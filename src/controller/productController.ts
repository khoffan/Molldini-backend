import { Request, Response } from "express";
import prisma from "../lib/prisma_config";
import { Products, ProductVariant, Merchant } from "../../generated/prisma/client";
import { AuthenticatedRequest } from "../interface/authRequestInterface";
import { database } from "firebase-admin";


export const addProduct = async (req: AuthenticatedRequest, res: Response) => {
    const merchant = req.merchant as Merchant;
    const { title, description, categoryId, variants, images } = req.body;
    // const variantData: Omit<ProductVariant, "id" | "createdAt" | "updatedAt">[] = variants;
    try {
        const newProduct = await prisma.products.create({
            data: {
                title,
                description,
                merchantId: merchant.id,
                categoryId,
                images: {
                    create: images?.map((img: any) => {
                        return {
                            url: img.url,
                            path: img.path,
                            fileName: img.fileName || "main-image",
                            mimeType: img.mimeType || "image/jpeg",
                            size: img.size ? Number(img.size) : null
                        }
                    }),
                },
                variants: {
                    create: variants.map((v: any) => ({
                        variantName: v.variantName,
                        price: Number(v.price),
                        stock: Number(v.stock),
                        sku: v.sku,
                        images: {
                            create: v.images?.map((img: any) => ({
                                url: img.url,
                                path: img.path,
                                fileName: img.fileName || "variant-image",
                                mimeType: img.mimeType || "image/jpeg",
                                size: img.size ? Number(img.size) : null
                                // Prisma จะใส่ variantId ให้เองอัตโนมัติ
                            }))
                        },
                    }))
                }
            },
            include: {
                images: true,
                variants: {
                    include: {
                        images: true
                    }
                }
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
                images: true,
                variants: {
                    include: {
                        images: true
                    }
                }
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
                images: true,
                variants: {
                    include: {
                        images: true
                    }
                },
                category: true,
                merchant: {
                    include: {
                        address: true,
                        logoUrl: true
                    }
                }
            },
            orderBy: {
                createdAt: "desc"
            }
        });
        console.log("Products fetched successfully");
        return res.status(200).json(products);
    } catch (e: any) {
        console.log("Products fetched failed error", e.message);
        return res.status(500).json({ message: e.message });
    }
}

export const searchingProducts = async (req: Request, res: Response) => {
    const { search } = req.query;
    try {
        const products = await prisma.products.findMany(
            {
                where: {
                    title: {
                        contains: search as string,
                        mode: "insensitive"
                    },
                },
                include: {
                    images: true,
                    variants: {
                        include: {
                            images: true
                        },
                    },
                    merchant: {
                        select: {
                            name: true,
                            logoUrl: true
                        }
                    }
                }
            }
        );
        console.log("Products fetched successfully");
        return res.status(200).json(products);
    } catch (e: any) {
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

export const updateProductById = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { title, description, categoryId, variants, images } = req.body;

        const variantToUpdate = variants.filter((v: any) => v.id);
        console.log("🚀 ~ updateProductById ~ variantToUpdate:", variantToUpdate)
        const variantToCreate = variants.filter((v: any) => !v.id);
        console.log("🚀 ~ updateProductById ~ variantToCreate:", variantToCreate)

        const existingVariants = variantToUpdate.map((v: any) => v.id)
        const result = await prisma.products.update({
            where: {
                id: id as string
            },
            data: {
                title,
                description,
                categoryId,
                variants: {
                    deleteMany: {
                        id: { notIn: existingVariants }
                    },
                    update: variantToUpdate.map((v: any) => ({
                        where: {
                            id: v.id as string
                        },
                        data: {
                            variantName: v.variantName,
                            price: Number(v.price),
                            stock: Number(v.stock),
                            sku: v.sku,
                            // จัดการรูปภาพของแต่ละ Variant
                            images: {
                                deleteMany: {},
                                create: v.images?.map((img: any) => ({
                                    url: img.url,
                                    path: img.path,
                                    fileName: img.fileName || "variant-image",
                                    mimeType: img.mimeType || "image/jpeg",
                                    size: img.size ? Number(img.size) : null
                                }))
                            }
                        }
                    })),
                    create: variantToCreate.map((v: any) => ({
                        variantName: v.variantName,
                        price: Number(v.price),
                        stock: Number(v.stock),
                        sku: v.sku,
                        images: {
                            create: v.images?.map((img: any) => ({
                                url: img.url,
                                path: img.path,
                                fileName: img.fileName || "variant-image",
                                mimeType: img.mimeType || "image/jpeg",
                                size: img.size ? Number(img.size) : null
                            }))
                        }
                    })),
                },
                images: {
                    deleteMany: {},
                    create: images?.map((img: any) => {
                        return {
                            url: img.url,
                            path: img.path,
                            fileName: img.fileName || "main-image",
                            mimeType: img.mimeType || "image/jpeg",
                            size: img.size ? Number(img.size) : null
                        }
                    }),
                },
            },
            include: {
                images: true,
                variants: {
                    include: {
                        images: true
                    }
                }
            }
        });

        console.log("Product updated successfully");
        return res.status(200).json({
            massage: "Product updated successfully",
            data: result
        });
    } catch (e: any) {
        console.log("Product updated failed", e);
        return res.status(500).json({ message: e.message });
    }
}