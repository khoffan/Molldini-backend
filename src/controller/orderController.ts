import { Request, Response, Errback } from "express";
import prisma from "../lib/prisma_config";
import { Order, OrderItems, OrderStatus, PaymentStatus } from "../../generated/prisma/client";
import { AuthenticatedRequest } from "src/interface/authRequestInterface";
import { Auth } from "firebase-admin/auth";

export const setOrder = async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    const { cartId } = req.params;
    const { shippingAddress, paymentMethod, receiverName, receiverPhone } = req.body;
    try {
        const cartData = await prisma.carts.findUnique({
            where: {
                id: cartId as string
            },
            include: {
                items: true
            }
        })
        console.log("Cart Data:", cartData);
        const cartItems = cartData?.items;
        if (!cartData || !cartItems || cartItems.length === 0) {
            return res.status(400).json({ message: "Cart is empty or not found" });
        }

        console.log("Cart Data:", cartItems);
        const orderItemsWidthdata = await Promise.all(
            cartData.items.map(async (it) => {
                const variant = await prisma.productVariant.findUnique({
                    where: { id: it.productId },
                    include: {
                        product: true,
                        images: true
                    }
                })

                if (!variant) {
                    throw new Error(`Product variant with ID ${it.productId} not found`);
                }

                return {
                    productId: variant.productId, // id ของสินค้าหลัก
                    productVariantId: variant.id,  // id ของ variant
                    title: variant.product.title, // snapshot ชื่อ
                    price: variant.price,         // snapshot ราคา
                    image: variant.images[0]?.url || "",
                    quantity: it.quantity
                }
            })
        );
        console.log("Order Items with Data:", orderItemsWidthdata);
        let totalPrice = 0;
        if (cartData.totalPrice !== 0) {
            totalPrice = cartData.totalPrice;
        } else {
            totalPrice = orderItemsWidthdata.reduce((acc, item) => acc + item.price * item.quantity, 0);
        }
        console.log("Total Price:", totalPrice);
        const result = await prisma.$transaction(async (tx) => {
            console.log("Creating order in transaction");
            const newOrder = await tx.order.create({
                data: {
                    userId: user.id,
                    status: OrderStatus.PENDING,
                    items: {
                        create: orderItemsWidthdata
                    },
                    shippingAddress: shippingAddress,
                    receiverName: receiverName,
                    receiverPhone: receiverPhone,
                    totalPrice: totalPrice,
                    invoice: {
                        create: {
                            amount: totalPrice,
                            status: PaymentStatus.UNPAID,
                            paymentMethod: paymentMethod
                        }
                    }
                }
            });
            console.log("New Order:", newOrder);
            // await tx.cartItems.deleteMany({
            //     where: {
            //         cartsId: cartData.id
            //     }
            // });

            return newOrder;
        });
        const order = await prisma.order.findUnique({
            where: {
                id: result.id
            },
            include: {
                items: true,
                invoice: true
            }
        });

        console.log("Order created successfully", order);
        return res.status(201).json(order);
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
                items: true,
                invoice: true
            }
        });
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
                    status: OrderStatus.PROCESSING,
                },
                include: {
                    items: true,
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
        console.log("Order and invoice updated successfully ", updateOrderInvoiceData);
        return res.status(200).json(updateOrderInvoiceData);
    } catch (e: unknown) {
        if (e instanceof Error) {
            return res.status(500).json({ message: "Failed to update order", error: e.message });
        }
        return res.status(500).json({ message: "Failed to update order" });
    }
}
