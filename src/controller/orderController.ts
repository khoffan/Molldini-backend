import { Response } from "express";
import prisma, { Decimal } from "../lib/prisma_config";
import { OrderStatus, PaymentStatus, SubOrderStatus } from "../../generated/prisma/client";
import { AuthenticatedRequest } from "src/interface/authRequestInterface";
import omise from "../lib/omise_confic";

const createCharge = async (source: string, amount: number, orderId: string | null): Promise<any> => {
    return new Promise((resolve, reject) => {
        const redirect = process.env.NODE_ENV === "dev" ? `https://supercrowned-unhortative-sun.ngrok-free.dev/success/${orderId}` : `${process.env.FRONTEND_URL}/success/${orderId}`
        omise.charges.create({
            amount: amount,
            currency: "THB",
            return_uri: redirect,
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
                    cartItemId: it.id,
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
                                    cartItemId: it.cartItemId,
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

export const getOrderUser = async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    try {
        const orders = await prisma.order.findMany({
            where: {
                userId: userId

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
        console.log("Orders User fetched successfully");
        return res.status(200).json(orders);
    } catch (e: any) {
        return res.status(500).json({ message: "Failed to fetch orders", error: e.message });
    }
}

export const getOrderMerchant = async (req: AuthenticatedRequest, res: Response) => {
    const merchant = req.merchant
    console.log("🚀 ~ getOrderMerchant ~ merchant:", merchant)
    try {
        const orders = await prisma.order.findMany({
            where: {
                subOrders: {
                    some: {
                        merchantId: merchant!.id
                    }
                }
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
        console.log("🚀 ~ getOrderMerchant ~ orders:", orders)

        console.log("Orders Merchant fetched successfully");
        return res.status(200).json(orders);
    } catch (e: any) {
        return res.status(500).json({ message: "Failed to fetch orders", error: e.message });
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
        const { source, shippingId } = req.body;

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

        const shippingMethod = await prisma.shipping.findUnique({
            where: {
                id: shippingId as string
            }
        });


        const productTotal = new Decimal(orderData.totalPrice || 0);
        const threshold = new Decimal(shippingMethod?.freeShippingThreshold || 0);

        const isFree = shippingMethod?.freeShippingThreshold && productTotal.gte(threshold);
        const shippingCost = isFree ? new Decimal(0) : new Decimal(shippingMethod?.price || 0);

        const finalNetAmount = productTotal.plus(shippingCost);

        let totalSystemFee = new Decimal(0);
        let totalNetMerchant = new Decimal(0);
        // 3. เริ่ม Transaction เพื่อคำนวณรายร้านและบันทึก
        const result = await prisma.$transaction(async (tx) => {

            // วนลูป SubOrders เพื่อคำนวณหัก 5% รายร้าน
            for (const sub of orderData.subOrders) {
                const subTotal = new Decimal(sub.totalPrice);
                const feePercent = new Decimal(sub.feePercentage); // 5.0

                // คำนวณ Fee: (ยอดรวมร้าน * 5) / 100
                const systemFee = subTotal.times(feePercent).dividedBy(100);
                const netToMerchant = subTotal.minus(systemFee);

                // สะสมยอดรวมไว้ใส่ Order หลัก
                totalSystemFee = totalSystemFee.plus(systemFee);
                totalNetMerchant = totalNetMerchant.plus(netToMerchant);

                // อัปเดต SubOrder แต่ละตัว
                await tx.subOrder.update({
                    where: { id: sub.id },
                    data: {
                        systemFeeAmount: systemFee,
                        netToMerchant: netToMerchant,
                        shippingFee: shippingCost,
                        shippingProvider: shippingMethod?.name
                    }
                });
            }

            // สร้าง Charge ไปยัง Omise (แปลงเป็นหน่วยสตางค์)
            const amountInSubunits = finalNetAmount.times(100).toNumber();
            console.log("🚀 ~ checkoutOrder ~ amountInSubunits:", amountInSubunits)

            const omiseRes = await createCharge(source, amountInSubunits, orderData.id);

            // อัปเดต Order หลัก
            const updatedOrder = await tx.order.update({
                where: { id: orderId as string },
                data: {
                    chargeId: omiseRes.id,
                    totalPrice: productTotal,
                    totalShippingCost: shippingCost,
                    netAmount: finalNetAmount,
                    totalSystemFee: totalSystemFee,
                    totalNetMerchant: totalNetMerchant.plus(shippingCost)
                }
            });

            await tx.invoice.update({
                where: { orderId: orderId as string },
                data: {
                    amount: finalNetAmount,
                    shippingCost: shippingCost
                }
            });

            return { omiseRes, updatedOrder };
        });
        const paymentInfoRes = handlePaymentResponse(result.omiseRes);

        return res.status(200).json({
            message: "Order checked out successfully",
            ...paymentInfoRes
        });
    } catch (e: any) {
        console.log("Checkout order failed", e.message);
        return res.status(500).json({ message: "Failed to checkout order", error: e.message });
    }
}



// แยก Response Logic ออกมา
const handlePaymentResponse = (omiseRes: any) => {
    // กรณี PromptPay
    if (omiseRes.source?.type === "promptpay") {
        return {
            paymentType: "qr_code",
            code: omiseRes.source.scannable_code?.image?.download_uri, // ดึง URL รูปโดยตรง
            expiresAt: omiseRes.source.scannable_code?.expires_at
        };
    }

    // กรณี Credit Card หรืออื่นๆ ที่ต้อง Redirect (เช่น 3DS)
    if (omiseRes.authorize_uri) {
        return {
            paymentType: "redirect",
            redirectUrl: omiseRes.authorize_uri
        };
    }

    // กรณีจ่ายสำเร็จทันที (เช่น Card ไม่ต้อง 3DS)
    return {
        paymentType: "immediate",
        status: omiseRes.status
    };
};