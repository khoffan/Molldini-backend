-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "shippingCost" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "netAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "totalShippingCost" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Receipt" ADD COLUMN     "shippingCost" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "SubOrder" ADD COLUMN     "shippingProvider" TEXT;
