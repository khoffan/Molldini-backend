import express from "express";
import cookieParser from "cookie-parser";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from './lib/swagger_config';

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


const cors = require("cors");
const dotenv = require("dotenv");
dotenv.config();


const app = express();
app.use(cookieParser());

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use(cors({
    origin: "http://localhost:5173",
    allowedHeaders: ["Content-Type", "Authorization"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
}));
app.use(express.json());


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

app.use("/api/v1", productRoute);
app.use("/api/v1", cartRoute);
app.use("/api/v1", userRoute);
app.use("/api/v1", merchantRoute);
app.use("/api/v1", categoryRoute);
app.use("/api/v1", addressRouter);
app.use("/api/v1", orderRouter);
app.use("/api/v1", invoiceRouter);
app.use("/medias", mediaRouter);

app.listen(process.env.PORT || 3000, () => {
    console.log(`Server is running on port http://localhost:${process.env.PORT}`);
});