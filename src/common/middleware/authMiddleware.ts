import { Request, Response, NextFunction } from 'express';
import { auth } from '../firebase/firebase_config';
import prisma from '../lib/prisma_config';
import { Role, Users } from '../../../generated/prisma/client';
import { AuthenticatedRequest } from '../../interface/authRequestInterface';

export const checkAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    let idToken = req.cookies.idtoken;

    if (!idToken && req.headers.authorization?.startsWith('Bearer ')) {
        idToken = req.headers.authorization.split('Bearer ')[1];
    }

    if (!idToken) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    try {
        const decodedToken = await auth.verifyIdToken(idToken);

        const user = await prisma.users.findUnique({
            where: { id: decodedToken.uid },
            include: { merchant: true } // ดึงข้อมูลร้านค้าพ่วงมาด้วย (ถ้ามี)
        });

        if (!user) {
            return res.status(404).json({
                message: "User not found in database"
            })
        }

        req.user = user;

        next();
    } catch (e: any) {
        console.error(e);
        return res.status(401).json({ message: 'Invalid or expired token' });
    }
}

export const isMerchant = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (req.user && req.user.role === Role.MERCHANT) {
        try {
            const merchant = await prisma.merchant.findUnique({
                where: { ownerId: req.user.id }
            });
            if (!merchant) {
                return res.status(403).json({
                    message: "Forbidden: Merchant not found"
                })
            }
            req.merchant = merchant;
            next();
        } catch (e: any) {
            console.error(e);
            return res.status(500).json({ message: e.message });
        }
    } else {
        res.status(403).json({ message: 'Forbidden: Merchant access required' });
    }
};

export const isAdmin = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (req.user && req.user.role === Role.ADMIN) {
        try {
            const admin = await prisma.users.findUnique({
                where: { id: req.user.id }
            });
            if (!admin) {
                return res.status(403).json({
                    message: "Forbidden: Admin not found"
                })
            }
            req.admin = admin;
            next();
        } catch (e: any) {
            console.error(e);
            return res.status(500).json({ message: e.message });
        }

    } else {
        res.status(403).json({ message: 'Forbidden: Admin access required' });
    }
};