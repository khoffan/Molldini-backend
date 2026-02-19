import { Request, Response } from "express";
import prisma from "../lib/prisma_config";
import { Merchant } from "../../generated/prisma/client";
import { AuthenticatedRequest } from "src/interface/authRequestInterface";

export const addMerchant = async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    // สมมติว่า Frontend ส่ง { name, description, address: { detail, ... } }
    const { address, ...merchantData } = req.body;

    try {
        const result = await prisma.$transaction(async (tx) => {
            const newMerchant = await tx.merchant.create({
                data: {
                    ...merchantData,
                    ownerId: user.id,
                    address: {
                        create: address // ข้อมูล address ก้อน Object จาก req.body
                    }
                },
                include: { address: true, logoUrl: true }
            });

            await tx.users.update({
                where: { id: user.id },
                data: { role: "MERCHANT" }
            });

            return newMerchant;
        });

        return res.status(201).json(result);
    } catch (e: any) {
        return res.status(500).json({ message: e.message });
    }
}

export const getAllMerchants = async (req: Request, res: Response) => {
    try {
        const merchants = await prisma.merchant.findMany({
            include: {
                products: {
                    include: {
                        variants: {
                            include: {
                                images: true
                            }
                        },
                        category: true,
                        images: true
                    }
                },
                address: true,
                logoUrl: true
            }
        });
        console.log("Merchants fetched successfully");
        return res.status(200).json(merchants);
    } catch (e: any) {
        console.log("Merchants fetched failed");
        return res.status(500).json({ message: e.message });
    }
}

export const getMerchantById = async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user;
    try {
        const merchant = await prisma.merchant.findUnique({
            where: {
                ownerId: user?.id
            },
            include: {
                products: {
                    include: {
                        variants: {
                            include: {
                                images: true
                            }
                        },
                        category: true,
                        images: true
                    }
                },
                address: true,
                logoUrl: true
            }
        });
        if (!merchant) {
            return res.status(404).json({ message: "Merchant not found" });
        }
        console.log("Merchant fetched successfully");
        return res.status(200).json(merchant);
    } catch (e: any) {
        console.log("Merchant fetched failed");
        return res.status(500).json({ message: e.message });
    }
}