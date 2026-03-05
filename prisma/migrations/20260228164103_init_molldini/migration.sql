/*
  Warnings:

  - A unique constraint covering the columns `[shippingId]` on the table `Media` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[paymentId]` on the table `Media` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Media" ADD COLUMN     "paymentId" TEXT,
ADD COLUMN     "shippingId" TEXT;

-- CreateTable
CREATE TABLE "Shipping" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "estimatedDays" TEXT NOT NULL,
    "minOrderAmount" INTEGER NOT NULL DEFAULT 0,
    "freeShippingThreshold" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updateAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Shipping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updateAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentChild" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updateAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentChild_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Shipping_provider_key" ON "Shipping"("provider");

-- CreateIndex
CREATE INDEX "Shipping_id_idx" ON "Shipping"("id");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_method_key" ON "Payment"("method");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentChild_method_key" ON "PaymentChild"("method");

-- CreateIndex
CREATE UNIQUE INDEX "Media_shippingId_key" ON "Media"("shippingId");

-- CreateIndex
CREATE UNIQUE INDEX "Media_paymentId_key" ON "Media"("paymentId");

-- CreateIndex
CREATE INDEX "Media_userId_idx" ON "Media"("userId");

-- CreateIndex
CREATE INDEX "Media_merchantId_idx" ON "Media"("merchantId");

-- CreateIndex
CREATE INDEX "Media_productId_idx" ON "Media"("productId");

-- CreateIndex
CREATE INDEX "Media_variantId_idx" ON "Media"("variantId");

-- CreateIndex
CREATE INDEX "Media_shippingId_idx" ON "Media"("shippingId");

-- CreateIndex
CREATE INDEX "Media_paymentId_idx" ON "Media"("paymentId");

-- AddForeignKey
ALTER TABLE "Media" ADD CONSTRAINT "Media_shippingId_fkey" FOREIGN KEY ("shippingId") REFERENCES "Shipping"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Media" ADD CONSTRAINT "Media_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentChild" ADD CONSTRAINT "PaymentChild_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
