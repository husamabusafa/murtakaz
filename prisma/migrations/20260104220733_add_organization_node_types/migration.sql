-- CreateTable
CREATE TABLE "organization_node_types" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "node_type_id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organization_node_types_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "organization_node_types_org_id_idx" ON "organization_node_types"("org_id");

-- CreateIndex
CREATE INDEX "organization_node_types_node_type_id_idx" ON "organization_node_types"("node_type_id");

-- CreateIndex
CREATE UNIQUE INDEX "organization_node_types_org_id_node_type_id_key" ON "organization_node_types"("org_id", "node_type_id");

-- AddForeignKey
ALTER TABLE "organization_node_types" ADD CONSTRAINT "organization_node_types_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_node_types" ADD CONSTRAINT "organization_node_types_node_type_id_fkey" FOREIGN KEY ("node_type_id") REFERENCES "node_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
