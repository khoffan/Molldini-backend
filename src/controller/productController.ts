import { Request, Response } from "express";
import prisma from "../lib/prisma_config";
import csv from 'csv-parser';
import fs from 'fs';
import path from 'path';
import { Products, ProductVariant, Merchant } from "../../generated/prisma/client";
import { AuthenticatedRequest } from "../interface/authRequestInterface";
import { getCache, setCache } from "../utils/redis_utils";
import { PRODUCT_KEYS, invalidateProductCache } from "../cache/cache_product_key";
import { Readable } from "stream";

const COMMON_COLUMNS = {
    title: ['product_name', 'title', 'ชื่อสินค้า', 'item', 'name'],
    description: ['desc', 'description', 'รายละเอียด', 'detail'],
    category: ['category', 'หมวดหมู่', 'ประเภท'],
    variantName: ['variant', 'variant_name', 'ชื่อรุ่น', 'แบบ', 'option'],
    price: ['price', 'ราคา', 'unit_price', 'cost'],
    stock: ['stock', 'inventory', 'quantity', 'qty', 'จำนวน'],
    sku: ['sku', 'code', 'product_code', 'รหัสสินค้า'],
    pImage: ['product_images', 'product_image', 'image', 'รูปภาพ'],
    vImage: ['variant_images', 'variant_image', 'image', 'รูปภาพ'],
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
        image: findKey('pImage'),
        vName: findKey('variantName'),
        price: findKey('price'),
        stock: findKey('stock'),
        sku: findKey('sku'),
        vImage: findKey('vImage')
    };

    return rawData.reduce((acc: any[], curr: any) => {
        const title = curr[col.title || ''];
        if (!title) return acc; // ข้ามถ้าไม่มีชื่อสินค้า

        let product = acc.find(p => p.title === title);

        let pImage = [];
        if (curr[col.image || '']) {
            pImage.push(curr[col.image || '']);
        }

        let vImage = [];
        if (curr[col.vImage || '']) {
            vImage.push(curr[col.vImage || '']);
        }

        const variantObj = {
            variantName: curr[col.vName || ''] || 'Default',
            price: parseFloat(curr[col.price || '']) || 0,
            stock: parseInt(curr[col.stock || '']) || 0,
            sku: curr[col.sku || ''] || null,
            images: vImage || null
        };

        if (product) {
            product.variants.push(variantObj);
        } else {
            acc.push({
                title: title,
                description: curr[col.desc || ''] || '',
                categoryName: curr[col.cat || ''] || 'General', // เดี๋ยวจะเอาไปหา CategoryId ต่อ
                variants: [variantObj],
                images: pImage || null
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
        console.log("file", file)
        const results: any[] = [];
        // ขั้นตอนการ Read Stream และ Parse CSV
        let stream: Readable;

        if (file.buffer) {
            stream = Readable.from(file.buffer)
        } else {
            const filePath = path.join(process.cwd(), file.path);
            if (!fs.existsSync(filePath)) {
                return res.status(404).json({ message: "File not found on disk" });
            }
            stream = fs.createReadStream(filePath);
        }

        stream
            .pipe(csv())
            .on('data', (data) => results.push(data))
            .on('end', async () => {
                // ณ จุดนี้ results คือ JSON Raw Data
                // console.log('Raw Data from CSV:', results);
                const groupData = mapAndGroupProducts(results);
                const merchantId = merchant.id;


                // 1. ดึงชื่อ Category ทั้งหมดจากไฟล์ (Unique Names)
                const uniqueCategoryNames = [...new Set(groupData.map((p: any) => p.categoryName))] as string[];

                // return res.status(200).json({
                //     message: "Group Data", data: {
                //         groupData,
                //         uniqueCategoryNames
                //     }
                // });
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
                                }
                            })

                            // 3. สร้างรูปภาพของ Product (ถ้ามี)
                            if (p.images && p.images.length > 0) {
                                const productImages = p.images.filter((img: string) => img).map((img: string) => ({
                                    url: img,
                                    path: img,
                                    productId: product.id // เชื่อม ID ตรงๆ
                                }));
                                if (productImages.length > 0) {
                                    await tx.media.createMany({ data: productImages });
                                }
                            }

                            // 4. วนลูปสร้าง Variants ทีละตัวเพื่อคุม Error
                            for (const v of p.variants) {
                                const variant = await tx.productVariant.create({
                                    data: {
                                        variantName: v.variantName,
                                        price: parseFloat(v.price) || 0,
                                        stock: parseInt(v.stock) || 0,
                                        sku: v.sku,
                                        productId: product.id
                                    }
                                });

                                // 5. สร้างรูปภาพของ Variant (จุดที่เคยพัง)
                                if (v.images && v.images.length > 0) {
                                    const variantImages = v.images.filter((img: string) => img).map((img: string) => ({
                                        url: img,
                                        path: img,
                                        variantId: variant.id // ใช้ ID จากตัวที่เพิ่งสร้างสดๆ
                                    }));
                                    if (variantImages.length > 0) {
                                        await tx.media.createMany({ data: variantImages });
                                    }
                                }
                            }

                            outcomes.push({ status: 'success', id: product.id, title: p.title });
                        } catch (e: any) {
                            // ตรวจสอบว่า Error คือ Unique Constraint ของ Prisma (P2002)
                            if (e.code === 'P2002') {
                                outcomes.push({ status: 'error', title: p.title, message: `SKU ซ้ำในระบบ: ${e.meta?.target}` });
                                continue;
                            }
                            throw e; // ถ้าเป็น error อื่นให้ rollback ทั้งหมด
                        }
                    }
                    return outcomes
                }, {
                    timeout: 600000 // เพิ่มระยะเวลา timeout จาก 5 วินาที เป็น 10 นาที เพือรองรับการสร้างข้อมูลจำนวนมาก
                })
                console.log("transaction success")

                await invalidateProductCache()

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
        console.error("Upload failed:", e.message);
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
        const cached = await getCache(PRODUCT_KEYS.MERCHANT(merchant.id));
        if (cached) return res.status(200).json(cached);

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
        await setCache(PRODUCT_KEYS.MERCHANT(merchant.id), products, 600);
        console.log("Products fetched successfully");
        return res.status(200).json(products);
    } catch (e: any) {
        console.log("Products fetched failed");
        return res.status(500).json({ message: e.message });
    }
}

export const getAllProducts = async (req: Request, res: Response) => {
    try {
        const cached = await getCache(PRODUCT_KEYS.ALL);
        if (cached) return res.status(200).json(cached);

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
        await setCache(PRODUCT_KEYS.ALL, products, 600);
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

        const variantToCreate = variants.filter((v: any) => !v.id);


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

        await invalidateProductCache(id as string);

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