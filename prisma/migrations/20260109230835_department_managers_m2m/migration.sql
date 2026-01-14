/*
  Warnings:

  - The values [PMO] on the enum `KpiApprovalLevel` will be removed. If these variants are still used in the database, this will fail.
  - The values [STRATEGY,PILLAR,OBJECTIVE] on the enum `NodeTypeCode` will be removed. If these variants are still used in the database, this will fail.
  - The values [PMO,EMPLOYEE] on the enum `Role` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `manager_id` on the `departments` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "KpiSourceType" AS ENUM ('MANUAL', 'CALCULATED', 'DERIVED', 'SCORE');

-- CreateEnum
CREATE TYPE "KpiContainerType" AS ENUM ('OBJECTIVE', 'DEPARTMENT', 'NODE');

-- CreateEnum
CREATE TYPE "KpiApprovalType" AS ENUM ('AUTO', 'MANUAL');

-- Normalize deprecated enum values before altering enums
UPDATE "Organization"
SET "kpi_approval_level" = 'MANAGER'
WHERE "kpi_approval_level" = 'PMO';

UPDATE "user"
SET "role" = 'MANAGER'
WHERE "role" IN ('PMO', 'EMPLOYEE');

-- AlterEnum
BEGIN;
CREATE TYPE "KpiApprovalLevel_new" AS ENUM ('MANAGER', 'EXECUTIVE', 'ADMIN');
ALTER TABLE "public"."Organization" ALTER COLUMN "kpi_approval_level" DROP DEFAULT;
ALTER TABLE "Organization" ALTER COLUMN "kpi_approval_level" TYPE "KpiApprovalLevel_new" USING ("kpi_approval_level"::text::"KpiApprovalLevel_new");
ALTER TYPE "KpiApprovalLevel" RENAME TO "KpiApprovalLevel_old";
ALTER TYPE "KpiApprovalLevel_new" RENAME TO "KpiApprovalLevel";
DROP TYPE "public"."KpiApprovalLevel_old";
ALTER TABLE "Organization" ALTER COLUMN "kpi_approval_level" SET DEFAULT 'MANAGER';
COMMIT;

-- Normalize deprecated node types before altering NodeTypeCode enum
DO $$
DECLARE
  initiative_id TEXT;
  project_id TEXT;
  objective_id TEXT;
  strategy_id TEXT;
  pillar_id TEXT;
BEGIN
  SELECT id INTO initiative_id FROM "node_types" WHERE code = 'INITIATIVE';
  SELECT id INTO project_id FROM "node_types" WHERE code = 'PROJECT';

  -- OBJECTIVE -> INITIATIVE (merge)
  SELECT id INTO objective_id FROM "node_types" WHERE code = 'OBJECTIVE';
  IF objective_id IS NOT NULL AND initiative_id IS NOT NULL THEN
    UPDATE "nodes" SET "node_type_id" = initiative_id WHERE "node_type_id" = objective_id;

    DELETE FROM "organization_node_types"
    WHERE "node_type_id" = objective_id
      AND "org_id" IN (
        SELECT "org_id" FROM "organization_node_types" WHERE "node_type_id" = initiative_id
      );

    UPDATE "organization_node_types" SET "node_type_id" = initiative_id WHERE "node_type_id" = objective_id;
    DELETE FROM "node_types" WHERE id = objective_id;
  END IF;

  -- STRATEGY -> PROJECT (rename if no PROJECT exists, otherwise merge)
  SELECT id INTO strategy_id FROM "node_types" WHERE code = 'STRATEGY';
  IF strategy_id IS NOT NULL THEN
    IF project_id IS NULL THEN
      UPDATE "node_types" SET code = 'PROJECT' WHERE id = strategy_id;
      project_id := strategy_id;
    ELSE
      UPDATE "nodes" SET "node_type_id" = project_id WHERE "node_type_id" = strategy_id;

      DELETE FROM "organization_node_types"
      WHERE "node_type_id" = strategy_id
        AND "org_id" IN (
          SELECT "org_id" FROM "organization_node_types" WHERE "node_type_id" = project_id
        );

      UPDATE "organization_node_types" SET "node_type_id" = project_id WHERE "node_type_id" = strategy_id;
      DELETE FROM "node_types" WHERE id = strategy_id;
    END IF;
  END IF;

  -- PILLAR -> PROJECT (same logic as STRATEGY, if present)
  SELECT id INTO pillar_id FROM "node_types" WHERE code = 'PILLAR';
  IF pillar_id IS NOT NULL THEN
    IF project_id IS NULL THEN
      UPDATE "node_types" SET code = 'PROJECT' WHERE id = pillar_id;
      project_id := pillar_id;
    ELSE
      UPDATE "nodes" SET "node_type_id" = project_id WHERE "node_type_id" = pillar_id;

      DELETE FROM "organization_node_types"
      WHERE "node_type_id" = pillar_id
        AND "org_id" IN (
          SELECT "org_id" FROM "organization_node_types" WHERE "node_type_id" = project_id
        );

      UPDATE "organization_node_types" SET "node_type_id" = project_id WHERE "node_type_id" = pillar_id;
      DELETE FROM "node_types" WHERE id = pillar_id;
    END IF;
  END IF;
END $$;

-- AlterEnum
BEGIN;
CREATE TYPE "NodeTypeCode_new" AS ENUM ('INITIATIVE', 'PROJECT', 'TASK');
ALTER TABLE "node_types" ALTER COLUMN "code" TYPE "NodeTypeCode_new" USING ("code"::text::"NodeTypeCode_new");
ALTER TYPE "NodeTypeCode" RENAME TO "NodeTypeCode_old";
ALTER TYPE "NodeTypeCode_new" RENAME TO "NodeTypeCode";
DROP TYPE "public"."NodeTypeCode_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "Role_new" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'EXECUTIVE', 'MANAGER');
ALTER TABLE "user" ALTER COLUMN "role" TYPE "Role_new" USING ("role"::text::"Role_new");
ALTER TYPE "Role" RENAME TO "Role_old";
ALTER TYPE "Role_new" RENAME TO "Role";
DROP TYPE "public"."Role_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "departments" DROP CONSTRAINT "departments_manager_id_fkey";

-- DropIndex
DROP INDEX "departments_manager_id_idx";

-- CreateTable
CREATE TABLE "department_managers" (
    "department_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "department_managers_pkey" PRIMARY KEY ("department_id","user_id")
);

-- Backfill existing single manager relationship into join table
INSERT INTO "department_managers" ("department_id", "user_id")
SELECT "id", "manager_id"
FROM "departments"
WHERE "manager_id" IS NOT NULL
ON CONFLICT DO NOTHING;

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "about" TEXT,
ADD COLUMN     "about_ar" TEXT,
ADD COLUMN     "contacts" JSONB,
ADD COLUMN     "logo_url" TEXT,
ADD COLUMN     "mission" TEXT,
ADD COLUMN     "mission_ar" TEXT,
ADD COLUMN     "name_ar" TEXT,
ADD COLUMN     "vision" TEXT,
ADD COLUMN     "vision_ar" TEXT;

-- AlterTable
ALTER TABLE "departments" DROP COLUMN "manager_id",
ADD COLUMN     "name_ar" TEXT;

-- AlterTable
ALTER TABLE "kpi_values" ADD COLUMN     "achievement_value" DOUBLE PRECISION,
ADD COLUMN     "actual_value" DOUBLE PRECISION,
ADD COLUMN     "approval_type" "KpiApprovalType";

-- AlterTable
ALTER TABLE "kpi_variables" ADD COLUMN     "name_ar" TEXT;

-- AlterTable
ALTER TABLE "kpis" ADD COLUMN     "container_type" "KpiContainerType" NOT NULL DEFAULT 'NODE',
ADD COLUMN     "department_id" TEXT,
ADD COLUMN     "description_ar" TEXT,
ADD COLUMN     "name_ar" TEXT,
ADD COLUMN     "objective_id" TEXT,
ADD COLUMN     "source_type" "KpiSourceType" NOT NULL DEFAULT 'MANUAL',
ADD COLUMN     "unit_ar" TEXT,
ALTER COLUMN "primary_node_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "node_types" ADD COLUMN     "nameAr" TEXT;

-- AlterTable
ALTER TABLE "nodes" ADD COLUMN     "department_id" TEXT,
ADD COLUMN     "description_ar" TEXT,
ADD COLUMN     "name_ar" TEXT,
ADD COLUMN     "objective_id" TEXT;

-- CreateTable
CREATE TABLE "organization_settings" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "pillars_enabled" BOOLEAN NOT NULL DEFAULT false,
    "nodes_enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pillars" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "name_ar" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "pillars_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "objectives" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "name_ar" TEXT,
    "description" TEXT,
    "description_ar" TEXT,
    "owner_user_id" TEXT,
    "status" "Status" NOT NULL DEFAULT 'PLANNED',
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "objectives_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "objective_pillars" (
    "id" TEXT NOT NULL,
    "objective_id" TEXT NOT NULL,
    "pillar_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "objective_pillars_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kpi_links" (
    "id" TEXT NOT NULL,
    "derived_kpi_id" TEXT NOT NULL,
    "source_kpi_id" TEXT NOT NULL,
    "weight" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kpi_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kpi_dependencies" (
    "kpi_id" TEXT NOT NULL,
    "depends_on_kpi_id" TEXT NOT NULL,

    CONSTRAINT "kpi_dependencies_pkey" PRIMARY KEY ("kpi_id","depends_on_kpi_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organization_settings_org_id_key" ON "organization_settings"("org_id");

-- CreateIndex
CREATE INDEX "organization_settings_org_id_idx" ON "organization_settings"("org_id");

-- CreateIndex
CREATE INDEX "pillars_org_id_idx" ON "pillars"("org_id");

-- CreateIndex
CREATE UNIQUE INDEX "pillars_org_id_name_deleted_at_key" ON "pillars"("org_id", "name", "deleted_at");

-- CreateIndex
CREATE INDEX "objectives_org_id_idx" ON "objectives"("org_id");

-- CreateIndex
CREATE INDEX "objectives_owner_user_id_idx" ON "objectives"("owner_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "objectives_org_id_name_deleted_at_key" ON "objectives"("org_id", "name", "deleted_at");

-- CreateIndex
CREATE INDEX "objective_pillars_objective_id_idx" ON "objective_pillars"("objective_id");

-- CreateIndex
CREATE INDEX "objective_pillars_pillar_id_idx" ON "objective_pillars"("pillar_id");

-- CreateIndex
CREATE UNIQUE INDEX "objective_pillars_objective_id_pillar_id_key" ON "objective_pillars"("objective_id", "pillar_id");

-- CreateIndex
CREATE INDEX "department_managers_department_id_idx" ON "department_managers"("department_id");

-- CreateIndex
CREATE INDEX "department_managers_user_id_idx" ON "department_managers"("user_id");

-- CreateIndex
CREATE INDEX "kpi_links_derived_kpi_id_idx" ON "kpi_links"("derived_kpi_id");

-- CreateIndex
CREATE INDEX "kpi_links_source_kpi_id_idx" ON "kpi_links"("source_kpi_id");

-- CreateIndex
CREATE UNIQUE INDEX "kpi_links_derived_kpi_id_source_kpi_id_key" ON "kpi_links"("derived_kpi_id", "source_kpi_id");

-- CreateIndex
CREATE INDEX "kpi_dependencies_kpi_id_idx" ON "kpi_dependencies"("kpi_id");

-- CreateIndex
CREATE INDEX "kpi_dependencies_depends_on_kpi_id_idx" ON "kpi_dependencies"("depends_on_kpi_id");

-- CreateIndex
CREATE INDEX "kpis_container_type_idx" ON "kpis"("container_type");

-- CreateIndex
CREATE INDEX "kpis_objective_id_idx" ON "kpis"("objective_id");

-- CreateIndex
CREATE INDEX "kpis_department_id_idx" ON "kpis"("department_id");

-- CreateIndex
CREATE INDEX "nodes_objective_id_idx" ON "nodes"("objective_id");

-- CreateIndex
CREATE INDEX "nodes_department_id_idx" ON "nodes"("department_id");

-- AddForeignKey
ALTER TABLE "organization_settings" ADD CONSTRAINT "organization_settings_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pillars" ADD CONSTRAINT "pillars_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "objectives" ADD CONSTRAINT "objectives_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "objectives" ADD CONSTRAINT "objectives_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "objective_pillars" ADD CONSTRAINT "objective_pillars_objective_id_fkey" FOREIGN KEY ("objective_id") REFERENCES "objectives"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "objective_pillars" ADD CONSTRAINT "objective_pillars_pillar_id_fkey" FOREIGN KEY ("pillar_id") REFERENCES "pillars"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "department_managers" ADD CONSTRAINT "department_managers_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "department_managers" ADD CONSTRAINT "department_managers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nodes" ADD CONSTRAINT "nodes_objective_id_fkey" FOREIGN KEY ("objective_id") REFERENCES "objectives"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nodes" ADD CONSTRAINT "nodes_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kpis" ADD CONSTRAINT "kpis_objective_id_fkey" FOREIGN KEY ("objective_id") REFERENCES "objectives"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kpis" ADD CONSTRAINT "kpis_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kpi_links" ADD CONSTRAINT "kpi_links_derived_kpi_id_fkey" FOREIGN KEY ("derived_kpi_id") REFERENCES "kpis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kpi_links" ADD CONSTRAINT "kpi_links_source_kpi_id_fkey" FOREIGN KEY ("source_kpi_id") REFERENCES "kpis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kpi_dependencies" ADD CONSTRAINT "kpi_dependencies_kpi_id_fkey" FOREIGN KEY ("kpi_id") REFERENCES "kpis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kpi_dependencies" ADD CONSTRAINT "kpi_dependencies_depends_on_kpi_id_fkey" FOREIGN KEY ("depends_on_kpi_id") REFERENCES "kpis"("id") ON DELETE CASCADE ON UPDATE CASCADE;
