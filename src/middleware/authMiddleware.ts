import { Request, Response, NextFunction } from 'express';
import auth from '../firebase/firebase_config';
import prisma from '../lib/prisma_config';
import { Role, Users } from '../../generated/prisma/client';

interface AuthRequest extends Request {
    user?: Users;
}


export const checkAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    const idToken = authHeader.split('Bearer ')[1];

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

export const isMerchant = (req: AuthRequest, res: Response, next: NextFunction) => {
    if (req.user && req.user.role === Role.MERCHANT) {
        next();
    } else {
        res.status(403).json({ message: 'Forbidden: Merchant access required' });
    }
};