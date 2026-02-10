import { Router } from 'express';
import { getAllInvoice, getInvoiceById } from '../controller/invoiceController';

const router = Router();

/**
 * @openapi
 * /api/v1/invoices:
 *   get:
 *     summary: ดึงรายการใบแจ้งหนี้ทั้งหมด
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: OK
 *       401:
 *         description: Unauthorized
 */
router.get("/invoices", getAllInvoice);

/**
 * @openapi
 * /api/v1/invoices/{id}:
 *   get:
 *     summary: ดึงข้อมูลใบแจ้งหนี้ตาม ID
 *     tags: [Invoices]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: OK
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Invoice not found
 */
router.get("/invoices/:id", getInvoiceById);

export default router;