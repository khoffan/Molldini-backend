import cron from 'node-cron';
import { createAndSendNotification } from '../controller/notificationController';
import { OrderStatus } from '../../generated/prisma/client';
import prisma from '../lib/prisma_config';

export const initOrderCron = () => {
    console.log("🚀 Order Checker Cron Job Initialized");
    cron.schedule('*/20 * * * *', async () => {
        const expiredTime = new Date(Date.now() - 60 * 60 * 1000).toISOString();

        const expriedOrder = await prisma.order.findMany({
            where: {
                expiredAt: {
                    lt: expiredTime
                },
                status: OrderStatus.PENDING
            }
        })
        console.log(expriedOrder.length, "Order Expired");
        console.log("🚀 Order Checker Cron Job Running")
        if (expriedOrder.length > 0) {
            for (const order of expriedOrder) {
                await prisma.order.update({
                    where: {
                        id: order.id
                    },
                    data: {
                        status: OrderStatus.CANCELLED
                    }
                })

                await createAndSendNotification(order.userId, 'Order Expired', `Your order with id ${order.id} has been expired`, 'ORDER_EXPIRED', `/orders/${order.id}`);
            }
        }
    })
}