import { createClient } from 'redis';
import dotenv from 'dotenv';
dotenv.config();

const client = createClient({
    // อย่าลืมใส่ URL ให้ตรงกับที่ตั้งไว้ใน Docker
    url: process.env.REDIS_URL
});

client.on("error", (err) => console.log("Redis Client Error", err));
client.on("connect", () => console.log("Redis Client Connected ✅"));

export const connectRedis = async () => {
    if (!client.isOpen) {
        await client.connect();
    }
};

export default client;