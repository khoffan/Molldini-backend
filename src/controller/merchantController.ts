import { Request, Response } from "express";
import prisma from "../lib/prisma_config";
import { Merchant } from "../../generated/prisma/client";

export const addMerchant = async (req: Request, res: Response) => {
    const merchant: Omit<Merchant, "id" | "createdAt" | "updatedAt"> = req.body;
    try {
        const newMerchant = await prisma.merchant.create({
            data: {...merchant}
        });
        console.log("Merchant added successfully");
        return res.status(201).json(newMerchant);
    } catch(e: any) {
        console.log("Merchant added failed");
        console.log(e.message);
        return res.status(500).json({ message: e.message });
    }
}

export const getAllMerchants = async (req: Request, res: Response) => {
    try {
        const merchants = await prisma.merchant.findMany();
        console.log("Merchants fetched successfully");
        return res.status(200).json(merchants);
    } catch(e: any) {
        console.log("Merchants fetched failed");
        return res.status(500).json({ message: e.message });
    }
}

export const getMerchantById = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const merchant = await prisma.merchant.findUnique({
            where: {
                id: id as string
            }
        });
        console.log("Merchant fetched successfully");
        return res.status(200).json(merchant);
    } catch(e: any) {
        console.log("Merchant fetched failed");
        return res.status(500).json({ message: e.message });
    }
}