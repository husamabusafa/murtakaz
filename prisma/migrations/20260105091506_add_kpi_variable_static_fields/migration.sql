-- AlterTable
ALTER TABLE "kpi_variables" ADD COLUMN     "is_static" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "static_value" DOUBLE PRECISION;
