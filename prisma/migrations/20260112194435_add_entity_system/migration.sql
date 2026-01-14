/*
  Warnings:

  - You are about to drop the column `department_id` on the `user` table. All the data in the column will be lost.
  - You are about to drop the `department_managers` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `departments` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `kpi_dependencies` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `kpi_links` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `kpi_values` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `kpi_variable_values` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `kpi_variables` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `kpis` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `node_assignments` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `node_dependencies` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `node_types` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `nodes` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `objective_pillars` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `objectives` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `organization_node_types` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `organization_settings` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `pillars` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `responsibility_kpi_assignments` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `responsibility_node_assignments` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "department_managers" DROP CONSTRAINT "department_managers_department_id_fkey";

-- DropForeignKey
ALTER TABLE "department_managers" DROP CONSTRAINT "department_managers_user_id_fkey";

-- DropForeignKey
ALTER TABLE "departments" DROP CONSTRAINT "departments_org_id_fkey";

-- DropForeignKey
ALTER TABLE "departments" DROP CONSTRAINT "departments_parent_id_fkey";

-- DropForeignKey
ALTER TABLE "kpi_dependencies" DROP CONSTRAINT "kpi_dependencies_depends_on_kpi_id_fkey";

-- DropForeignKey
ALTER TABLE "kpi_dependencies" DROP CONSTRAINT "kpi_dependencies_kpi_id_fkey";

-- DropForeignKey
ALTER TABLE "kpi_links" DROP CONSTRAINT "kpi_links_derived_kpi_id_fkey";

-- DropForeignKey
ALTER TABLE "kpi_links" DROP CONSTRAINT "kpi_links_source_kpi_id_fkey";

-- DropForeignKey
ALTER TABLE "kpi_values" DROP CONSTRAINT "kpi_values_approved_by_fkey";

-- DropForeignKey
ALTER TABLE "kpi_values" DROP CONSTRAINT "kpi_values_changes_requested_by_fkey";

-- DropForeignKey
ALTER TABLE "kpi_values" DROP CONSTRAINT "kpi_values_entered_by_fkey";

-- DropForeignKey
ALTER TABLE "kpi_values" DROP CONSTRAINT "kpi_values_kpi_id_fkey";

-- DropForeignKey
ALTER TABLE "kpi_values" DROP CONSTRAINT "kpi_values_submitted_by_fkey";

-- DropForeignKey
ALTER TABLE "kpi_variable_values" DROP CONSTRAINT "kpi_variable_values_kpi_value_id_fkey";

-- DropForeignKey
ALTER TABLE "kpi_variable_values" DROP CONSTRAINT "kpi_variable_values_kpi_variable_id_fkey";

-- DropForeignKey
ALTER TABLE "kpi_variables" DROP CONSTRAINT "kpi_variables_kpi_id_fkey";

-- DropForeignKey
ALTER TABLE "kpis" DROP CONSTRAINT "kpis_department_id_fkey";

-- DropForeignKey
ALTER TABLE "kpis" DROP CONSTRAINT "kpis_objective_id_fkey";

-- DropForeignKey
ALTER TABLE "kpis" DROP CONSTRAINT "kpis_org_id_fkey";

-- DropForeignKey
ALTER TABLE "kpis" DROP CONSTRAINT "kpis_owner_user_id_fkey";

-- DropForeignKey
ALTER TABLE "kpis" DROP CONSTRAINT "kpis_primary_node_id_fkey";

-- DropForeignKey
ALTER TABLE "node_assignments" DROP CONSTRAINT "node_assignments_node_id_fkey";

-- DropForeignKey
ALTER TABLE "node_assignments" DROP CONSTRAINT "node_assignments_user_id_fkey";

-- DropForeignKey
ALTER TABLE "node_dependencies" DROP CONSTRAINT "node_dependencies_blocked_node_id_fkey";

-- DropForeignKey
ALTER TABLE "node_dependencies" DROP CONSTRAINT "node_dependencies_depends_on_node_id_fkey";

-- DropForeignKey
ALTER TABLE "nodes" DROP CONSTRAINT "nodes_department_id_fkey";

-- DropForeignKey
ALTER TABLE "nodes" DROP CONSTRAINT "nodes_node_type_id_fkey";

-- DropForeignKey
ALTER TABLE "nodes" DROP CONSTRAINT "nodes_objective_id_fkey";

-- DropForeignKey
ALTER TABLE "nodes" DROP CONSTRAINT "nodes_org_id_fkey";

-- DropForeignKey
ALTER TABLE "nodes" DROP CONSTRAINT "nodes_owner_user_id_fkey";

-- DropForeignKey
ALTER TABLE "nodes" DROP CONSTRAINT "nodes_parent_id_fkey";

-- DropForeignKey
ALTER TABLE "objective_pillars" DROP CONSTRAINT "objective_pillars_objective_id_fkey";

-- DropForeignKey
ALTER TABLE "objective_pillars" DROP CONSTRAINT "objective_pillars_pillar_id_fkey";

-- DropForeignKey
ALTER TABLE "objectives" DROP CONSTRAINT "objectives_org_id_fkey";

-- DropForeignKey
ALTER TABLE "objectives" DROP CONSTRAINT "objectives_owner_user_id_fkey";

-- DropForeignKey
ALTER TABLE "organization_node_types" DROP CONSTRAINT "organization_node_types_node_type_id_fkey";

-- DropForeignKey
ALTER TABLE "organization_node_types" DROP CONSTRAINT "organization_node_types_org_id_fkey";

-- DropForeignKey
ALTER TABLE "organization_settings" DROP CONSTRAINT "organization_settings_org_id_fkey";

-- DropForeignKey
ALTER TABLE "pillars" DROP CONSTRAINT "pillars_org_id_fkey";

-- DropForeignKey
ALTER TABLE "responsibility_kpi_assignments" DROP CONSTRAINT "responsibility_kpi_assignments_assigned_by_id_fkey";

-- DropForeignKey
ALTER TABLE "responsibility_kpi_assignments" DROP CONSTRAINT "responsibility_kpi_assignments_assigned_to_id_fkey";

-- DropForeignKey
ALTER TABLE "responsibility_kpi_assignments" DROP CONSTRAINT "responsibility_kpi_assignments_kpi_id_fkey";

-- DropForeignKey
ALTER TABLE "responsibility_kpi_assignments" DROP CONSTRAINT "responsibility_kpi_assignments_org_id_fkey";

-- DropForeignKey
ALTER TABLE "responsibility_node_assignments" DROP CONSTRAINT "responsibility_node_assignments_assigned_by_id_fkey";

-- DropForeignKey
ALTER TABLE "responsibility_node_assignments" DROP CONSTRAINT "responsibility_node_assignments_assigned_to_id_fkey";

-- DropForeignKey
ALTER TABLE "responsibility_node_assignments" DROP CONSTRAINT "responsibility_node_assignments_org_id_fkey";

-- DropForeignKey
ALTER TABLE "responsibility_node_assignments" DROP CONSTRAINT "responsibility_node_assignments_root_node_id_fkey";

-- DropForeignKey
ALTER TABLE "user" DROP CONSTRAINT "user_department_id_fkey";

-- DropIndex
DROP INDEX "user_department_id_idx";

-- AlterTable
ALTER TABLE "user" DROP COLUMN "department_id";

-- DropTable
DROP TABLE "department_managers";

-- DropTable
DROP TABLE "departments";

-- DropTable
DROP TABLE "kpi_dependencies";

-- DropTable
DROP TABLE "kpi_links";

-- DropTable
DROP TABLE "kpi_values";

-- DropTable
DROP TABLE "kpi_variable_values";

-- DropTable
DROP TABLE "kpi_variables";

-- DropTable
DROP TABLE "kpis";

-- DropTable
DROP TABLE "node_assignments";

-- DropTable
DROP TABLE "node_dependencies";

-- DropTable
DROP TABLE "node_types";

-- DropTable
DROP TABLE "nodes";

-- DropTable
DROP TABLE "objective_pillars";

-- DropTable
DROP TABLE "objectives";

-- DropTable
DROP TABLE "organization_node_types";

-- DropTable
DROP TABLE "organization_settings";

-- DropTable
DROP TABLE "pillars";

-- DropTable
DROP TABLE "responsibility_kpi_assignments";

-- DropTable
DROP TABLE "responsibility_node_assignments";

-- DropEnum
DROP TYPE "KpiContainerType";

-- DropEnum
DROP TYPE "KpiDefinitionStatus";

-- DropEnum
DROP TYPE "NodeAssignmentRole";

-- DropEnum
DROP TYPE "NodeTypeCode";

-- CreateTable
CREATE TABLE "org_entity_types" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "name_ar" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "org_entity_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entities" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "key" TEXT,
    "org_entity_type_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "title_ar" TEXT,
    "description" TEXT,
    "description_ar" TEXT,
    "owner_user_id" TEXT,
    "status" "Status" NOT NULL DEFAULT 'PLANNED',
    "source_type" "KpiSourceType" NOT NULL DEFAULT 'MANUAL',
    "period_type" "KpiPeriodType",
    "unit" TEXT,
    "unit_ar" TEXT,
    "direction" "KpiDirection" NOT NULL DEFAULT 'INCREASE_IS_GOOD',
    "aggregation" "KpiAggregationMethod" NOT NULL DEFAULT 'LAST_VALUE',
    "baseline_value" DOUBLE PRECISION,
    "target_value" DOUBLE PRECISION,
    "weight" DOUBLE PRECISION,
    "formula" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "entities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entity_variables" (
    "id" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "name_ar" TEXT,
    "data_type" "KpiVariableDataType" NOT NULL,
    "is_required" BOOLEAN NOT NULL DEFAULT false,
    "is_static" BOOLEAN NOT NULL DEFAULT false,
    "static_value" DOUBLE PRECISION,

    CONSTRAINT "entity_variables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entity_values" (
    "id" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "actual_value" DOUBLE PRECISION,
    "calculated_value" DOUBLE PRECISION,
    "final_value" DOUBLE PRECISION,
    "achievement_value" DOUBLE PRECISION,
    "status" "KpiValueStatus" NOT NULL DEFAULT 'DRAFT',
    "approval_type" "KpiApprovalType",
    "note" TEXT,
    "entered_by" TEXT,
    "submitted_by" TEXT,
    "approved_by" TEXT,
    "submitted_at" TIMESTAMP(3),
    "approved_at" TIMESTAMP(3),
    "locked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "entity_values_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entity_variable_values" (
    "id" TEXT NOT NULL,
    "entity_value_id" TEXT NOT NULL,
    "entity_variable_id" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "entity_variable_values_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "org_entity_types_org_id_idx" ON "org_entity_types"("org_id");

-- CreateIndex
CREATE INDEX "org_entity_types_org_id_sort_order_idx" ON "org_entity_types"("org_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "org_entity_types_org_id_code_key" ON "org_entity_types"("org_id", "code");

-- CreateIndex
CREATE INDEX "entities_org_id_idx" ON "entities"("org_id");

-- CreateIndex
CREATE INDEX "entities_org_entity_type_id_idx" ON "entities"("org_entity_type_id");

-- CreateIndex
CREATE INDEX "entities_owner_user_id_idx" ON "entities"("owner_user_id");

-- CreateIndex
CREATE INDEX "entities_key_idx" ON "entities"("key");

-- CreateIndex
CREATE UNIQUE INDEX "entities_org_id_key_deleted_at_key" ON "entities"("org_id", "key", "deleted_at");

-- CreateIndex
CREATE INDEX "entity_variables_entity_id_idx" ON "entity_variables"("entity_id");

-- CreateIndex
CREATE UNIQUE INDEX "entity_variables_entity_id_code_key" ON "entity_variables"("entity_id", "code");

-- CreateIndex
CREATE INDEX "entity_values_entity_id_idx" ON "entity_values"("entity_id");

-- CreateIndex
CREATE INDEX "entity_values_entered_by_idx" ON "entity_values"("entered_by");

-- CreateIndex
CREATE INDEX "entity_values_submitted_by_idx" ON "entity_values"("submitted_by");

-- CreateIndex
CREATE INDEX "entity_values_approved_by_idx" ON "entity_values"("approved_by");

-- CreateIndex
CREATE UNIQUE INDEX "entity_values_entity_id_period_start_period_end_key" ON "entity_values"("entity_id", "period_start", "period_end");

-- CreateIndex
CREATE INDEX "entity_variable_values_entity_value_id_idx" ON "entity_variable_values"("entity_value_id");

-- CreateIndex
CREATE INDEX "entity_variable_values_entity_variable_id_idx" ON "entity_variable_values"("entity_variable_id");

-- CreateIndex
CREATE UNIQUE INDEX "entity_variable_values_entity_value_id_entity_variable_id_key" ON "entity_variable_values"("entity_value_id", "entity_variable_id");

-- AddForeignKey
ALTER TABLE "org_entity_types" ADD CONSTRAINT "org_entity_types_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entities" ADD CONSTRAINT "entities_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entities" ADD CONSTRAINT "entities_org_entity_type_id_fkey" FOREIGN KEY ("org_entity_type_id") REFERENCES "org_entity_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entities" ADD CONSTRAINT "entities_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entity_variables" ADD CONSTRAINT "entity_variables_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entity_values" ADD CONSTRAINT "entity_values_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entity_values" ADD CONSTRAINT "entity_values_entered_by_fkey" FOREIGN KEY ("entered_by") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entity_values" ADD CONSTRAINT "entity_values_submitted_by_fkey" FOREIGN KEY ("submitted_by") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entity_values" ADD CONSTRAINT "entity_values_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entity_variable_values" ADD CONSTRAINT "entity_variable_values_entity_value_id_fkey" FOREIGN KEY ("entity_value_id") REFERENCES "entity_values"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entity_variable_values" ADD CONSTRAINT "entity_variable_values_entity_variable_id_fkey" FOREIGN KEY ("entity_variable_id") REFERENCES "entity_variables"("id") ON DELETE CASCADE ON UPDATE CASCADE;
