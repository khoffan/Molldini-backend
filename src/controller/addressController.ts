import { Request, Response } from "express";
import prisma from "../lib/prisma_config";
import { Address } from "../../generated/prisma/client";

export const setAddress = async (req: Request, res: Response) => {
    const data: Omit<Address, "id" | "createdAt" | "updatedAt"> = req.body;
    try {
        const newAddress = await prisma.address.create({
            data: { ...data }
        });
        return res.status(201).json(newAddress);
    } catch (e: any) {
        return res.status(500).json({ message: e.message });
    }
}

export const getAllAddress = async (req: Request, res: Response) => {
    try {
        const addresses = await prisma.address.findMany();
        return res.status(200).json(addresses);
    } catch (e: any) {
        return res.status(500).json({ message: e.message });
    }
}

export const getAddresById = async (req: Request, res: Response) => {
    const { userId, merchantId } = req.query;
    try {
        if (userId) {
            const addresses = await prisma.address.findMany({
                where: {
                    userId: userId as string
                }
            });
            return res.status(200).json(addresses);
        } else if (merchantId) {
            const addresses = await prisma.address.findUnique({
                where: {
                    merchantId: merchantId as string
                }
            })
            return res.status(200).json(addresses);
        } else {
            return res.status(400).json({ message: "Invalid request required userId or merchantId" });
        }

    } catch (e: any) {
        return res.status(500).json({ message: e.message });
    }
}