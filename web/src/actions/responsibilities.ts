"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { ActionValidationIssue } from "@/types/actions";

const prismaNode = (prisma as unknown as { node: unknown }).node as {
  findMany: <T>(args: unknown) => Promise<T[]>;
  findFirst: <T>(args: unknown) => Promise<T | null>;
};

const prismaKpiDefinition = (prisma as unknown as { kpiDefinition: unknown }).kpiDefinition as {
  findMany: <T>(args: unknown) => Promise<T[]>;
  count: (args: unknown) => Promise<number>;
};

const prismaResponsibilityNodeAssignment = (prisma as unknown as { responsibilityNodeAssignment: unknown })
  .responsibilityNodeAssignment as {
  upsert: <T>(args: unknown) => Promise<T>;
  findMany: <T>(args: unknown) => Promise<T[]>;
  deleteMany: (args: unknown) => Promise<unknown>;
};

const prismaResponsibilityKpiAssignment = (prisma as unknown as { responsibilityKpiAssignment: unknown })
  .responsibilityKpiAssignment as {
  createMany: (args: unknown) => Promise<unknown>;
  findMany: <T>(args: unknown) => Promise<T[]>;
  deleteMany: (args: unknown) => Promise<unknown>;
};

function requireResponsibilityModels() {
  if (!prismaResponsibilityNodeAssignment || !prismaResponsibilityKpiAssignment) {
    throw new Error("unexpectedError");
  }
}

function zodIssues(error: z.ZodError): ActionValidationIssue[] {
  return error.issues.map((i) => ({
    path: i.path.map((p) => (typeof p === "string" || typeof p === "number" ? p : String(p))),
    message: i.message,
  }));
}

async function requireOrgMember() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) throw new Error("unauthorized");
  if (!session.user.orgId) throw new Error("unauthorizedMissingOrg");
  return session;
}

function assertCanUseResponsibilities(role: unknown) {
  const r = String(role ?? "");
  if (r === "SUPER_ADMIN") throw new Error("unauthorized");
}

function buildSubtreeIds(input: { rootId: string; nodes: Array<{ id: string; parentId: string | null }> }) {
  const childrenByParent = new Map<string, string[]>();
  for (const n of input.nodes) {
    if (!n.parentId) continue;
    const list = childrenByParent.get(n.parentId) ?? [];
    list.push(n.id);
    childrenByParent.set(n.parentId, list);
  }

  const ids: string[] = [];
  const queue: string[] = [input.rootId];
  const seen = new Set<string>();

  while (queue.length) {
    const current = queue.shift();
    if (!current) break;
    if (seen.has(current)) continue;
    seen.add(current);
    ids.push(current);
    const children = childrenByParent.get(current) ?? [];
    for (const child of children) queue.push(child);
  }

  return ids;
}

const assignModeSchema = z.enum(["node", "kpi"]);

export async function getMyDirectReports() {
  const session = await requireOrgMember();
  assertCanUseResponsibilities(session.user.role);

  return prisma.user.findMany({
    where: {
      orgId: session.user.orgId,
      deletedAt: null,
      managerId: session.user.id,
    },
    orderBy: [{ role: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      role: true,
      email: true,
    },
  });
}

const searchNodesSchema = z.object({
  query: z.string().optional(),
});

export async function getAssignableNodePickerNodes() {
  const session = await requireOrgMember();
  assertCanUseResponsibilities(session.user.role);

  return prismaNode.findMany<{
    id: string;
    name: string;
    parentId: string | null;
    color: string;
    nodeType: { displayName: string; levelOrder: number };
  }>({
    where: {
      orgId: session.user.orgId,
      deletedAt: null,
    },
    orderBy: [{ nodeType: { levelOrder: "asc" } }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      parentId: true,
      color: true,
      nodeType: { select: { displayName: true, levelOrder: true } },
    },
  });
}

export async function searchAssignableNodes(input: z.infer<typeof searchNodesSchema>) {
  const session = await requireOrgMember();
  assertCanUseResponsibilities(session.user.role);
  const parsed = searchNodesSchema.safeParse(input);
  if (!parsed.success) return [];

  const q = parsed.data.query?.trim();

  return prismaNode.findMany<{
    id: string;
    name: string;
    color: string;
    parentId: string | null;
    nodeType: { code: string; displayName: string; levelOrder: number };
    parent: { id: string; name: string; nodeType: { displayName: string } } | null;
    _count: { children: number; kpis: number };
  }>({
    where: {
      orgId: session.user.orgId,
      deletedAt: null,
      ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
    },
    orderBy: [{ nodeType: { levelOrder: "asc" } }, { name: "asc" }],
    take: 50,
    select: {
      id: true,
      name: true,
      color: true,
      parentId: true,
      nodeType: { select: { code: true, displayName: true, levelOrder: true } },
      parent: { select: { id: true, name: true, nodeType: { select: { code: true, displayName: true } } } },
      _count: { select: { children: true, kpis: true } },
    },
  });
}

const searchKpisSchema = z.object({
  query: z.string().optional(),
});

export async function searchAssignableKpis(input: z.infer<typeof searchKpisSchema>) {
  const session = await requireOrgMember();
  assertCanUseResponsibilities(session.user.role);
  const parsed = searchKpisSchema.safeParse(input);
  if (!parsed.success) return [];

  const q = parsed.data.query?.trim();

  return prismaKpiDefinition.findMany<{
    id: string;
    name: string;
    unit: string | null;
    primaryNode: { id: string; name: string; nodeType: { displayName: string } };
  }>({
    where: {
      orgId: session.user.orgId,
      ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
    },
    orderBy: [{ name: "asc" }],
    take: 50,
    select: {
      id: true,
      name: true,
      unit: true,
      primaryNode: { select: { id: true, name: true, nodeType: { select: { code: true, displayName: true } } } },
    },
  });
}

const previewNodeCascadeSchema = z.object({
  rootNodeId: z.string().uuid(),
});

export async function previewNodeCascade(input: z.infer<typeof previewNodeCascadeSchema>) {
  const session = await requireOrgMember();
  assertCanUseResponsibilities(session.user.role);
  const parsed = previewNodeCascadeSchema.safeParse(input);
  if (!parsed.success) return null;

  const root = await prismaNode.findFirst<{
    id: string;
    name: string;
    color: string;
    nodeType: { displayName: string; code: string };
  }>({
    where: { id: parsed.data.rootNodeId, orgId: session.user.orgId, deletedAt: null },
    select: {
      id: true,
      name: true,
      color: true,
      nodeType: { select: { displayName: true, code: true } },
    },
  });
  if (!root) return null;

  const nodes = await prismaNode.findMany<{ id: string; parentId: string | null }>({
    where: { orgId: session.user.orgId, deletedAt: null },
    select: { id: true, parentId: true },
  });

  const subtreeIds = buildSubtreeIds({ rootId: root.id, nodes });

  const kpis = await prismaKpiDefinition.findMany<{
    id: string;
    name: string;
    primaryNode: { id: string; name: string; nodeType: { code: string; displayName: string } };
  }>({
    where: { orgId: session.user.orgId, primaryNodeId: { in: subtreeIds } },
    orderBy: [{ name: "asc" }],
    take: 10,
    select: {
      id: true,
      name: true,
      primaryNode: { select: { id: true, name: true, nodeType: { select: { code: true, displayName: true } } } },
    },
  });

  return {
    root,
    counts: {
      nodes: subtreeIds.length,
      kpis: await prismaKpiDefinition.count({ where: { orgId: session.user.orgId, primaryNodeId: { in: subtreeIds } } }),
    },
    sampleKpis: kpis,
  };
}

const assignSchema = z
  .object({
    mode: assignModeSchema,
    assignedToId: z.string().min(1),
    rootNodeId: z.string().uuid().optional(),
    kpiIds: z.array(z.string().uuid()).optional(),
  })
  .superRefine((val, ctx) => {
    if (val.mode === "node") {
      if (!val.rootNodeId) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "rootNodeId is required", path: ["rootNodeId"] });
    }
    if (val.mode === "kpi") {
      if (!val.kpiIds?.length) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Select at least one KPI", path: ["kpiIds"] });
    }
  });

async function assertAssignableUser(input: { orgId: string; managerId: string; targetUserId: string }) {
  const user = await prisma.user.findFirst({
    where: { id: input.targetUserId, orgId: input.orgId, deletedAt: null, managerId: input.managerId },
    select: { id: true },
  });
  if (!user) throw new Error("onlyAssignToDirectReportsDesc");
}

export async function assignResponsibilities(data: z.infer<typeof assignSchema>) {
  const session = await requireOrgMember();
  assertCanUseResponsibilities(session.user.role);
  const parsed = assignSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false as const, error: "validationFailed", issues: zodIssues(parsed.error) };
  }

  const orgId = session.user.orgId;
  await assertAssignableUser({ orgId, managerId: session.user.id, targetUserId: parsed.data.assignedToId });

  try {
    requireResponsibilityModels();
    if (parsed.data.mode === "node") {
      const rootNodeId = parsed.data.rootNodeId as string;
      const root = await prismaNode.findFirst({ where: { id: rootNodeId, orgId, deletedAt: null }, select: { id: true } });
      if (!root) return { success: false as const, error: "nodeNotFound" };

      await prismaResponsibilityNodeAssignment.upsert({
        where: { responsibility_node_unique: { assignedToId: parsed.data.assignedToId, rootNodeId } },
        create: {
          orgId,
          rootNodeId,
          assignedToId: parsed.data.assignedToId,
          assignedById: session.user.id,
        },
        update: {
          assignedById: session.user.id,
        },
        select: { id: true },
      });

      return { success: true as const };
    }

    const kpiIds = parsed.data.kpiIds ?? [];
    const existing = await prismaKpiDefinition.findMany<{ id: string }>({
      where: { orgId, id: { in: kpiIds } },
      select: { id: true },
    });
    const existingIds = new Set(existing.map((k) => k.id));
    const missing = kpiIds.filter((id) => !existingIds.has(id));
    if (missing.length) return { success: false as const, error: "kpiNotFound" };

    await prismaResponsibilityKpiAssignment.createMany({
      data: kpiIds.map((kpiId) => ({
        orgId,
        kpiId,
        assignedToId: parsed.data.assignedToId,
        assignedById: session.user.id,
      })),
      skipDuplicates: true,
    });

    return { success: true as const };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to assign";
    return { success: false as const, error: message };
  }
}

const unassignSchema = z.object({
  mode: assignModeSchema,
  assignedToId: z.string().min(1),
  rootNodeId: z.string().uuid().optional(),
  kpiId: z.string().uuid().optional(),
});

export async function unassignResponsibility(data: z.infer<typeof unassignSchema>) {
  const session = await requireOrgMember();
  assertCanUseResponsibilities(session.user.role);
  const parsed = unassignSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false as const, error: "validationFailed", issues: zodIssues(parsed.error) };
  }

  const orgId = session.user.orgId;
  await assertAssignableUser({ orgId, managerId: session.user.id, targetUserId: parsed.data.assignedToId });

  try {
    requireResponsibilityModels();
    if (parsed.data.mode === "node") {
      if (!parsed.data.rootNodeId) return { success: false as const, error: "rootNodeId is required" };
      await prismaResponsibilityNodeAssignment.deleteMany({
        where: { orgId, assignedToId: parsed.data.assignedToId, rootNodeId: parsed.data.rootNodeId },
      });
      return { success: true as const };
    }

    if (!parsed.data.kpiId) return { success: false as const, error: "kpiId is required" };
    await prismaResponsibilityKpiAssignment.deleteMany({
      where: { orgId, assignedToId: parsed.data.assignedToId, kpiId: parsed.data.kpiId },
    });
    return { success: true as const };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to unassign";
    return { success: false as const, error: message };
  }
}

const getAssignmentsSchema = z.object({ assignedToId: z.string().min(1) });

export async function getResponsibilitiesForUser(input: z.infer<typeof getAssignmentsSchema>) {
  const session = await requireOrgMember();
  assertCanUseResponsibilities(session.user.role);
  const parsed = getAssignmentsSchema.safeParse(input);
  if (!parsed.success) return null;

  const orgId = session.user.orgId;
  await assertAssignableUser({ orgId, managerId: session.user.id, targetUserId: parsed.data.assignedToId });

  requireResponsibilityModels();

  const [nodeAssignments, kpiAssignments] = await Promise.all([
    prismaResponsibilityNodeAssignment.findMany<{
      id: string;
      rootNode: { id: string; name: string; color: string; nodeType: { code: string; displayName: string } };
      assignedBy: { id: string; name: string; role: string };
      createdAt: Date;
    }>({
      where: { orgId, assignedToId: parsed.data.assignedToId },
      orderBy: [{ createdAt: "desc" }],
      select: {
        id: true,
        rootNode: { select: { id: true, name: true, color: true, nodeType: { select: { code: true, displayName: true } } } },
        assignedBy: { select: { id: true, name: true, role: true } },
        createdAt: true,
      },
    }),
    prismaResponsibilityKpiAssignment.findMany<{
      id: string;
      kpi: {
        id: string;
        name: string;
        unit: string | null;
        primaryNode: { id: string; name: string; nodeType: { code: string; displayName: string } };
      };
      assignedBy: { id: string; name: string; role: string };
      createdAt: Date;
    }>({
      where: { orgId, assignedToId: parsed.data.assignedToId },
      orderBy: [{ createdAt: "desc" }],
      select: {
        id: true,
        kpi: { select: { id: true, name: true, unit: true, primaryNode: { select: { id: true, name: true, nodeType: { select: { code: true, displayName: true } } } } } },
        assignedBy: { select: { id: true, name: true, role: true } },
        createdAt: true,
      },
    }),
  ]);

  return { nodeAssignments, kpiAssignments };
}

// Used for KPI visibility enforcement.
export async function getMyEffectiveKpiIds() {
  const session = await requireOrgMember();
  const orgId = session.user.orgId;

  requireResponsibilityModels();

  const [nodeAssignments, directKpis, ownedKpis, nodes] = await Promise.all([
    prismaResponsibilityNodeAssignment.findMany<{ rootNodeId: string }>({
      where: { orgId, assignedToId: session.user.id },
      select: { rootNodeId: true },
    }),
    prismaResponsibilityKpiAssignment.findMany<{ kpiId: string }>({
      where: { orgId, assignedToId: session.user.id },
      select: { kpiId: true },
    }),
    prismaKpiDefinition.findMany<{ id: string }>({
      where: { orgId, ownerUserId: session.user.id },
      select: { id: true },
    }),
    prismaNode.findMany<{ id: string; parentId: string | null }>({
      where: { orgId, deletedAt: null },
      select: { id: true, parentId: true },
    }),
  ]);

  const allNodeIds = new Set<string>();
  for (const a of nodeAssignments) {
    const subtree = buildSubtreeIds({ rootId: a.rootNodeId, nodes });
    subtree.forEach((id) => allNodeIds.add(id));
  }

  const kpisFromNodes = allNodeIds.size
    ? await prismaKpiDefinition.findMany<{ id: string }>({
        where: { orgId, primaryNodeId: { in: Array.from(allNodeIds) } },
        select: { id: true },
      })
    : [];

  const ids = new Set<string>();
  directKpis.forEach((k: { kpiId: string }) => ids.add(k.kpiId));
  ownedKpis.forEach((k: { id: string }) => ids.add(k.id));
  kpisFromNodes.forEach((k: { id: string }) => ids.add(k.id));

  return Array.from(ids);
}
