-- CreateTable
CREATE TABLE "user_entity_assignments" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "assigned_by" TEXT,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_entity_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_entity_assignments_user_id_idx" ON "user_entity_assignments"("user_id");

-- CreateIndex
CREATE INDEX "user_entity_assignments_entity_id_idx" ON "user_entity_assignments"("entity_id");

-- CreateIndex
CREATE INDEX "user_entity_assignments_assigned_by_idx" ON "user_entity_assignments"("assigned_by");

-- CreateIndex
CREATE UNIQUE INDEX "user_entity_assignments_user_id_entity_id_key" ON "user_entity_assignments"("user_id", "entity_id");

-- AddForeignKey
ALTER TABLE "user_entity_assignments" ADD CONSTRAINT "user_entity_assignments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_entity_assignments" ADD CONSTRAINT "user_entity_assignments_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
