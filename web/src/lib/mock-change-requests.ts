import type { ChangeRequest } from "@/lib/types";

export const changeRequests: ChangeRequest[] = [
  {
    id: "cr-1",
    entityType: "KPI",
    entityName: "Digital revenue growth",
    requestedBy: "Finance Ops",
    status: "PENDING",
    ageDays: 3,
  },
  {
    id: "cr-2",
    entityType: "Initiative",
    entityName: "Unified support",
    requestedBy: "CX Office",
    status: "APPROVED",
    ageDays: 1,
  },
  {
    id: "cr-3",
    entityType: "Project",
    entityName: "Core systems migration",
    requestedBy: "Engineering",
    status: "PENDING",
    ageDays: 7,
  },
];

