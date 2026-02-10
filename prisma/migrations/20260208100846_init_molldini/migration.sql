/*
  Warnings:

  - Added the required column `receiverName` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `receiverPhone` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `shippingAddress` to the `Order` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Order_userId_key";

-- AlterTable
ALTER TABLE "Address" ADD COLUMN     "invoiceId" TEXT;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "receiverName" TEXT NOT NULL,
ADD COLUMN     "receiverPhone" TEXT NOT NULL,
ADD COLUMN     "shippingAddress" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "Address" ADD CONSTRAINT "Address_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
