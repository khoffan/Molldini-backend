import multer from "multer";
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

const uploadDir = "upload/csv";
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

let storage: multer.StorageEngine;

if (process.env.NODE_ENV === "development") {
    storage = multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, uploadDir);
        },
        filename: (req, file, cb) => {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            cb(null, uniqueSuffix + path.extname(file.originalname));
        },
    });
} else {
    storage = multer.memoryStorage();
}


export const upload = multer({
    storage, fileFilter: (req, file, cb) => {
        // เพิ่ม mimetype ที่เป็นไปได้ของ CSV ทั้งหมด
        const allowedTypes = [
            'text/csv',
            'application/vnd.ms-excel',
            'text/plain', // บางเครื่องมอง CSV เป็น plain text
            'application/csv'
        ];

        if (allowedTypes.includes(file.mimetype) || file.originalname.endsWith('.csv')) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only CSV is allowed!'));
        }
    }
});
