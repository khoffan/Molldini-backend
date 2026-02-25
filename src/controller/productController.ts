import { Request, Response } from "express";
import prisma from "../lib/prisma_config";
import csv from 'csv-parser';
import fs from 'fs';
import path from 'path';
import { Products, ProductVariant, Merchant } from "../../generated/prisma/client";
import { AuthenticatedRequest } from "../interface/authRequestInterface";

const COMMON_COLUMNS = {
    title: ['product_name', 'title', 'ชื่อสินค้า', 'item', 'name'],
    description: ['desc', 'description', 'รายละเอียด', 'detail'],
    category: ['category', 'หมวดหมู่', 'ประเภท'],
    variantName: ['variant', 'variant_name', 'ชื่อรุ่น', 'แบบ', 'option'],
    price: ['price', 'ราคา', 'unit_price', 'cost'],
    stock: ['stock', 'inventory', 'quantity', 'qty', 'จำนวน'],
    sku: ['sku', 'code', 'product_code', 'รหัสสินค้า']
};

const mapAndGroupProducts = (rawData: any[]) => {
    // ดึง Headers ทั้งหมดจากแถวแรกมาหาคู่ (Mapping Index)
    const headers = Object.keys(rawData[0]);

    // สร้างตัวช่วยจำว่าฟิลด์ไหน อยู่ที่ Column ชื่ออะไรในไฟล์นี้
    const findKey = (targetField: keyof typeof COMMON_COLUMNS) => {
        return headers.find(h => COMMON_COLUMNS[targetField].includes(h.toLowerCase().trim()));
    };

    const col = {
        title: findKey('title'),
        desc: findKey('description'),
        cat: findKey('category'),
        vName: findKey('variantName'),
        price: findKey('price'),
        stock: findKey('stock'),
        sku: findKey('sku')
    };

    return rawData.reduce((acc: any[], curr: any) => {
        const title = curr[col.title || ''];
        if (!title) return acc; // ข้ามถ้าไม่มีชื่อสินค้า

        let product = acc.find(p => p.title === title);

        const variantObj = {
            variantName: curr[col.vName || ''] || 'Default',
            price: parseFloat(curr[col.price || '']) || 0,
            stock: parseInt(curr[col.stock || '']) || 0,
            sku: curr[col.sku || ''] || null
        };

        if (product) {
            product.variants.push(variantObj);
        } else {
            acc.push({
                title: title,
                description: curr[col.desc || ''] || '',
                categoryName: curr[col.cat || ''] || 'General', // เดี๋ยวจะเอาไปหา CategoryId ต่อ
                variants: [variantObj]
            });
        }

        return acc;
    }, []);
};


const groupProducts = (rawData: any[]) => {
    return rawData.reduce((acc: any[], curr: any) => {
        // 1. หาว่าใน acc (ตัวที่สะสมไว้) มี product_name นี้หรือยัง
        const existingProduct = acc.find(p => p.product_name === curr.product_name);

        const variantData = {
            variant_name: curr.variant_name,
            sku: curr.sku,
            price: Number(curr.price), // แปลงเป็นตัวเลข
            stock: Number(curr.stock)  // แปลงเป็นตัวเลข
        };

        if (existingProduct) {
            // 2. ถ้ามีแล้ว ให้ push variant เข้าไปใน array เดิม
            existingProduct.variants.push(variantData);
        } else {
            // 3. ถ้ายังไม่มี ให้สร้าง object product ใหม่พร้อม variant ตัวแรก
            acc.push({
                product_name: curr.product_name,
                description: curr.description,
                category: curr.category,
                variants: [variantData]
            });
        }

        return acc;
    }, []);
};


export const addProductImportFIle = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const merchant = req.merchant as Merchant;
        const file = req.file;
        if (!file) {
            return res.status(400).json({ message: "No file uploaded" });
        }
        const results: any[] = [];
        const filePath = path.join(process.cwd(), req.file.path);

        // ขั้นตอนการ Read Stream และ Parse CSV
        fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (data) => results.push(data))
            .on('end', async () => {
                // ณ จุดนี้ results คือ JSON Raw Data
                // console.log('Raw Data from CSV:', results);
                const groupData = mapAndGroupProducts(results);
                const merchantId = merchant.id;
                console.log('Group Data:', groupData);

                // 1. ดึงชื่อ Category ทั้งหมดจากไฟล์ (Unique Names)
                const uniqueCategoryNames = [...new Set(groupData.map((p: any) => p.categoryName))] as string[];

                // 2. ใช้ connectOrCreate หรือจัดการสร้างก่อนเพื่อให้ได้ ID
                // วิธีที่เร็วที่สุดคือการวนลูปสร้าง (หรือหา) ทีละตัว
                const categoryMap: Record<string, string> = {};

                for (const catName of uniqueCategoryNames) {
                    const cat = await prisma.category.upsert({
                        where: { name: catName },
                        update: {}, // ถ้ามีอยู่แล้วไม่ต้องทำอะไร
                        create: { name: catName },
                    });
                    categoryMap[catName] = cat.id; // เก็บชื่อคู่กับ ID ไว้ใน Map
                }


                const importProcess = await prisma.$transaction(async (tx) => {
                    const outcomes = [];
                    for (const p of groupData) {
                        try {
                            const existing = await tx.products.findFirst({
                                where: { title: p.title, merchantId: merchantId }
                            });

                            if (existing) {
                                outcomes.push({ status: 'duplicate', title: p.title });
                                continue;
                            }

                            const product = await tx.products.create({
                                data: {
                                    title: p.title,
                                    description: p.description,
                                    merchantId: merchantId,
                                    categoryId: categoryMap[p.categoryName],
                                    images: {
                                        create: p.images?.map((img: any) => {
                                            return {
                                                url: img,
                                                isPrimary: img === p.images[0]
                                            }
                                        })
                                    },
                                    variants: {
                                        create: p.variants.map((v: any) => {
                                            return {

                                                variantName: v.variantName,
                                                price: v.price,
                                                stock: v.stock,
                                                sku: v.sku
                                            }
                                        })
                                    }
                                }
                            })
                            outcomes.push({ status: 'success', id: product.id });
                        } catch (e: any) {
                            // ตรวจสอบว่า Error คือ Unique Constraint ของ Prisma (P2002)
                            if (e.code === 'P2002') {
                                outcomes.push({ status: 'skipped', title: p.title });
                                continue; // ข้ามตัวนี้แล้วทำตัวต่อไป
                            }
                            throw e; // ถ้าเป็น error อื่นให้ rollback ทั้งหมด
                        }
                    }
                    return outcomes
                })

                // เช็คว่าถ้ามีแต่ตัวที่ซ้ำ (ไม่มีตัวไหน success เลย) ให้ส่ง 204
                const hasSuccess = importProcess.some(r => r.status === 'success');
                if (!hasSuccess) {
                    return res.status(204).end();
                }

                // ส่งกลับไปให้ Frontend ดูผลลัพธ์ หรือส่งต่อไปยัง Stage Mapping
                res.status(200).json({
                    message: 'File uploaded and parsed successfully',
                    fileName: req.file?.filename,
                    rowCount: results.length,
                    dataImport: importProcess
                });
            })
            .on('error', (error) => {
                res.status(500).json({ message: 'Error parsing CSV', error });
            });
    } catch (e: any) {
        console.log("File uploaded failed");
        console.log(e.message);
        return res.status(500).json({ message: e.message });
    }
}

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