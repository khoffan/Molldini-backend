import { Response } from 'express'
import prisma from '../lib/prisma_config'
import { AuthenticatedRequest } from 'src/interface/authRequestInterface';

export const settingRevanueFeePercentage = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const admin = req.admin
        const { feePercentage } = req.body;
        const setting = await prisma.systemSetting.create({
            data: { feePercentage, updatedBy: admin?.id },
        });
        return res.status(201).json({ message: "Setting created successfully", data: setting });
    } catch (error) {
        console.error('Error updating system setting:', error);
        return res.status(500).json({ error: 'Failed to update system setting' });
    }
}

export const updateRevenueFeePercentage = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const admin = req.admin
        const { id } = req.params
        const { feePercentage } = req.body;
        const setting = await prisma.systemSetting.update({
            where: { id: id as string },
            data: { feePercentage, updatedBy: admin?.id },
        });
        return res.status(200).json({ message: "Setting updated successfully", data: setting });
    } catch (error) {
        console.error('Error updating system setting:', error);
        return res.status(500).json({ error: 'Failed to update system setting' });
    }
}

export const getSettingRevanue = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const setting = await prisma.systemSetting.findFirst();
        if (!setting) {
            return res.status(404).json({ error: 'System setting not found', data: null });
        }
        return res.status(200).json({ data: setting });
    } catch (error) {
        console.error('Error fetching system setting:', error);
        return res.status(500).json({ error: 'Failed to fetch system setting' });
    }
}

export const revenueLogs = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const logs = await prisma.systemRevenueLog.findMany({
            include: {
                subOrder: {
                    include: {
                        order: true
                    }
                }
            }
        });
        return res.status(200).json({ data: logs });
    } catch (error) {
        console.error('Error fetching revenue logs:', error);
        return res.status(500).json({ error: 'Failed to fetch revenue logs' });
    }
}
