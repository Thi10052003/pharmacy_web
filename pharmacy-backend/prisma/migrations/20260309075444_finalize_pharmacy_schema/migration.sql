/*
  Warnings:

  - You are about to drop the column `referenceId` on the `InventoryHistory` table. All the data in the column will be lost.
  - You are about to alter the column `quantity` on the `InventoryHistory` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,2)` to `DoublePrecision`.
  - You are about to alter the column `stockAfter` on the `InventoryHistory` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,2)` to `DoublePrecision`.
  - You are about to drop the column `isActive` on the `Medicine` table. All the data in the column will be lost.
  - You are about to drop the column `price` on the `Medicine` table. All the data in the column will be lost.
  - You are about to drop the column `unit` on the `Medicine` table. All the data in the column will be lost.
  - You are about to alter the column `currentStock` on the `Medicine` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,2)` to `DoublePrecision`.
  - You are about to drop the column `note` on the `PrescriptionItem` table. All the data in the column will be lost.
  - You are about to drop the column `unitSnapshot` on the `PrescriptionItem` table. All the data in the column will be lost.
  - You are about to alter the column `quantity` on the `PrescriptionItem` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,2)` to `DoublePrecision`.
  - You are about to alter the column `priceSnapshot` on the `PrescriptionItem` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,2)` to `DoublePrecision`.
  - Changed the type of `action` on the `InventoryHistory` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `baseUnitPrice` to the `Medicine` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Medicine` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "InventoryHistory" DROP COLUMN "referenceId",
DROP COLUMN "action",
ADD COLUMN     "action" TEXT NOT NULL,
ALTER COLUMN "quantity" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "stockAfter" SET DATA TYPE DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Medicine" DROP COLUMN "isActive",
DROP COLUMN "price",
DROP COLUMN "unit",
ADD COLUMN     "baseUnitName" TEXT NOT NULL DEFAULT 'Viên',
ADD COLUMN     "baseUnitPrice" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "mainUnitName" TEXT,
ADD COLUMN     "mainUnitPrice" DOUBLE PRECISION,
ADD COLUMN     "pillsPerMainUnit" INTEGER,
ADD COLUMN     "pillsPerSubUnit" INTEGER,
ADD COLUMN     "subUnitName" TEXT,
ADD COLUMN     "subUnitPrice" DOUBLE PRECISION,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "currentStock" SET DATA TYPE DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "PrescriptionItem" DROP COLUMN "note",
DROP COLUMN "unitSnapshot",
ALTER COLUMN "quantity" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "priceSnapshot" SET DATA TYPE DOUBLE PRECISION;
