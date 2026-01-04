-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'EXECUTIVE', 'PMO', 'MANAGER', 'EMPLOYEE');

-- CreateEnum
CREATE TYPE "Status" AS ENUM ('PLANNED', 'ACTIVE', 'AT_RISK', 'COMPLETED');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "NodeTypeCode" AS ENUM ('STRATEGY', 'PILLAR', 'OBJECTIVE', 'INITIATIVE', 'PROJECT', 'TASK');

-- CreateEnum
CREATE TYPE "NodeAssignmentRole" AS ENUM ('OWNER', 'CONTRIBUTOR', 'REVIEWER', 'APPROVER');

-- CreateEnum
CREATE TYPE "KpiPeriodType" AS ENUM ('MONTHLY', 'QUARTERLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "KpiVariableDataType" AS ENUM ('NUMBER', 'PERCENTAGE');

-- CreateEnum
CREATE TYPE "KpiDefinitionStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "KpiValueStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'LOCKED');

-- CreateEnum
CREATE TYPE "KpiDirection" AS ENUM ('INCREASE_IS_GOOD', 'DECREASE_IS_GOOD');

-- CreateEnum
CREATE TYPE "KpiAggregationMethod" AS ENUM ('LAST_VALUE', 'SUM', 'AVERAGE', 'MIN', 'MAX');

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "domain" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "departments" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "parent_id" TEXT,
    "manager_id" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "manager_id" TEXT,
    "department_id" TEXT,
    "title" TEXT,
    "image" TEXT,
    "hashed_password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'en',
    "theme" TEXT NOT NULL DEFAULT 'system',
    "notifications" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChangeRequest" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "requestedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "decided_at" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ChangeRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChangeApproval" (
    "id" TEXT NOT NULL,
    "changeRequestId" TEXT NOT NULL,
    "approverId" TEXT NOT NULL,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),

    CONSTRAINT "ChangeApproval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "node_types" (
    "id" TEXT NOT NULL,
    "code" "NodeTypeCode" NOT NULL,
    "display_name" TEXT NOT NULL,
    "level_order" INTEGER NOT NULL,
    "can_have_kpis" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "node_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nodes" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "node_type_id" TEXT NOT NULL,
    "parent_id" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "owner_user_id" TEXT,
    "status" "Status" NOT NULL DEFAULT 'PLANNED',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "nodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "node_assignments" (
    "id" TEXT NOT NULL,
    "node_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" "NodeAssignmentRole" NOT NULL DEFAULT 'CONTRIBUTOR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "node_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "node_dependencies" (
    "id" TEXT NOT NULL,
    "blocked_node_id" TEXT NOT NULL,
    "depends_on_node_id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "node_dependencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kpis" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "primary_node_id" TEXT NOT NULL,
    "owner_user_id" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "formula" TEXT,
    "unit" TEXT,
    "direction" "KpiDirection" NOT NULL DEFAULT 'INCREASE_IS_GOOD',
    "aggregation" "KpiAggregationMethod" NOT NULL DEFAULT 'LAST_VALUE',
    "period_type" "KpiPeriodType" NOT NULL,
    "baseline_value" DOUBLE PRECISION,
    "target_value" DOUBLE PRECISION,
    "weight" DOUBLE PRECISION,
    "status" "KpiDefinitionStatus" NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "kpis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kpi_variables" (
    "id" TEXT NOT NULL,
    "kpi_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "data_type" "KpiVariableDataType" NOT NULL,
    "is_required" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "kpi_variables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kpi_values" (
    "id" TEXT NOT NULL,
    "kpi_id" TEXT NOT NULL,
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "calculated_value" DOUBLE PRECISION,
    "status" "KpiValueStatus" NOT NULL DEFAULT 'DRAFT',
    "note" TEXT,
    "entered_by" TEXT,
    "approved_by" TEXT,
    "submitted_at" TIMESTAMP(3),
    "approved_at" TIMESTAMP(3),
    "locked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kpi_values_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kpi_variable_values" (
    "id" TEXT NOT NULL,
    "kpi_value_id" TEXT NOT NULL,
    "kpi_variable_id" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "kpi_variable_values_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Organization_domain_idx" ON "Organization"("domain");

-- CreateIndex
CREATE INDEX "departments_org_id_idx" ON "departments"("org_id");

-- CreateIndex
CREATE INDEX "departments_parent_id_idx" ON "departments"("parent_id");

-- CreateIndex
CREATE INDEX "departments_manager_id_idx" ON "departments"("manager_id");

-- CreateIndex
CREATE UNIQUE INDEX "departments_org_id_name_deletedAt_key" ON "departments"("org_id", "name", "deletedAt");

-- CreateIndex
CREATE INDEX "user_org_id_idx" ON "user"("org_id");

-- CreateIndex
CREATE INDEX "user_manager_id_idx" ON "user"("manager_id");

-- CreateIndex
CREATE INDEX "user_department_id_idx" ON "user"("department_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_org_id_email_key" ON "user"("org_id", "email");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");

-- CreateIndex
CREATE UNIQUE INDEX "UserPreference_userId_key" ON "UserPreference"("userId");

-- CreateIndex
CREATE INDEX "ChangeRequest_org_id_idx" ON "ChangeRequest"("org_id");

-- CreateIndex
CREATE INDEX "ChangeRequest_entityType_entityId_idx" ON "ChangeRequest"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "ChangeApproval_approverId_idx" ON "ChangeApproval"("approverId");

-- CreateIndex
CREATE UNIQUE INDEX "ChangeApproval_changeRequestId_approverId_key" ON "ChangeApproval"("changeRequestId", "approverId");

-- CreateIndex
CREATE UNIQUE INDEX "node_types_code_key" ON "node_types"("code");

-- CreateIndex
CREATE INDEX "nodes_org_id_idx" ON "nodes"("org_id");

-- CreateIndex
CREATE INDEX "nodes_node_type_id_idx" ON "nodes"("node_type_id");

-- CreateIndex
CREATE INDEX "nodes_parent_id_idx" ON "nodes"("parent_id");

-- CreateIndex
CREATE INDEX "nodes_owner_user_id_idx" ON "nodes"("owner_user_id");

-- CreateIndex
CREATE INDEX "node_assignments_node_id_idx" ON "node_assignments"("node_id");

-- CreateIndex
CREATE INDEX "node_assignments_user_id_idx" ON "node_assignments"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "node_assignments_node_id_user_id_role_key" ON "node_assignments"("node_id", "user_id", "role");

-- CreateIndex
CREATE INDEX "node_dependencies_blocked_node_id_idx" ON "node_dependencies"("blocked_node_id");

-- CreateIndex
CREATE INDEX "node_dependencies_depends_on_node_id_idx" ON "node_dependencies"("depends_on_node_id");

-- CreateIndex
CREATE UNIQUE INDEX "node_dependencies_blocked_node_id_depends_on_node_id_key" ON "node_dependencies"("blocked_node_id", "depends_on_node_id");

-- CreateIndex
CREATE INDEX "kpis_org_id_idx" ON "kpis"("org_id");

-- CreateIndex
CREATE INDEX "kpis_primary_node_id_idx" ON "kpis"("primary_node_id");

-- CreateIndex
CREATE INDEX "kpis_owner_user_id_idx" ON "kpis"("owner_user_id");

-- CreateIndex
CREATE INDEX "kpi_variables_kpi_id_idx" ON "kpi_variables"("kpi_id");

-- CreateIndex
CREATE UNIQUE INDEX "kpi_variables_kpi_id_code_key" ON "kpi_variables"("kpi_id", "code");

-- CreateIndex
CREATE INDEX "kpi_values_kpi_id_idx" ON "kpi_values"("kpi_id");

-- CreateIndex
CREATE INDEX "kpi_values_entered_by_idx" ON "kpi_values"("entered_by");

-- CreateIndex
CREATE INDEX "kpi_values_approved_by_idx" ON "kpi_values"("approved_by");

-- CreateIndex
CREATE UNIQUE INDEX "kpi_values_kpi_id_period_start_period_end_key" ON "kpi_values"("kpi_id", "period_start", "period_end");

-- CreateIndex
CREATE INDEX "kpi_variable_values_kpi_value_id_idx" ON "kpi_variable_values"("kpi_value_id");

-- CreateIndex
CREATE INDEX "kpi_variable_values_kpi_variable_id_idx" ON "kpi_variable_values"("kpi_variable_id");

-- CreateIndex
CREATE UNIQUE INDEX "kpi_variable_values_kpi_value_id_kpi_variable_id_key" ON "kpi_variable_values"("kpi_value_id", "kpi_variable_id");

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "user_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "user_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "user_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPreference" ADD CONSTRAINT "UserPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeRequest" ADD CONSTRAINT "ChangeRequest_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeRequest" ADD CONSTRAINT "ChangeRequest_requestedBy_fkey" FOREIGN KEY ("requestedBy") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeApproval" ADD CONSTRAINT "ChangeApproval_changeRequestId_fkey" FOREIGN KEY ("changeRequestId") REFERENCES "ChangeRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeApproval" ADD CONSTRAINT "ChangeApproval_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nodes" ADD CONSTRAINT "nodes_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nodes" ADD CONSTRAINT "nodes_node_type_id_fkey" FOREIGN KEY ("node_type_id") REFERENCES "node_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nodes" ADD CONSTRAINT "nodes_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "nodes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nodes" ADD CONSTRAINT "nodes_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "node_assignments" ADD CONSTRAINT "node_assignments_node_id_fkey" FOREIGN KEY ("node_id") REFERENCES "nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "node_assignments" ADD CONSTRAINT "node_assignments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "node_dependencies" ADD CONSTRAINT "node_dependencies_blocked_node_id_fkey" FOREIGN KEY ("blocked_node_id") REFERENCES "nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "node_dependencies" ADD CONSTRAINT "node_dependencies_depends_on_node_id_fkey" FOREIGN KEY ("depends_on_node_id") REFERENCES "nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kpis" ADD CONSTRAINT "kpis_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kpis" ADD CONSTRAINT "kpis_primary_node_id_fkey" FOREIGN KEY ("primary_node_id") REFERENCES "nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kpis" ADD CONSTRAINT "kpis_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kpi_variables" ADD CONSTRAINT "kpi_variables_kpi_id_fkey" FOREIGN KEY ("kpi_id") REFERENCES "kpis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kpi_values" ADD CONSTRAINT "kpi_values_kpi_id_fkey" FOREIGN KEY ("kpi_id") REFERENCES "kpis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kpi_values" ADD CONSTRAINT "kpi_values_entered_by_fkey" FOREIGN KEY ("entered_by") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kpi_values" ADD CONSTRAINT "kpi_values_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kpi_variable_values" ADD CONSTRAINT "kpi_variable_values_kpi_value_id_fkey" FOREIGN KEY ("kpi_value_id") REFERENCES "kpi_values"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kpi_variable_values" ADD CONSTRAINT "kpi_variable_values_kpi_variable_id_fkey" FOREIGN KEY ("kpi_variable_id") REFERENCES "kpi_variables"("id") ON DELETE CASCADE ON UPDATE CASCADE;
