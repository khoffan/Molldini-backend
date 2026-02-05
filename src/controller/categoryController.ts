import { Request, Response } from "express";
import prisma from "../lib/prisma_config";
import { Category } from "../../generated/prisma/client";

export const setCategory = async (req: Request, res: Response) => {
    const data: Omit<Category, "id" | "createdAt" | "updatedAt"> = req.body;
    try {
        const newCategory = await prisma.category.create({
            data: { ...data }
        });
        return res.status(201).json(newCategory);
    } catch (e: any) {
        return res.status(500).json({ message: e.message });
    }
}

export const getAllCategory = async (req: Request, res: Response) => {
    try {
        const categories = await prisma.category.findMany();
        return res.status(200).json(categories);
    } catch (e: any) {
        return res.status(500).json({ message: e.message });
    }
}

export const getCategoryById = (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const category = prisma.category.findUnique({
            where: {
                id: id as string
            }
        });
        return res.status(200).json(category);
    } catch (e: any) {
        return res.status(500).json({ message: e.message });
    }
}

export const deleteCategory = (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const deletedCategory = prisma.category.delete({
            where: {
                id: id as string
            }
        });
        return res.status(200).json(deletedCategory);
    } catch (e: any) {
        return res.status(500).json({ message: e.message });
    }
}