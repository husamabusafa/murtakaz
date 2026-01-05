"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getMyEffectiveKpiIds } from "@/actions/responsibilities";
import type { Role, Status } from "@prisma/client";

const prismaNode = (prisma as unknown as { node: unknown }).node as {
  findMany: <T>(args: unknown) => Promise<T[]>;
  findFirst: <T>(args: unknown) => Promise<T | null>;
};

const prismaKpiDefinition = (prisma as unknown as { kpiDefinition: unknown }).kpiDefinition as {
  findMany: <T>(args: unknown) => Promise<T[]>;
};

const prismaResponsibilityNodeAssignment = (prisma as unknown as { responsibilityNodeAssignment: unknown })
  .responsibilityNodeAssignment as {
  findMany: <T>(args: unknown) => Promise<T[]>;
};

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

function buildAncestorIds(input: { startIds: string[]; parentById: Map<string, string | null> }) {
  const out = new Set<string>();

  for (const start of input.startIds) {
    let current: string | null | undefined = start;
    while (current) {
      if (out.has(current)) break;
      out.add(current);
      current = input.parentById.get(current) ?? null;
    }
  }

  return out;
}

async function requireOrgMember() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) throw new Error("Unauthorized");
  if (!session.user.orgId) throw new Error("Unauthorized: Missing organization scope");
  return session;
}

async function getEnabledNodeTypesByOrder(orgId: string) {
  const rows = await prisma.organizationNodeType.findMany({
    where: { orgId },
    orderBy: { nodeType: { levelOrder: "asc" } },
    select: {
      nodeType: {
        select: {
          id: true,
          code: true,
          displayName: true,
          levelOrder: true,
        },
      },
    },
  });
  return rows.map((r) => r.nodeType);
}

function normalizeNodeTypeCode(code: string) {
  return code.trim().toUpperCase();
}

async function resolveEnabledNodeTypeByCode(input: { orgId: string; code: string }) {
  const enabled = await getEnabledNodeTypesByOrder(input.orgId);
  const normalized = normalizeNodeTypeCode(input.code);
  const found = enabled.find((t) => String(t.code) === normalized);
  return { enabled, nodeType: found ?? null };
}

function getDirectLowerEnabledNodeType(input: { enabled: Array<{ code: unknown }>; currentCode: string }) {
  const normalized = normalizeNodeTypeCode(input.currentCode);
  const idx = input.enabled.findIndex((t) => String(t.code) === normalized);
  if (idx < 0) return null;
  return input.enabled[idx + 1] ?? null;
}

async function getVisibility(input: { orgId: string; userId: string; role: unknown }) {
  const role = String(input.role ?? "");

  const allNodes = await prismaNode.findMany<{ id: string; parentId: string | null; nodeTypeId: string }>({
    where: { orgId: input.orgId, deletedAt: null },
    select: { id: true, parentId: true, nodeTypeId: true },
  });

  const parentById = new Map<string, string | null>();
  for (const n of allNodes) parentById.set(n.id, n.parentId);

  if (role === "ADMIN") {
    return {
      isAdmin: true,
      visibleNodeIds: new Set(allNodes.map((n) => n.id)),
      effectiveKpiIds: null as string[] | null,
      allNodes,
      parentById,
    };
  }

  const assignedRoots = await prismaResponsibilityNodeAssignment.findMany<{ rootNodeId: string }>({
    where: { orgId: input.orgId, assignedToId: input.userId },
    select: { rootNodeId: true },
  });

  const assignedNodeIds = new Set<string>();
  for (const a of assignedRoots) {
    for (const id of buildSubtreeIds({ rootId: a.rootNodeId, nodes: allNodes })) assignedNodeIds.add(id);
  }

  const effectiveKpiIds = await getMyEffectiveKpiIds();

  const primaryNodes = effectiveKpiIds.length
    ? await prismaKpiDefinition.findMany<{ primaryNodeId: string }>({
        where: { orgId: input.orgId, id: { in: effectiveKpiIds } },
        select: { primaryNodeId: true },
      })
    : [];

  const kpiNodeIds = primaryNodes.map((p) => p.primaryNodeId);
  const ancestorIds = buildAncestorIds({ startIds: kpiNodeIds, parentById });

  const visibleNodeIds = new Set<string>();
  for (const id of assignedNodeIds) visibleNodeIds.add(id);
  for (const id of ancestorIds) visibleNodeIds.add(id);

  return { isAdmin: false, visibleNodeIds, effectiveKpiIds, allNodes, parentById };
}

const getNodesByTypeSchema = z.object({ code: z.string().min(1) });

export async function getOrgNodesByType(data: z.infer<typeof getNodesByTypeSchema>) {
  const session = await requireOrgMember();
  const parsed = getNodesByTypeSchema.safeParse(data);
  if (!parsed.success) return [];

  const { nodeType } = await resolveEnabledNodeTypeByCode({ orgId: session.user.orgId, code: parsed.data.code });
  if (!nodeType) return [];

  const visibility = await getVisibility({ orgId: session.user.orgId, userId: session.user.id, role: session.user.role });

  return prismaNode.findMany<{
    id: string;
    name: string;
    description: string | null;
    color: string;
    status: Status;
    parentId: string | null;
    createdAt: Date;
    parent: { id: string; name: string } | null;
    _count: { children: number; kpis: number };
  }>({
    where: {
      orgId: session.user.orgId,
      nodeTypeId: nodeType.id,
      deletedAt: null,
      ...(visibility.isAdmin ? {} : { id: { in: Array.from(visibility.visibleNodeIds) } }),
    },
    orderBy: [{ createdAt: "desc" }],
    select: {
      id: true,
      name: true,
      description: true,
      color: true,
      status: true,
      parentId: true,
      createdAt: true,
      parent: { select: { id: true, name: true } },
      _count: { select: { children: true, kpis: true } },
    },
  });
}

const getNodeDetailSchema = z.object({ nodeId: z.string().uuid(), code: z.string().min(1) });

export async function getOrgNodeDetail(data: z.infer<typeof getNodeDetailSchema>) {
  const session = await requireOrgMember();
  const parsed = getNodeDetailSchema.safeParse(data);
  if (!parsed.success) return null;

  const { enabled, nodeType } = await resolveEnabledNodeTypeByCode({ orgId: session.user.orgId, code: parsed.data.code });
  if (!nodeType) return null;

  const visibility = await getVisibility({ orgId: session.user.orgId, userId: session.user.id, role: session.user.role });

  if (!visibility.isAdmin && !visibility.visibleNodeIds.has(parsed.data.nodeId)) return null;

  const node = await prismaNode.findFirst<{
    id: string;
    name: string;
    description: string | null;
    color: string;
    status: Status;
    parentId: string | null;
    createdAt: Date;
    parent: { id: string; name: string; color: string; status: Status } | null;
    nodeType: { id: string; code: unknown; displayName: string; levelOrder: number };
  }>({
    where: { id: parsed.data.nodeId, orgId: session.user.orgId, deletedAt: null, nodeTypeId: nodeType.id },
    select: {
      id: true,
      name: true,
      description: true,
      color: true,
      status: true,
      parentId: true,
      createdAt: true,
      parent: { select: { id: true, name: true, color: true, status: true } },
      nodeType: { select: { id: true, code: true, displayName: true, levelOrder: true } },
    },
  });

  if (!node) return null;

  const lower = getDirectLowerEnabledNodeType({ enabled, currentCode: String(node.nodeType.code) });
  const lowerTypeId = lower ? (enabled.find((t) => String(t.code) === String(lower.code)) as { id: string } | undefined)?.id : undefined;

  const children = lowerTypeId
    ? await prismaNode.findMany<{
        id: string;
        name: string;
        description: string | null;
        color: string;
        status: Status;
        _count: { children: number; kpis: number };
      }>({
        where: {
          orgId: session.user.orgId,
          deletedAt: null,
          parentId: node.id,
          nodeTypeId: lowerTypeId,
          ...(visibility.isAdmin ? {} : { id: { in: Array.from(visibility.visibleNodeIds) } }),
        },
        orderBy: [{ name: "asc" }],
        select: {
          id: true,
          name: true,
          description: true,
          color: true,
          status: true,
          _count: { select: { children: true, kpis: true } },
        },
      })
    : [];

  const subtreeIds = buildSubtreeIds({ rootId: node.id, nodes: visibility.allNodes.map((n) => ({ id: n.id, parentId: n.parentId })) });

  const kpis = await prismaKpiDefinition.findMany<{
    id: string;
    name: string;
    description: string | null;
    status: unknown;
    unit: string | null;
    baselineValue: number | null;
    targetValue: number | null;
    primaryNodeId: string;
    primaryNode: { id: string; name: string; nodeType: { code: unknown; displayName: string } };
    ownerUser: { id: string; name: string; role: Role } | null;
  }>({
    where: {
      orgId: session.user.orgId,
      primaryNodeId: { in: subtreeIds },
      ...(visibility.isAdmin
        ? {}
        : {
            id: {
              in: (visibility.effectiveKpiIds ?? []) as string[],
            },
          }),
    },
    orderBy: [{ name: "asc" }],
    select: {
      id: true,
      name: true,
      description: true,
      status: true,
      unit: true,
      baselineValue: true,
      targetValue: true,
      primaryNodeId: true,
      primaryNode: { select: { id: true, name: true, nodeType: { select: { code: true, displayName: true } } } },
      ownerUser: { select: { id: true, name: true, role: true } },
    },
  });

  return { node, children, subtreeIds, kpis, enabledNodeTypes: enabled };
}
