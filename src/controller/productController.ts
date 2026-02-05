import { Request, Response } from "express";
import prisma from "../lib/prisma_config";
import { Products, ProductVariant, Merchant } from "../../generated/prisma/client";
import { AuthenticatedRequest } from "../interface/authRequestInterface";


export const addProduct = async (req: AuthenticatedRequest, res: Response) => {
    const merchant = req.merchant as Merchant;
    const { title, description, categoryId, variants } = req.body;
    // const variantData: Omit<ProductVariant, "id" | "createdAt" | "updatedAt">[] = variants;
    try {
        const newProduct = await prisma.products.create({
            data: {
                title,
                description,
                merchantId: merchant.id,
                categoryId,
                variants: {
                    create: variants.map((v: any) => ({
                        variantName: v.variantName,
                        price: Number(v.price),
                        stock: Number(v.stock),
                        image: v.image,
                        sku: v.sku
                    }))
                }
            },
            include: {
                variants: true
            }
        });
        console.log("Product added successfully");
        return res.status(201).json(newProduct);
    } catch (e: any) {
        console.log("Product added failed");
        console.log(e.message);
        return res.status(500).json({ message: e.message });
    }
}

export const getMerchantProducts = async (req: AuthenticatedRequest, res: Response) => {
    const merchant = req.merchant as Merchant;
    try {
        const products = await prisma.products.findMany({
            where: {
                merchantId: merchant.id
            },
            include: {
                variants: true
            }
        });
        console.log("Products fetched successfully");
        return res.status(200).json(products);
    } catch (e: any) {
        console.log("Products fetched failed");
        return res.status(500).json({ message: e.message });
    }
}

export const getAllProducts = async (req: Request, res: Response) => {
    try {
        const products = await prisma.products.findMany({
            include: {
                variants: true
            }
        });
        console.log("Products fetched successfully");
        return res.status(200).json(products);
    } catch (e: any) {
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
            },
            include: {
                variants: true
            }
        });
        console.log("Product fetched successfully");
        return res.status(200).json(product);
    } catch (e: any) {
        console.log("Product fetched failed");
        return res.status(500).json({ message: e.message });
    }
}