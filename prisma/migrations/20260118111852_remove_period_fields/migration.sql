/*
  Warnings:

  - You are about to drop the column `period_end` on the `entity_values` table. All the data in the column will be lost.
  - You are about to drop the column `period_start` on the `entity_values` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "entity_values_entity_id_period_start_period_end_key";

-- AlterTable
ALTER TABLE "entity_values" DROP COLUMN "period_end",
DROP COLUMN "period_start";

-- CreateIndex
CREATE INDEX "entity_values_entity_id_created_at_idx" ON "entity_values"("entity_id", "created_at");
