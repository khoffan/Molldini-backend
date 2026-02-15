import { Request, Response } from "express";
import prisma from "../lib/prisma_config";
import { CartItems, Carts } from "../../generated/prisma/client";
import { AuthenticatedRequest } from "../interface/authRequestInterface";
import { threadCpuUsage } from "process";

const getOrcreateCart = async (userId: string) => {
    let cart = await prisma.carts.findUnique({
        where: {
            userId: userId
        },
    });

    if (!cart) {
        cart = await prisma.carts.create({
            data: {
                userId: userId
            }
        });
    }
    return cart;
}

const checkProductIdExist = async (productId: string) => {
    const product = await prisma.productVariant.findUnique({
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

export const addToCart = async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    const { productId, quantity } = req.body;
    const requestedQuantity = Number(quantity);
    try {
        const variant = await checkProductIdExist(productId);
        if (!variant) {
            return res.status(404).json({ message: "Product variant not found" });
        }

        const cart = await getOrcreateCart(user.id);

        const existingCartItem = await prisma.cartItems.findUnique({
            where: {
                cartsId_productId: {
                    cartsId: cart.id,
                    productId: productId
                }
            }
        });

        const currentInCart = existingCartItem ? existingCartItem.quantity : 0;
        const totalNewQuantity = currentInCart + requestedQuantity;

        if (totalNewQuantity > variant.stock) {
            return res.status(400).json({
                message: `สต็อกไม่พอ (คงเหลือ ${variant.stock} ชิ้น)`,
                availableStock: variant.stock
            });
        }

        await prisma.cartItems.upsert({
            where: {
                cartsId_productId: {
                    cartsId: cart.id,
                    productId: productId
                }
            },
            update: {
                quantity: totalNewQuantity
            },
            create: {
                cartsId: cart.id,
                userId: user.id,
                productId: productId,
                quantity: requestedQuantity
            }
        });

        const getCart = await prisma.carts.findUnique({
            where: {
                userId: user.id
            },
            include: {
                items: true
            }
        })

        console.log("Cart item added successfully");

        return res.status(201).json(getCart);
    } catch (e: any) {
        console.log("Cart item added failed");
        console.log(e.message);
        return res.status(500).json({ message: e.message });
    }
}

export const getCartItems = async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    try {
        const cart = await prisma.carts.findUnique({
            where: { userId: user.id },
            include: {
                items: true
            }
        });
        console.log("Cart items fetched successfully");
        return res.status(200).json(cart || { items: [] });
    } catch (e: any) {
        console.log("Cart items fetched failed");
        return res.status(500).json({ message: e.message });
    }
}

export const getCartItemById = async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    try {
        const cart = await prisma.carts.findUnique({
            where: { id: id as string },
            include: {
                items: true
            }
        });
        console.log("Cart item fetched successfully");
        return res.status(200).json(cart);
    } catch (e: any) {
        console.log("Cart item fetched failed");
        return res.status(500).json({ message: e.message });
    }
}

export const updateIncrementCartItem = async (req: AuthenticatedRequest, res: Response) => {
    const { productId } = req.body;
    try {
        const cart = await getOrcreateCart(req.user!.id);

        const updatedCartItem = await prisma.cartItems.update({
            where: {
                cartsId_productId: {
                    cartsId: cart.id,
                    productId: productId
                }
            },
            data: {
                quantity: { increment: 1 }
            }
        });
        console.log("Cart item updated successfully");
        return res.status(200).json(updatedCartItem);
    } catch (e: any) {
        console.log("Cart item updated failed");
        return res.status(500).json({ message: e.message });
    }
}
export const updateDecrementedCartItem = async (req: AuthenticatedRequest, res: Response) => {
    const { productId } = req.body;
    try {
        const cart = await getOrcreateCart(req.user!.id);

        const cartItem = await prisma.cartItems.findUnique({
            where: {
                cartsId_productId: {
                    cartsId: cart.id,
                    productId: productId
                }
            }
        });

        if (cartItem === null) {
            return res.status(404).json({ message: "Cart item not found" });
        }

        if (cart && cartItem!.quantity > 1) {
            const updated = await prisma.cartItems.update({
                where: { id: cartItem.id },
                data: { quantity: { decrement: 1 } } // Prisma มีคำสั่ง decrement โดยตรงเช่นกัน
            });
            console.log("Cart item updated successfully");
            return res.status(200).json(updated);
        }
        return res.status(400).json({ message: "จำนวนขั้นต่ำคือ 1" });
    } catch (e: any) {
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
    } catch (e: any) {
        console.log("Cart item deleted failed");
        return res.status(500).json({ message: e.message });
    }
}

