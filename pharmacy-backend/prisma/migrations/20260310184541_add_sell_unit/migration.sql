-- AlterTable
ALTER TABLE "PrescriptionItem" ADD COLUMN     "conversionRatio" DOUBLE PRECISION DEFAULT 1,
ADD COLUMN     "sellUnit" TEXT;
