import { Request, Response } from "express";
import prisma from "../lib/prisma_config";
import { Users } from "../../generated/prisma/client";
import auth from "../firebase/firebase_config";

export const syncUser = async (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;
    const idToken = authHeader?.split("Bearer ")[1];
    console.log("idToken", idToken);

    if (!idToken) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    try {
        const decodeToken = await auth.verifyIdToken(idToken);
        const { email, name, picture, uid, email_verified, phone_number, firebase } = decodeToken;

        // 2. ใช้ Upsert: ถ้าไม่มี Email นี้ให้สร้างใหม่ ถ้ามีแล้วให้อัปเดตข้อมูลล่าสุด
        const user = await prisma.users.upsert({
            where: { email: email },
            update: {
                name: name || "",
                image: picture ? {
                    upsert: {
                        create: {
                            url: picture,
                            path: `users/${uid}/profile.jpg`, // กำหนด path จำลองไว้
                            fileName: "google_profile",
                        },
                        update: {
                            url: picture,
                        }
                    }
                } : undefined,
                emailVerified: email_verified,
                lastLogin: new Date(), // อัปเดตเวลาล็อกอินล่าสุด
            },
            create: {
                id: uid, // บันทึก UID ที่ได้จาก Firebase
                email: email!,
                name: name || "New User",
                emailVerified: email_verified || false,
                phoneNumber: phone_number || null,
                provider: firebase.sign_in_provider,
                role: "USER",
                image: picture ? {
                    create: {
                        url: picture,
                        path: `users/${uid}/profile.jpg`,
                        fileName: "google_profile",
                    }
                } : undefined
            },
        });

        console.log("Users fetched successfully");

        res.cookie("idtoken", idToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 24 * 60 * 60 * 1000,
        });
        return res.status(200).json(user);
    } catch (e: any) {
        console.log("Users fetched failed");
        return res.status(500).json({ message: e.message });
    }
}

// export const addUser = async (req: Request, res: Response) => {
//     const user: Omit<Users, | "createdAt" | "updatedAt"> = req.body;
//     try {
//         const newUser = await prisma.users.create({
//             data: {
//                 id: user.id,
//                 name: user.name,
//                 email: user.email,
//                 imageUrl: user.imageUrl,
//                 emailVerified: user.emailVerified,
//                 phoneNumber: user.phoneNumber,
//                 provider: user.provider,
//                 lastLogin: user.lastLogin,
//                 role: user.role,
//             }
//         });
//         console.log("User added successfully");
//         return res.status(201).json(newUser);
//     } catch(e: any) {
//         console.log("User added failed");
//         console.log(e.message);
//         return res.status(500).json({ message: e.message });
//     }
// }

export const getAllUsers = async (req: Request, res: Response) => {
    try {
        const users = await prisma.users.findMany();
        console.log("Users fetched successfully");
        return res.status(200).json(users);
    } catch (e: any) {
        console.log("Users fetched failed");
        return res.status(500).json({ message: e.message });
    }
}

export const getUserById = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const user = await prisma.users.findUnique({
            where: {
                id: id as string
            }
        });
        console.log("User fetched successfully");
        return res.status(200).json(user);
    } catch (e: any) {
        console.log("User fetched failed");
        return res.status(500).json({ message: e.message });
    }
}

export const updateUser = async (req: Request, res: Response) => {
    const { id } = req.params;
    const user: Omit<Users, "id" | "createdAt" | "updatedAt"> = req.body;
    try {
        const updatedUser = await prisma.users.update({
            where: {
                id: id as string
            },
            data: { ...user }
        });
        console.log("User updated successfully");
        return res.status(200).json(updatedUser);
    } catch (e: any) {
        console.log("User updated failed");
        return res.status(500).json({ message: e.message });
    }
}

export const deleteUser = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const deletedUser = await prisma.users.delete({
            where: {
                id: id as string
            }
        });
        console.log("User deleted successfully");
        return res.status(200).json(deletedUser);
    } catch (e: any) {
        console.log("User deleted failed");
        return res.status(500).json({ message: e.message });
    }
}