import client from '../lib/redis_config';

// ฟังก์ชันสำหรับดึงข้อมูล (Generic)
export const getCache = async <T>(key: string): Promise<T | null> => {
    try {
        const data = await client.get(key);
        if (!data) return null;
        const strData = typeof data === "string" ? data : data.toString();
        return JSON.parse(strData) as T;
    } catch (e: any) {
        console.error(`[Redis Get Error] Key: ${key}`, e.message);
        return null;
    }
};

// ฟังก์ชันสำหรับเซ็ตข้อมูล
export const setCache = async (key: string, value: any, ttl = 3600): Promise<void> => {
    try {
        const val = typeof value === 'string' ? value : JSON.stringify(value);
        await client.set(key, val, { EX: ttl });
    } catch (e: any) {
        console.error(`[Redis Set Error] Key: ${key}`, e.message);
    }
};

// ฟังก์ชันลบ Cache (รองรับทั้ง Key เดียว และ Array ของ Keys)
export const deleteCache = async (keys: string | string[]): Promise<void> => {
    try {
        const keysArray = Array.isArray(keys) ? keys : [keys];
        if (keysArray.length > 0) {
            await client.del(keysArray);
        }
    } catch (e: any) {
        console.error(`[Redis Delete Error] Keys: ${keys}`, e.message);
    }
};

// ฟังก์ชันลบ Cache ตาม Pattern (เช่น v1:prod:search:*)
export const deleteCacheByPattern = async (pattern: string): Promise<void> => {
    try {
        const keys = await client.keys(pattern);
        if (keys.length > 0) {
            await client.del(keys);
        }
    } catch (e: any) {
        console.error(`[Redis Delete Pattern Error] Pattern: ${pattern}`, e.message);
    }
};