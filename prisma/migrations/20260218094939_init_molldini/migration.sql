/*
  Warnings:

  - You are about to drop the column `cartId` on the `OrderItems` table. All the data in the column will be lost.
  - Added the required column `cartItemId` to the `OrderItems` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "OrderItems" DROP COLUMN "cartId",
ADD COLUMN     "cartItemId" TEXT NOT NULL;
