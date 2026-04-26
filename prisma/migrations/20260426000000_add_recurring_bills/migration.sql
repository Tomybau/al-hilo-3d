-- CreateTable
CREATE TABLE "RecurringBill" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "amountArs" DECIMAL(12,2) NOT NULL,
    "dueDay" INTEGER NOT NULL,
    "accountId" INTEGER,
    "category" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastPaidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecurringBill_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RecurringBill_active_idx" ON "RecurringBill"("active");

-- AddForeignKey
ALTER TABLE "RecurringBill" ADD CONSTRAINT "RecurringBill_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;
