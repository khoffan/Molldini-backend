import { Response } from 'express';
import { AuthenticatedRequest } from '../interface/authRequestInterface';
import prisma from '../lib/prisma_config';

interface createPaymentBody {
    label: string;
    icon: {
        url: string;
        path: string;
    } | null;
    method: string;
    children: createPaymentBody[];
}

export const createPaymentIntent = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { label, icon, method, children }: createPaymentBody = req.body;

        const existingMethod = await prisma.payment.findUnique({
            where: {
                method
            }
        })

        if (existingMethod) {
            return res.status(400).json({
                message: `Payment method '${method}' already exists.`
            });
        }

        // 1. หาค่า sortOrder ที่สูงที่สุดในปัจจุบัน
        const lastPayment = await prisma.payment.findFirst({
            orderBy: { sortOrder: 'desc' },
            select: { sortOrder: true }
        });

        // ถ้ายังไม่มีข้อมูลเลยให้เริ่มที่ 0 ถ้ามีแล้วให้ +1
        const nextSortOrder = lastPayment ? lastPayment.sortOrder + 1 : 0;

        const paymentIntent = await prisma.payment.create({
            data: {
                label,
                method,
                sortOrder: nextSortOrder, // ✨ ใส่ค่าที่คำนวณได้
                icon: icon ? {
                    create: {
                        url: icon.url,
                        path: icon.path,
                    }
                } : undefined,
                paymentChilds: (Array.isArray(children) && children.length > 0) ? {
                    create: children.map((child, index) => ({
                        label: child.label,
                        method: child.method,
                        sortOrder: index // ✨ สำหรับลูกๆ ให้เรียงตามลำดับ Array ที่ส่งมา
                    }))
                } : undefined
            },
            include: {
                icon: true,
                paymentChilds: true
            }
        });

        return res.status(201).json(paymentIntent);
    } catch (e: any) {
        console.log(e);
        return res.status(500).json({ message: e.message });
    }
}

export const getAllPayment = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const payment = await prisma.payment.findMany({
            include: {
                icon: true,
                paymentChilds: true
            }
        });
        return res.status(200).json(payment);
    } catch (e: any) {
        return res.status(500).json({ message: e.message });
    }
}

export const getPaymentById = async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    try {
        const payment = await prisma.payment.findUnique({
            where: {
                id: id as string
            },
            include: {
                icon: true,
                paymentChilds: true
            }
        });
        return res.status(200).json(payment);
    } catch (e: any) {
        return res.status(500).json({ message: e.message });
    }
}

export const updatePaymentIntent = async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    try {
        const { label, icon, method, children }: createPaymentBody = req.body
        const paymentIntent = await prisma.payment.update({
            where: {
                id: id as string
            },
            data: {
                label,
                method,
                icon: icon ? {
                    upsert: { // ใช้ upsert เผื่อกรณีเดิมไม่มีรูป
                        create: { url: icon.url, path: icon.path },
                        update: { url: icon.url, path: icon.path }
                    }
                } : undefined,

                // การ Update Relation แบบ One-to-Many (paymentChilds)
                paymentChilds: {
                    deleteMany: {}, // ลบลูกทั้งหมดทิ้งก่อน (ถ้า Business Logic คือการส่ง list ใหม่มาแทนที่ทั้งหมด)
                    createMany: {
                        data: children.map((child: any) => ({
                            label: child.label,
                            method: child.method,
                            // id: child.id // ไม่ต้องส่ง ID เพราะเราสร้างใหม่
                        }))
                    }
                }
            },
        });
        return res.status(200).json(paymentIntent);
    } catch (e: any) {
        return res.status(500).json({ message: e.message });
    }
}

export const togglePaymentStatus = async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    try {
        const { status } = req.body;
        const payment = await prisma.payment.update({
            where: {
                id: id as string
            },
            data: {
                isActive: status
            }
        });
        return res.status(200).json({
            message: "Status updated successfully",
        })
    } catch (e: any) {
        return res.status(500).json({ message: e.message });
    }
}


export const deletePayment = async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    try {
        await prisma.payment.update({
            where: {
                id: id as string
            },
            data: {
                isActive: false,
                paymentChilds: {
                    updateMany: {
                        where: { paymentId: id as string }, // หรือใส่ {} เพื่อเหมาหมด
                        data: { isActive: false }
                    }
                }
            },
        });
        return res.status(200).json({ message: "Payment deleted successfully" });
    } catch (e: any) {
        return res.status(500).json({ message: e.message });
    }
}