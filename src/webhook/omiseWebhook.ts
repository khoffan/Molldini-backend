import { Router, Response } from "express";
import { AuthenticatedRequest } from "../interface/authRequestInterface";
import prisma from "../lib/prisma_config";
import { OrderStatus, PaymentStatus, SubOrderStatus } from "../../generated/prisma/client";
import { updateOrderData } from "src/controller/orderController";
const router = Router();


router.post("/webhook", async (req: AuthenticatedRequest, res: Response) => {
    try {

        if (req.body.key === 'charge.complete') {
            const chargeData = req.body.data;
            const chargeId = chargeData.id;
            const chargeStatus = chargeData.status;
            const orderId = chargeData.metadata.orderId;
            const existingOrder = await prisma.order.findUnique({
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
            })

            if (existingOrder && existingOrder.status === OrderStatus.PAID) {
                return res.status(200).json({ message: "Order already delivered" });
            }

            if (chargeStatus === 'successful') {
                const receiptNumber = `RE-${Math.floor(100000 + Math.random() * 900000)}`;

                await prisma.$transaction(async (tx) => {
                    const orderUpdate = await tx.order.update({
                        where: {
                            id: orderId
                        },
                        data: {
                            status: OrderStatus.PAID
                        },
                        include: {
                            subOrders: {
                                include: {
                                    orderItems: true
                                }
                            },
                            invoice: true
                        }
                    })

                    await tx.subOrder.updateMany({
                        where: {
                            orderId: orderId
                        },
                        data: {
                            status: SubOrderStatus.PREPARING
                        }
                    })

                    const invopiceUpdate = await tx.invoice.update({
                        where: {
                            orderId: orderUpdate.id as string
                        },
                        data: {
                            status: PaymentStatus.PAID
                        },

                    })

                    await tx.receipt.create({
                        data: {
                            amount: orderUpdate.totalPrice,
                            paymentMethod: invopiceUpdate.paymentMethod!,
                            omiseChargeId: chargeId,
                            invoiceId: invopiceUpdate.id,
                            orderId: orderUpdate.id,
                            paidAt: new Date(),
                            receiptNumber: receiptNumber.toString()
                        }
                    })

                    const subOrders = orderUpdate.subOrders;
                    await Promise.all(subOrders.map(async (sub) => {
                        sub.orderItems.map(async (it) => {
                            await tx.productVariant.update({
                                where: {
                                    id: it.productVariantId as string
                                },
                                data: {
                                    stock: {
                                        decrement: it.quantity
                                    }
                                }
                            })
                        })
                    }))
                });
                console.log(`✅ Payment Success: Order ${orderId}`);
            } else {
                await prisma.order.update({
                    where: {
                        id: orderId
                    },
                    data: {
                        status: OrderStatus.CANCELLED
                    },
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