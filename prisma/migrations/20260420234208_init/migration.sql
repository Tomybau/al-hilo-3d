-- CreateEnum
CREATE TYPE "FilamentType" AS ENUM ('PLA', 'PETG', 'ABS', 'TPU', 'OTRO');

-- CreateEnum
CREATE TYPE "FilamentMoveType" AS ENUM ('PURCHASE', 'USAGE', 'ADJUSTMENT', 'SALE');

-- CreateEnum
CREATE TYPE "SalesDayStatus" AS ENUM ('DRAFT', 'CLOSED');

-- CreateEnum
CREATE TYPE "SettlementKind" AS ENUM ('RECEIVED', 'DISCOUNT', 'DISCREPANCY');

-- CreateEnum
CREATE TYPE "AccountKind" AS ENUM ('CASH', 'BANK', 'WALLET');

-- CreateEnum
CREATE TYPE "TxDirection" AS ENUM ('INCOME', 'EXPENSE');

-- CreateEnum
CREATE TYPE "PrinterStatus" AS ENUM ('ACTIVE', 'DOWN', 'RETIRED');

-- CreateEnum
CREATE TYPE "PartMoveType" AS ENUM ('PURCHASE', 'USE', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "IssueSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Filament" (
    "id" SERIAL NOT NULL,
    "brand" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "type" "FilamentType" NOT NULL,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Filament_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FilamentBatch" (
    "id" SERIAL NOT NULL,
    "filamentId" INTEGER NOT NULL,
    "gramsTotal" INTEGER NOT NULL,
    "gramsRemaining" INTEGER NOT NULL,
    "purchasePriceArs" DECIMAL(12,2) NOT NULL,
    "purchaseDate" TIMESTAMP(3) NOT NULL,
    "supplier" TEXT,
    "notes" TEXT,
    "createdById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FilamentBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FilamentMove" (
    "id" SERIAL NOT NULL,
    "batchId" INTEGER NOT NULL,
    "type" "FilamentMoveType" NOT NULL,
    "grams" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,
    "createdById" INTEGER,

    CONSTRAINT "FilamentMove_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Toy" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT,
    "currentPriceArs" DECIMAL(12,2) NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Toy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ToyPrice" (
    "id" SERIAL NOT NULL,
    "toyId" INTEGER NOT NULL,
    "priceArs" DECIMAL(12,2) NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" INTEGER,

    CONSTRAINT "ToyPrice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesDay" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "location" TEXT,
    "notes" TEXT,
    "status" "SalesDayStatus" NOT NULL DEFAULT 'DRAFT',
    "createdById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "SalesDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SaleLine" (
    "id" SERIAL NOT NULL,
    "salesDayId" INTEGER NOT NULL,
    "toyId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPriceArs" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "SaleLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Settlement" (
    "id" SERIAL NOT NULL,
    "salesDayId" INTEGER NOT NULL,
    "accountId" INTEGER,
    "amountArs" DECIMAL(12,2) NOT NULL,
    "kind" "SettlementKind" NOT NULL,
    "note" TEXT,

    CONSTRAINT "Settlement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "AccountKind" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "direction" "TxDirection" NOT NULL,
    "amountArs" DECIMAL(12,2) NOT NULL,
    "accountId" INTEGER NOT NULL,
    "category" TEXT,
    "description" TEXT,
    "salesDayId" INTEGER,
    "createdById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Printer" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "model" TEXT,
    "purchasedAt" TIMESTAMP(3),
    "status" "PrinterStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Printer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Part" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Part_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartMove" (
    "id" SERIAL NOT NULL,
    "partId" INTEGER NOT NULL,
    "type" "PartMoveType" NOT NULL,
    "qty" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "printerId" INTEGER,
    "issueId" INTEGER,
    "note" TEXT,
    "createdById" INTEGER,

    CONSTRAINT "PartMove_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Issue" (
    "id" SERIAL NOT NULL,
    "printerId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "severity" "IssueSeverity" NOT NULL DEFAULT 'MEDIUM',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "createdById" INTEGER,

    CONSTRAINT "Issue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IssuePart" (
    "issueId" INTEGER NOT NULL,
    "partId" INTEGER NOT NULL,
    "qty" INTEGER NOT NULL,

    CONSTRAINT "IssuePart_pkey" PRIMARY KEY ("issueId","partId")
);

-- CreateTable
CREATE TABLE "_PrinterParts" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "User_name_key" ON "User"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Filament_brand_color_type_key" ON "Filament"("brand", "color", "type");

-- CreateIndex
CREATE INDEX "FilamentBatch_filamentId_idx" ON "FilamentBatch"("filamentId");

-- CreateIndex
CREATE INDEX "FilamentMove_batchId_date_idx" ON "FilamentMove"("batchId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Toy_name_key" ON "Toy"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Toy_sku_key" ON "Toy"("sku");

-- CreateIndex
CREATE INDEX "ToyPrice_toyId_effectiveFrom_idx" ON "ToyPrice"("toyId", "effectiveFrom");

-- CreateIndex
CREATE INDEX "SalesDay_date_idx" ON "SalesDay"("date");

-- CreateIndex
CREATE INDEX "SaleLine_salesDayId_idx" ON "SaleLine"("salesDayId");

-- CreateIndex
CREATE UNIQUE INDEX "SaleLine_salesDayId_toyId_key" ON "SaleLine"("salesDayId", "toyId");

-- CreateIndex
CREATE INDEX "Settlement_salesDayId_idx" ON "Settlement"("salesDayId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_name_key" ON "Account"("name");

-- CreateIndex
CREATE INDEX "Transaction_date_idx" ON "Transaction"("date");

-- CreateIndex
CREATE INDEX "Transaction_accountId_date_idx" ON "Transaction"("accountId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Printer_name_key" ON "Printer"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Part_name_sku_key" ON "Part"("name", "sku");

-- CreateIndex
CREATE INDEX "PartMove_partId_date_idx" ON "PartMove"("partId", "date");

-- CreateIndex
CREATE INDEX "Issue_printerId_startedAt_idx" ON "Issue"("printerId", "startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "_PrinterParts_AB_unique" ON "_PrinterParts"("A", "B");

-- CreateIndex
CREATE INDEX "_PrinterParts_B_index" ON "_PrinterParts"("B");

-- AddForeignKey
ALTER TABLE "FilamentBatch" ADD CONSTRAINT "FilamentBatch_filamentId_fkey" FOREIGN KEY ("filamentId") REFERENCES "Filament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FilamentBatch" ADD CONSTRAINT "FilamentBatch_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FilamentMove" ADD CONSTRAINT "FilamentMove_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "FilamentBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FilamentMove" ADD CONSTRAINT "FilamentMove_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ToyPrice" ADD CONSTRAINT "ToyPrice_toyId_fkey" FOREIGN KEY ("toyId") REFERENCES "Toy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ToyPrice" ADD CONSTRAINT "ToyPrice_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesDay" ADD CONSTRAINT "SalesDay_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleLine" ADD CONSTRAINT "SaleLine_salesDayId_fkey" FOREIGN KEY ("salesDayId") REFERENCES "SalesDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleLine" ADD CONSTRAINT "SaleLine_toyId_fkey" FOREIGN KEY ("toyId") REFERENCES "Toy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Settlement" ADD CONSTRAINT "Settlement_salesDayId_fkey" FOREIGN KEY ("salesDayId") REFERENCES "SalesDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Settlement" ADD CONSTRAINT "Settlement_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_salesDayId_fkey" FOREIGN KEY ("salesDayId") REFERENCES "SalesDay"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartMove" ADD CONSTRAINT "PartMove_partId_fkey" FOREIGN KEY ("partId") REFERENCES "Part"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartMove" ADD CONSTRAINT "PartMove_printerId_fkey" FOREIGN KEY ("printerId") REFERENCES "Printer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartMove" ADD CONSTRAINT "PartMove_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "Issue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartMove" ADD CONSTRAINT "PartMove_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Issue" ADD CONSTRAINT "Issue_printerId_fkey" FOREIGN KEY ("printerId") REFERENCES "Printer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Issue" ADD CONSTRAINT "Issue_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IssuePart" ADD CONSTRAINT "IssuePart_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "Issue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IssuePart" ADD CONSTRAINT "IssuePart_partId_fkey" FOREIGN KEY ("partId") REFERENCES "Part"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PrinterParts" ADD CONSTRAINT "_PrinterParts_A_fkey" FOREIGN KEY ("A") REFERENCES "Part"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PrinterParts" ADD CONSTRAINT "_PrinterParts_B_fkey" FOREIGN KEY ("B") REFERENCES "Printer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
