import express, { Response, Request, NextFunction } from "express";
import cookieParser from "cookie-parser";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from './common/lib/swagger_config';
import { exec } from 'child_process';
import client from './common/lib/redis_config';


//router
import productRoute from "./routes/productRoute";
import cartRoute from "./routes/cartRoute";
import userRoute from "./routes/userRoute";
import merchantRoute from "./routes/merchantRoute";
import categoryRoute from "./routes/categoryRoute";
import addressRouter from "./routes/addressRoute";
import orderRouter from './routes/orderRoute';
import invoiceRouter from './routes/invoiceRoute';
import mediaRouter from './routes/mediaRoute';
import notiRoute from './routes/notiRoute';
import webhookRouter from './common/webhook/omiseWebhook';
import statRouter from './routes/statRoute';
import paymentRouter from './routes/paymentRoute';
import shippingRouter from './routes/shippingRoute';
import systemRouter from './routes/systemRoute';

//cron
import { initOrderCron } from "./common/cron/orderChecker";
import multer from "multer";




const cors = require("cors");
const dotenv = require("dotenv");
dotenv.config();
const port = process.env.PORT || 10000

const app = express();
app.use(express.json());
app.use(cookieParser());

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

const allowedOrigins = [
    process.env.FRONTEND_URL,
    process.env.BACKOFFICE_URL
]

app.use(cors({
    origin: function (origin, callback) {
        const isLocal = process.env.NODE_ENV === 'local' || process.env.NODE_ENV === 'dev';
        // Check if the origin is in the allowedOrigins list
        // Allow requests with no origin (e.g. mobile apps, curl requests)
        if (!origin || allowedOrigins.includes(origin) || isLocal) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    allowedHeaders: ["Content-Type", "Authorization"],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    credentials: true,
}));

initOrderCron();


// ตัวอย่างการเขียน Annotation ใน index.ts
/**
 * @openapi
 * /:
 * get:
 * description: Welcome to the API
 * responses:
 * 200:
 * description: Returns a mysterious greeting.
 */
app.get("/", (req, res) => {
    res.send("Hello World!");
});

app.post("/debug-sync", (req, res) => {
    console.log("!!! DEBUG LOG IS WORKING !!!");
    console.log("Body received:", req.body);
    res.json({ message: "Log should appear now" });
});

app.use("/api/v1", productRoute);
app.use("/api/v1", cartRoute);
app.use("/api/v1", userRoute);
app.use("/api/v1", merchantRoute);
app.use("/api/v1", categoryRoute);
app.use("/api/v1", addressRouter);
app.use("/api/v1", orderRouter);
app.use("/api/v1", invoiceRouter);
app.use("/api/v1", notiRoute)
app.use("/medias", mediaRouter);
app.use("/api/v1", webhookRouter);
app.use("/api/v1", statRouter);
app.use("/api/v1", paymentRouter);
app.use("/api/v1", shippingRouter);
app.use("/api/v1", systemRouter)

// ต้องมั่นใจว่าวางไว้หลัง Route ทั้งหมด
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    // 1. บังคับใส่ CORS Header ในทุก Error Response
    const origin = req.headers.origin;
    if (allowedOrigins.includes(origin!)) {
        res.header("Access-Control-Allow-Origin", origin);
        res.header("Access-Control-Allow-Credentials", "true");
    }

    // 2. จัดการ Error ของ Multer โดยเฉพาะ
    if (err instanceof multer.MulterError) {
        return res.status(400).json({
            message: `Multer Error: ${err.message}`,
            code: err.code
        });
    }

    // 3. จัดการ Error อื่นๆ (รวมถึงที่ throw มาจาก checkAuth/isMerchant)
    console.error("Global Error:", err);
    res.status(err.status || 500).json({
        message: err.message || "Internal Server Error"
    });
});

const isProduction = process.env.NODE_ENV === "production"

app.listen(Number(port), "0.0.0.0", async () => {
    if (!isProduction) {
        console.log(`Server is running on port http://localhost:${port}`);
    }
    console.log('Connecting to Redis...');
    // connection redis
    await client.connect();
    // ดักไว้: จะรัน Auto Migrate เฉพาะบน Production (เช่น Render) เท่านั้น
    if (isProduction) {
        console.log('🔄 Production detected: Starting Background Migration...');
        // ใช้ทางลัดระบุ path ไปที่ prisma ใน node_modules โดยตรงเพื่อความชัวร์
        const migrate = exec('npx prisma migrate deploy', (error, stdout, stderr) => {
            if (error) {
                console.error(`❌ db push Error: ${error.message}`);
                return;
            }
            if (stderr) {
                console.log(`⚠️ de push Stderr: ${stderr}`);
            }
            console.log(`✅ de push Success Output: \n${stdout}`);
        });

        // เพิ่มการดักจับ Stream แบบ Real-time (จะได้เห็น Log ทันทีไม่ต้องรอจบ)
        migrate.stdout?.on('data', (data) => {
            console.log(`[Prisma]: ${data}`);
        });
    } else {
        console.log('ℹ️ Local detected: Skipping Auto-Migration (Please run it manually if needed)');
    }
});