import { Request, Response } from 'express'
import prisma from '../lib/prisma_config'
import { Invoice } from '../../generated/prisma/client'

export const getAllInvoice = async (req: Request, res: Response) => {
    try {
        const invoices = await prisma.invoice.findMany();
        return res.status(200).json(invoices);
    } catch (e: any) {
        return res.status(500).json({ message: e.message });
    }
}

export const getInvoiceById = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const invoice = await prisma.invoice.findUnique({
            where: {
                id: id as string
            }
        });
        return res.status(200).json(invoice);
    } catch (e: any) {
        return res.status(500).json({ message: e.message });
    }
}