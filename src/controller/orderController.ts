import { Request, Response, Errback } from "express";
import prisma from "../lib/prisma_config";
import { Order, OrderItems, OrderStatus, PaymentStatus } from "../../generated/prisma/client";

export const setOrder = async (req: Request, res: Response) => {
    const { items, ...data } = req.body;
    const orderData: Omit<Order, "id" | "createdAt" | "updatedAt"> = data;
    const orderItems: Omit<OrderItems, "id" | "createdAt" | "updatedAt">[] = items;
    try {
        const result = await prisma.$transaction(async (tx) => {
            const newOrder = await tx.order.create({
                data: {
                    ...orderData,
                    status: OrderStatus.PENDING,
                    items: {
                        createMany: {
                            data: orderItems
                        }
                    },
                },
                include: {
                    items: true
                }
            })
            await tx.invoice.create({
                data: {
                    orderId: newOrder.id,
                    amount: newOrder.totalPrice,
                    status: PaymentStatus.UNPAID,
                }
            });
            return newOrder
        });
        return res.status(201).json(result);
    } catch (e: any) {
        return res.status(500).json({ message: "Failed to create order", error: e.message });
    }
}

export const getOrderById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const order = await prisma.order.findUnique({
            where: {
                id: id as string
            },
            include: {
                items: true
            }
        });
        return res.status(200).json(order);
    } catch (e: any) {
        return res.status(500).json({ message: "Failed to fetch order", error: e.message });
    }
}