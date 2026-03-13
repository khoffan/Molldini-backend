import prisma from "../lib/prisma_config";
import { Request, Response } from "express";
import client from "../lib/redis_config";
import { AuthenticatedRequest } from "src/interface/authRequestInterface";
import crypto from 'crypto';
import { SubOrderStatus } from "../../generated/prisma/client";


export const getOverviewState = async (req: AuthenticatedRequest, res: Response) => {
    const CACHE_KEY = "overview_stats_data";
    const HASH_KEY = "overview_stats_hash";

    try {
        const [orderStats, invoiceStats, userCount, merchantCount, topProducts, recentOrders] = await Promise.all([
            prisma.order.aggregate({ _sum: { totalPrice: true }, _count: { id: true } }),
            prisma.invoice.groupBy({ by: ['status'], _sum: { amount: true }, _count: { id: true } }),
            prisma.users.count(),
            prisma.merchant.count(),
            prisma.orderItems.groupBy({
                by: ['productVariantId', 'title'],
                _sum: { quantity: true },
                orderBy: { _sum: { quantity: 'desc' } },
                take: 5
            }),
            prisma.order.findMany({
                take: 5,
                orderBy: { createdAt: 'desc' },
                select: { id: true, receiverName: true, totalPrice: true, createdAt: true, status: true }
            })
        ]);

        // ✨ Transformation Logic: ปรับ Data ให้สวยงาม
        const statsResult = {
            // ส่วนตัวเลขโดดๆ (KPI Cards)
            overview: {
                revenue: orderStats._sum.totalPrice || 0,
                orders: orderStats._count.id || 0,
                users: userCount,
                merchants: merchantCount
            },
            // ส่วนสถานะเงิน (ใช้งานใน Pie Chart ได้เลย)
            billing: invoiceStats.map(item => ({
                status: item.status,
                amount: item._sum.amount || 0,
                count: item._count.id || 0
            })),
            // สินค้าขายดี (ใช้งานใน List หรือ Table ได้เลย)
            topSelling: topProducts.map(p => ({
                variantId: p.productVariantId,
                name: p.title,
                quantity: p._sum.quantity || 0
            })),
            // รายการล่าสุด
            latestActivities: recentOrders,
            updatedAt: new Date().toISOString()
        };

        // --- ระบบ Hash & Cache (เหมือนเดิม) ---
        const currentHash = crypto.createHash('md5').update(JSON.stringify(statsResult)).digest('hex');
        const savedHash = await client.get(HASH_KEY);

        if (currentHash === savedHash) {
            const cachedData = await client.get(CACHE_KEY);
            return res.status(200).json({
                source: 'cache',
                data: cachedData ? JSON.parse(cachedData.toString()) : statsResult
            });
        }

        await client.setEx(CACHE_KEY, 1800, JSON.stringify(statsResult));
        await client.set(HASH_KEY, currentHash);

        return res.status(200).json({ source: 'database', data: statsResult });

    } catch (e: any) {
        return res.status(500).json({ message: e.message });
    }
}

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
            invoices: invoiceStatus.map(item => ({
                status: item.status,
                amount: item._sum.amount || 0,
                count: item._count.id || 0
            })),
            recentActivities: recentReceipts.map(item => ({
                receiptNumber: item.receiptNumber,
                amount: item.amount,
                paymentMethod: item.paymentMethod,
                paidAt: item.paidAt,
                order: {
                    receiverName: item.order.receiverName
                }
            })),
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
        // กำหนดช่วงเวลา (ย้อนหลัง 24 ชม. และ 30 วัน)
        const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const last30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

        const [
            roleStats,
            activeToday,
            deviceDist,
            topSpenders,
            newUsers30d,
            orderAggregates,
            totalUsersCount
        ] = await Promise.all([
            // 1. แยกตาม Role
            prisma.users.groupBy({
                by: ['role'],
                _count: { id: true }
            }),
            // 2. Active 24 ชม.
            prisma.users.count({
                where: { lastLogin: { gte: last24h } }
            }),
            // 3. แยกตามอุปกรณ์
            prisma.userDevices.groupBy({
                by: ['deviceType'],
                _count: { id: true }
            }),
            // 4. Top Spenders (ดึงชื่อมาด้วย)
            prisma.order.groupBy({
                by: ['userId'],
                _sum: { totalPrice: true },
                orderBy: { _sum: { totalPrice: 'desc' } },
                take: 5
            }),
            // 5. ผู้สมัครใหม่ 30 วัน
            prisma.users.count({
                where: { createdAt: { gte: last30d } }
            }),
            // 6. คำนวณยอดเฉลี่ย (AOV)
            prisma.order.aggregate({
                _avg: { totalPrice: true },
                _count: { id: true }
            }),
            // 7. จำนวน User ทั้งหมด (ใช้คำนวณ %)
            prisma.users.count()
        ]);

        // ดึงชื่อของ Top Spenders เพิ่มเติม (เนื่องจาก groupBy ไม่สนับสนุน include)
        const topSpenderDetails = await Promise.all(
            topSpenders.map(async (s) => {
                const user = await prisma.users.findUnique({
                    where: { id: s.userId },
                    select: { name: true, email: true }
                });
                return {
                    userId: s.userId,
                    name: user?.name || 'Unknown',
                    email: user?.email,
                    totalSpent: s._sum.totalPrice || 0
                };
            })
        );

        return res.status(200).json({
            success: true,
            data: {
                summary: roleStats.map(item => ({
                    role: item.role,
                    count: item._count.id
                })),
                activeStatus: {
                    totalUsers: totalUsersCount,
                    active24h: activeToday,
                    newUsers30d: newUsers30d
                },
                devices: deviceDist.map(d => ({
                    type: d.deviceType,
                    count: d._count.id
                })),
                topSpenders: topSpenderDetails,
                insights: {
                    averageOrderValue: orderAggregates._avg.totalPrice || 0,
                    totalOrders: orderAggregates._count.id
                },
                updatedAt: new Date().toISOString()
            }
        });
    } catch (e: any) {
        return res.status(500).json({ success: false, message: e.message });
    }
};

// controllers/stats/merchantStats.controller.ts
export const getMerchantStats = async (req: Request, res: Response) => {
    try {
        const [
            topMerchants,
            lowStockAlert,
            totalMerchants,
            inventoryStats,
            recentSubOrders
        ] = await Promise.all([
            // 1. อันดับร้านค้าขายดี
            prisma.subOrder.groupBy({
                by: ['merchantId', 'merchantName'],
                where: { status: SubOrderStatus.DELIVERED },
                _sum: { totalPrice: true },
                _count: { id: true },
                orderBy: { _sum: { totalPrice: 'desc' } },
                take: 5,
            }),
            // 2. สินค้าสต็อกใกล้หมด (Alert)
            prisma.productVariant.findMany({
                where: { stock: { lt: 10 }, isActive: true },
                select: {
                    variantName: true,
                    stock: true,
                    product: {
                        select: {
                            title: true,
                            merchant: { select: { name: true } }
                        }
                    }
                },
                take: 10
            }),
            // 3. จำนวน Merchant ทั้งหมด
            prisma.merchant.count(),
            // 4. สถิติสต็อกรวม (Total Stock Capacity vs Remaining)
            // สมมติว่ามี field 'stock' ใน productVariant
            prisma.productVariant.aggregate({
                _sum: { stock: true },
                _count: { id: true } // จำนวน SKU ทั้งหมด
            }),
            // 5. ออเดอร์ล่าสุดและร้านค้าที่เกี่ยวข้อง
            prisma.subOrder.findMany({
                orderBy: { createAt: 'desc' },
                take: 10,
                select: {
                    id: true,
                    orderId: true,
                    merchantName: true,
                    totalPrice: true,
                    status: true,
                    createAt: true
                }
            })
        ]);

        return res.status(200).json({
            success: true,
            data: {
                totalMerchants,
                inventory: {
                    totalSkus: inventoryStats._count.id,
                    totalStockRemaining: inventoryStats._sum.stock || 0,
                    lowStockItems: lowStockAlert.map(item => ({
                        name: `${item.product.title} (${item.variantName})`,
                        stock: item.stock,
                        merchant: item.product.merchant.name
                    }))
                },
                rankings: topMerchants.map(item => ({
                    merchantId: item.merchantId,
                    merchantName: item.merchantName,
                    revenue: item._sum.totalPrice,
                    orderCount: item._count.id
                })),
                recentActivities: recentSubOrders.map(order => ({
                    subOrderId: order.id,
                    mainOrderId: order.orderId,
                    merchant: order.merchantName,
                    amount: order.totalPrice,
                    status: order.status,
                    date: order.createAt
                })),
                updatedAt: new Date().toISOString()
            }
        });
    } catch (e: any) {
        return res.status(500).json({ success: false, message: e.message });
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
            bestSellers: bestSellers.map(item => ({
                productVariantId: item.productVariantId,
                title: item.title,
                quantity: item._sum.quantity
            })),
            revenueByCategory: catMap,
            payments: paymentDist.map(item => ({
                paymentMethod: item.paymentMethod,
                count: item._count.id
            }))
        });
    } catch (e: any) {
        res.status(500).json({ message: e.message });
    }
};

