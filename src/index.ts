import express from "express";
import cookieParser from "cookie-parser";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from './lib/swagger_config';
import { exec } from 'child_process';
import client from './lib/redis_config';


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
import webhookRouter from './webhook/omiseWebhook';
import statRouter from './routes/statRoute';
import paymentRouter from './routes/paymentRoute';
import shippingRouter from './routes/shippingRoute';

//cron
import { initOrderCron } from "./cron/orderChecker";




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
        // Check if the origin is in the allowedOrigins list
        // Allow requests with no origin (e.g. mobile apps, curl requests)
        if (!origin || allowedOrigins.includes(origin)) {
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
app.get("/me", (req, res) => {
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

if (app._router && app._router.stack) {
    console.log("--- รายชื่อ Route ที่ลงทะเบียนไว้ ---");
    app._router.stack.forEach((middleware: any) => {
        if (middleware.route) { // routes registered directly on the app
            console.log(`Route: ${Object.keys(middleware.route.methods)} ${middleware.route.path}`);
        } else if (middleware.name === 'router') { // router middleware
            middleware.handle.stack.forEach((handler: any) => {
                if (handler.route) {
                    console.log(`Router Path: ${Object.keys(handler.route.methods)} ${handler.route.path}`);
                }
            });
        }
    });
}

const isProduction = process.env.NODE_ENV === "production"

app.listen(Number(port), "0.0.0.0", async () => {
    if (!isProduction) {
        console.log('Connecting to Redis...');
        await client.connect();
    }
    console.log(`Server is running on port http://localhost:${port}`);
    // ดักไว้: จะรัน Auto Migrate เฉพาะบน Production (เช่น Render) เท่านั้น
    if (isProduction) {
        console.log('🔄 Production detected: Starting Background Migration...');
        // ใช้ทางลัดระบุ path ไปที่ prisma ใน node_modules โดยตรงเพื่อความชัวร์
        const migrate = exec('npx prisma db push', (error, stdout, stderr) => {
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