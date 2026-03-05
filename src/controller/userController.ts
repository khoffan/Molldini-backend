import { Request, Response } from "express";
import prisma from "../lib/prisma_config";
import { Address, Role } from "../../generated/prisma/client";
import { auth } from "../firebase/firebase_config";
import { AuthenticatedRequest } from "src/interface/authRequestInterface";
import dotenv from "dotenv";
dotenv.config();


export const syncUser = async (req: Request, res: Response) => {
    console.log("syncUser");
    const authHeader = req.headers.authorization;
    const idToken = authHeader?.split("Bearer ")[1];

    const { role, fullname } = req.body;

    if (!idToken) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    try {
        const decodeToken = await auth.verifyIdToken(idToken);
        const { email, name, picture, uid, email_verified, phone_number, firebase } = decodeToken;
        console.log(decodeToken);

        let user = await prisma.users.findUnique({
            where: { email: email }, include: { image: true }
        })

        const cleanName = (name?.trim() || fullname?.trim());
        if (user) {
            user = await prisma.users.update({
                where: { email: email },
                data: {
                    emailVerified: email_verified,
                    lastLogin: new Date(), // อัปเดตเวลาล็อกอินล่าสุด
                },
                include: {
                    image: true
                }
            });
            console.log("User updated via sync");
        } else {
            user = await prisma.users.create({
                data: {
                    id: uid, // บันทึก UID ที่ได้จาก Firebase
                    email: email || "",
                    name: cleanName ? cleanName : "New User",
                    emailVerified: email_verified || false,
                    phoneNumber: phone_number || null,
                    provider: firebase.sign_in_provider,
                    role: role || Role.USER,
                    image: picture ? {
                        create: {
                            url: picture,
                            path: `users/${uid}/profile.jpg`,
                            fileName: "google_profile",
                        }
                    } : undefined
                },
                include: {
                    image: true
                }
            });
            console.log("New user created via sync");
        }
        console.log(user);
        return res.status(200).json(user);
    } catch (e: any) {
        console.log("Users fetched failed");
        return res.status(500).json({ message: e.message });
    }
}

export const signOutUser = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const { fcmToken } = req.body;
        const userId = req.user.id;

        if (fcmToken && userId) {
            await prisma.userDevices.deleteMany({
                where: {
                    userId: userId,
                    fcmToken: fcmToken
                }
            });
        }

        res.clearCookie("idtoken");
        return res.status(200).json({ message: "User signed out successfully" });
    } catch (e: any) {
        console.log("User signed out failed");
        return res.status(500).json({ message: e.message });
    }
}


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

export const getUserById = async (req: AuthenticatedRequest, res: Response) => {
    const userReq = req.user!;
    try {
        const user = await prisma.users.findUnique({
            where: {
                id: userReq.id
            },
            include: {
                image: true,
                addresses: true,
                carts: {
                    include: {
                        items: true
                    }
                },
                // merchant: {
                //     include: {
                //         address: true,
                //         logoUrl: true
                //     }
                // },
                // orders: {
                //     include: {
                //         subOrders: {
                //             include: {
                //                 orderItems: true
                //             }
                //         },
                //         invoice: true
                //     }
                // }
            }
        });
        console.log("User fetched successfully");
        return res.status(200).json(user);
    } catch (e: any) {
        console.log("User fetched failed");
        return res.status(500).json({ message: e.message });
    }
}

export const updateUser = async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.user!;
    const { displayName, emailVerify, phoneNumber } = req.body;
    try {
        const updatedUser = await prisma.users.update({
            where: {
                id: id
            },
            data: {
                name: displayName,
                emailVerified: emailVerify,
                phoneNumber: phoneNumber
            },
            include: {
                image: true,
                addresses: true,
                // merchant: {
                //     include: {
                //         address: true,
                //         logoUrl: true
                //     }
                // },
                // orders: {
                //     include: {
                //         subOrders: {
                //             include: {
                //                 orderItems: true
                //             }
                //         },
                //         invoice: true
                //     }
                // }
            }
        });
        console.log("User updated successfully");
        return res.status(200).json(updatedUser);
    } catch (e: any) {
        console.log("User updated failed");
        return res.status(500).json({ message: e.message });
    }
}

export const updateAddressUser = async (req: AuthenticatedRequest, res: Response) => {
    const user = req.user!;
    const { address }: { address: Partial<Address> } = req.body;
    console.log("address", address);
    try {
        const setAddressuser = await prisma.users.update({
            where: { id: user.id as string },
            data: {
                addresses: {
                    create: {
                        receiverName: address.receiverName ?? "",
                        phone: address.phone ?? "",
                        detail: address.detail ?? "",
                        district: address.district ?? "",
                        subDistrict: address.subDistrict ?? "",
                        province: address.province ?? "",
                        postcode: address.postcode ?? "",
                        isDefault: address.isDefault ?? false,
                    }
                }
            },
            include: {
                addresses: true
            }
        })
        return res.status(201).json(setAddressuser);
    } catch (e: any) {
        return res.status(500).json({ message: e.message });
    }
}

export const updateFCMToken = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const user = req.user!;
        const { token }: { token: string } = req.body;
        await prisma.userDevices.upsert({
            where: {
                fcmToken: token
            },
            create: {
                userId: user.id as string,
                fcmToken: token,
            },
            update: {
                fcmToken: token,
                userId: user.id as string
            }
        })
        return res.status(200).json({
            message: "update fcm token successfully"
        });
    } catch (e: any) {
        return res.status(500).json({
            message: "update fcm token failed",
            err: e.message
        });
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