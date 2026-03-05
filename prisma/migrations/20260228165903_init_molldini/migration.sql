/*
  Warnings:

  - A unique constraint covering the columns `[paymentId]` on the table `PaymentChild` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "PaymentChild_paymentId_key" ON "PaymentChild"("paymentId");
