/*
  Warnings:

  - A unique constraint covering the columns `[cartsId,productId]` on the table `CartItems` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "CartItems_cartsId_productId_key" ON "CartItems"("cartsId", "productId");
