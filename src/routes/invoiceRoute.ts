import { Router } from 'express';
import { getAllInvoice, getInvoiceById } from '../controller/invoiceController';

const router = Router();

router.get("/invoices", getAllInvoice);
router.get("/invoices/:id", getInvoiceById);

export default router;