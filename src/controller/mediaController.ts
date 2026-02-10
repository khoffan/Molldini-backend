import { Request, Response } from "express";
import prisma from "../lib/prisma_config";

export const setMedia = async (req: Request, res: Response) => {
    const { url, path, fileName, mimeType, size, productId, variantId, userId, merchantId } = req.body;
    try {
        const media = await prisma.media.create({
            data: {
                url,
                path,
                fileName,
                mimeType,
                size,
                // เชื่อม Relation ตาม ID ที่ส่งมา (ถ้ามี)
                productId: productId || null,
                variantId: variantId || null,
                userId: userId || null,
                merchantId: merchantId || null,
            },
        });

        res.status(201).json(media);
    } catch (e: any) {
        console.log("Media added failed error", e.message);
        return res.status(500).json({ message: e.message });
    }
}

export const getAllMedia = async (req: Request, res: Response) => {
    try {
        const { userId, productId, variantId, merchantId } = req.query;

        // ตรวจสอบว่ามีการส่ง ID ตัวใดตัวหนึ่งมาหรือไม่
        // ถ้าไม่มีการส่ง ID มาเลย ให้คืนค่าว่าง [] ตามที่คุณต้องการ
        if (!userId && !productId && !variantId && !merchantId) {
            return res.status(200).json([]);
        }

        const media = await prisma.media.findMany({
            where: {
                // Prisma จะสนใจเฉพาะตัวแปรที่มีค่า (ถ้าเป็น undefined จะถูกข้าม)
                userId: userId as string || undefined,
                productId: productId as string || undefined,
                variantId: variantId as string || undefined,
                merchantId: merchantId as string || undefined,
            },
            orderBy: {
                createdAt: "desc"
            }
        });
        console.log("Media fetched successfully");
        return res.status(200).json(media);
    } catch (e: any) {
        console.log("Media fetched failed");
        return res.status(500).json({ message: e.message });
    }
}