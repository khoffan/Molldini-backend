import prisma from "../lib/prisma_config";
import { Request, Response } from "express";
import client from "../lib/redis_config";
import { AuthenticatedRequest } from "src/interface/authRequestInterface";
import crypto from 'crypto';
import { SubOrderStatus } from "../../generated/prisma/client";

export const getOrderState = async (req: AuthenticatedRequest, res: Response) => {
    const CACHE_KEY = "order_stats_data";
    const HASH_KEY = "order_stats_hash";

    try {
        // 1. ดึงข้อมูลจาก Database
        const [orderSummary, invoiceStatus, recentReceipts] = await Promise.all([
            prisma.order.aggregate({
                _sum: { totalPrice: true },
                _count: { id: true }
            }),
            prisma.invoice.groupBy({
                by: ['status'],
                _sum: { amount: true },
                _count: { id: true }
            }),
            prisma.receipt.findMany({
                take: 5,
                orderBy: { paidAt: 'desc' },
                select: {
                    receiptNumber: true,
                    amount: true,
                    paymentMethod: true,
                    paidAt: true,
                    order: { select: { receiverName: true } }
                }
            })
        ]);

        const statsResult = {
            totalSales: orderSummary._sum.totalPrice || 0,
            totalOrders: orderSummary._count.id || 0,
            invoices: invoiceStatus,
            recentActivities: recentReceipts,
            updatedAt: new Date().toISOString()
        };

        // 2. สร้าง MD5 Hash จากข้อมูลที่ได้มาใหม่
        const currentHash = crypto
            .createHash('md5')
            .update(JSON.stringify(statsResult))
            .digest('hex');

        // 3. ดึง Hash เดิมจาก Redis มาเทียบ
        const savedHash = await client.get(HASH_KEY);

        if (currentHash === savedHash) {
            // ข้อมูลไม่เปลี่ยนแปลง ดึงจาก Cache ส่งกลับ
            const cachedData = await client.get(CACHE_KEY);
            return res.status(200).json({
                source: 'cache',
                data: cachedData ? JSON.parse(cachedData.toString()) : statsResult
            });
        }

        // 4. ถ้าข้อมูลเปลี่ยน (Delta) -> Update Redis
        // ตั้งเวลาหมดอายุไว้เผื่อด้วย (เช่น 1 ชั่วโมง) เพื่อไม่ให้ขยะค้างในระบบ
        await client.setEx(CACHE_KEY, 3600, JSON.stringify(statsResult));
        await client.set(HASH_KEY, currentHash);

        return res.status(200).json({
            source: 'database',
            data: statsResult
        });
    } catch (e: any) {
        return res.status(500).json({ message: e.message });
    }
};

// controllers/stats/userStats.controller.ts
export const getUserStats = async (req: Request, res: Response) => {
    try {
        const [totalUsers, activeToday, deviceDist, topSpenders] = await Promise.all([
            // 1. จำนวนผู้ใช้ทั้งหมดแยกตาม Role
            prisma.users.groupBy({
                by: ['role'],
                _count: { id: true }
            }),
            // 2. ผู้ใช้ที่ Active (Login ล่าสุดไม่เกิน 24 ชม.)
            prisma.users.count({
                where: {
                    lastLogin: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
                }
            }),
            // 3. การใช้งานแยกตามอุปกรณ์ (FCM Token)
            prisma.userDevices.groupBy({
                by: ['deviceType'],
                _count: { id: true }
            }),
            // 4. ลูกค้าที่มียอดซื้อสูงสุด (Top Spenders)
            prisma.order.groupBy({
                by: ['userId'],
                _sum: { totalPrice: true },
                orderBy: { _sum: { totalPrice: 'desc' } },
                take: 5
            })
        ]);

        return res.status(200).json({
            summary: totalUsers,
            active24h: activeToday,
            devices: deviceDist,
            topSpenders
        });
    } catch (e: any) {
        res.status(500).json({ message: e.message });
    }
};

// controllers/stats/merchantStats.controller.ts
export const getMerchantStats = async (req: Request, res: Response) => {
    try {
        const [topMerchants, lowStockAlert, totalMerchants] = await Promise.all([
            // 1. ร้านค้าที่มียอดขายสูงสุด (Ranking)
            prisma.subOrder.groupBy({
                by: ['merchantId', 'merchantName'],
                where: { status: SubOrderStatus.DELIVERED },
                _sum: { totalPrice: true },
                _count: { id: true },
                orderBy: { _sum: { totalPrice: 'desc' } },
                take: 5,
            }),
            // 2. สินค้าที่สต็อกใกล้หมด (Critical Stock < 10)
            prisma.productVariant.findMany({
                where: { stock: { lt: 10 }, isActive: true },
                select: {
                    variantName: true,
                    stock: true,
                    product: { select: { title: true, merchant: { select: { name: true } } } }
                },
                take: 10
            }),
            // 3. จำนวน Merchant ทั้งหมด
            prisma.merchant.count()
        ]);

        return res.status(200).json({
            rankings: topMerchants,
            inventoryAlert: lowStockAlert,
            totalMerchants
        });
    } catch (e: any) {
        res.status(500).json({ message: e.message });
    }
};

// controllers/stats/orderProductStats.controller.ts
export const getOrderProductStats = async (req: Request, res: Response) => {
    try {
        const [bestSellers, categorySales, paymentDist] = await Promise.all([
            // 1. สินค้าที่ขายดีที่สุด (Best Selling Variants)
            prisma.orderItems.groupBy({
                by: ['productVariantId', 'title'],
                _sum: { quantity: true },
                orderBy: { _sum: { quantity: 'desc' } },
                take: 5
            }),
            // 2. ยอดขายแยกตามหมวดหมู่ (Category Performance)
            prisma.products.findMany({
                select: {
                    category: { select: { name: true } },
                    variants: {
                        select: {
                            orderItems: { select: { price: true, quantity: true } }
                        }
                    }
                }
            }),
            // 3. สัดส่วนช่องทางการชำระเงิน
            prisma.invoice.groupBy({
                by: ['paymentMethod'],
                _count: { id: true },
                where: { status: 'PAID' }
            })
        ]);

        // Logic เพิ่มเติม: คำนวณยอดขายตาม Category ใน JS (เนื่องจาก Prisma GroupBy ข้าม Relation ลึกๆ ลำบาก)
        const catMap: any = {};
        categorySales.forEach(p => {
            const catName = p.category?.name || 'Uncategorized';
            let total = 0;
            p.variants.forEach(v => {
                v.orderItems.forEach(item => total += (item.price * item.quantity));
            });
            catMap[catName] = (catMap[catName] || 0) + total;
        });

        return res.status(200).json({
            bestSellers,
            revenueByCategory: catMap,
            payments: paymentDist
        });
    } catch (e: any) {
        res.status(500).json({ message: e.message });
    }
};

