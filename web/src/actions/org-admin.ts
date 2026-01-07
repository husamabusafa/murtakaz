"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { Role, Status } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

const prismaNode = (prisma as any).node;
const prismaKpiDefinition = (prisma as any).kpiDefinition;
const prismaOrganization = (prisma as any).organization;
const prismaNodeType = (prisma as any).nodeType;
const prismaOrganizationNodeType = (prisma as any).organizationNodeType;

type KpiApprovalLevelCode = "MANAGER" | "PMO" | "EXECUTIVE" | "ADMIN";
const kpiApprovalLevelSchema = z.enum(["MANAGER", "PMO", "EXECUTIVE", "ADMIN"]);

export type ActionValidationIssue = {
  path: (string | number)[];
  message: string;
};

async function requireOrgAdmin() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized: Organization admin access required");
  }

  if (!session.user.orgId) {
    throw new Error("Unauthorized: Missing organization scope");
  }

  return session;
}

const managerEligibleRoles = [Role.MANAGER, Role.PMO, Role.EXECUTIVE, Role.ADMIN] as const;

const optionalUserIdNullable = z.preprocess(
  (value) => {
    if (value === "" || value === "__none__" || value === undefined) return null;
    if (value === null) return null;
    return value;
  },
  z.string().min(1).nullable(),
);

const optionalUuidNullable = z.preprocess(
  (value) => {
    if (value === "" || value === "__none__" || value === undefined) return null;
    if (value === null) return null;
    return value;
  },
  z.string().uuid().nullable(),
);

const optionalHexColor = z.preprocess(
  (value) => {
    if (value === "" || value === undefined) return undefined;
    if (value === null) return undefined;
    return value;
  },
  z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Color must be a 6-digit hex code like #22c55e")
    .optional(),
);

const optionalUserIdNullableStrict = z.preprocess(
  (value) => {
    if (value === "" || value === "__none__" || value === undefined) return null;
    if (value === null) return null;
    return value;
  },
  z.string().min(1).nullable(),
);

function roleRank(role: Role) {
  if (role === Role.ADMIN) return 4;
  if (role === Role.EXECUTIVE) return 3;
  if (role === Role.PMO) return 2;
  if (role === Role.MANAGER) return 1;
  return 0;
}

const createOrgUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.nativeEnum(Role),
  managerId: optionalUserIdNullable.optional(),
  departmentId: optionalUuidNullable.optional(),
});

const updateOrgUserSchema = z.object({
  userId: z.string().min(1),
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  role: z.nativeEnum(Role).optional(),
  managerId: optionalUserIdNullable.optional(),
  departmentId: optionalUuidNullable.optional(),
});

const deleteOrgUserSchema = z.object({
  userId: z.string().min(1),
});

const createOrgDepartmentSchema = z.object({
  name: z.string().min(2),
  nameAr: z.string().optional(),
});

const updateOrgDepartmentSchema = z.object({
  departmentId: z.string().uuid(),
  name: z.string().min(2),
  nameAr: z.string().optional(),
});

const deleteOrgDepartmentSchema = z.object({
  departmentId: z.string().uuid(),
});

function zodIssues(error: z.ZodError): ActionValidationIssue[] {
  return error.issues.map((i) => ({
    path: i.path.map((p) => (typeof p === "string" || typeof p === "number" ? p : String(p))),
    message: i.message,
  }));
}

export async function getOrgAdminUsers() {
  const session = await requireOrgAdmin();

  return (prisma.user as any).findMany({
    where: {
      orgId: session.user.orgId,
      deletedAt: null,
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      managerId: true,
      departmentId: true,
      createdAt: true,
      manager: {
        select: {
          id: true,
          name: true,
          role: true,
        },
      },
      department: {
        select: {
          id: true,
          name: true,
          nameAr: true,
        },
      },
    },
  });
}

export async function getOrgAdminEnabledNodeTypes() {
  const session = await requireOrgAdmin();

  const rows = await (prismaOrganizationNodeType as any).findMany({
    where: {
      orgId: session.user.orgId,
    },
    orderBy: {
      nodeType: { levelOrder: "asc" },
    },
    select: {
      nodeType: {
        select: {
          id: true,
          code: true,
          displayName: true,
          nameAr: true,
          levelOrder: true,
          canHaveKpis: true,
        },
      },
    },
  });

  return (rows as any[]).map((r) => r.nodeType) as Array<{
    id: string;
    code: unknown;
    displayName: string;
    nameAr: string | null;
    levelOrder: number;
    canHaveKpis: boolean;
  }>;
}

export async function createOrgAdminDepartment(data: z.infer<typeof createOrgDepartmentSchema>) {
  const session = await requireOrgAdmin();
  const parsedResult = createOrgDepartmentSchema.safeParse(data);
  if (!parsedResult.success) {
    return {
      success: false,
      error: "Validation failed",
      issues: zodIssues(parsedResult.error),
    };
  }

  const parsed = parsedResult.data;

  try {
    const department = await (prisma.department as any).create({
      data: {
        orgId: session.user.orgId,
        name: parsed.name,
        nameAr: parsed.nameAr || null,
      },
      select: {
        id: true,
        name: true,
        nameAr: true,
        createdAt: true,
      },
    });

    return { success: true, department };
  } catch (error: unknown) {
    console.error("Failed to create department:", error);
    const message = error instanceof Error ? error.message : "Failed to create department";
    return { success: false, error: message };
  }
}

export async function getOrgAdminOrganizationSettings() {
  const session = await requireOrgAdmin();

  const [org, nodeTypeOptions, enabledNodeTypes, nodeTypeIds] = await Promise.all([
    (prismaOrganization as any).findFirst({
      where: { id: session.user.orgId, deletedAt: null },
      select: {
        id: true,
        name: true,
        nameAr: true,
        domain: true,
        kpiApprovalLevel: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { users: true, departments: true, nodes: true, kpis: true } },
      },
    }),
    (prismaNodeType as any).findMany({
      orderBy: [{ levelOrder: "asc" }, { code: "asc" }],
      select: { id: true, code: true, displayName: true, levelOrder: true, canHaveKpis: true },
    }),
    getOrgAdminEnabledNodeTypes(),
    (prismaNode as any).findMany({
      where: { orgId: session.user.orgId, deletedAt: null },
      select: { nodeTypeId: true },
    }),
  ]);

  const nodeTypeIdCounts = new Map<string, number>();
  for (const row of nodeTypeIds as any[]) {
    nodeTypeIdCounts.set(row.nodeTypeId, (nodeTypeIdCounts.get(row.nodeTypeId) ?? 0) + 1);
  }

  const enabledNodeTypeCounts = enabledNodeTypes.map((nt) => ({
    nodeTypeId: nt.id,
    displayName: nt.displayName,
    count: nodeTypeIdCounts.get(nt.id) ?? 0,
  }));

  return {
    org: org as {
      id: string;
      name: string;
      nameAr: string | null;
      domain: string | null;
      kpiApprovalLevel: unknown;
      createdAt: Date;
      updatedAt: Date;
      _count: { users: number; departments: number; nodes: number; kpis: number };
    } | null,
    enabledNodeTypes,
    enabledNodeTypeCounts,
    nodeTypeOptions: nodeTypeOptions as Array<{
      id: string;
      code: unknown;
      displayName: string;
      nameAr: string | null;
      levelOrder: number;
      canHaveKpis: boolean;
    }>,
  };
}

const updateOrgSettingsSchema = z.object({
  name: z.string().trim().min(2).optional(),
  nameAr: z.string().trim().optional(),
  domain: z.string().trim().optional(),
  kpiApprovalLevel: kpiApprovalLevelSchema.optional(),
});

export async function updateOrgAdminOrganizationSettings(data: z.infer<typeof updateOrgSettingsSchema>) {
  const session = await requireOrgAdmin();
  const parsedResult = updateOrgSettingsSchema.safeParse(data);
  if (!parsedResult.success) {
    return { success: false as const, error: "Validation failed", issues: zodIssues(parsedResult.error) };
  }

  const parsed = parsedResult.data;

  try {
    await prismaOrganization.update({
      where: { id: session.user.orgId },
      data: {
        ...(typeof parsed.name === "string" ? { name: parsed.name } : {}),
        ...(typeof parsed.nameAr === "string" ? { nameAr: parsed.nameAr || null } : {}),
        ...(typeof parsed.domain === "string" ? { domain: parsed.domain ? parsed.domain : null } : {}),
        ...(typeof parsed.kpiApprovalLevel !== "undefined" ? { kpiApprovalLevel: parsed.kpiApprovalLevel as KpiApprovalLevelCode } : {}),
      },
      select: { id: true },
    });
    return { success: true as const };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update organization";
    return { success: false as const, error: message };
  }
}

const updateOrgNodeTypesSchema = z.object({
  nodeTypeIds: z.array(z.string().uuid()).min(1),
});

export async function updateOrgAdminEnabledNodeTypes(data: z.infer<typeof updateOrgNodeTypesSchema>) {
  const session = await requireOrgAdmin();
  const parsedResult = updateOrgNodeTypesSchema.safeParse(data);
  if (!parsedResult.success) {
    return { success: false as const, error: "Validation failed", issues: zodIssues(parsedResult.error) };
  }

  const parsed = parsedResult.data;

  try {
    await prismaOrganizationNodeType.deleteMany({ where: { orgId: session.user.orgId } });
    await prismaOrganizationNodeType.createMany({
      data: parsed.nodeTypeIds.map((nodeTypeId) => ({ orgId: session.user.orgId, nodeTypeId })),
      skipDuplicates: true,
    });
    return { success: true as const };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update node types";
    return { success: false as const, error: message };
  }
}

async function getOrgEnabledNodeTypesByOrder(orgId: string) {
  const rows = await (prisma.organizationNodeType as any).findMany({
    where: {
      orgId,
    },
    orderBy: {
      nodeType: { levelOrder: "asc" },
    },
    select: {
      nodeType: {
        select: {
          id: true,
          code: true,
          displayName: true,
          nameAr: true,
          levelOrder: true,
          canHaveKpis: true,
        },
      },
    },
  });
  return rows.map((r: any) => r.nodeType);
}

function normalizeNodeTypeCode(code: string) {
  return code.trim().toUpperCase();
}

async function resolveEnabledNodeTypeByCode(input: { orgId: string; code: string }) {
  const enabled = await getOrgEnabledNodeTypesByOrder(input.orgId);
  const normalized = normalizeNodeTypeCode(input.code);
  const found = enabled.find((t: any) => String(t.code) === normalized);
  return { enabled, nodeType: found ?? null };
}

function getDirectHigherEnabledNodeType(input: { enabled: Array<{ code: unknown }>; currentCode: string }) {
  const normalized = normalizeNodeTypeCode(input.currentCode);
  const idx = input.enabled.findIndex((t: any) => String(t.code) === normalized);
  if (idx <= 0) return null;
  return input.enabled[idx - 1] ?? null;
}

function getDirectLowerEnabledNodeType(input: { enabled: Array<{ code: unknown }>; currentCode: string }) {
  const normalized = normalizeNodeTypeCode(input.currentCode);
  const idx = input.enabled.findIndex((t: any) => String(t.code) === normalized);
  if (idx < 0) return null;
  return input.enabled[idx + 1] ?? null;
}

const getNodesByTypeSchema = z.object({
  code: z.string().min(1),
});

export async function getOrgAdminNodesByType(data: z.infer<typeof getNodesByTypeSchema>) {
  const session = await requireOrgAdmin();
  const parsedResult = getNodesByTypeSchema.safeParse(data);
  if (!parsedResult.success) {
    return [];
  }

  const parsed = parsedResult.data;
  const { nodeType } = await resolveEnabledNodeTypeByCode({ orgId: session.user.orgId, code: parsed.code });
  if (!nodeType) return [];

  return (prisma.node as any).findMany({
    where: {
      orgId: session.user.orgId,
      nodeTypeId: nodeType.id,
      deletedAt: null,
    },
    orderBy: [{ createdAt: "desc" }],
    select: {
      id: true,
      name: true,
      nameAr: true,
      description: true,
      descriptionAr: true,
      color: true,
      status: true,
      parentId: true,
      createdAt: true,
      parent: {
        select: {
          id: true,
          name: true,
          nameAr: true,
        },
      },
      _count: {
        select: {
          children: true,
          kpis: true,
        },
      },
    },
  });
}

const getParentOptionsSchema = z.object({
  code: z.string().min(1),
});

export async function getOrgAdminParentOptionsForNodeType(data: z.infer<typeof getParentOptionsSchema>) {
  const session = await requireOrgAdmin();
  const parsedResult = getParentOptionsSchema.safeParse(data);
  if (!parsedResult.success) return [];

  const parsed = parsedResult.data;
  const { enabled, nodeType } = await resolveEnabledNodeTypeByCode({ orgId: session.user.orgId, code: parsed.code });
  if (!nodeType) return [];

  const higher = getDirectHigherEnabledNodeType({ enabled, currentCode: String(nodeType.code) });
  if (!higher) return [];

  const higherType = enabled.find((t: any) => String(t.code) === String(higher.code));
  if (!higherType) return [];

  const nodes = await (prisma.node as any).findMany({
    where: {
      orgId: session.user.orgId,
      nodeTypeId: (higherType as { id: string }).id,
      deletedAt: null,
    },
    orderBy: [{ name: "asc" }],
    select: {
      id: true,
      name: true,
      nameAr: true,
      color: true,
      status: true,
    },
  });

  return nodes as Array<{ id: string; name: string; nameAr: string | null; color: string; status: Status }>;
}

const createNodeSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(2),
  nameAr: z.string().optional(),
  description: z.string().optional(),
  descriptionAr: z.string().optional(),
  parentId: optionalUuidNullable.optional(),
  color: optionalHexColor,
  status: z.nativeEnum(Status).optional(),
  ownerUserId: optionalUserIdNullableStrict.optional(),
});

export async function createOrgAdminNode(data: z.infer<typeof createNodeSchema>) {
  const session = await requireOrgAdmin();
  const parsedResult = createNodeSchema.safeParse(data);
  if (!parsedResult.success) {
    return {
      success: false,
      error: "Validation failed",
      issues: zodIssues(parsedResult.error),
    };
  }

  const parsed = parsedResult.data;
  const { enabled, nodeType } = await resolveEnabledNodeTypeByCode({ orgId: session.user.orgId, code: parsed.code });
  if (!nodeType) {
    return { success: false, error: "Node type is not enabled for this organization." };
  }

  const directHigher = getDirectHigherEnabledNodeType({ enabled, currentCode: String(nodeType.code) });
  const parentId = parsed.parentId ?? null;

  if (directHigher) {
    if (!parentId) {
      return {
        success: false,
        error: "A parent node is required for this node type.",
        issues: [{ path: ["parentId"], message: "Parent is required." } satisfies ActionValidationIssue],
      };
    }

    const parent = await (prisma.node as any).findFirst({
      where: {
        id: parentId,
        orgId: session.user.orgId,
        deletedAt: null,
      },
      select: {
        id: true,
        nodeType: { select: { code: true } },
      },
    });

    if (!parent) {
      return {
        success: false,
        error: "Selected parent was not found.",
        issues: [{ path: ["parentId"], message: "Selected parent was not found." } satisfies ActionValidationIssue],
      };
    }

    if (String(parent.nodeType.code) !== String(directHigher.code)) {
      return {
        success: false,
        error: "Selected parent has an invalid node type.",
        issues: [{ path: ["parentId"], message: "Selected parent has an invalid node type." } satisfies ActionValidationIssue],
      };
    }
  } else {
    if (parentId) {
      return {
        success: false,
        error: "This node type cannot have a parent.",
        issues: [{ path: ["parentId"], message: "This node type cannot have a parent." } satisfies ActionValidationIssue],
      };
    }
  }

  if (parsed.ownerUserId) {
    const owner = await prisma.user.findFirst({
      where: {
        id: parsed.ownerUserId,
        orgId: session.user.orgId,
        deletedAt: null,
      },
      select: { id: true },
    });
    if (!owner) {
      return {
        success: false,
        error: "Selected owner was not found.",
        issues: [{ path: ["ownerUserId"], message: "Selected owner was not found." } satisfies ActionValidationIssue],
      };
    }
  }

  try {
    const node = await (prisma.node as any).create({
      data: {
        orgId: session.user.orgId,
        nodeTypeId: nodeType.id,
        parentId,
        name: parsed.name,
        nameAr: parsed.nameAr || null,
        description: parsed.description ?? null,
        descriptionAr: parsed.descriptionAr ?? null,
        color: parsed.color ?? undefined,
        status: parsed.status ?? undefined,
        ownerUserId: typeof parsed.ownerUserId === "undefined" ? undefined : parsed.ownerUserId,
      },
      select: {
        id: true,
        name: true,
        nameAr: true,
        description: true,
        descriptionAr: true,
        color: true,
        status: true,
        parentId: true,
        createdAt: true,
      },
    });

    return { success: true, node };
  } catch (error: unknown) {
    console.error("Failed to create node:", error);
    const message = error instanceof Error ? error.message : "Failed to create node";
    return { success: false, error: message };
  }
}

const updateNodeSchema = z.object({
  nodeId: z.string().uuid(),
  code: z.string().min(1),
  name: z.string().min(2).optional(),
  nameAr: z.string().optional(),
  description: z.string().optional(),
  descriptionAr: z.string().optional(),
  parentId: optionalUuidNullable.optional(),
  color: optionalHexColor,
  status: z.nativeEnum(Status).optional(),
  ownerUserId: optionalUserIdNullableStrict.optional(),
});

export async function updateOrgAdminNode(data: z.infer<typeof updateNodeSchema>) {
  const session = await requireOrgAdmin();
  const parsedResult = updateNodeSchema.safeParse(data);
  if (!parsedResult.success) {
    return {
      success: false,
      error: "Validation failed",
      issues: zodIssues(parsedResult.error),
    };
  }

  const parsed = parsedResult.data;

  const existing = await (prisma.node as any).findFirst({
    where: {
      id: parsed.nodeId,
      orgId: session.user.orgId,
      deletedAt: null,
    },
    select: {
      id: true,
      nodeType: { select: { id: true, code: true } },
    },
  });

  if (!existing) return { success: false, error: "Node not found." };

  const { enabled, nodeType } = await resolveEnabledNodeTypeByCode({ orgId: session.user.orgId, code: parsed.code });
  if (!nodeType || nodeType.id !== existing.nodeType.id) {
    return { success: false, error: "Node type mismatch." };
  }

  const directHigher = getDirectHigherEnabledNodeType({ enabled, currentCode: String(nodeType.code) });
  const nextParentId = typeof parsed.parentId === "undefined" ? undefined : parsed.parentId;

  if (typeof nextParentId !== "undefined") {
    const parentId = nextParentId ?? null;
    if (directHigher) {
      if (!parentId) {
        return {
          success: false,
          error: "A parent node is required for this node type.",
          issues: [{ path: ["parentId"], message: "Parent is required." } satisfies ActionValidationIssue],
        };
      }

      const parent = await (prisma.node as any).findFirst({
        where: {
          id: parentId,
          orgId: session.user.orgId,
          deletedAt: null,
        },
        select: {
          id: true,
          nodeType: { select: { code: true } },
        },
      });
      if (!parent) {
        return {
          success: false,
          error: "Selected parent was not found.",
          issues: [{ path: ["parentId"], message: "Selected parent was not found." } satisfies ActionValidationIssue],
        };
      }

      if (String(parent.nodeType.code) !== String(directHigher.code)) {
        return {
          success: false,
          error: "Selected parent has an invalid node type.",
          issues: [{ path: ["parentId"], message: "Selected parent has an invalid node type." } satisfies ActionValidationIssue],
        };
      }
    } else if (parentId) {
      return {
        success: false,
        error: "This node type cannot have a parent.",
        issues: [{ path: ["parentId"], message: "This node type cannot have a parent." } satisfies ActionValidationIssue],
      };
    }
  }

  if (typeof parsed.ownerUserId !== "undefined" && parsed.ownerUserId) {
    const owner = await prisma.user.findFirst({
      where: {
        id: parsed.ownerUserId,
        orgId: session.user.orgId,
        deletedAt: null,
      },
      select: { id: true },
    });
    if (!owner) {
      return {
        success: false,
        error: "Selected owner was not found.",
        issues: [{ path: ["ownerUserId"], message: "Selected owner was not found." } satisfies ActionValidationIssue],
      };
    }
  }

  try {
    const node = await (prisma.node as any).update({
      where: { id: parsed.nodeId },
      data: {
        ...(typeof parsed.name === "string" ? { name: parsed.name } : {}),
        ...(typeof parsed.nameAr === "string" ? { nameAr: parsed.nameAr || null } : {}),
        ...(typeof parsed.description !== "undefined" ? { description: parsed.description || null } : {}),
        ...(typeof parsed.descriptionAr !== "undefined" ? { descriptionAr: parsed.descriptionAr || null } : {}),
        ...(typeof parsed.parentId !== "undefined" ? { parentId: parsed.parentId } : {}),
        ...(typeof parsed.color !== "undefined" ? { color: parsed.color } : {}),
        ...(typeof parsed.status !== "undefined" ? { status: parsed.status } : {}),
        ...(typeof parsed.ownerUserId !== "undefined" ? { ownerUserId: parsed.ownerUserId } : {}),
      },
      select: {
        id: true,
        name: true,
        nameAr: true,
        description: true,
        descriptionAr: true,
        color: true,
        status: true,
        parentId: true,
        createdAt: true,
      },
    });

    return { success: true, node };
  } catch (error: unknown) {
    console.error("Failed to update node:", error);
    const message = error instanceof Error ? error.message : "Failed to update node";
    return { success: false, error: message };
  }
}

export async function updateOrgAdminDepartment(data: z.infer<typeof updateOrgDepartmentSchema>) {
  const session = await requireOrgAdmin();
  const parsedResult = updateOrgDepartmentSchema.safeParse(data);
  if (!parsedResult.success) {
    return {
      success: false,
      error: "Validation failed",
      issues: zodIssues(parsedResult.error),
    };
  }

  const parsed = parsedResult.data;

  try {
    const existing = await (prisma.department as any).findFirst({
      where: {
        id: parsed.departmentId,
        orgId: session.user.orgId,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!existing) return { success: false, error: "Department not found." };

    const department = await (prisma.department as any).update({
      where: { id: parsed.departmentId },
      data: {
        name: parsed.name,
        nameAr: parsed.nameAr || null,
      },
      select: { id: true, name: true, nameAr: true, createdAt: true },
    });

    return { success: true, department };
  } catch (error: unknown) {
    console.error("Failed to update department:", error);
    const message = error instanceof Error ? error.message : "Failed to update department";
    return { success: false, error: message };
  }
}

export async function deleteOrgAdminDepartment(data: z.infer<typeof deleteOrgDepartmentSchema>) {
  const session = await requireOrgAdmin();
  const parsedResult = deleteOrgDepartmentSchema.safeParse(data);
  if (!parsedResult.success) {
    return {
      success: false,
      error: "Validation failed",
      issues: zodIssues(parsedResult.error),
    };
  }

  const parsed = parsedResult.data;

  try {
    const existing = await (prisma.department as any).findFirst({
      where: {
        id: parsed.departmentId,
        orgId: session.user.orgId,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!existing) return { success: false, error: "Department not found." };

    await (prisma.department as any).update({
      where: { id: parsed.departmentId },
      data: { deletedAt: new Date() },
      select: { id: true },
    });

    return { success: true };
  } catch (error: unknown) {
    console.error("Failed to delete department:", error);
    const message = error instanceof Error ? error.message : "Failed to delete department";
    return { success: false, error: message };
  }
}

export async function getOrgAdminDepartments() {
  const session = await requireOrgAdmin();

  return (prisma.department as any).findMany({
    where: {
      orgId: session.user.orgId,
      deletedAt: null,
    },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      nameAr: true,
      createdAt: true,
      _count: {
        select: {
          users: true,
        },
      },
    },
  });
}

export async function getOrgAdminManagerOptions() {
  const session = await requireOrgAdmin();

  return prisma.user.findMany({
    where: {
      orgId: session.user.orgId,
      deletedAt: null,
      role: {
        in: managerEligibleRoles as unknown as Role[],
      },
    },
    orderBy: [{ role: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      role: true,
    },
  });
}

function validateManagerAssignment(input: { userRole: Role; managerRole: Role | null }) {
  if (!input.managerRole) return;

  if (!managerEligibleRoles.includes(input.managerRole as (typeof managerEligibleRoles)[number])) {
    throw new Error("Manager must be MANAGER, PMO, EXECUTIVE, or ADMIN.");
  }

  if (input.userRole === Role.ADMIN) {
    throw new Error("ADMIN users cannot have a manager.");
  }

  if (roleRank(input.managerRole) < roleRank(input.userRole)) {
    throw new Error("Manager must be in a higher or equal position than the user.");
  }
}

export async function createOrgAdminUser(data: z.infer<typeof createOrgUserSchema>) {
  const session = await requireOrgAdmin();
  const parsedResult = createOrgUserSchema.safeParse(data);
  if (!parsedResult.success) {
    return {
      success: false,
      error: "Validation failed",
      issues: zodIssues(parsedResult.error),
    };
  }

  const parsed = parsedResult.data;

  if (parsed.role === ("SUPER_ADMIN" as unknown as Role)) {
    return { success: false, error: "Cannot create SUPER_ADMIN users inside an organization." };
  }

  let managerRole: Role | null = null;
  if (parsed.managerId) {
    const manager = await prisma.user.findFirst({
      where: {
        id: parsed.managerId,
        orgId: session.user.orgId,
        deletedAt: null,
      },
      select: { role: true },
    });
    if (!manager) return { success: false, error: "Selected manager was not found." };
    managerRole = manager.role;
  }

  try {
    validateManagerAssignment({ userRole: parsed.role, managerRole });

    if (parsed.departmentId) {
      const department = await prisma.department.findFirst({
        where: {
          id: parsed.departmentId,
          orgId: session.user.orgId,
          deletedAt: null,
        },
        select: { id: true },
      });
      if (!department) return { success: false, error: "Selected department was not found." };
    }

    const result = await auth.api.signUpEmail({
      body: {
        email: parsed.email,
        password: parsed.password,
        name: parsed.name,
        role: parsed.role,
        orgId: session.user.orgId,
      },
    });

    if (!result?.user?.id) {
      return { success: false, error: "Failed to create user." };
    }

    await prisma.user.update({
      where: { id: result.user.id },
      data: {
        managerId: parsed.managerId ?? null,
        departmentId: parsed.departmentId ?? null,
      },
      select: { id: true },
    });

    return { success: true, userId: result.user.id };
  } catch (error: unknown) {
    console.error("Failed to create org user:", error);
    const message = error instanceof Error ? error.message : "Failed to create user";
    return { success: false, error: message };
  }
}

export async function updateOrgAdminUser(data: z.infer<typeof updateOrgUserSchema>) {
  const session = await requireOrgAdmin();
  const parsedResult = updateOrgUserSchema.safeParse(data);
  if (!parsedResult.success) {
    return {
      success: false,
      error: "Validation failed",
      issues: zodIssues(parsedResult.error),
    };
  }

  const parsed = parsedResult.data;

  const existing = await prisma.user.findFirst({
    where: {
      id: parsed.userId,
      orgId: session.user.orgId,
      deletedAt: null,
    },
    select: {
      id: true,
      role: true,
    },
  });

  if (!existing) {
    return { success: false, error: "User not found." };
  }

  const nextRole = parsed.role ?? existing.role;

  if (nextRole === ("SUPER_ADMIN" as unknown as Role)) {
    return { success: false, error: "Cannot assign SUPER_ADMIN role." };
  }

  let managerRole: Role | null = null;
  if (parsed.managerId) {
    const manager = await prisma.user.findFirst({
      where: {
        id: parsed.managerId,
        orgId: session.user.orgId,
        deletedAt: null,
      },
      select: { role: true },
    });
    if (!manager) return { success: false, error: "Selected manager was not found." };
    managerRole = manager.role;
  }

  try {
    validateManagerAssignment({ userRole: nextRole, managerRole });

    if (parsed.departmentId) {
      const department = await prisma.department.findFirst({
        where: {
          id: parsed.departmentId,
          orgId: session.user.orgId,
          deletedAt: null,
        },
        select: { id: true },
      });
      if (!department) return { success: false, error: "Selected department was not found." };
    }

    const user = await prisma.user.update({
      where: { id: parsed.userId },
      data: {
        ...(typeof parsed.name === "string" ? { name: parsed.name } : {}),
        ...(typeof parsed.email === "string" ? { email: parsed.email } : {}),
        ...(typeof parsed.role !== "undefined" ? { role: parsed.role } : {}),
        ...(typeof parsed.managerId !== "undefined" ? { managerId: parsed.managerId } : {}),
        ...(typeof parsed.departmentId !== "undefined" ? { departmentId: parsed.departmentId } : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        managerId: true,
        departmentId: true,
        createdAt: true,
        manager: { select: { id: true, name: true, role: true } },
        department: { select: { id: true, name: true } },
      },
    });

    return { success: true, user };
  } catch (error: unknown) {
    console.error("Failed to update org user:", error);
    const message = error instanceof Error ? error.message : "Failed to update user";
    return { success: false, error: message };
  }
}

export async function deleteOrgAdminUser(data: z.infer<typeof deleteOrgUserSchema>) {
  const session = await requireOrgAdmin();
  const parsedResult = deleteOrgUserSchema.safeParse(data);
  if (!parsedResult.success) {
    return {
      success: false,
      error: "Validation failed",
      issues: zodIssues(parsedResult.error),
    };
  }

  const parsed = parsedResult.data;

  try {
    const target = await prisma.user.findFirst({
      where: {
        id: parsed.userId,
        orgId: session.user.orgId,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!target) return { success: false, error: "User not found." };

    await prisma.user.update({
      where: { id: parsed.userId },
      data: { deletedAt: new Date() },
      select: { id: true },
    });

    return { success: true };
  } catch (error: unknown) {
    console.error("Failed to delete org user:", error);
    const message = error instanceof Error ? error.message : "Failed to delete user";
    return { success: false, error: message };
  }
}

export async function deleteOrgAdminNode(data: { nodeId: string }) {
  const session = await requireOrgAdmin();
  const target = await (prisma.node as any).findFirst({
    where: { id: data.nodeId, orgId: session.user.orgId, deletedAt: null },
    select: { id: true },
  });
  if (!target) return { success: false, error: "Node not found." };
  await (prisma.node as any).update({
    where: { id: data.nodeId },
    data: { deletedAt: new Date() },
  });
  return { success: true };
}
