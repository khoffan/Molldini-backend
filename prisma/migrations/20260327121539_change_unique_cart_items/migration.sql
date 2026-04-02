/*
  Warnings:

  - A unique constraint covering the columns `[productId]` on the table `CartItems` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "CartItems_cartsId_productId_key";

-- CreateIndex
CREATE UNIQUE INDEX "CartItems_productId_key" ON "CartItems"("productId");
