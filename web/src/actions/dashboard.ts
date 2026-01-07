"use server";

import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getMyEffectiveKpiIds } from "@/actions/responsibilities";
import { KpiValueStatus, type Role, type Status } from "@prisma/client";

const prismaOrganization = (prisma as unknown as { organization: unknown }).organization as {
  findFirst: <T>(args: unknown) => Promise<T | null>;
};

const prismaOrganizationNodeType = (prisma as unknown as { organizationNodeType: unknown }).organizationNodeType as {
  findMany: <T>(args: unknown) => Promise<T[]>;
};

const prismaNode = (prisma as unknown as { node: unknown }).node as {
  findMany: <T>(args: unknown) => Promise<T[]>;
};

const prismaKpiDefinition = (prisma as unknown as { kpiDefinition: unknown }).kpiDefinition as {
  findMany: <T>(args: unknown) => Promise<T[]>;
};

const prismaNodeAssignment = (prisma as unknown as { nodeAssignment: unknown }).nodeAssignment as {
  findMany: <T>(args: unknown) => Promise<T[]>;
};

const prismaResponsibilityNodeAssignment = (prisma as unknown as { responsibilityNodeAssignment: unknown })
  .responsibilityNodeAssignment as {
  findMany: <T>(args: unknown) => Promise<T[]>;
};

const prismaKpiValuePeriod = (prisma as unknown as { kpiValuePeriod: unknown }).kpiValuePeriod as {
  findMany: <T>(args: unknown) => Promise<T[]>;
};

const ROLE_RANK: Record<string, number> = {
  EMPLOYEE: 0,
  MANAGER: 1,
  PMO: 2,
  EXECUTIVE: 3,
  ADMIN: 4,
  SUPER_ADMIN: 5,
};

type KpiApprovalLevelCode = "MANAGER" | "PMO" | "EXECUTIVE" | "ADMIN";

function resolveRoleRank(role: unknown) {
  if (typeof role !== "string") return 0;
  return ROLE_RANK[role] ?? 0;
}

async function requireOrgMember() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) throw new Error("Unauthorized");
  if (!session.user.orgId) throw new Error("Unauthorized: Missing organization scope");
  return session;
}

function buildChildrenByParent(nodes: Array<{ id: string; parentId: string | null }>) {
  const childrenByParent = new Map<string, string[]>();
  for (const n of nodes) {
    if (!n.parentId) continue;
    const list = childrenByParent.get(n.parentId) ?? [];
    list.push(n.id);
    childrenByParent.set(n.parentId, list);
  }
  return childrenByParent;
}

function buildSubtreeIds(input: { rootId: string; childrenByParent: Map<string, string[]> }) {
  const out: string[] = [];
  const queue: string[] = [input.rootId];
  const seen = new Set<string>();

  while (queue.length) {
    const current = queue.shift();
    if (!current) break;
    if (seen.has(current)) continue;
    seen.add(current);
    out.push(current);
    for (const childId of input.childrenByParent.get(current) ?? []) {
      queue.push(childId);
    }
  }

  return out;
}

function daysBetweenUtc(now: Date, other: Date) {
  const ms = other.getTime() - now.getTime();
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}

function kpiStatusOrder(status: string) {
  if (status === "SUBMITTED") return 0;
  if (status === "DRAFT") return 1;
  if (status === "APPROVED") return 2;
  if (status === "LOCKED") return 3;
  return 4;
}

function formatMonthKey(d: Date) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function monthStartUtc(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 0, 0, 0, 0));
}

function addMonthsUtc(d: Date, months: number) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, 1, 0, 0, 0, 0));
}

function clampNumber(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export async function getMyDashboardData() {
  const session = await requireOrgMember();
  const orgId = session.user.orgId;
  const userId = session.user.id;
  const userRole = session.user.role;

  const isAdmin = String(userRole) === "ADMIN";

  const [org, enabledNodeTypesRows] = await Promise.all([
    prismaOrganization.findFirst<{ id: string; name: string; kpiApprovalLevel: KpiApprovalLevelCode }>({
      where: { id: orgId, deletedAt: null },
      select: { id: true, name: true, kpiApprovalLevel: true },
    }),
    prismaOrganizationNodeType.findMany<{
      nodeType: { id: string; code: unknown; displayName: string; levelOrder: number };
    }>({
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
    }),
  ]);

  const enabledNodeTypes = enabledNodeTypesRows.map((r) => r.nodeType);

  const approvalLevel = org?.kpiApprovalLevel ?? "MANAGER";
  const canApprove = resolveRoleRank(userRole) >= resolveRoleRank(approvalLevel);

  const effectiveKpiIds = isAdmin ? null : await getMyEffectiveKpiIds();

  const myKpis = effectiveKpiIds && effectiveKpiIds.length === 0
    ? []
    : await prismaKpiDefinition.findMany<{
        id: string;
        name: string;
        unit: string | null;
        targetValue: number | null;
        baselineValue: number | null;
        periodType: unknown;
        primaryNode: {
          id: string;
          name: string;
          nodeType: { code: unknown; displayName: string; levelOrder: number };
        };
        ownerUser: { id: string; name: string; role: Role } | null;
        values: Array<{
          calculatedValue: number | null;
          status: KpiValueStatus;
          periodEnd: Date;
          periodStart: Date;
        }>;
      }>({
        where: {
          orgId,
          ...(effectiveKpiIds ? { id: { in: effectiveKpiIds } } : {}),
        },
        orderBy: [{ name: "asc" }],
        select: {
          id: true,
          name: true,
          unit: true,
          targetValue: true,
          baselineValue: true,
          periodType: true,
          primaryNode: {
            select: {
              id: true,
              name: true,
              nodeType: { select: { code: true, displayName: true, levelOrder: true } },
            },
          },
          ownerUser: { select: { id: true, name: true, role: true } },
          values: {
            orderBy: [{ periodEnd: "desc" }],
            take: 1,
            select: {
              calculatedValue: true,
              status: true,
              periodEnd: true,
              periodStart: true,
            },
          },
        },
      });

  const now = new Date();

  const completion = (() => {
    const rows = myKpis
      .map((k) => {
        const latest = k.values[0] ?? null;
        const target = typeof k.targetValue === "number" && Number.isFinite(k.targetValue) && k.targetValue > 0 ? k.targetValue : null;
        const value = latest && typeof latest.calculatedValue === "number" && Number.isFinite(latest.calculatedValue) ? latest.calculatedValue : null;
        if (!target || value === null) return null;
        const pct = clampNumber((value / target) * 100, 0, 200);
        return { pct };
      })
      .filter((x): x is { pct: number } => Boolean(x));

    const buckets = {
      LT_60: 0,
      LT_90: 0,
      LT_110: 0,
      GTE_110: 0,
    };

    for (const r of rows) {
      if (r.pct < 60) buckets.LT_60 += 1;
      else if (r.pct < 90) buckets.LT_90 += 1;
      else if (r.pct < 110) buckets.LT_110 += 1;
      else buckets.GTE_110 += 1;
    }

    const avg = rows.length ? rows.reduce((sum, r) => sum + r.pct, 0) / rows.length : null;

    return {
      avgPercent: avg,
      totalWithTargets: rows.length,
      buckets,
    };
  })();

  const activity = await (async () => {
    const monthsBack = 6;
    const start = addMonthsUtc(monthStartUtc(now), -monthsBack + 1);
    const end = addMonthsUtc(monthStartUtc(now), 1);

    const ids = isAdmin ? null : (effectiveKpiIds ?? []);
    if (!isAdmin && ids && ids.length === 0) {
      const categories: string[] = [];
      const values: number[] = [];
      for (let i = 0; i < monthsBack; i += 1) {
        const m = addMonthsUtc(start, i);
        categories.push(formatMonthKey(m));
        values.push(0);
      }
      return { categories, values };
    }

    const rows = await prismaKpiValuePeriod.findMany<{ updatedAt: Date }>({
      where: {
        kpi: {
          orgId,
          ...(ids ? { id: { in: ids } } : {}),
        },
        updatedAt: {
          gte: start,
          lt: end,
        },
      },
      select: { updatedAt: true },
    });

    const byMonth = new Map<string, number>();
    for (const r of rows) {
      const key = formatMonthKey(r.updatedAt);
      byMonth.set(key, (byMonth.get(key) ?? 0) + 1);
    }

    const categories: string[] = [];
    const values: number[] = [];
    for (let i = 0; i < monthsBack; i += 1) {
      const m = addMonthsUtc(start, i);
      const key = formatMonthKey(m);
      categories.push(key);
      values.push(byMonth.get(key) ?? 0);
    }

    return { categories, values };
  })();

  const kpiStatusCounts: Record<string, number> = {
    NO_DATA: 0,
    DRAFT: 0,
    SUBMITTED: 0,
    APPROVED: 0,
    LOCKED: 0,
  };

  for (const k of myKpis) {
    const latest = k.values[0] ?? null;
    if (!latest) {
      kpiStatusCounts.NO_DATA += 1;
      continue;
    }
    kpiStatusCounts[String(latest.status)] = (kpiStatusCounts[String(latest.status)] ?? 0) + 1;
  }

  const allNodes = await prismaNode.findMany<{
    id: string;
    parentId: string | null;
    ownerUserId: string | null;
    name: string;
    color: string;
    status: Status;
    progress: number;
    startDate: Date | null;
    endDate: Date | null;
    nodeType: { id: string; code: unknown; displayName: string; levelOrder: number };
  }>({
    where: {
      orgId,
      deletedAt: null,
    },
    select: {
      id: true,
      parentId: true,
      ownerUserId: true,
      name: true,
      color: true,
      status: true,
      progress: true,
      startDate: true,
      endDate: true,
      nodeType: { select: { id: true, code: true, displayName: true, levelOrder: true } },
    },
  });

  const nodeById = new Map(allNodes.map((n) => [n.id, n] as const));
  const childrenByParent = buildChildrenByParent(allNodes.map((n) => ({ id: n.id, parentId: n.parentId })));

  const myAssignedWork = await prismaNodeAssignment.findMany<{
    role: unknown;
    node: {
      id: string;
      name: string;
      color: string;
      status: Status;
      progress: number;
      startDate: Date | null;
      endDate: Date | null;
      nodeType: { code: unknown; displayName: string; levelOrder: number };
      parent: { id: string; name: string; nodeType: { displayName: string } } | null;
    };
  }>({
    where: {
      userId,
      node: {
        orgId,
        deletedAt: null,
      },
    },
    orderBy: [{ createdAt: "desc" }],
    select: {
      role: true,
      node: {
        select: {
          id: true,
          name: true,
          color: true,
          status: true,
          progress: true,
          startDate: true,
          endDate: true,
          nodeType: { select: { code: true, displayName: true, levelOrder: true } },
          parent: { select: { id: true, name: true, nodeType: { select: { displayName: true } } } },
        },
      },
    },
  });

  const ownedItems = allNodes
    .filter((n) => n.ownerUserId === userId)
    .map((n) => {
      const parent = n.parentId ? nodeById.get(n.parentId) ?? null : null;
      const endDateIso = n.endDate ? n.endDate.toISOString() : null;
      const startDateIso = n.startDate ? n.startDate.toISOString() : null;
      const daysToEnd = n.endDate ? daysBetweenUtc(now, n.endDate) : null;
      return {
        id: n.id,
        name: n.name,
        color: n.color,
        status: String(n.status),
        progress: n.progress,
        startDate: startDateIso,
        endDate: endDateIso,
        daysToEnd,
        type: {
          code: String(n.nodeType.code).toLowerCase(),
          displayName: n.nodeType.displayName,
          levelOrder: n.nodeType.levelOrder,
        },
        parent: parent
          ? {
              id: parent.id,
              name: parent.name,
              typeDisplayName: parent.nodeType.displayName,
            }
          : null,
      };
    })
    .sort((a, b) => {
      const aScore = typeof a.daysToEnd === "number" ? a.daysToEnd : Number.POSITIVE_INFINITY;
      const bScore = typeof b.daysToEnd === "number" ? b.daysToEnd : Number.POSITIVE_INFINITY;
      if (aScore !== bScore) return aScore - bScore;
      if (a.type.levelOrder !== b.type.levelOrder) return a.type.levelOrder - b.type.levelOrder;
      return a.name.localeCompare(b.name);
    });

  const workItems = myAssignedWork
    .map((a) => {
      const endDateIso = a.node.endDate ? a.node.endDate.toISOString() : null;
      const startDateIso = a.node.startDate ? a.node.startDate.toISOString() : null;
      const daysToEnd = a.node.endDate ? daysBetweenUtc(now, a.node.endDate) : null;
      return {
        assignmentRole: String(a.role ?? ""),
        id: a.node.id,
        name: a.node.name,
        color: a.node.color,
        status: String(a.node.status),
        progress: a.node.progress,
        startDate: startDateIso,
        endDate: endDateIso,
        daysToEnd,
        type: {
          code: String(a.node.nodeType.code).toLowerCase(),
          displayName: a.node.nodeType.displayName,
          levelOrder: a.node.nodeType.levelOrder,
        },
        parent: a.node.parent
          ? {
              id: a.node.parent.id,
              name: a.node.parent.name,
              typeDisplayName: a.node.parent.nodeType.displayName,
            }
          : null,
      };
    })
    .sort((a, b) => {
      const aScore = typeof a.daysToEnd === "number" ? a.daysToEnd : Number.POSITIVE_INFINITY;
      const bScore = typeof b.daysToEnd === "number" ? b.daysToEnd : Number.POSITIVE_INFINITY;
      if (aScore !== bScore) return aScore - bScore;
      return (a.type.levelOrder ?? 0) - (b.type.levelOrder ?? 0);
    });

  const responsibilityRoots = await prismaResponsibilityNodeAssignment.findMany<{
    rootNode: {
      id: string;
      name: string;
      color: string;
      status: Status;
      progress: number;
      nodeType: { code: unknown; displayName: string; levelOrder: number };
    };
  }>({
    where: {
      orgId,
      assignedToId: userId,
    },
    select: {
      rootNode: {
        select: {
          id: true,
          name: true,
          color: true,
          status: true,
          progress: true,
          nodeType: { select: { code: true, displayName: true, levelOrder: true } },
        },
      },
    },
  });

  const kpiCountByPrimaryNodeId = new Map<string, number>();
  for (const k of myKpis) {
    kpiCountByPrimaryNodeId.set(k.primaryNode.id, (kpiCountByPrimaryNodeId.get(k.primaryNode.id) ?? 0) + 1);
  }

  const scopes = responsibilityRoots
    .map((r) => {
      const root = r.rootNode;
      const subtreeIds = buildSubtreeIds({ rootId: root.id, childrenByParent });

      const counts = {
        total: 0,
        planned: 0,
        active: 0,
        atRisk: 0,
        completed: 0,
      };

      const atRiskItems: Array<{
        id: string;
        name: string;
        progress: number;
        status: string;
        color: string;
        type: { displayName: string; levelOrder: number; code: string };
      }> = [];

      for (const id of subtreeIds) {
        const n = nodeById.get(id);
        if (!n) continue;
        counts.total += 1;
        if (n.status === "PLANNED") counts.planned += 1;
        else if (n.status === "ACTIVE") counts.active += 1;
        else if (n.status === "AT_RISK") counts.atRisk += 1;
        else if (n.status === "COMPLETED") counts.completed += 1;

        if (n.status === "AT_RISK" && n.id !== root.id) {
          atRiskItems.push({
            id: n.id,
            name: n.name,
            progress: n.progress,
            status: String(n.status),
            color: n.color,
            type: { displayName: n.nodeType.displayName, levelOrder: n.nodeType.levelOrder, code: String(n.nodeType.code).toLowerCase() },
          });
        }
      }

      atRiskItems.sort((a, b) => {
        if (a.type.levelOrder !== b.type.levelOrder) return a.type.levelOrder - b.type.levelOrder;
        if (a.progress !== b.progress) return a.progress - b.progress;
        return a.name.localeCompare(b.name);
      });

      let kpisCount = 0;
      for (const id of subtreeIds) {
        kpisCount += kpiCountByPrimaryNodeId.get(id) ?? 0;
      }

      return {
        root: {
          id: root.id,
          name: root.name,
          color: root.color,
          status: String(root.status),
          progress: root.progress,
          type: {
            code: String(root.nodeType.code).toLowerCase(),
            displayName: root.nodeType.displayName,
            levelOrder: root.nodeType.levelOrder,
          },
        },
        counts,
        kpisCount,
        atRiskPreview: atRiskItems.slice(0, 4),
      };
    })
    .sort((a, b) => {
      if (a.root.type.levelOrder !== b.root.type.levelOrder) return a.root.type.levelOrder - b.root.type.levelOrder;
      return a.root.name.localeCompare(b.root.name);
    });

  const approvals = canApprove
    ? await prismaKpiValuePeriod.findMany<{
        id: string;
        kpiId: string;
        periodEnd: Date;
        calculatedValue: number | null;
        submittedAt: Date | null;
        submittedByUser: { id: string; name: string } | null;
        kpi: {
          id: string;
          name: string;
          primaryNode: { id: string; name: string; nodeType: { displayName: string } } | null;
        };
      }>({
        where: {
          status: KpiValueStatus.SUBMITTED,
          kpi: {
            orgId,
          },
        },
        orderBy: [{ submittedAt: "desc" }, { updatedAt: "desc" }],
        take: 8,
        select: {
          id: true,
          kpiId: true,
          periodEnd: true,
          calculatedValue: true,
          submittedAt: true,
          submittedByUser: { select: { id: true, name: true } },
          kpi: {
            select: {
              id: true,
              name: true,
              primaryNode: { select: { id: true, name: true, nodeType: { select: { displayName: true } } } },
            },
          },
        },
      })
    : [];

  const kpisForUi = myKpis
    .map((k) => {
      const latest = k.values[0] ?? null;
      return {
        id: k.id,
        name: k.name,
        unit: k.unit,
        targetValue: k.targetValue,
        baselineValue: k.baselineValue,
        periodType: String(k.periodType ?? ""),
        owner: k.ownerUser ? { id: k.ownerUser.id, name: k.ownerUser.name, role: String(k.ownerUser.role) } : null,
        primary: {
          id: k.primaryNode.id,
          name: k.primaryNode.name,
          typeDisplayName: k.primaryNode.nodeType.displayName,
        },
        latest: latest
          ? {
              calculatedValue: latest.calculatedValue,
              status: String(latest.status),
              periodEnd: latest.periodEnd.toISOString(),
              periodStart: latest.periodStart.toISOString(),
            }
          : null,
      };
    })
    .sort((a, b) => {
      const aStatus = a.latest?.status ?? "NO_DATA";
      const bStatus = b.latest?.status ?? "NO_DATA";
      const aRank = kpiStatusOrder(aStatus);
      const bRank = kpiStatusOrder(bStatus);
      if (aRank !== bRank) return aRank - bRank;
      return a.name.localeCompare(b.name);
    });

  const pendingApprovalsCount = canApprove
    ? await (prisma as unknown as { kpiValuePeriod: { count: (args: unknown) => Promise<number> } }).kpiValuePeriod.count({
        where: { status: KpiValueStatus.SUBMITTED, kpi: { orgId } },
      })
    : 0;

  const scopesCount = scopes.length;

  const summary = {
    kpisTotal: kpisForUi.length,
    kpisNoData: kpiStatusCounts.NO_DATA ?? 0,
    kpisDraft: kpiStatusCounts.DRAFT ?? 0,
    kpisSubmitted: kpiStatusCounts.SUBMITTED ?? 0,
    kpisApproved: (kpiStatusCounts.APPROVED ?? 0) + (kpiStatusCounts.LOCKED ?? 0),
    scopesTotal: scopesCount,
    workTotal: workItems.length,
    ownedTotal: ownedItems.length,
    approvalsPending: pendingApprovalsCount,
    completionTracked: completion.totalWithTargets,
  };

  return {
    user: {
      id: userId,
      name: session.user.name,
      role: String(userRole),
    },
    org: {
      id: orgId,
      name: org?.name ?? "",
      approvalLevel,
    },
    enabledNodeTypes: enabledNodeTypes.map((t) => ({
      id: t.id,
      code: String(t.code),
      displayName: t.displayName,
      levelOrder: t.levelOrder,
    })),
    canApprove,
    summary,
    kpiStatusCounts,
    kpiCompletion: {
      avgPercent: completion.avgPercent,
      totalWithTargets: completion.totalWithTargets,
      buckets: completion.buckets,
    },
    kpiActivity: activity,
    kpis: kpisForUi,
    scopes,
    workItems: isAdmin ? [] : workItems,
    ownedItems,
    approvals: approvals.map((a) => ({
      id: a.id,
      kpiId: a.kpiId,
      kpiName: a.kpi.name,
      typeDisplayName: a.kpi.primaryNode?.nodeType.displayName ?? null,
      primaryName: a.kpi.primaryNode?.name ?? null,
      calculatedValue: a.calculatedValue,
      submittedAt: a.submittedAt ? a.submittedAt.toISOString() : null,
      submittedBy: a.submittedByUser?.name ?? null,
      periodEnd: a.periodEnd.toISOString(),
    })),
  };
}
