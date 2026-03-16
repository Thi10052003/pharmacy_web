/*
  Warnings:

  - The values [CANCELED] on the enum `PrescriptionStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `pillsPerMainUnit` on the `Medicine` table. All the data in the column will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "PrescriptionStatus_new" AS ENUM ('ACTIVE', 'CANCELLED');
ALTER TABLE "public"."Prescription" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Prescription" ALTER COLUMN "status" TYPE "PrescriptionStatus_new" USING ("status"::text::"PrescriptionStatus_new");
ALTER TYPE "PrescriptionStatus" RENAME TO "PrescriptionStatus_old";
ALTER TYPE "PrescriptionStatus_new" RENAME TO "PrescriptionStatus";
DROP TYPE "public"."PrescriptionStatus_old";
ALTER TABLE "Prescription" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';
COMMIT;

-- AlterTable
ALTER TABLE "Medicine" DROP COLUMN "pillsPerMainUnit",
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "mainUnitRatio" INTEGER,
ALTER COLUMN "baseUnitPrice" SET DEFAULT 0,
ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- DropEnum
DROP TYPE "InventoryAction";
