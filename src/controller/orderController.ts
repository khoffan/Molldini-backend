import { Request, Response, Errback } from "express";
import prisma from "../lib/prisma_config";
import { Order, OrderItems, OrderStatus, PaymentStatus, SubOrderStatus } from "../../generated/prisma/client";
import { AuthenticatedRequest } from "src/interface/authRequestInterface";
import { Auth } from "firebase-admin/auth";
import omise from "../lib/omise_confic";


const createCharge = async (source: string, amount: number, orderId: string | null): Promise<any> => {
    return new Promise((resolve, reject) => {
        omise.charges.create({
            amount: (amount * 100),
            currency: "THB",
            return_uri: `https://supercrowned-unhortative-sun.ngrok-free.dev/success/${orderId}`,
            metadata: {
                orderId
            },
            source
        }, (err, res) => {
            if (err) {
                reject(err)
            }
            resolve(res)
        });
    });
}

export const setOrder = async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    const { cartId } = req.params;
    const { shippingAddress, paymentMethod, receiverName, receiverPhone, selectedItems } = req.body;
    try {
        const cartData = await prisma.carts.findUnique({
            where: {
                id: cartId as string
            },
            include: {
                items: true
            }
        })
        console.log("cartData => ", cartData);
        const cartItems = cartData?.items.filter(item => selectedItems.includes(item.productId));
        if (!cartData || !cartItems || cartItems.length === 0) {
            return res.status(400).json({ message: "Cart is empty or not found" });
        }

        const orderItemsWithdata = await Promise.all(
            cartItems.map(async (it) => {
                const variant = await prisma.productVariant.findUnique({
                    where: { id: it.productId },
                    include: {
                        product: {
                            select: {
                                title: true,
                                description: true,
                                merchantId: true,
                                merchant: {
                                    select: {
                                        ownerId: true,
                                        name: true,
                                    }
                                }
                            }
                        },
                        images: true
                    }
                })

                if (!variant) {
                    throw new Error(`Product variant with ID ${it.productId} not found`);
                }

                return {
                    productId: variant.productId, // id ของสินค้าหลัก
                    productVariantId: variant.id,  // id ของ variant
                    merchantId: variant.product.merchantId,
                    merchantName: variant.product.merchant.name,
                    title: variant.product.title, // snapshot ชื่อ
                    price: variant.price,         // snapshot ราคา
                    image: variant.images[0]?.url || "",
                    quantity: it.quantity
                }
            })
        );

        const groupedByMerchant = orderItemsWithdata.reduce((acc, item) => {
            const mId = item.merchantId;
            if (!acc[mId]) {
                acc[mId] = {
                    merchantName: item.merchantName,
                    items: [],
                    subTotal: 0
                };
            }
            acc[mId].items.push(item);
            acc[mId].subTotal += item.price * item.quantity;
            return acc;
        }, {} as Record<string, any>);
        const finalTotalPrice = orderItemsWithdata.reduce((acc, item) => acc + (item.price * item.quantity), 0);
        // let totalPrice = 0;
        // if (cartData.totalPrice !== 0) {
        //     totalPrice = cartData.totalPrice;
        // } else {
        //     totalPrice = orderItemsWithdata.reduce((acc, item) => acc + item.price * item.quantity, 0);
        // }
        const result = await prisma.$transaction(async (tx) => {
            console.log("Creating order in transaction");
            const newOrder = await tx.order.create({
                data: {
                    userId: user.id,
                    status: OrderStatus.PENDING,
                    shippingAddress: shippingAddress,
                    receiverName: receiverName,
                    receiverPhone: receiverPhone,
                    totalPrice: finalTotalPrice,
                    subOrders: {
                        create: Object.entries(groupedByMerchant).map(([mId, data]: [string, any]) => ({
                            merchantId: mId,
                            merchantName: data.merchantName,
                            shippingFee: 0, // ปรับจูนตาม logic ค่าส่งของคุณในอนาคต
                            status: SubOrderStatus.PENDING,
                            orderItems: {
                                create: data.items.map((it: any) => ({
                                    productId: it.productId,
                                    merchantId: it.merchantId,
                                    title: it.title,
                                    price: it.price,
                                    quantity: it.quantity,
                                    image: it.image,
                                    productVariantId: it.productVariantId
                                }))
                            }
                        }))
                    },
                    invoice: {
                        create: {
                            amount: finalTotalPrice,
                            status: PaymentStatus.UNPAID,
                            paymentMethod: paymentMethod
                        }
                    },
                    expiredAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
                }
            });
            console.log("update cart items succesfully");
            return newOrder;
        });
        const completeOrder = await prisma.order.findUnique({
            where: {
                id: result.id
            },
            include: {
                subOrders: {
                    include: {
                        orderItems: true
                    }
                },
                invoice: true,
                receipt: true
            }
        });
        console.log("Order created successfully");
        return res.status(201).json(completeOrder);
    } catch (e: any) {
        console.log("Order creation failed", e.message);
        return res.status(500).json({ message: "Failed to create order", error: e.message });
    }
}

export const getOrderById = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { id } = req.params;
        const order = await prisma.order.findUnique({
            where: {
                id: id as string
            },
            include: {
                subOrders: {
                    include: {
                        orderItems: true
                    }
                },
                invoice: true,
                receipt: true
            }
        });
        console.log("Order fetched successfully");
        return res.status(200).json(order);
    } catch (e: any) {
        return res.status(500).json({ message: "Failed to fetch order", error: e.message });
    }
}

export const updateOrderData = async (req: AuthenticatedRequest, res: Response) => {
    const { id, cartId } = req.params;
    const { shippingAddress, receiverName, receiverPhone, paymentMethod } = req.body;
    try {
        const updateOrderInvoiceData = await prisma.$transaction(async (tx) => {
            const updatedOrder = await tx.order.update({
                where: {
                    id: id as string
                },
                data: {
                    shippingAddress: shippingAddress,
                    receiverName: receiverName,
                    receiverPhone: receiverPhone,
                },
                include: {
                    subOrders: {
                        include: {
                            orderItems: true
                        }
                    },
                    invoice: true
                }
            });

            await tx.invoice.update({
                where: {
                    orderId: updatedOrder.id
                },
                data: {
                    paymentMethod: paymentMethod
                }
            });

            await tx.cartItems.deleteMany({
                where: {
                    cartsId: cartId as string
                },
            });
            return updatedOrder;
        });
        console.log("Order updated successfully");
        return res.status(200).json(updateOrderInvoiceData);
    } catch (e: unknown) {
        if (e instanceof Error) {
            return res.status(500).json({ message: "Failed to update order", error: e.message });
        }
        return res.status(500).json({ message: "Failed to update order" });
    }
}

export const checkoutOrder = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { orderId } = req.params;
        const { source } = req.body;
        const orderData = await prisma.order.findUnique({
            where: {
                id: orderId as string
            },
            include: {
                user: true,
                subOrders: {
                    include: {
                        orderItems: true
                    }
                },
                invoice: true
            }
        });
        const productVariantIdsInOrder = orderData?.subOrders
            .flatMap(sub => sub.orderItems)
            .map(item => item.productVariantId);
        const totalPrice: number = orderData?.totalPrice ?? 0;
        const amount = totalPrice;
        console.log("🚀 ~ checkoutOrder ~ totalPrice:", totalPrice)

        const orderDataId = orderData?.id || null;
        const omiseRes = await createCharge(source, amount, orderDataId);

        await prisma.$transaction(async (tx) => {
            await tx.order.update({
                where: {
                    id: orderId as string
                },
                data: {
                    chargeId: omiseRes.id,
                }
            })

            // 2. ลบสินค้าออกจากตะกร้า เฉพาะชิ้นที่จ่ายเงินซื้อไปแล้ว
            if (productVariantIdsInOrder && productVariantIdsInOrder.length > 0) {
                await tx.cartItems.deleteMany({
                    where: {
                        // ระบุ Cart ของ User คนนี้ (สมมติว่าคุณมีความสัมพันธ์นี้)
                        userId: req.user?.id,
                        // หรือถ้า CartItem มี userId ตรงๆ ก็ใช้เสร็จได้เลย
                        productId: {
                            in: productVariantIdsInOrder as string[]
                        }
                    }
                });
            }
        })


        let redirectUrl = null;
        let code = null;
        if (omiseRes.source.type !== "promptpay") {
            redirectUrl = omiseRes.authorize_uri
        } else {
            code = omiseRes.source.scannable_code
        }
        return res.status(200).json({
            message: "Order checked out successfully",
            redirectUrl: redirectUrl,
            code: code
        });
    } catch (e: any) {
        console.log("Checkout order failed", e.message);
        return res.status(500).json({ message: "Failed to checkout order", error: e.message });
    }
}
