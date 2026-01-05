
import {
  KpiAggregationMethod,
  KpiDefinitionStatus,
  KpiDirection,
  KpiPeriodType,
  KpiVariableDataType,
  NodeTypeCode,
  PrismaClient,
  Role,
  Status,
} from "@prisma/client";
import { auth } from "../web/src/lib/auth";
import fs from "node:fs/promises";
import path from "node:path";

const prisma = new PrismaClient();

async function ensureNodeType(input: { code: NodeTypeCode; displayName: string; levelOrder: number; canHaveKpis: boolean }) {
  return prisma.nodeType.upsert({
    where: { code: input.code },
    update: { displayName: input.displayName, levelOrder: input.levelOrder, canHaveKpis: input.canHaveKpis },
    create: { code: input.code, displayName: input.displayName, levelOrder: input.levelOrder, canHaveKpis: input.canHaveKpis },
    select: { id: true, code: true },
  });
}

async function ensureOrg(input: { domain?: string | null; name: string; kpiApprovalLevel?: "MANAGER" | "PMO" | "EXECUTIVE" | "ADMIN" }) {
  const existing = await prisma.organization.findFirst({
    where: {
      deletedAt: null,
      OR: [
        ...(input.domain ? [{ domain: input.domain }] : []),
        { name: input.name },
      ],
    },
    select: { id: true },
  });

  if (existing) {
    return prisma.organization.update({
      where: { id: existing.id },
      data: {
        name: input.name,
        domain: typeof input.domain === "undefined" ? undefined : input.domain,
        kpiApprovalLevel: (input.kpiApprovalLevel ?? "MANAGER") as any,
      },
      select: { id: true },
    });
  }

  return prisma.organization.create({
    data: {
      name: input.name,
      domain: typeof input.domain === "undefined" ? null : input.domain,
      kpiApprovalLevel: (input.kpiApprovalLevel ?? "MANAGER") as any,
    },
    select: { id: true },
  });
}

async function ensureOrgNodeTypes(orgId: string, allowedCodes: NodeTypeCode[]) {
  const allowedNodeTypes = await prisma.nodeType.findMany({
    where: { code: { in: allowedCodes } },
    select: { id: true },
  });

  await prisma.organizationNodeType.deleteMany({
    where: {
      orgId,
      nodeTypeId: { notIn: allowedNodeTypes.map((nt) => nt.id) },
    },
  });

  await prisma.organizationNodeType.createMany({
    data: allowedNodeTypes.map((nt) => ({ orgId, nodeTypeId: nt.id })),
    skipDuplicates: true,
  });
}

async function ensureDepartment(input: { orgId: string; name: string }) {
  const existing = await prisma.department.findFirst({ where: { orgId: input.orgId, name: input.name, deletedAt: null }, select: { id: true } });
  if (existing) return existing;
  return prisma.department.create({ data: { orgId: input.orgId, name: input.name }, select: { id: true } });
}

async function ensureUser(input: { orgId: string; email: string; password: string; name: string; role: Role; managerId?: string | null; departmentId?: string | null; title?: string | null }) {
  const existingUser = await prisma.user.findFirst({
    where: { orgId: input.orgId, email: input.email, deletedAt: null },
    select: { id: true },
  });

  if (existingUser) {
    const credentialAccount = await prisma.account.findFirst({
      where: { userId: existingUser.id, providerId: "credential" },
      select: { id: true },
    });

    if (credentialAccount) {
      await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          role: input.role,
          managerId: typeof input.managerId === "undefined" ? undefined : input.managerId,
          departmentId: typeof input.departmentId === "undefined" ? undefined : input.departmentId,
          title: typeof input.title === "undefined" ? undefined : input.title,
        },
      });
      return existingUser;
    }

    await prisma.user.delete({ where: { id: existingUser.id } });
  }

  const result = await auth.api.signUpEmail({
    body: {
      email: input.email,
      password: input.password,
      name: input.name,
      role: input.role,
      orgId: input.orgId,
    },
  });

  await prisma.user.update({
    where: { id: result.user.id },
    data: {
      managerId: typeof input.managerId === "undefined" ? undefined : input.managerId,
      departmentId: typeof input.departmentId === "undefined" ? undefined : input.departmentId,
      title: typeof input.title === "undefined" ? undefined : input.title,
    },
  });

  return { id: result.user.id };
}

async function ensureNode(input: {
  orgId: string;
  nodeTypeId: string;
  name: string;
  description?: string | null;
  parentId?: string | null;
  ownerUserId?: string | null;
  color?: string | null;
  status?: Status;
  progress?: number | null;
  startDate?: Date | null;
  endDate?: Date | null;
}) {
  const existing = await prisma.node.findFirst({
    where: {
      orgId: input.orgId,
      nodeTypeId: input.nodeTypeId,
      name: input.name,
      deletedAt: null,
      parentId: typeof input.parentId === "undefined" ? undefined : input.parentId,
    },
    select: { id: true },
  });

  if (existing) {
    await prisma.node.update({
      where: { id: existing.id },
      data: {
        description: typeof input.description === "undefined" ? undefined : input.description ?? null,
        ownerUserId: typeof input.ownerUserId === "undefined" ? undefined : input.ownerUserId ?? null,
        color: typeof input.color === "undefined" ? undefined : input.color ?? undefined,
        status: typeof input.status === "undefined" ? undefined : input.status,
        progress: typeof input.progress === "undefined" ? undefined : input.progress ?? 0,
        startDate: typeof input.startDate === "undefined" ? undefined : input.startDate ?? null,
        endDate: typeof input.endDate === "undefined" ? undefined : input.endDate ?? null,
      },
      select: { id: true },
    });

    return existing;
  }

  return prisma.node.create({
    data: {
      orgId: input.orgId,
      nodeTypeId: input.nodeTypeId,
      name: input.name,
      description: input.description ?? null,
      parentId: input.parentId ?? null,
      ownerUserId: input.ownerUserId ?? null,
      color: input.color ?? undefined,
      status: input.status ?? Status.PLANNED,
      progress: input.progress ?? 0,
      startDate: input.startDate ?? null,
      endDate: input.endDate ?? null,
    },
    select: { id: true },
  });
}

async function ensureKpi(input: {
  orgId: string;
  primaryNodeId: string;
  ownerUserId?: string | null;
  name: string;
  description?: string | null;
  formula?: string | null;
  unit?: string | null;
  direction?: KpiDirection;
  aggregation?: KpiAggregationMethod;
  periodType: KpiPeriodType;
  baselineValue?: number | null;
  targetValue?: number | null;
  weight?: number | null;
  status?: KpiDefinitionStatus;
  variables?: Array<{
    code: string;
    displayName: string;
    dataType: KpiVariableDataType;
    isRequired?: boolean;
    isStatic?: boolean;
    staticValue?: number | null;
  }>;
}) {
  const existing = await prisma.kpiDefinition.findFirst({
    where: { orgId: input.orgId, name: input.name },
    select: { id: true },
  });

  const kpi = existing
    ? await prisma.kpiDefinition.update({
        where: { id: existing.id },
        data: {
          primaryNodeId: input.primaryNodeId,
          ownerUserId: typeof input.ownerUserId === "undefined" ? undefined : input.ownerUserId ?? null,
          description: typeof input.description === "undefined" ? undefined : input.description ?? null,
          formula: typeof input.formula === "undefined" ? undefined : input.formula ?? null,
          unit: typeof input.unit === "undefined" ? undefined : input.unit ?? null,
          direction: typeof input.direction === "undefined" ? undefined : input.direction,
          aggregation: typeof input.aggregation === "undefined" ? undefined : input.aggregation,
          periodType: input.periodType,
          baselineValue: typeof input.baselineValue === "undefined" ? undefined : input.baselineValue ?? null,
          targetValue: typeof input.targetValue === "undefined" ? undefined : input.targetValue ?? null,
          weight: typeof input.weight === "undefined" ? undefined : input.weight ?? null,
          status: typeof input.status === "undefined" ? undefined : input.status,
        },
        select: { id: true },
      })
    : await prisma.kpiDefinition.create({
        data: {
          orgId: input.orgId,
          primaryNodeId: input.primaryNodeId,
          ownerUserId: input.ownerUserId ?? null,
          name: input.name,
          description: input.description ?? null,
          formula: input.formula ?? null,
          unit: input.unit ?? null,
          direction: input.direction ?? KpiDirection.INCREASE_IS_GOOD,
          aggregation: input.aggregation ?? KpiAggregationMethod.LAST_VALUE,
          periodType: input.periodType,
          baselineValue: input.baselineValue ?? null,
          targetValue: input.targetValue ?? null,
          weight: input.weight ?? null,
          status: input.status ?? KpiDefinitionStatus.ACTIVE,
        },
        select: { id: true },
      });

  if (input.variables?.length) {
    for (const v of input.variables) {
      await prisma.kpiVariable.upsert({
        where: {
          kpiId_code: {
            kpiId: kpi.id,
            code: v.code,
          },
        },
        update: {
          displayName: v.displayName,
          dataType: v.dataType,
          isRequired: v.isRequired ?? false,
          isStatic: v.isStatic ?? false,
          staticValue: typeof v.staticValue === "undefined" ? undefined : v.staticValue ?? null,
        },
        create: {
          kpiId: kpi.id,
          code: v.code,
          displayName: v.displayName,
          dataType: v.dataType,
          isRequired: v.isRequired ?? false,
          isStatic: v.isStatic ?? false,
          staticValue: v.staticValue ?? null,
        },
        select: { id: true },
      });
    }
  }

  return kpi;
}

function parseDateOrNull(value: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

type SeedJson = {
  meta?: {
    hierarchy?: Array<"STRATEGY" | "OBJECTIVE" | "INITIATIVE" | "TASK" | "PILLAR" | "PROJECT">;
  };
  organization?: {
    name?: string;
    domain?: string | null;
    kpiApprovalLevel?: "MANAGER" | "PMO" | "EXECUTIVE" | "ADMIN";
  };
  nodeTypes?: Array<{ id: string; code: NodeTypeCode }>;
  nodes?: Array<{
    id: string;
    nodeTypeId: string;
    parentId: string | null;
    name: string;
    description: string | null;
    color?: string | null;
    status?: keyof typeof Status;
    progress?: number | null;
    startDate?: string | null;
    endDate?: string | null;
  }>;
  kpis?: Array<{
    id: string;
    primaryNodeId: string;
    ownerUserId: string | null;
    name: string;
    description: string | null;
    formula?: string | null;
    unit?: string | null;
    direction?: keyof typeof KpiDirection;
    aggregation?: keyof typeof KpiAggregationMethod;
    periodType: keyof typeof KpiPeriodType;
    baselineValue?: number | null;
    targetValue?: number | null;
    weight?: number | null;
    status?: keyof typeof KpiDefinitionStatus;
    variables?: Array<{
      id: string;
      code: string;
      displayName: string;
      dataType: keyof typeof KpiVariableDataType;
      isRequired?: boolean;
      isStatic?: boolean;
      staticValue?: number | null;
    }>;
  }>;
};

function toNodeTypeCode(value: string): NodeTypeCode {
  const code = NodeTypeCode[value as keyof typeof NodeTypeCode];
  if (!code) throw new Error(`Invalid node type code in meta.hierarchy: ${value}`);
  return code;
}

async function loadSeedJson(seedFilePath: string): Promise<SeedJson> {
  const raw = await fs.readFile(seedFilePath, "utf8");
  // Allow JSONC-style seed files (line comments, block comments, trailing commas)
  const withoutLineComments = raw
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("//"))
    .join("\n");

  const withoutBlockComments = withoutLineComments.replace(/\/\*[\s\S]*?\*\//g, "");
  const withoutTrailingCommas = withoutBlockComments.replace(/,\s*(\}|\])/g, "$1");
  return JSON.parse(withoutTrailingCommas) as SeedJson;
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function seedFromJsonDataset(input: {
  orgId: string;
  nodeTypeByCode: Map<NodeTypeCode, string>;
  dataset: SeedJson;
}) {
  const nodeTypeIdToCode = new Map<string, NodeTypeCode>();
  for (const nt of input.dataset.nodeTypes ?? []) {
    if (nt?.id && nt?.code) nodeTypeIdToCode.set(nt.id, nt.code);
  }

  const nodes = input.dataset.nodes ?? [];
  const kpis = input.dataset.kpis ?? [];

  if (!nodes.length || !kpis.length) {
    throw new Error(
      "Seed dataset is missing nodes/kpis. Put the provided JSON into prisma/seed-mousa.json (or set SEED_DATA_PATH).",
    );
  }

  const extNodeIdToDbId = new Map<string, string>();
  const pending = [...nodes];

  while (pending.length) {
    let progressed = false;

    for (let i = pending.length - 1; i >= 0; i--) {
      const n = pending[i];
      const parentDbId = n.parentId ? extNodeIdToDbId.get(n.parentId) : null;
      if (n.parentId && !parentDbId) continue;

      const code = nodeTypeIdToCode.get(n.nodeTypeId);
      if (!code) {
        throw new Error(`Unknown nodeTypeId ${n.nodeTypeId} for node ${n.id}`);
      }

      const nodeTypeDbId = input.nodeTypeByCode.get(code);
      if (!nodeTypeDbId) {
        throw new Error(`Missing NodeType in DB for code ${code}`);
      }

      const created = await ensureNode({
        orgId: input.orgId,
        nodeTypeId: nodeTypeDbId,
        name: n.name,
        description: n.description ?? null,
        parentId: parentDbId,
        color: n.color ?? null,
        status: n.status ? Status[n.status] : Status.PLANNED,
        progress: typeof n.progress === "number" ? n.progress : 0,
        startDate: parseDateOrNull(n.startDate ?? null),
        endDate: parseDateOrNull(n.endDate ?? null),
      });

      extNodeIdToDbId.set(n.id, created.id);
      pending.splice(i, 1);
      progressed = true;
    }

    if (!progressed) {
      const sample = pending.slice(0, 5).map((n) => `${n.id} -> parent ${n.parentId}`).join(", ");
      throw new Error(`Could not resolve parent chain for remaining nodes. Sample: ${sample}`);
    }
  }

  for (const k of kpis) {
    const primaryNodeDbId = extNodeIdToDbId.get(k.primaryNodeId);
    if (!primaryNodeDbId) {
      throw new Error(`KPI ${k.id} references unknown primaryNodeId ${k.primaryNodeId}`);
    }

    await ensureKpi({
      orgId: input.orgId,
      primaryNodeId: primaryNodeDbId,
      ownerUserId: null,
      name: k.name,
      description: k.description ?? null,
      formula: k.formula ?? null,
      unit: k.unit ?? null,
      direction: k.direction ? KpiDirection[k.direction] : KpiDirection.INCREASE_IS_GOOD,
      aggregation: k.aggregation ? KpiAggregationMethod[k.aggregation] : KpiAggregationMethod.LAST_VALUE,
      periodType: KpiPeriodType[k.periodType],
      baselineValue: typeof k.baselineValue === "number" ? k.baselineValue : null,
      targetValue: typeof k.targetValue === "number" ? k.targetValue : null,
      weight: typeof k.weight === "number" ? k.weight : null,
      status: k.status ? KpiDefinitionStatus[k.status] : KpiDefinitionStatus.ACTIVE,
      variables: (k.variables ?? []).map((v) => ({
        code: v.code,
        displayName: v.displayName,
        dataType: KpiVariableDataType[v.dataType],
        isRequired: v.isRequired ?? false,
        isStatic: v.isStatic ?? false,
        staticValue: typeof v.staticValue === "number" ? v.staticValue : null,
      })),
    });
  }
}

async function main() {
  console.log('Starting minimal seed...');

  try {
    const nodeTypes = await Promise.all([
      ensureNodeType({ code: NodeTypeCode.STRATEGY, displayName: "Strategy", levelOrder: 1, canHaveKpis: true }),
      ensureNodeType({ code: NodeTypeCode.PILLAR, displayName: "Pillar", levelOrder: 2, canHaveKpis: false }),
      ensureNodeType({ code: NodeTypeCode.OBJECTIVE, displayName: "Objective", levelOrder: 3, canHaveKpis: true }),
      ensureNodeType({ code: NodeTypeCode.INITIATIVE, displayName: "Initiative", levelOrder: 4, canHaveKpis: true }),
      ensureNodeType({ code: NodeTypeCode.PROJECT, displayName: "Project", levelOrder: 5, canHaveKpis: false }),
      ensureNodeType({ code: NodeTypeCode.TASK, displayName: "Task", levelOrder: 6, canHaveKpis: false }),
    ]);

    const nodeTypeByCode = new Map(nodeTypes.map((t) => [t.code, t.id] as const));

    const defaultSeedPathJsonc = path.join(process.cwd(), "prisma", "seed-mousa.jsonc");
    const defaultSeedPathJson = path.join(process.cwd(), "prisma", "seed-mousa.json");

    const seedPath = process.env.SEED_DATA_PATH
      ?? ((await fileExists(defaultSeedPathJsonc)) ? defaultSeedPathJsonc : defaultSeedPathJson);

    const dataset = await loadSeedJson(seedPath);

    const orgDomain = typeof dataset.organization?.domain === "undefined"
      ? (process.env.SEED_ORG_DOMAIN ?? "almousa.local")
      : dataset.organization?.domain;

    const org = await ensureOrg({
      domain: orgDomain ?? null,
      name: dataset.organization?.name ?? "مجموعة موسى الموسى",
      kpiApprovalLevel: dataset.organization?.kpiApprovalLevel ?? "MANAGER",
    });
    console.log("Using Org:", org.id);

    const allowedCodes = (dataset.meta?.hierarchy?.length
      ? dataset.meta.hierarchy.map((c) => toNodeTypeCode(c))
      : [NodeTypeCode.STRATEGY, NodeTypeCode.OBJECTIVE, NodeTypeCode.INITIATIVE, NodeTypeCode.TASK]);

    await ensureOrgNodeTypes(org.id, allowedCodes);

    const password = process.env.SEED_DEFAULT_PASSWORD ?? "password123";

    const deptExecutive = await ensureDepartment({ orgId: org.id, name: "الإدارة العليا" });
    const deptStrategy = await ensureDepartment({ orgId: org.id, name: "الاستراتيجية والتميز المؤسسي" });
    const deptFinance = await ensureDepartment({ orgId: org.id, name: "القطاع المالي" });
    const deptIt = await ensureDepartment({ orgId: org.id, name: "تقنية المعلومات والبيانات" });
    const deptHr = await ensureDepartment({ orgId: org.id, name: "الموارد البشرية" });
    const deptMarketing = await ensureDepartment({ orgId: org.id, name: "التسويق والاتصال المؤسسي" });
    const deptAudit = await ensureDepartment({ orgId: org.id, name: "المراجعة الداخلية والمخاطر" });

    const superAdminEmail = process.env.SEED_SUPERADMIN_EMAIL ?? "superadmin@almousa.local";
    const superAdminName = process.env.SEED_SUPERADMIN_NAME ?? "Super Admin";
    const superAdminPassword = process.env.SEED_SUPERADMIN_PASSWORD ?? password;

    const superAdmin = await ensureUser({
      orgId: org.id,
      email: superAdminEmail,
      password: superAdminPassword,
      name: superAdminName,
      role: Role.SUPER_ADMIN,
      departmentId: deptExecutive.id,
      title: "Super Admin",
    });

    const ceo = await ensureUser({
      orgId: org.id,
      email: "ceo@almousa.local",
      password,
      name: "الرئيس التنفيذي للمجموعة",
      role: Role.EXECUTIVE,
      departmentId: deptExecutive.id,
      title: "CEO",
    });

    const admin = await ensureUser({
      orgId: org.id,
      email: "admin@almousa.local",
      password,
      name: "مسؤول النظام",
      role: Role.ADMIN,
      managerId: ceo.id,
      departmentId: deptExecutive.id,
      title: "Admin",
    });

    const headStrategy = await ensureUser({
      orgId: org.id,
      email: "strategy@almousa.local",
      password,
      name: "مدير الاستراتيجية والتميز المؤسسي",
      role: Role.PMO,
      managerId: ceo.id,
      departmentId: deptStrategy.id,
      title: "Head of Strategy",
    });

    const headFinance = await ensureUser({
      orgId: org.id,
      email: "finance@almousa.local",
      password,
      name: "مدير القطاع المالي",
      role: Role.EXECUTIVE,
      managerId: ceo.id,
      departmentId: deptFinance.id,
      title: "CFO",
    });

    const headIt = await ensureUser({
      orgId: org.id,
      email: "it@almousa.local",
      password,
      name: "مدير تقنية المعلومات والبيانات",
      role: Role.MANAGER,
      managerId: ceo.id,
      departmentId: deptIt.id,
      title: "IT Director",
    });

    const headHr = await ensureUser({
      orgId: org.id,
      email: "hr@almousa.local",
      password,
      name: "مدير الموارد البشرية",
      role: Role.MANAGER,
      managerId: ceo.id,
      departmentId: deptHr.id,
      title: "HR Director",
    });

    const headMarketing = await ensureUser({
      orgId: org.id,
      email: "marketing@almousa.local",
      password,
      name: "مدير التسويق والاتصال المؤسسي",
      role: Role.MANAGER,
      managerId: ceo.id,
      departmentId: deptMarketing.id,
      title: "Marketing Director",
    });

    const headAudit = await ensureUser({
      orgId: org.id,
      email: "audit@almousa.local",
      password,
      name: "مدير المراجعة الداخلية والمخاطر",
      role: Role.MANAGER,
      managerId: ceo.id,
      departmentId: deptAudit.id,
      title: "Head of Audit",
    });

    await Promise.all([
      ensureUser({ orgId: org.id, email: "employee1@almousa.local", password, name: "موظف 1", role: Role.EMPLOYEE, managerId: headStrategy.id, departmentId: deptStrategy.id, title: "Analyst" }),
      ensureUser({ orgId: org.id, email: "employee2@almousa.local", password, name: "موظف 2", role: Role.EMPLOYEE, managerId: headFinance.id, departmentId: deptFinance.id, title: "Accountant" }),
      ensureUser({ orgId: org.id, email: "employee3@almousa.local", password, name: "موظف 3", role: Role.EMPLOYEE, managerId: headIt.id, departmentId: deptIt.id, title: "Engineer" }),
      ensureUser({ orgId: org.id, email: "employee4@almousa.local", password, name: "موظف 4", role: Role.EMPLOYEE, managerId: headHr.id, departmentId: deptHr.id, title: "HR Specialist" }),
      ensureUser({ orgId: org.id, email: "employee5@almousa.local", password, name: "موظف 5", role: Role.EMPLOYEE, managerId: headMarketing.id, departmentId: deptMarketing.id, title: "Coordinator" }),
    ]);

    await seedFromJsonDataset({
      orgId: org.id,
      nodeTypeByCode: nodeTypeByCode as any,
      dataset,
    });

    console.log("Seeded org users and strategy tree. You can login with:");
    console.log("- superadmin:", superAdminEmail);
    console.log("- admin:", "admin@almousa.local");
    console.log("Password:", password);

  } catch (e) {
    console.error('Error in minimal seed:', e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
