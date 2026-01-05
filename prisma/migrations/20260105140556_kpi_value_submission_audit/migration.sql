-- AlterTable
ALTER TABLE "kpi_values" ADD COLUMN     "submitted_by" TEXT;

-- CreateIndex
CREATE INDEX "kpi_values_submitted_by_idx" ON "kpi_values"("submitted_by");

-- AddForeignKey
ALTER TABLE "kpi_values" ADD CONSTRAINT "kpi_values_submitted_by_fkey" FOREIGN KEY ("submitted_by") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
