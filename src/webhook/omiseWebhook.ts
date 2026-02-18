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
            console.log("chargeData =>", chargeData);
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
                const now = new Date();
                const timestamp = now.toISOString().replace(/[-T:.Z]/g, "");
                // จะได้รูปแบบ YYYYMMDDHHMMSSmmm
                const receiptNumber = `RE-${timestamp}-${Math.floor(Math.random() * 100000)}`;

                console.log(receiptNumber); // ผลลัพธ์: RE-20260218171538123

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
                            status: PaymentStatus.PAID,
                            paidAt: new Date(),
                        },

                    })

                    const recipt = await tx.receipt.create({
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
                    if (recipt) {
                        const subOrders = orderUpdate.subOrders;
                        const cartItemId = orderUpdate.subOrders.flatMap((sub) => sub.orderItems.map((it) => it.cartItemId));
                        await Promise.all(subOrders.map(async (sub) => {
                            await Promise.all(sub.orderItems.map(async (it) => {
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
                                if (cartItemId && cartItemId.length > 0) {
                                    await Promise.all(
                                        cartItemId.map(async (cartItemId) => {
                                            await tx.cartItems.delete({
                                                where: {
                                                    id: cartItemId
                                                }
                                            })
                                        })
                                    )
                                }
                            }))
                        }))
                    }

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