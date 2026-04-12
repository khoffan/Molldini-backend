import { Response } from 'express';
import { AuthenticatedRequest } from '../interface/authRequestInterface';
import { adminMessaging } from '../common/firebase/firebase_config';
import prisma from "../common/lib/prisma_config";

export const createAndSendNotification = async (
    userId: string,
    title: string,
    body: string,
    type: string,
    link?: string
) => {
    try {
        const newNoti = await prisma.notification.create({
            data: { userId, title, body, type, link }
        })

        const tokens = await prisma.userDevices.findMany({
            where: {
                userId: userId
            },
        })

        if (tokens.length > 0) {
            const register = tokens.map(t => t.fcmToken)

            const message = {
                notification: { title, body },
                data: {
                    click_action: link || '/',
                    notiId: newNoti.id
                },
                tokens: register,
            }

            const res = await adminMessaging.sendEachForMulticast(message);
            console.log(`Successfully sent ${res.successCount} notifications`)

            if (res.failureCount > 0) {
                res.responses.forEach((res, idx) => {
                    if (!res.success) {
                        console.log(`Failed token: ${register[idx]}, error: ${res.error}`);
                        if (res.error!.code === 'messaging/invalid-registration-token' ||
                            res.error!.code === 'messaging/registration-token-not-registered') {
                            prisma.userDevices.delete({
                                where: {
                                    fcmToken: register[idx]
                                }
                            })
                        }
                    }
                })
            }
            return res;

        }

    } catch (e: any) {
        console.error(e.message);
    }
}

export const fetchNotification = async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    try {
        const notification = await prisma.notification.findMany({
            where: {
                userId: user.id
            },
            include: {
                user: true
            }
        })
        console.log("Notification fetched successfully");
        return res.status(200).json(notification);
    } catch (e: any) {
        return res.status(500).json({ message: e.message });
    }
}

export const readNotification = async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    try {
        await prisma.notification.update({
            where: {
                id: id as string
            },
            data: {
                isRead: true
            },
        });
        return res.status(200).json({ message: "Notification deleted successfully" });
    } catch (e: any) {
        return res.status(500).json({ message: e.message });
    }
}