import { Request, Response } from "express";
import prisma from "../lib/prisma_config";
import { CartItems } from "../../generated/prisma/client";

const checkProductIdExist = async (productId: string) => {
    const product = await prisma.products.findUnique({
        where: {
            id: productId
        }
    });
    return product;
}

const checkUserIdExist = async (userId: string) => {
    const user = await prisma.users.findUnique({
        where: {
            id: userId
        }
    });
    return user;
}

export const addToCart = async (req: Request, res: Response) => {
    const cartItem: Omit<CartItems, "id" | "createdAt" | "updatedAt"> = req.body;
    try {
        const checkProductId = await checkProductIdExist(cartItem.productId);
        const checkUserId = await checkUserIdExist(cartItem.userId);

        if (!checkProductId) {
            console.log("Product not found");
            return res.status(404).json({ message: "Product not found" });
        }

        if (!checkUserId) {
            console.log("User not found");
            return res.status(404).json({ message: "User not found" });
        }

        const existingCartItem = await prisma.cartItems.findFirst({
            where: {
                userId: cartItem.userId,
                productId: cartItem.productId
            }
        });

        if (existingCartItem) {
            const updatedCartItem = await prisma.cartItems.update({
                where: {
                    id: existingCartItem.id
                },
                data: {
                    quantity: existingCartItem.quantity + cartItem.quantity
                }
            });
            console.log("Cart item updated successfully");
            return res.status(200).json(updatedCartItem);
        }

        const newCartItem = await prisma.cartItems.create({
            data: {...cartItem}
        });
        console.log("Cart item added successfully");
        return res.status(201).json(newCartItem);
    } catch(e: any) {
        console.log("Cart item added failed");
        console.log(e.message);
        return res.status(500).json({ message: e.message });
    }
}

export const getCartItems = async (req: Request, res: Response) => {
    try {
        const cartItems = await prisma.cartItems.findMany();
        console.log("Cart items fetched successfully");
        return res.status(200).json(cartItems);
    } catch(e: any) {
        console.log("Cart items fetched failed");
        return res.status(500).json({ message: e.message });
    }
}

export const getCartItemById = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const cartItem = await prisma.cartItems.findUnique({
            where: {
                id: id as string
            }
        });
        console.log("Cart item fetched successfully");
        return res.status(200).json(cartItem);
    } catch(e: any) {
        console.log("Cart item fetched failed");
        return res.status(500).json({ message: e.message });
    }
}

export const updateCartItem = async (req: Request, res: Response) => {
    const { id } = req.params;
    const cartItem: Omit<CartItems, "id" | "createdAt" | "updatedAt"> = req.body;
    try {
        const updatedCartItem = await prisma.cartItems.update({
            where: {
                id: id as string
            },
            data: {...cartItem}
        });
        console.log("Cart item updated successfully");
        return res.status(200).json(updatedCartItem);
    } catch(e: any) {
        console.log("Cart item updated failed");
        return res.status(500).json({ message: e.message });
    }
}

export const deleteCartItem = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const deletedCartItem = await prisma.cartItems.delete({
            where: {
                id: id as string
            }
        });
        console.log("Cart item deleted successfully");
        return res.status(200).json(deletedCartItem);
    } catch(e: any) {
        console.log("Cart item deleted failed");
        return res.status(500).json({ message: e.message });
    }
}

