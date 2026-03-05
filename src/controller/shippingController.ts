import { Response } from 'express';
import { AuthenticatedRequest } from '../interface/authRequestInterface';
import prisma from '../lib/prisma_config';


interface createShippingReq {
    name: string;
    provider: string;
    description: string;
    price: number;
    estimatedDays: string;
    minOrderAmount: number;
    freeShippingThreshold: number | undefined;
    image: string
}


export const createShippingIntent = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { name, provider, description, price, estimatedDays, minOrderAmount, freeShippingThreshold, image }: createShippingReq = req.body;

        const lastShipping = await prisma.shipping.findFirst({
            orderBy: { sortOrder: 'desc' },
            select: { sortOrder: true }
        });

        const nextSortOrder = lastShipping ? lastShipping.sortOrder + 1 : 0;


        const shipping = await prisma.shipping.create({
            data: {
                name,
                provider,
                description,
                price,
                estimatedDays,
                minOrderAmount,
                freeShippingThreshold,
                image: image ? {
                    create: {
                        url: image,
                        path: image
                    }
                } : undefined,
                sortOrder: nextSortOrder
            }
        });
        return res.status(201).json(shipping);
    } catch (e: any) {
        return res.status(500).send({
            message: e.message
        });
    }
}

export const getAllShipping = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const shipping = await prisma.shipping.findMany({
            include: {
                image: true
            }
        });
        return res.status(200).json(shipping);
    } catch (e: any) {
        return res.status(500).send({
            message: e.message
        });
    }
}

export const getShippingById = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const shipping = await prisma.shipping.findUnique({
            where: {
                id: req.params.id as string
            },
            include: {
                image: true
            }
        });
        return res.status(200).json(shipping);
    } catch (e: any) {
        return res.status(500).send({
            message: e.message
        });
    }
}

export const updateShipping = async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    try {
        const { name, provider, description, price, estimatedDays, minOrderAmount, freeShippingThreshold, image }: createShippingReq = req.body;

        const shipping = await prisma.shipping.update({
            where: {
                id: id as string
            },
            data: {
                name,
                provider,
                description,
                price,
                estimatedDays,
                minOrderAmount,
                freeShippingThreshold,
                image: image ? {
                    create: {
                        url: image,
                        path: image
                    }
                } : undefined,
            },
            include: {
                image: true
            }
        });
        return res.status(200).json(shipping);
    } catch (e: any) {
        return res.status(500).send({
            message: e.message
        });
    }
}


export const deleteShipping = async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    try {
        await prisma.shipping.update({
            where: {
                id: id as string
            },
            data: {
                isActive: false,
            },
        });
        return res.status(200).json({ message: "Payment deleted successfully" });
    } catch (e: any) {
        return res.status(500).json({ message: e.message });
    }
}