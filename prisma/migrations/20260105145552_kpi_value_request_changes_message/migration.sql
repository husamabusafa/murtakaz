-- AlterTable
ALTER TABLE "kpi_values" ADD COLUMN     "changes_requested_at" TIMESTAMP(3),
ADD COLUMN     "changes_requested_by" TEXT,
ADD COLUMN     "changes_requested_message" TEXT;

-- CreateIndex
CREATE INDEX "kpi_values_changes_requested_by_idx" ON "kpi_values"("changes_requested_by");

-- AddForeignKey
ALTER TABLE "kpi_values" ADD CONSTRAINT "kpi_values_changes_requested_by_fkey" FOREIGN KEY ("changes_requested_by") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
