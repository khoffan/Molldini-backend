/*
  Warnings:

  - The values [PROCESSING,SHIPPED,DELIVERED] on the enum `OrderStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `status` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `totalPrice` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `orderId` on the `OrderItems` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[subOrderId,productVariantId]` on the table `OrderItems` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `merchantId` to the `OrderItems` table without a default value. This is not possible if the table is not empty.
  - Added the required column `subOrderId` to the `OrderItems` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "SubOrderStatus" AS ENUM ('PENDING', 'PREPARING', 'SHIPPED', 'DELIVERED', 'CANCELLED');

-- AlterEnum
BEGIN;

-- 1. Create the new version of the type
CREATE TYPE "OrderStatus_new" AS ENUM ('PENDING', 'PAID', 'CANCELLED', 'COMPLETED');

-- 2. Drop the default so it doesn't block the type change
ALTER TABLE "public"."Order" ALTER COLUMN "status" DROP DEFAULT;

-- 3. Rename the old type to get it out of the way
ALTER TYPE "OrderStatus" RENAME TO "OrderStatus_old";

-- 4. Rename the new type to the preferred name
ALTER TYPE "OrderStatus_new" RENAME TO "OrderStatus";

-- 5. CRITICAL STEP: Explicitly point the column to the NEW type
-- We cast to text first, then to the new "OrderStatus" type
ALTER TABLE "public"."Order" 
  ALTER COLUMN "status" TYPE "OrderStatus" 
  USING ("status"::text::"OrderStatus");

-- 6. Now that the column no longer depends on it, we can drop the old one
DROP TYPE "public"."OrderStatus_old";

-- 7. (Optional) Re-add your default value if you had one
-- ALTER TABLE "public"."Order" ALTER COLUMN "status" SET DEFAULT 'PENDING';

COMMIT;

-- DropForeignKey
ALTER TABLE "OrderItems" DROP CONSTRAINT "OrderItems_orderId_fkey";

-- DropIndex
DROP INDEX "OrderItems_orderId_productVariantId_key";

-- AlterTable
ALTER TABLE "Order" DROP COLUMN "status",
DROP COLUMN "totalPrice";

-- AlterTable
ALTER TABLE "OrderItems" DROP COLUMN "orderId",
ADD COLUMN     "merchantId" TEXT NOT NULL,
ADD COLUMN     "subOrderId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "SubOrder" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "merchantName" TEXT,
    "shippingFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "SubOrderStatus" NOT NULL DEFAULT 'PENDING',
    "createAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updateAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubOrder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OrderItems_subOrderId_productVariantId_key" ON "OrderItems"("subOrderId", "productVariantId");

-- AddForeignKey
ALTER TABLE "SubOrder" ADD CONSTRAINT "SubOrder_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItems" ADD CONSTRAINT "OrderItems_subOrderId_fkey" FOREIGN KEY ("subOrderId") REFERENCES "SubOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
