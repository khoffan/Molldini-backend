/*
  Warnings:

  - A unique constraint covering the columns `[userId,merchantId]` on the table `Address` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[userId,productId]` on the table `CartItems` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[productId,variantId,merchantId,userId]` on the table `Media` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[userId]` on the table `Order` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[orderId,productVariantId]` on the table `OrderItems` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[userId]` on the table `PointHistory` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Address_userId_merchantId_key" ON "Address"("userId", "merchantId");

-- CreateIndex
CREATE UNIQUE INDEX "CartItems_userId_productId_key" ON "CartItems"("userId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "Media_productId_variantId_merchantId_userId_key" ON "Media"("productId", "variantId", "merchantId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_userId_key" ON "Order"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "OrderItems_orderId_productVariantId_key" ON "OrderItems"("orderId", "productVariantId");

-- CreateIndex
CREATE UNIQUE INDEX "PointHistory_userId_key" ON "PointHistory"("userId");
