import { Request, Response} from "express";
import prisma from "../lib/prisma_config";
import { Products } from "../../generated/prisma/client";


export const addProduct = async (req: Request, res: Response) => {
    const product: Omit<Products, "id" | "createdAt" | "updatedAt"> = req.body;
    try {
        const newProduct = await prisma.products.create({
            data: {...product}
        });
        console.log("Product added successfully");
        return res.status(201).json(newProduct);
    } catch(e: any) {
        console.log("Product added failed");
        console.log(e.message);
        return res.status(500).json({ message: e.message });
    }
}

export const getAllProducts = async (req: Request, res: Response) => {
    try {
        const products = await prisma.products.findMany();
        console.log("Products fetched successfully");
        return res.status(200).json(products);
    } catch(e: any) {
        console.log("Products fetched failed");
        return res.status(500).json({ message: e.message });
    }
}

export const getProductById = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const product = await prisma.products.findUnique({
            where: {
                id: id as string
            }
        });
        console.log("Product fetched successfully");
        return res.status(200).json(product);
    } catch(e: any) {
        console.log("Product fetched failed");
        return res.status(500).json({ message: e.message });
    }
}