import express from "express";

//router
import productRoute from "./routes/productRoute";
import cartRoute from "./routes/cartRoute";
import userRoute from "./routes/userRoute";
import merchantRoute from "./routes/merchantRoute";

const cors = require("cors");
const dotenv = require("dotenv");
dotenv.config();


const app = express();

app.use(cors({
    origin: "*",
    allowedHeaders: "*",
    methods: "*",
    credentials: true
}));
app.use(express.json());

app.get("/", (req, res) => {
    res.send("Hello World!");
});

app.use("/api/v1", productRoute);
app.use("/api/v1", cartRoute);
app.use("/api/v1", userRoute);
app.use("/api/v1", merchantRoute);

app.listen(process.env.PORT || 3000, () => {
    console.log(`Server is running on port http://localhost:${process.env.PORT}`);
});