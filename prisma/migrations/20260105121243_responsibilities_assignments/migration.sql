-- CreateTable
CREATE TABLE "responsibility_node_assignments" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "root_node_id" TEXT NOT NULL,
    "assigned_to_id" TEXT NOT NULL,
    "assigned_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "responsibility_node_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "responsibility_kpi_assignments" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "kpi_id" TEXT NOT NULL,
    "assigned_to_id" TEXT NOT NULL,
    "assigned_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "responsibility_kpi_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "responsibility_node_assignments_org_id_idx" ON "responsibility_node_assignments"("org_id");

-- CreateIndex
CREATE INDEX "responsibility_node_assignments_assigned_to_id_idx" ON "responsibility_node_assignments"("assigned_to_id");

-- CreateIndex
CREATE INDEX "responsibility_node_assignments_assigned_by_id_idx" ON "responsibility_node_assignments"("assigned_by_id");

-- CreateIndex
CREATE INDEX "responsibility_node_assignments_root_node_id_idx" ON "responsibility_node_assignments"("root_node_id");

-- CreateIndex
CREATE UNIQUE INDEX "responsibility_node_assignments_assigned_to_id_root_node_id_key" ON "responsibility_node_assignments"("assigned_to_id", "root_node_id");

-- CreateIndex
CREATE INDEX "responsibility_kpi_assignments_org_id_idx" ON "responsibility_kpi_assignments"("org_id");

-- CreateIndex
CREATE INDEX "responsibility_kpi_assignments_assigned_to_id_idx" ON "responsibility_kpi_assignments"("assigned_to_id");

-- CreateIndex
CREATE INDEX "responsibility_kpi_assignments_assigned_by_id_idx" ON "responsibility_kpi_assignments"("assigned_by_id");

-- CreateIndex
CREATE INDEX "responsibility_kpi_assignments_kpi_id_idx" ON "responsibility_kpi_assignments"("kpi_id");

-- CreateIndex
CREATE UNIQUE INDEX "responsibility_kpi_assignments_assigned_to_id_kpi_id_key" ON "responsibility_kpi_assignments"("assigned_to_id", "kpi_id");

-- AddForeignKey
ALTER TABLE "responsibility_node_assignments" ADD CONSTRAINT "responsibility_node_assignments_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "responsibility_node_assignments" ADD CONSTRAINT "responsibility_node_assignments_root_node_id_fkey" FOREIGN KEY ("root_node_id") REFERENCES "nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "responsibility_node_assignments" ADD CONSTRAINT "responsibility_node_assignments_assigned_to_id_fkey" FOREIGN KEY ("assigned_to_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "responsibility_node_assignments" ADD CONSTRAINT "responsibility_node_assignments_assigned_by_id_fkey" FOREIGN KEY ("assigned_by_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "responsibility_kpi_assignments" ADD CONSTRAINT "responsibility_kpi_assignments_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "responsibility_kpi_assignments" ADD CONSTRAINT "responsibility_kpi_assignments_kpi_id_fkey" FOREIGN KEY ("kpi_id") REFERENCES "kpis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "responsibility_kpi_assignments" ADD CONSTRAINT "responsibility_kpi_assignments_assigned_to_id_fkey" FOREIGN KEY ("assigned_to_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "responsibility_kpi_assignments" ADD CONSTRAINT "responsibility_kpi_assignments_assigned_by_id_fkey" FOREIGN KEY ("assigned_by_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
