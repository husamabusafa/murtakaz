-- CreateEnum
CREATE TYPE "KpiApprovalLevel" AS ENUM ('MANAGER', 'PMO', 'EXECUTIVE', 'ADMIN');

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "kpi_approval_level" "KpiApprovalLevel" NOT NULL DEFAULT 'MANAGER';
