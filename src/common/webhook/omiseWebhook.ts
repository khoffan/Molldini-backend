import { Router, Response } from "express";
import { AuthenticatedRequest } from "../../interface/authRequestInterface";
import prisma from "../lib/prisma_config";
import { OrderStatus, PaymentStatus, SubOrderStatus, SysLogStatus } from "../../../generated/prisma/client";
import { updateOrderData } from "src/controller/orderController";
const router = Router();


router.post("/webhook", async (req: AuthenticatedRequest, res: Response) => {
    try {

        if (req.body.key === 'charge.complete') {
            const chargeData = req.body.data;
            console.log("chargeData =>", chargeData);
            const chargeId = chargeData.id;
            const chargeStatus = chargeData.status;
            const orderId = chargeData.metadata.orderId;
            const [existingOrder, systemSetting] = await Promise.all([
                prisma.order.findUnique({
                    where: {
                        id: orderId
                    },
                    include: {
                        subOrders: {
                            include: {
                                orderItems: true
                            }
                        },
                        invoice: true
                    }
                }),
                prisma.systemSetting.findFirst({ orderBy: { createdAt: 'desc' } })
            ]);

            if (!existingOrder) return res.status(404).json({ message: "Order not found" });
            if (existingOrder.status === OrderStatus.PAID) return res.sendStatus(200);

            const feePercent = systemSetting ? Number(systemSetting.feePercentage) : 5.0; // Default 5% ถ้าไม่มีใน DB

            if (chargeStatus === 'successful') {
                const now = new Date();
                const timestamp = now.toISOString().replace(/[-T:.Z]/g, "");
                const receiptNumber = `RE-${timestamp}-${Math.floor(Math.random() * 100000)}`;

                await prisma.$transaction(async (tx) => {
                    // 2. อัปเดตสถานะ Order และ Invoice
                    const orderUpdate = await tx.order.update({
                        where: { id: orderId },
                        data: { status: OrderStatus.PAID },
                        include: { subOrders: true }
                    });

                    await tx.subOrder.updateMany({
                        where: { orderId: orderId },
                        data: { status: SubOrderStatus.PREPARING }
                    });

                    const invoiceUpdate = await tx.invoice.update({
                        where: { orderId: orderId },
                        data: { status: PaymentStatus.PAID, paidAt: now }
                    });

                    // 3. สร้าง Receipt
                    await tx.receipt.create({
                        data: {
                            amount: orderUpdate.totalPrice,
                            paymentMethod: invoiceUpdate.paymentMethod!,
                            shippingCost: invoiceUpdate.shippingCost,
                            omiseChargeId: chargeId,
                            invoiceId: invoiceUpdate.id,
                            orderId: orderUpdate.id,
                            paidAt: now,
                            receiptNumber: receiptNumber
                        }
                    });

                    // 4. 🔥 ระบบจัดการรายได้ (Revenue Logging)
                    // เราจะ Loop ทุก SubOrder เพื่อสร้าง Log รายได้แยกตามร้านค้า
                    for (const subOrder of existingOrder.subOrders) {
                        const totalAmount = Number(subOrder.totalPrice);
                        const revenueAmount = totalAmount * (feePercent / 100);
                        const netToMerchant = totalAmount - revenueAmount;

                        await tx.systemRevenueLog.create({
                            data: {
                                orderId: orderId,
                                subOrderId: subOrder.id,
                                totalAmount: totalAmount,
                                feePercentage: feePercent,
                                revenueAmount: revenueAmount,
                                netToMerchant: netToMerchant,
                                status: SysLogStatus.SUCCESS
                            }
                        });
                    }

                    // 5. ตัดสต็อกและลบตะกร้า
                    for (const sub of existingOrder.subOrders) {
                        for (const it of sub.orderItems) {
                            // ตัดสต็อก
                            await tx.productVariant.update({
                                where: { id: it.productVariantId as string },
                                data: { stock: { decrement: it.quantity } }
                            });
                            // ลบจากตะกร้า
                            if (it.cartItemId) {
                                await tx.cartItems.delete({ where: { id: it.cartItemId } });
                            }
                        }
                    }
                });

                console.log(`✅ Revenue Logged & Payment Success: Order ${orderId}`);
            } else {
                // กรณีจ่ายเงินไม่สำเร็จ
                await prisma.order.update({
                    where: { id: orderId },
                    data: { status: OrderStatus.CANCELLED }
                });
                console.log(`❌ Payment Failed: Order ${orderId}`);
            }

            res.sendStatus(200);
        }
    } catch (e: any) {
        console.log("Webhook failed", e.message);
        return res.status(500).json({ message: e.message });
    }
});

export default router;