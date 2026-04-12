import { Request, Response } from "express";
import prisma from "../common/lib/prisma_config";
import { Address } from "../../generated/prisma/client";
import { AuthenticatedRequest } from "src/interface/authRequestInterface";

export const setAddressUser = async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    const { address }: { address: Partial<Address> } = req.body;
    try {
        const setAddressuser = await prisma.users.update({
            where: { id: user.id as string },
            data: {
                addresses: {
                    upsert: {
                        where: {
                            id: address.id || ""
                        },
                        update: {
                            receiverName: address.receiverName,
                            phone: address.phone,
                            detail: address.detail ?? "",
                            district: address.district ?? "",
                            subDistrict: address.subDistrict ?? "",
                            province: address.province ?? "",
                            postcode: address.postcode ?? "",
                            isDefault: address.isDefault ?? false,
                        },
                        create: {
                            receiverName: address.receiverName!,
                            phone: address.phone!,
                            detail: address.detail ?? "",
                            district: address.district ?? "",
                            subDistrict: address.subDistrict ?? "",
                            province: address.province ?? "",
                            postcode: address.postcode ?? "",
                            isDefault: address.isDefault ?? false,
                        }
                    }
                }
            },
            include: {
                addresses: true
            }
        })
        return res.status(201).json(setAddressuser);
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

export const getAllAddressByUserId = async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    try {
        const addresses = await prisma.address.findMany({
            where: {
                userId: userId as string
            }
        });
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

export const updateAddressById = async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const userId = req.user!.id;
    const { address }: { address: Partial<Address> } = req.body;
    try {
        // ใช้ Transaction เพื่อความปลอดภัยของข้อมูล
        const result = await prisma.$transaction(async (tx) => {
            // 1. ถ้าเซ็ตเป็น Default ให้ล้างตัวอื่นก่อน
            if (address.isDefault) {
                await tx.address.updateMany({
                    where: { userId: userId },
                    data: { isDefault: false }
                });
            }

            // 2. อัปเดตข้อมูลตัวที่ต้องการ (ใช้ updateMany เพื่อเช็ค userId ไปในตัว)
            const updateCount = await tx.address.updateMany({
                where: { id: id as string, userId: userId },
                data: {
                    receiverName: address.receiverName,
                    phone: address.phone,
                    detail: address.detail,
                    district: address.district,
                    subDistrict: address.subDistrict,
                    province: address.province,
                    postcode: address.postcode,
                    isDefault: address.isDefault,
                }
            });

            if (updateCount.count === 0) return null;

            // 3. ดึงข้อมูลล่าสุดกลับมาเพื่อส่งให้ Frontend
            return await tx.address.findUnique({ where: { id: id as string } });
        });

        if (!result) {
            return res.status(404).json({ message: "Address not found or unauthorized" });
        }

        return res.status(200).json({
            status: "success",
            message: "Update address success", // แก้สะกดคำว่า message
            data: result // จะได้ข้อมูลที่อยู่จริงๆ กลับไป
        });
    } catch (e: any) {
        console.log("update address error ", e.message);
        return res.status(500).json({ message: e.message });
    }
}

export const deleteAddressById = async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params
    const userId = req.user!.id
    try {
        const deleteCount = await prisma.address.deleteMany({
            where: { id: id as string, userId: userId as string },

        })
        if (deleteCount.count === 0) {
            return res.status(404).send({
                status: "error",
                message: "address not found"
            })
        }

        console.log("delete address success");
        return res.status(200).json({
            status: "success",
            massage: "delete address success",
        });
    } catch (e: any) {
        console.log("delete address error ", e.message);
        return res.status(500).json({ message: e.message });
    }
}