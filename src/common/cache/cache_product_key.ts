import { deleteCache, deleteCacheByPattern } from '../utils/redis_utils';

const PREFIX = process.env.NODE_ENV === "production" ? "v1:prod" : "v1:dev";

export const PRODUCT_KEYS = {
    ALL: `${PREFIX}:products:all`,
    DETAIL: (id: string) => `${PREFIX}:products:id:${id}`,
    MERCHANT: (mid: string) => `${PREFIX}:products:merchant:${mid}`,
    SEARCH_PATTERN: `${PREFIX}:products:search:*`,
};

// ฟังก์ชันจัดการ Invalidation เฉพาะของ Product
export const invalidateProductCache = async (productId?: string, merchantId?: string) => {
    const keys = [PRODUCT_KEYS.ALL];
    if (productId) keys.push(PRODUCT_KEYS.DETAIL(productId));
    if (merchantId) keys.push(PRODUCT_KEYS.MERCHANT(merchantId));

    await deleteCache(keys);
    await deleteCacheByPattern(PRODUCT_KEYS.SEARCH_PATTERN);
};