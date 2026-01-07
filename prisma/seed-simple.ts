
import {
  KpiAggregationMethod,
  KpiDefinitionStatus,
  KpiDirection,
  KpiPeriodType,
  KpiValueStatus,
  KpiVariableDataType,
  NodeTypeCode,
  PrismaClient,
  Role,
  Status,
} from "@prisma/client";
import { auth } from "../web/src/lib/auth";

const prisma = new PrismaClient();

async function wipeDatabase() {
  await prisma.kpiVariableValue.deleteMany();
  await prisma.kpiValuePeriod.deleteMany();
  await prisma.kpiVariable.deleteMany();
  await prisma.kpiDefinition.deleteMany();

  await prisma.nodeDependency.deleteMany();
  await prisma.nodeAssignment.deleteMany();

  await prisma.responsibilityKpiAssignment.deleteMany();
  await prisma.responsibilityNodeAssignment.deleteMany();

  await prisma.changeApproval.deleteMany();
  await prisma.changeRequest.deleteMany();

  await prisma.userPreference.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.verification.deleteMany();

  await prisma.node.deleteMany();
  await prisma.department.deleteMany();
  await prisma.user.deleteMany();

  await prisma.organizationNodeType.deleteMany();
  await prisma.organization.deleteMany();

  await prisma.nodeType.deleteMany();
}

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
  progress?: number;
  startDate?: Date | null;
  endDate?: Date | null;
}) {
  const existing = await prisma.node.findFirst({
    where: {
      orgId: input.orgId,
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

async function ensureTaskList(input: {
  orgId: string;
  nodeTypeId: string;
  parentId: string;
  defaultOwnerUserId?: string | null;
  tasks: Array<{ name: string; description?: string | null; ownerUserId?: string | null }>;
}) {
  await Promise.all(
    input.tasks.map((t) =>
      ensureNode({
        orgId: input.orgId,
        nodeTypeId: input.nodeTypeId,
        parentId: input.parentId,
        name: t.name,
        description: typeof t.description === "undefined" ? null : t.description,
        ownerUserId: typeof t.ownerUserId === "undefined" ? input.defaultOwnerUserId ?? null : t.ownerUserId,
      }),
    ),
  );
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

function dateAtStartOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

function dateAtEndOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

function resolveSeedPeriodRange(periodType: KpiPeriodType, offset: number) {
  const now = new Date();
  const base = new Date(now.getFullYear(), now.getMonth(), 1);

  if (periodType === KpiPeriodType.MONTHLY) {
    const start = new Date(base.getFullYear(), base.getMonth() - offset, 1);
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
    return { start: dateAtStartOfDay(start), end: dateAtEndOfDay(end) };
  }

  if (periodType === KpiPeriodType.QUARTERLY) {
    const quarterStartMonth = Math.floor(base.getMonth() / 3) * 3;
    const quarterStart = new Date(base.getFullYear(), quarterStartMonth, 1);
    const start = new Date(quarterStart.getFullYear(), quarterStart.getMonth() - offset * 3, 1);
    const end = new Date(start.getFullYear(), start.getMonth() + 3, 0);
    return { start: dateAtStartOfDay(start), end: dateAtEndOfDay(end) };
  }

  const start = new Date(base.getFullYear() - offset, 0, 1);
  const end = new Date(start.getFullYear(), 12, 0);
  return { start: dateAtStartOfDay(start), end: dateAtEndOfDay(end) };
}

async function upsertKpiValuePeriodWithVariables(input: {
  kpiId: string;
  periodStart: Date;
  periodEnd: Date;
  calculatedValue: number | null;
  status: KpiValueStatus;
  note?: string | null;
  enteredBy?: string | null;
  submittedAt?: Date | null;
  submittedBy?: string | null;
  approvedAt?: Date | null;
  approvedBy?: string | null;
  changesRequestedMessage?: string | null;
  changesRequestedAt?: Date | null;
  changesRequestedBy?: string | null;
  variableValues: Array<{ kpiVariableId: string; value: number }>;
}) {
  const kpiValue = await prisma.kpiValuePeriod.upsert({
    where: {
      kpiId_periodStart_periodEnd: {
        kpiId: input.kpiId,
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
      },
    },
    update: {
      calculatedValue: input.calculatedValue,
      status: input.status,
      note: typeof input.note === "undefined" ? undefined : input.note,
      enteredBy: typeof input.enteredBy === "undefined" ? undefined : input.enteredBy,
      submittedAt: typeof input.submittedAt === "undefined" ? undefined : input.submittedAt,
      submittedBy: typeof input.submittedBy === "undefined" ? undefined : input.submittedBy,
      approvedAt: typeof input.approvedAt === "undefined" ? undefined : input.approvedAt,
      approvedBy: typeof input.approvedBy === "undefined" ? undefined : input.approvedBy,
      changesRequestedMessage: typeof input.changesRequestedMessage === "undefined" ? undefined : input.changesRequestedMessage,
      changesRequestedAt: typeof input.changesRequestedAt === "undefined" ? undefined : input.changesRequestedAt,
      changesRequestedBy: typeof input.changesRequestedBy === "undefined" ? undefined : input.changesRequestedBy,
    },
    create: {
      kpiId: input.kpiId,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      calculatedValue: input.calculatedValue,
      status: input.status,
      note: input.note ?? null,
      enteredBy: input.enteredBy ?? null,
      submittedAt: input.submittedAt ?? null,
      submittedBy: input.submittedBy ?? null,
      approvedAt: input.approvedAt ?? null,
      approvedBy: input.approvedBy ?? null,
      changesRequestedMessage: input.changesRequestedMessage ?? null,
      changesRequestedAt: input.changesRequestedAt ?? null,
      changesRequestedBy: input.changesRequestedBy ?? null,
    },
    select: { id: true },
  });

  for (const vv of input.variableValues) {
    await prisma.kpiVariableValue.upsert({
      where: {
        kpiValueId_kpiVariableId: {
          kpiValueId: kpiValue.id,
          kpiVariableId: vv.kpiVariableId,
        },
      },
      update: {
        value: vv.value,
      },
      create: {
        kpiValueId: kpiValue.id,
        kpiVariableId: vv.kpiVariableId,
        value: vv.value,
      },
      select: { id: true },
    });
  }
}

async function getKpiVariableIdMap(kpiId: string) {
  const vars = await prisma.kpiVariable.findMany({
    where: { kpiId },
    select: { id: true, code: true },
  });
  return new Map(vars.map((v) => [v.code, v.id] as const));
}

async function upsertKpiValuePeriodByVariableCodes(input: {
  kpiId: string;
  periodType: KpiPeriodType;
  offset: number;
  calculatedValue: number | null;
  status: KpiValueStatus;
  note?: string | null;
  enteredBy?: string | null;
  submittedBy?: string | null;
  approvedBy?: string | null;
  changesRequestedBy?: string | null;
  changesRequestedMessage?: string | null;
  variableValues: Record<string, number>;
}) {
  const now = new Date();
  const range = resolveSeedPeriodRange(input.periodType, input.offset);

  const submittedAt = input.status === KpiValueStatus.SUBMITTED || input.status === KpiValueStatus.APPROVED
    ? new Date(now.getTime() - 6 * 60 * 60 * 1000)
    : null;

  const approvedAt = input.status === KpiValueStatus.APPROVED
    ? new Date(now.getTime() - 2 * 60 * 60 * 1000)
    : null;

  const changesRequestedAt = input.changesRequestedBy
    ? new Date(now.getTime() - 3 * 60 * 60 * 1000)
    : null;

  const varIdByCode = await getKpiVariableIdMap(input.kpiId);
  const mapped = Object.entries(input.variableValues).map(([code, value]) => {
    const kpiVariableId = varIdByCode.get(code);
    if (!kpiVariableId) throw new Error(`Unknown KPI variable code ${code} for kpiId ${input.kpiId}`);
    return { kpiVariableId, value };
  });

  await upsertKpiValuePeriodWithVariables({
    kpiId: input.kpiId,
    periodStart: range.start,
    periodEnd: range.end,
    calculatedValue: input.calculatedValue,
    status: input.status,
    note: input.note ?? null,
    enteredBy: input.enteredBy ?? null,
    submittedAt,
    submittedBy: submittedAt ? (input.submittedBy ?? input.enteredBy ?? null) : null,
    approvedAt,
    approvedBy: approvedAt ? (input.approvedBy ?? null) : null,
    changesRequestedAt,
    changesRequestedBy: changesRequestedAt ? (input.changesRequestedBy ?? null) : null,
    changesRequestedMessage: changesRequestedAt ? (input.changesRequestedMessage ?? "Changes requested") : null,
    variableValues: mapped,
  });
}

async function main() {
  console.log("Starting seed...");

  try {
    await wipeDatabase();

    const nodeTypes = await Promise.all([
      ensureNodeType({ code: NodeTypeCode.STRATEGY, displayName: "Strategy", levelOrder: 1, canHaveKpis: true }),
      ensureNodeType({ code: NodeTypeCode.OBJECTIVE, displayName: "Objective", levelOrder: 2, canHaveKpis: true }),
      ensureNodeType({ code: NodeTypeCode.INITIATIVE, displayName: "Initiative", levelOrder: 3, canHaveKpis: true }),
      ensureNodeType({ code: NodeTypeCode.TASK, displayName: "Task", levelOrder: 4, canHaveKpis: false }),
    ]);

    const nodeTypeByCode = new Map(nodeTypes.map((t) => [t.code, t.id] as const));

    const org = await ensureOrg({
      domain: process.env.SEED_ORG_DOMAIN ?? "almousa.local",
      name: "مجموعة موسى بن عبدالعزيز الموسى وأولاده العقارية القابضة",
      kpiApprovalLevel: "PMO",
    });
    console.log("Using Org:", org.id);

    await ensureOrgNodeTypes(org.id, [
      NodeTypeCode.STRATEGY,
      NodeTypeCode.OBJECTIVE,
      NodeTypeCode.INITIATIVE,
      NodeTypeCode.TASK,
    ]);

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

    await ensureUser({
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

    const [employee1, employee2, employee3, employee4, employee5] = await Promise.all([
      ensureUser({ orgId: org.id, email: "employee1@almousa.local", password, name: "محلل استراتيجي", role: Role.EMPLOYEE, managerId: headStrategy.id, departmentId: deptStrategy.id, title: "Strategy Analyst" }),
      ensureUser({ orgId: org.id, email: "employee2@almousa.local", password, name: "محاسب", role: Role.EMPLOYEE, managerId: headFinance.id, departmentId: deptFinance.id, title: "Accountant" }),
      ensureUser({ orgId: org.id, email: "employee3@almousa.local", password, name: "مهندس نظم", role: Role.EMPLOYEE, managerId: headIt.id, departmentId: deptIt.id, title: "Systems Engineer" }),
      ensureUser({ orgId: org.id, email: "employee4@almousa.local", password, name: "أخصائي موارد بشرية", role: Role.EMPLOYEE, managerId: headHr.id, departmentId: deptHr.id, title: "HR Specialist" }),
      ensureUser({ orgId: org.id, email: "employee5@almousa.local", password, name: "منسق تسويق", role: Role.EMPLOYEE, managerId: headMarketing.id, departmentId: deptMarketing.id, title: "Marketing Coordinator" }),
    ]);

    const ntStrategy = nodeTypeByCode.get(NodeTypeCode.STRATEGY)!;
    const ntObjective = nodeTypeByCode.get(NodeTypeCode.OBJECTIVE)!;
    const ntInitiative = nodeTypeByCode.get(NodeTypeCode.INITIATIVE)!;
    const ntTask = nodeTypeByCode.get(NodeTypeCode.TASK)!;

    const start2025 = new Date("2025-11-01T00:00:00.000Z");
    const end2026 = new Date("2026-12-31T00:00:00.000Z");
    const end2027 = new Date("2027-12-31T00:00:00.000Z");
    const end2028 = new Date("2028-12-31T00:00:00.000Z");
    const end2030 = new Date("2030-12-31T00:00:00.000Z");

    const sBrand = await ensureNode({
      orgId: org.id,
      nodeTypeId: ntStrategy,
      name: "العلامة التجارية",
      description: "Brand (العلامة التجارية)",
      ownerUserId: headMarketing.id,
      status: Status.ACTIVE,
      progress: 10,
      startDate: start2025,
      endDate: end2030,
    });

    const sGovernance = await ensureNode({
      orgId: org.id,
      nodeTypeId: ntStrategy,
      name: "الحوكمة والتميز",
      description: "Governance & Excellence (الحوكمة والتميز)\n\nالرؤية: مجموعة استثمارية طموحة ذات كفاءه تبني استدامة النمو في قطاعات حيوية\nالرسالة: نستثمر في القطاعات الحيوية ذات الأثر الاقتصادي لخلق قيمة مستدامة تجسد كفاءة المجموعة وريادتها\nالقيم: الابتكار – الكفاءة – الشفافية – الالتزام",
      ownerUserId: headStrategy.id,
      status: Status.ACTIVE,
      progress: 15,
      startDate: start2025,
      endDate: end2030,
    });

    const sFinancial = await ensureNode({
      orgId: org.id,
      nodeTypeId: ntStrategy,
      name: "الاستدامة المالية",
      description: "Financial Sustainability (الاستدامة المالية)",
      ownerUserId: headFinance.id,
      status: Status.ACTIVE,
      progress: 12,
      startDate: start2025,
      endDate: end2030,
    });

    const sInvestment = await ensureNode({
      orgId: org.id,
      nodeTypeId: ntStrategy,
      name: "الريادة الاستثمارية وتنويع المحفظة",
      description: "Investment Leadership & Portfolio Diversification (الريادة الاستثمارية وتنويع المحفظة)",
      ownerUserId: ceo.id,
      status: Status.ACTIVE,
      progress: 10,
      startDate: start2025,
      endDate: end2030,
    });

    const oBrandAwareness2028 = await ensureNode({
      orgId: org.id,
      nodeTypeId: ntObjective,
      parentId: sBrand.id,
      name: "تعزيز الوعي بالعلامة التجارية (%) بحلول 2028",
      description: "نسخة A",
      ownerUserId: headMarketing.id,
      status: Status.ACTIVE,
      progress: 10,
      startDate: start2025,
      endDate: end2028,
    });

    const oBrandPosition2030Alt = await ensureNode({
      orgId: org.id,
      nodeTypeId: ntObjective,
      parentId: sBrand.id,
      name: "بديل (نسخة B): ترسيخ مكانة المجموعة كعلامة استثمارية رائدة بحلول 2030",
      description: "نسخة B",
      ownerUserId: headMarketing.id,
      status: Status.PLANNED,
      progress: 0,
      startDate: start2025,
      endDate: end2030,
    });

    const oMediaImpact2030 = await ensureNode({
      orgId: org.id,
      nodeTypeId: ntObjective,
      parentId: sBrand.id,
      name: "تعزيز الحضور والتأثير الإعلامي بحلول 2030",
      description: "نسخة B",
      ownerUserId: headMarketing.id,
      status: Status.ACTIVE,
      progress: 5,
      startDate: start2025,
      endDate: end2030,
    });

    const oIpoReadiness2026 = await ensureNode({
      orgId: org.id,
      nodeTypeId: ntObjective,
      parentId: sGovernance.id,
      name: "رفع الجاهزية للإدراج عبر الحوكمة وتفعيل النموذج التشغيلي بحلول 2026",
      description: "نسخة A/B",
      ownerUserId: headStrategy.id,
      status: Status.ACTIVE,
      progress: 20,
      startDate: start2025,
      endDate: end2026,
    });

    const oProductivity85_2027 = await ensureNode({
      orgId: org.id,
      nodeTypeId: ntObjective,
      parentId: sGovernance.id,
      name: "رفع مستوى إنتاجية الموظفين إلى 85% بحلول 2027",
      description: "نسخة A",
      ownerUserId: headHr.id,
      status: Status.ACTIVE,
      progress: 15,
      startDate: start2025,
      endDate: end2027,
    });

    const oRestructure2027Alt = await ensureNode({
      orgId: org.id,
      nodeTypeId: ntObjective,
      parentId: sGovernance.id,
      name: "بديل (نسخة B): إعادة هيكلة المجموعة والشركات التابعة لتمكين الأعمال واستدامتها بحلول 2027",
      description: "نسخة B",
      ownerUserId: admin.id,
      status: Status.ACTIVE,
      progress: 10,
      startDate: start2025,
      endDate: end2027,
    });

    const oRevenue2028 = await ensureNode({
      orgId: org.id,
      nodeTypeId: ntObjective,
      parentId: sFinancial.id,
      name: "رفع إيرادات المجموعة لتصبح XXX ريال بحلول 2028",
      description: "نسخة A",
      ownerUserId: headFinance.id,
      status: Status.ACTIVE,
      progress: 10,
      startDate: start2025,
      endDate: end2028,
    });

    const oRevenue2030Alt = await ensureNode({
      orgId: org.id,
      nodeTypeId: ntObjective,
      parentId: sFinancial.id,
      name: "بديل (نسخة B): رفع إيرادات المجموعة والشركات التابعة إلى XXX ريال بحلول 2030",
      description: "نسخة B",
      ownerUserId: headFinance.id,
      status: Status.PLANNED,
      progress: 0,
      startDate: start2025,
      endDate: end2030,
    });

    const oSpendingEfficiency2026 = await ensureNode({
      orgId: org.id,
      nodeTypeId: ntObjective,
      parentId: sFinancial.id,
      name: "تعزيز الانضباط المالي عبر نظام كفاءة إنفاق موحد لخفض الانحرافات المالية 10% بحلول 2026",
      description: "نسخة A/B",
      ownerUserId: headFinance.id,
      status: Status.ACTIVE,
      progress: 20,
      startDate: start2025,
      endDate: end2026,
    });

    const oNominalValue3y = await ensureNode({
      orgId: org.id,
      nodeTypeId: ntObjective,
      parentId: sFinancial.id,
      name: "رفع القيمة الاسمية للمجموعة (%) على مدى 3 سنوات",
      description: "نسخة A",
      ownerUserId: headFinance.id,
      status: Status.ACTIVE,
      progress: 10,
      startDate: start2025,
      endDate: end2028,
    });

    const oSectors7_2028 = await ensureNode({
      orgId: org.id,
      nodeTypeId: ntObjective,
      parentId: sInvestment.id,
      name: "توسيع المحفظة عبر الدخول في 7 قطاعات جديدة بحلول نهاية 2028",
      description: "نسخة A/B",
      ownerUserId: ceo.id,
      status: Status.ACTIVE,
      progress: 10,
      startDate: start2025,
      endDate: end2028,
    });

    const oReturn15_2028 = await ensureNode({
      orgId: org.id,
      nodeTypeId: ntObjective,
      parentId: sInvestment.id,
      name: "تعزيز الريادة الاستثمارية عبر منظومة مبتكرة تحقق عائد يفوق متوسط السوق 15% بحلول 2028",
      description: "نسخة A",
      ownerUserId: ceo.id,
      status: Status.ACTIVE,
      progress: 10,
      startDate: start2025,
      endDate: end2028,
    });

    const oReturn15_2030Alt = await ensureNode({
      orgId: org.id,
      nodeTypeId: ntObjective,
      parentId: sInvestment.id,
      name: "بديل (نسخة B): تحقيق عائد يفوق متوسط السوق 15% بحلول 2030",
      description: "نسخة B",
      ownerUserId: ceo.id,
      status: Status.PLANNED,
      progress: 0,
      startDate: start2025,
      endDate: end2030,
    });

    const i11BrandComms = await ensureNode({
      orgId: org.id,
      nodeTypeId: ntInitiative,
      parentId: oBrandAwareness2028.id,
      name: "مبادرة 11: تحديث وتنفيذ استراتيجية شاملة للتواصل والتسويق",
      description: null,
      ownerUserId: headMarketing.id,
      status: Status.ACTIVE,
      progress: 15,
      startDate: start2025,
      endDate: end2030,
    });

    await ensureTaskList({
      orgId: org.id,
      nodeTypeId: ntTask,
      parentId: i11BrandComms.id,
      defaultOwnerUserId: employee5.id,
      tasks: [
        { name: "تحليل شامل للهوية الحالية ومراجعة أداء قنوات التواصل" },
        { name: "إعداد استراتيجية اتصال وتسويق (الأهداف، الجمهور، الرسائل المحورية)" },
        { name: "تطوير خطة اتصال داخلية لتعزيز الوعي بالهوية المؤسسية" },
        { name: "تصميم خطة محتوى متعددة القنوات (رقمية/تقليدية/إعلامية)" },
        { name: "إنشاء نظام لإدارة السمعة ومتابعة الانطباعات" },
        { name: "تنفيذ حملات تسويقية وإعلامية لدعم المبادرات الاستراتيجية الكبرى" },
        { name: "التعاون مع وسائل الإعلام والشركاء لتوسيع التغطية" },
        { name: "تقييم الأداء بشكل دوري وتحديث الاستراتيجية" },
        { name: "تنفيذ برامج تواصل داخلي لتحسين اندماج الموظفين وتبني الهوية" },
      ],
    });

    const i6TransferServices = await ensureNode({
      orgId: org.id,
      nodeTypeId: ntInitiative,
      parentId: oRestructure2027Alt.id,
      name: "مبادرة 6: نقل خدمات المجموعة للشركات التابعة",
      description: null,
      ownerUserId: headStrategy.id,
      status: Status.ACTIVE,
      progress: 10,
      startDate: start2025,
      endDate: end2027,
    });

    await ensureTaskList({
      orgId: org.id,
      nodeTypeId: ntTask,
      parentId: i6TransferServices.id,
      defaultOwnerUserId: headStrategy.id,
      tasks: [
        { name: "تحديد الخدمات ذات الأولوية للنقل" },
        { name: "إعداد خطة تفصيلية وجدول زمني للتنفيذ المرحلي" },
        { name: "تطوير أدوات متابعة/تقييم جودة الخدمات المنقولة" },
        { name: "تنفيذ خطة التواصل وإدارة التغيير" },
        { name: "متابعة الأداء بعد النقل وتحديث الإجراءات حسب التغذية الراجعة" },
        { name: "تحديد نموذج تشغيلي للأدوار والمسؤوليات بين المجموعة والشركات التابعة" },
        { name: "توحيد الأنظمة التقنية والبيانات المرتبطة بالخدمات المشتركة" },
        { name: "تقييم دوري لنضج الخدمات وتحديد فرص التحسين المستمر" },
      ],
    });

    const i7RiskAudit = await ensureNode({
      orgId: org.id,
      nodeTypeId: ntInitiative,
      parentId: oIpoReadiness2026.id,
      name: "مبادرة 7: تفعيل الخطط المتعلقة بالمخاطر والمراجعة الداخلية",
      description: null,
      ownerUserId: headAudit.id,
      status: Status.ACTIVE,
      progress: 15,
      startDate: start2025,
      endDate: end2026,
    });

    await ensureTaskList({
      orgId: org.id,
      nodeTypeId: ntTask,
      parentId: i7RiskAudit.id,
      defaultOwnerUserId: headAudit.id,
      tasks: [
        { name: "تحديث سجل المخاطر الاستراتيجية والتشغيلية" },
        { name: "تنفيذ خطط المراجعة المعتمدة وتغطية جميع الوحدات التشغيلية" },
        { name: "تطوير نظام متابعة إلكتروني لحالات المراجعة الداخلية" },
        { name: "إعداد تقارير ربع سنوية عن حالة المخاطر ومؤشرات الاستجابة" },
        { name: "تنفيذ برامج توعية داخلية عن إدارة المخاطر والالتزام" },
        { name: "تصميم منهجية تقييم المخاطر وتحديد الأولويات (الاحتمالية × التأثير)" },
        { name: "تقييم نضج إدارة المخاطر في كل شركة وتحديد الفجوات وخطط التحسين" },
        { name: "تطوير مصفوفة الصلاحيات والمسؤوليات بين المجموعة والشركات التابعة" },
      ],
    });

    const i8OperatingModel = await ensureNode({
      orgId: org.id,
      nodeTypeId: ntInitiative,
      parentId: oIpoReadiness2026.id,
      name: "مبادرة 8: تفعيل النموذج التشغيلي المعتمد",
      description: null,
      ownerUserId: headStrategy.id,
      status: Status.ACTIVE,
      progress: 10,
      startDate: start2025,
      endDate: end2026,
    });

    await ensureTaskList({
      orgId: org.id,
      nodeTypeId: ntTask,
      parentId: i8OperatingModel.id,
      defaultOwnerUserId: headStrategy.id,
      tasks: [
        { name: "إنشاء آلية تنسيق واجتماعات دورية بين إدارات المخاطر والمراجعة (مجموعة/شركات)" },
        { name: "تحديد مؤشرات أداء موحدة للمخاطر والمراجعة وتطبيقها على جميع الشركات" },
        { name: "تطوير خطة استجابة للمخاطر ذات الأولوية العالية (فورية/وقائية)" },
      ],
    });

    const i9Learning = await ensureNode({
      orgId: org.id,
      nodeTypeId: ntInitiative,
      parentId: oProductivity85_2027.id,
      name: "مبادرة 9: تطوير خطة تعلم وتطوير للموظفين (المجموعة والشركات التابعة)",
      description: null,
      ownerUserId: headHr.id,
      status: Status.ACTIVE,
      progress: 15,
      startDate: start2025,
      endDate: end2027,
    });

    await ensureTaskList({
      orgId: org.id,
      nodeTypeId: ntTask,
      parentId: i9Learning.id,
      defaultOwnerUserId: employee4.id,
      tasks: [
        { name: "تحليل فجوات المهارات للمستويات الإدارية والفنية" },
        { name: "تصميم إطار تعلم وتطوير موحد (مسارات مهنية + برامج أساسية/متقدمة)" },
        { name: "إعداد خطة سنوية للتطوير (قيادي/فني/تحول رقمي)" },
        { name: "تطوير نظام إدارة تعلم إلكتروني لمتابعة وتقييم التدريب" },
        { name: "تنفيذ برامج تدريب داخلية وخارجية مع شركاء أكاديميين/استشاريين" },
        { name: "بناء برامج إعداد قيادات الصف الثاني والثالث" },
        { name: "وضع آلية تحفيزية تربط الأداء بالتطوير المهني" },
        { name: "تنفيذ برامج تعلم رقمية لزيادة الوصول والمرونة" },
        { name: "قياس أثر التدريب على الأداء باستخدام مؤشرات الكفاءة والإنتاجية" },
        { name: "تقارير أداء فصلية لمتابعة الأهداف التعليمية والمهنية" },
      ],
    });

    const i10Integration = await ensureNode({
      orgId: org.id,
      nodeTypeId: ntInitiative,
      parentId: oRestructure2027Alt.id,
      name: "مبادرة 10: تعزيز التواصل والتكامل بين المجموعة والشركات التابعة",
      description: null,
      ownerUserId: headStrategy.id,
      status: Status.ACTIVE,
      progress: 10,
      startDate: start2025,
      endDate: end2027,
    });

    await ensureTaskList({
      orgId: org.id,
      nodeTypeId: ntTask,
      parentId: i10Integration.id,
      defaultOwnerUserId: headStrategy.id,
      tasks: [
        { name: "إنشاء حوكمة للتواصل الداخلي (قنوات رسمية + مسؤوليات)" },
        { name: "تطوير منصة رقمية موحدة للتواصل وتبادل المعلومات", ownerUserId: headIt.id },
        { name: "لقاءات دورية تنسيقية بين القيادات لمناقشة المشاريع المشتركة والتحديات" },
        { name: "نشرات داخلية وتقارير موحدة للمستجدات والمبادرات" },
        { name: "برامج تواصل داخلي تفاعلية (ورش/اجتماعات/فعاليات)" },
        { name: "آلية لمتابعة القرارات المشتركة وقياس الالتزام بالتنفيذ" },
        { name: "استبيانات دورية لقياس رضا الشركات التابعة عن التواصل" },
        { name: "دليل إجرائي للتواصل الداخلي (رسائل/مسارات/اعتمادات)" },
      ],
    });

    const i12DigitalTransformation = await ensureNode({
      orgId: org.id,
      nodeTypeId: ntInitiative,
      parentId: oRestructure2027Alt.id,
      name: "مبادرة 12: تطوير وتفعيل استراتيجية التحول الرقمي",
      description: null,
      ownerUserId: headIt.id,
      status: Status.ACTIVE,
      progress: 10,
      startDate: start2025,
      endDate: end2027,
    });

    await ensureTaskList({
      orgId: org.id,
      nodeTypeId: ntTask,
      parentId: i12DigitalTransformation.id,
      defaultOwnerUserId: employee3.id,
      tasks: [
        { name: "تقييم شامل للنضج الرقمي وتحديد الفجوات والفرص" },
        { name: "تحديث استراتيجية التحول الرقمي لتتوافق مع الأهداف الاستثمارية والتشغيلية" },
        { name: "تطوير خارطة طريق رقمية (الأولويات، الأنظمة، مراحل التنفيذ)" },
        { name: "أتمتة العمليات الأساسية (المشتريات، المالية، الموارد البشرية، التقارير)" },
        { name: "بناء بنية تحتية رقمية موحدة للتكامل بين أنظمة المجموعة والشركات" },
        { name: "تطوير منصة بيانات مركزية لتجميع وتحليل البيانات التشغيلية والمالية" },
        { name: "إدخال أنظمة ذكاء أعمال لدعم القرار وتحليل الأداء لحظيًا" },
        { name: "برامج توعية وتدريب رقمي لرفع الجاهزية" },
      ],
    });

    const i4FinancialIntegration = await ensureNode({
      orgId: org.id,
      nodeTypeId: ntInitiative,
      parentId: oSpendingEfficiency2026.id,
      name: "مبادرة 4: تعزيز التكامل المالي والتقني والامتثال المالي",
      description: null,
      ownerUserId: headFinance.id,
      status: Status.ACTIVE,
      progress: 20,
      startDate: start2025,
      endDate: end2026,
    });

    await ensureTaskList({
      orgId: org.id,
      nodeTypeId: ntTask,
      parentId: i4FinancialIntegration.id,
      defaultOwnerUserId: employee2.id,
      tasks: [
        { name: "مراجعة الأنظمة والسياسات والإجراءات المالية وتحديد التباينات" },
        { name: "تصميم دليل سياسات مالي موحد + متطلبات تقنية الامتثال" },
        { name: "توحيد واعتماد منصة تقنية مالية للتقارير الموحدة والشفافية", ownerUserId: headIt.id },
        { name: "تطوير وتفعيل حوكمة الامتثال + أتمتة التدقيق الداخلي وتقارير الامتثال", ownerUserId: headAudit.id },
        { name: "برنامج تدريب شامل للفرق المالية على الإطار الموحد والمنصة" },
      ],
    });

    const i5CapitalStructure = await ensureNode({
      orgId: org.id,
      nodeTypeId: ntInitiative,
      parentId: oRevenue2028.id,
      name: "مبادرة 5: مراجعة هيكلة رأس المال والتدفقات المالية",
      description: null,
      ownerUserId: headFinance.id,
      status: Status.ACTIVE,
      progress: 15,
      startDate: start2025,
      endDate: end2026,
    });

    await ensureTaskList({
      orgId: org.id,
      nodeTypeId: ntTask,
      parentId: i5CapitalStructure.id,
      defaultOwnerUserId: employee2.id,
      tasks: [
        { name: "تحليل الوضع المالي وهيكل رأس المال (مديونية/سيولة)" },
        { name: "مراجعة توزيع رأس المال وتحديد الفائض/العجز" },
        { name: "تحديث سياسات إدارة النقد والتدفقات" },
        { name: "تصميم نموذج محاكاة للتدفقات النقدية المستقبلية" },
        { name: "اقتراح خطة لإعادة هيكلة رأس المال (ديون/حقوق)" },
        { name: "تطوير آلية مركزية لمتابعة وإدارة السيولة" },
        { name: "تقارير مالية دورية للإدارة العليا", ownerUserId: headFinance.id },
        { name: "ورش عمل مالية لرفع كفاءة الإدارات المالية" },
      ],
    });

    const i1InvestmentDesign = await ensureNode({
      orgId: org.id,
      nodeTypeId: ntInitiative,
      parentId: oSectors7_2028.id,
      name: "مبادرة 1: تصميم أطر الاستثمار",
      description: null,
      ownerUserId: ceo.id,
      status: Status.ACTIVE,
      progress: 20,
      startDate: start2025,
      endDate: end2026,
    });

    await ensureTaskList({
      orgId: org.id,
      nodeTypeId: ntTask,
      parentId: i1InvestmentDesign.id,
      defaultOwnerUserId: employee1.id,
      tasks: [
        { name: "تحليل أداء الاستثمارات الحالية ومصادر الإيرادات (قوة/ضعف/فرص غير مستغلة)", ownerUserId: headFinance.id },
        { name: "تحديد القطاعات الجديدة ذات النمو المرتفع المتوافقة مع الأهداف والرؤية" },
        { name: "تحديد أهداف كمية لزيادة الإيرادات وتنوعها + عائد مستهدف لكل قطاع", ownerUserId: headFinance.id },
        { name: "وضع إطار لتقييم وإدارة المخاطر + هياكل اتخاذ القرار (مثل لجنة الاستثمار)", ownerUserId: headAudit.id },
        { name: "تخصيص رأس المال البشري والمالي لمشاريع النمو", ownerUserId: ceo.id },
        { name: "وضع مؤشرات قياس واضحة لنجاح الاستراتيجية" },
        { name: "مراجعة سنوية شاملة للخطة وتحديثها" },
        { name: "أتمتة لجنة تقييم استثماري لمراجعة القرارات الكبرى", ownerUserId: headIt.id },
      ],
    });

    const i2InvestmentExecute = await ensureNode({
      orgId: org.id,
      nodeTypeId: ntInitiative,
      parentId: oSectors7_2028.id,
      name: "مبادرة 2: تنفيذ أطر الاستثمار",
      description: null,
      ownerUserId: ceo.id,
      status: Status.ACTIVE,
      progress: 10,
      startDate: start2025,
      endDate: end2028,
    });

    await ensureTaskList({
      orgId: org.id,
      nodeTypeId: ntTask,
      parentId: i2InvestmentExecute.id,
      defaultOwnerUserId: ceo.id,
      tasks: [
        { name: "اعتماد الإطار وتدريب الإدارات على تطبيقه", ownerUserId: admin.id },
        { name: "تخصيص الموارد والميزانيات لمشاريع النمو والدخول في القطاعات الجديدة", ownerUserId: headFinance.id },
        { name: "تنفيذ خطة الشراكات وجذب المستثمرين وتوقيع الاتفاقيات" },
        { name: "إطلاق مشاريع النمو في القطاعات الجديدة وتخصيص الاستثمارات وفق الإطار" },
        { name: "تطبيق آلية إدارة التخارج الدورية للاستثمارات غير المتوافقة" },
        { name: "تقارير دورية تقيس العائد على الاستثمار للاستثمارات الجديدة والمستمرة", ownerUserId: headFinance.id },
      ],
    });

    const i3MarketResearchBi = await ensureNode({
      orgId: org.id,
      nodeTypeId: ntInitiative,
      parentId: oReturn15_2028.id,
      name: "مبادرة 3: إعداد الدراسات وأبحاث السوق وتأسيس ذكاء الأعمال",
      description: null,
      ownerUserId: headIt.id,
      status: Status.ACTIVE,
      progress: 10,
      startDate: start2025,
      endDate: end2027,
    });

    await ensureTaskList({
      orgId: org.id,
      nodeTypeId: ntTask,
      parentId: i3MarketResearchBi.id,
      defaultOwnerUserId: employee3.id,
      tasks: [
        { name: "وضع إطار منهجي لأبحاث السوق (أهداف، منهجيات، شرائح، أسواق)", ownerUserId: employee1.id },
        { name: "جمع وتحليل بيانات السوق (استبيانات/مقابلات/مصادر) واستخلاص الاتجاهات", ownerUserId: employee1.id },
        { name: "إعداد دراسات وتقارير وتحليل منافسين وتوصيات لدعم القرار", ownerUserId: employee1.id },
        { name: "بناء مستودع بيانات وتوحيد المصادر الداخلية والخارجية وضمان الجودة" },
        { name: "تطوير لوحات معلومات تفاعلية لمؤشرات الأداء" },
        { name: "تدريب الكوادر ونقل المعرفة على أدوات ذكاء الأعمال" },
        { name: "أتمتة وتحديث ذكاء الأعمال + نماذج تنبؤية للاستشراف" },
      ],
    });

    const kpiNominalValueGrowth = await ensureKpi({
      orgId: org.id,
      primaryNodeId: oNominalValue3y.id,
      ownerUserId: headFinance.id,
      name: "% نمو/رفع القيمة الاسمية للمجموعة",
      description: "Strategic KPI",
      formula: "((NOMINAL_VALUE_CURRENT - NOMINAL_VALUE_BASELINE) / NOMINAL_VALUE_BASELINE) * 100",
      unit: "%",
      direction: KpiDirection.INCREASE_IS_GOOD,
      aggregation: KpiAggregationMethod.LAST_VALUE,
      periodType: KpiPeriodType.YEARLY,
      variables: [
        { code: "NOMINAL_VALUE_BASELINE", displayName: "القيمة الاسمية (خط الأساس)", dataType: KpiVariableDataType.NUMBER, isRequired: true },
        { code: "NOMINAL_VALUE_CURRENT", displayName: "القيمة الاسمية الحالية", dataType: KpiVariableDataType.NUMBER, isRequired: true },
      ],
    });

    const kpiBrandAwareness = await ensureKpi({
      orgId: org.id,
      primaryNodeId: oBrandAwareness2028.id,
      ownerUserId: headMarketing.id,
      name: "% الوعي بالعلامة التجارية",
      description: "Strategic KPI",
      formula: "AWARENESS_PERCENT",
      unit: "%",
      direction: KpiDirection.INCREASE_IS_GOOD,
      aggregation: KpiAggregationMethod.AVERAGE,
      periodType: KpiPeriodType.QUARTERLY,
      variables: [{ code: "AWARENESS_PERCENT", displayName: "نسبة الوعي", dataType: KpiVariableDataType.PERCENTAGE, isRequired: true }],
    });

    const kpiIpoReadiness = await ensureKpi({
      orgId: org.id,
      primaryNodeId: oIpoReadiness2026.id,
      ownerUserId: headStrategy.id,
      name: "مؤشر جاهزية الإدراج (IPO Readiness Score)",
      description: "Strategic KPI",
      formula: "(GOVERNANCE + OPERATING_MODEL + COMPLIANCE) / 3",
      unit: "%",
      direction: KpiDirection.INCREASE_IS_GOOD,
      aggregation: KpiAggregationMethod.AVERAGE,
      periodType: KpiPeriodType.QUARTERLY,
      variables: [
        { code: "GOVERNANCE", displayName: "الحوكمة", dataType: KpiVariableDataType.PERCENTAGE, isRequired: true },
        { code: "OPERATING_MODEL", displayName: "النموذج التشغيلي", dataType: KpiVariableDataType.PERCENTAGE, isRequired: true },
        { code: "COMPLIANCE", displayName: "الامتثال", dataType: KpiVariableDataType.PERCENTAGE, isRequired: true },
      ],
    });

    const kpiGroupRevenue = await ensureKpi({
      orgId: org.id,
      primaryNodeId: oRevenue2028.id,
      ownerUserId: headFinance.id,
      name: "إيرادات المجموعة (SAR)",
      description: "Strategic KPI",
      formula: "TOTAL_REVENUE",
      unit: "SAR",
      direction: KpiDirection.INCREASE_IS_GOOD,
      aggregation: KpiAggregationMethod.LAST_VALUE,
      periodType: KpiPeriodType.YEARLY,
      variables: [{ code: "TOTAL_REVENUE", displayName: "إجمالي الإيرادات", dataType: KpiVariableDataType.NUMBER, isRequired: true }],
    });

    const kpiVarianceReduction = await ensureKpi({
      orgId: org.id,
      primaryNodeId: oSpendingEfficiency2026.id,
      ownerUserId: headFinance.id,
      name: "% خفض الانحرافات المالية",
      description: "Strategic KPI",
      formula: "((VARIANCE_BASELINE - VARIANCE_CURRENT) / VARIANCE_BASELINE) * 100",
      unit: "%",
      direction: KpiDirection.INCREASE_IS_GOOD,
      aggregation: KpiAggregationMethod.LAST_VALUE,
      periodType: KpiPeriodType.QUARTERLY,
      targetValue: 10,
      variables: [
        { code: "VARIANCE_BASELINE", displayName: "انحرافات خط الأساس", dataType: KpiVariableDataType.NUMBER, isRequired: true },
        { code: "VARIANCE_CURRENT", displayName: "الانحرافات الحالية", dataType: KpiVariableDataType.NUMBER, isRequired: true },
      ],
    });

    const kpiNewSectors = await ensureKpi({
      orgId: org.id,
      primaryNodeId: oSectors7_2028.id,
      ownerUserId: ceo.id,
      name: "عدد القطاعات الجديدة المدخولة",
      description: "Strategic KPI",
      formula: "SECTORS_ENTERED",
      unit: "count",
      direction: KpiDirection.INCREASE_IS_GOOD,
      aggregation: KpiAggregationMethod.LAST_VALUE,
      periodType: KpiPeriodType.YEARLY,
      targetValue: 7,
      variables: [{ code: "SECTORS_ENTERED", displayName: "عدد القطاعات", dataType: KpiVariableDataType.NUMBER, isRequired: true }],
    });

    const kpiReturnVsMarket = await ensureKpi({
      orgId: org.id,
      primaryNodeId: oReturn15_2028.id,
      ownerUserId: ceo.id,
      name: "الأداء/العائد الاستثماري مقابل متوسط السوق",
      description: "Strategic KPI",
      formula: "ROI_GROUP - ROI_MARKET_AVG",
      unit: "%",
      direction: KpiDirection.INCREASE_IS_GOOD,
      aggregation: KpiAggregationMethod.LAST_VALUE,
      periodType: KpiPeriodType.QUARTERLY,
      targetValue: 15,
      variables: [
        { code: "ROI_GROUP", displayName: "عائد المحفظة", dataType: KpiVariableDataType.PERCENTAGE, isRequired: true },
        { code: "ROI_MARKET_AVG", displayName: "متوسط السوق", dataType: KpiVariableDataType.PERCENTAGE, isRequired: true },
      ],
    });

    const kpiEmployeeProductivity = await ensureKpi({
      orgId: org.id,
      primaryNodeId: oProductivity85_2027.id,
      ownerUserId: headHr.id,
      name: "% إنتاجية الموظفين",
      description: "Strategic KPI (Objective 8A)",
      formula: "PRODUCTIVITY_PERCENT",
      unit: "%",
      direction: KpiDirection.INCREASE_IS_GOOD,
      aggregation: KpiAggregationMethod.LAST_VALUE,
      periodType: KpiPeriodType.QUARTERLY,
      targetValue: 85,
      variables: [{ code: "PRODUCTIVITY_PERCENT", displayName: "نسبة الإنتاجية", dataType: KpiVariableDataType.PERCENTAGE, isRequired: true }],
    });

    const kpiRestructureCompletion = await ensureKpi({
      orgId: org.id,
      primaryNodeId: oRestructure2027Alt.id,
      ownerUserId: admin.id,
      name: "% إنجاز إعادة الهيكلة/تمكين الأعمال",
      description: "Strategic KPI (Objective 8B - Alt)",
      formula: "RESTRUCTURE_COMPLETION",
      unit: "%",
      direction: KpiDirection.INCREASE_IS_GOOD,
      aggregation: KpiAggregationMethod.LAST_VALUE,
      periodType: KpiPeriodType.QUARTERLY,
      variables: [{ code: "RESTRUCTURE_COMPLETION", displayName: "نسبة الإنجاز", dataType: KpiVariableDataType.PERCENTAGE, isRequired: true }],
    });

    const kpiI1FrameworkCompletion = await ensureKpi({
      orgId: org.id,
      primaryNodeId: i1InvestmentDesign.id,
      ownerUserId: ceo.id,
      name: "% إنجاز وتوثيق الأطر الاستثمارية",
      description: "Initiative 1 KPI",
      formula: "FRAMEWORK_COMPLETION",
      unit: "%",
      direction: KpiDirection.INCREASE_IS_GOOD,
      aggregation: KpiAggregationMethod.LAST_VALUE,
      periodType: KpiPeriodType.QUARTERLY,
      variables: [{ code: "FRAMEWORK_COMPLETION", displayName: "نسبة الإنجاز", dataType: KpiVariableDataType.PERCENTAGE, isRequired: true }],
    });

    const kpiI1RevenueDiversification = await ensureKpi({
      orgId: org.id,
      primaryNodeId: i1InvestmentDesign.id,
      ownerUserId: headFinance.id,
      name: "% تنوع مصادر الإيرادات في القطاعات المستهدفة",
      description: "Initiative 1 KPI",
      formula: "REVENUE_DIVERSIFICATION",
      unit: "%",
      direction: KpiDirection.INCREASE_IS_GOOD,
      aggregation: KpiAggregationMethod.LAST_VALUE,
      periodType: KpiPeriodType.YEARLY,
      variables: [{ code: "REVENUE_DIVERSIFICATION", displayName: "نسبة التنوع", dataType: KpiVariableDataType.PERCENTAGE, isRequired: true }],
    });

    const kpiI1RiskCoverage = await ensureKpi({
      orgId: org.id,
      primaryNodeId: i1InvestmentDesign.id,
      ownerUserId: headAudit.id,
      name: "% تغطية المخاطر ضمن الإطار المعياري الجديد",
      description: "Initiative 1 KPI",
      formula: "RISK_COVERAGE",
      unit: "%",
      direction: KpiDirection.INCREASE_IS_GOOD,
      aggregation: KpiAggregationMethod.LAST_VALUE,
      periodType: KpiPeriodType.QUARTERLY,
      variables: [{ code: "RISK_COVERAGE", displayName: "نسبة التغطية", dataType: KpiVariableDataType.PERCENTAGE, isRequired: true }],
    });

    const kpiI2RoiNewSectors = await ensureKpi({
      orgId: org.id,
      primaryNodeId: i2InvestmentExecute.id,
      ownerUserId: ceo.id,
      name: "العائد على الاستثمار للقطاعات الجديدة",
      description: "Initiative 2 KPI",
      formula: "ROI_NEW_SECTORS",
      unit: "%",
      direction: KpiDirection.INCREASE_IS_GOOD,
      aggregation: KpiAggregationMethod.LAST_VALUE,
      periodType: KpiPeriodType.QUARTERLY,
      variables: [{ code: "ROI_NEW_SECTORS", displayName: "العائد", dataType: KpiVariableDataType.PERCENTAGE, isRequired: true }],
    });

    const kpiI2Contribution = await ensureKpi({
      orgId: org.id,
      primaryNodeId: i2InvestmentExecute.id,
      ownerUserId: headFinance.id,
      name: "نسبة مساهمة القطاعات الجديدة في إجمالي المحفظة",
      description: "Initiative 2 KPI",
      formula: "NEW_SECTORS_CONTRIBUTION",
      unit: "%",
      direction: KpiDirection.INCREASE_IS_GOOD,
      aggregation: KpiAggregationMethod.LAST_VALUE,
      periodType: KpiPeriodType.QUARTERLY,
      variables: [{ code: "NEW_SECTORS_CONTRIBUTION", displayName: "نسبة المساهمة", dataType: KpiVariableDataType.PERCENTAGE, isRequired: true }],
    });

    const kpiI2PartnershipRevenue = await ensureKpi({
      orgId: org.id,
      primaryNodeId: i2InvestmentExecute.id,
      ownerUserId: ceo.id,
      name: "نسبة الإيرادات عبر الشراكات الاستراتيجية",
      description: "Initiative 2 KPI",
      formula: "PARTNERSHIP_REVENUE_SHARE",
      unit: "%",
      direction: KpiDirection.INCREASE_IS_GOOD,
      aggregation: KpiAggregationMethod.LAST_VALUE,
      periodType: KpiPeriodType.QUARTERLY,
      variables: [{ code: "PARTNERSHIP_REVENUE_SHARE", displayName: "نسبة الإيرادات", dataType: KpiVariableDataType.PERCENTAGE, isRequired: true }],
    });

    const kpiI2ExitEfficiency = await ensureKpi({
      orgId: org.id,
      primaryNodeId: i2InvestmentExecute.id,
      ownerUserId: headFinance.id,
      name: "كفاءة إدارة التخارج",
      description: "Initiative 2 KPI",
      formula: "EXIT_EFFICIENCY",
      unit: "%",
      direction: KpiDirection.INCREASE_IS_GOOD,
      aggregation: KpiAggregationMethod.LAST_VALUE,
      periodType: KpiPeriodType.YEARLY,
      variables: [{ code: "EXIT_EFFICIENCY", displayName: "الكفاءة", dataType: KpiVariableDataType.PERCENTAGE, isRequired: true }],
    });

    const kpiI2Compliance = await ensureKpi({
      orgId: org.id,
      primaryNodeId: i2InvestmentExecute.id,
      ownerUserId: headAudit.id,
      name: "معدل الامتثال للمعيار الاستثماري الجديد",
      description: "Initiative 2 KPI",
      formula: "INVESTMENT_STANDARD_COMPLIANCE",
      unit: "%",
      direction: KpiDirection.INCREASE_IS_GOOD,
      aggregation: KpiAggregationMethod.LAST_VALUE,
      periodType: KpiPeriodType.QUARTERLY,
      variables: [{ code: "INVESTMENT_STANDARD_COMPLIANCE", displayName: "نسبة الامتثال", dataType: KpiVariableDataType.PERCENTAGE, isRequired: true }],
    });

    const kpiI3WarehouseCompletion = await ensureKpi({
      orgId: org.id,
      primaryNodeId: i3MarketResearchBi.id,
      ownerUserId: headIt.id,
      name: "% اكتمال بناء وتغطية مستودع البيانات وذكاء الأعمال",
      description: "Initiative 3 KPI",
      formula: "DWH_BI_COMPLETION",
      unit: "%",
      direction: KpiDirection.INCREASE_IS_GOOD,
      aggregation: KpiAggregationMethod.LAST_VALUE,
      periodType: KpiPeriodType.QUARTERLY,
      variables: [{ code: "DWH_BI_COMPLETION", displayName: "نسبة الاكتمال", dataType: KpiVariableDataType.PERCENTAGE, isRequired: true }],
    });

    const kpiI3DecisionCycle = await ensureKpi({
      orgId: org.id,
      primaryNodeId: i3MarketResearchBi.id,
      ownerUserId: ceo.id,
      name: "زمن دورة تجهيز القرار الاستثماري",
      description: "Initiative 3 KPI",
      formula: "DECISION_CYCLE_DAYS",
      unit: "days",
      direction: KpiDirection.DECREASE_IS_GOOD,
      aggregation: KpiAggregationMethod.LAST_VALUE,
      periodType: KpiPeriodType.MONTHLY,
      variables: [{ code: "DECISION_CYCLE_DAYS", displayName: "أيام دورة القرار", dataType: KpiVariableDataType.NUMBER, isRequired: true }],
    });

    const kpiI3DecisionsSupported = await ensureKpi({
      orgId: org.id,
      primaryNodeId: i3MarketResearchBi.id,
      ownerUserId: headIt.id,
      name: "% القرارات الاستثمارية المدعومة بذكاء الأعمال",
      description: "Initiative 3 KPI",
      formula: "BI_DECISIONS_SHARE",
      unit: "%",
      direction: KpiDirection.INCREASE_IS_GOOD,
      aggregation: KpiAggregationMethod.AVERAGE,
      periodType: KpiPeriodType.QUARTERLY,
      variables: [{ code: "BI_DECISIONS_SHARE", displayName: "نسبة القرارات", dataType: KpiVariableDataType.PERCENTAGE, isRequired: true }],
    });

    const kpiI3ForecastAccuracy = await ensureKpi({
      orgId: org.id,
      primaryNodeId: i3MarketResearchBi.id,
      ownerUserId: employee1.id,
      name: "دقة التوقعات في دراسات الجدوى",
      description: "Initiative 3 KPI",
      formula: "FORECAST_ACCURACY",
      unit: "%",
      direction: KpiDirection.INCREASE_IS_GOOD,
      aggregation: KpiAggregationMethod.AVERAGE,
      periodType: KpiPeriodType.QUARTERLY,
      variables: [{ code: "FORECAST_ACCURACY", displayName: "دقة التوقع", dataType: KpiVariableDataType.PERCENTAGE, isRequired: true }],
    });

    const kpiI4PolicyUnification = await ensureKpi({
      orgId: org.id,
      primaryNodeId: i4FinancialIntegration.id,
      ownerUserId: headFinance.id,
      name: "% توحيد السياسات والإجراءات المالية بين المجموعة والشركات التابعة",
      description: "Initiative 4 KPI",
      formula: "POLICY_UNIFICATION",
      unit: "%",
      direction: KpiDirection.INCREASE_IS_GOOD,
      aggregation: KpiAggregationMethod.LAST_VALUE,
      periodType: KpiPeriodType.QUARTERLY,
      variables: [{ code: "POLICY_UNIFICATION", displayName: "نسبة التوحيد", dataType: KpiVariableDataType.PERCENTAGE, isRequired: true }],
    });

    const kpiI4ComplianceControls = await ensureKpi({
      orgId: org.id,
      primaryNodeId: i4FinancialIntegration.id,
      ownerUserId: headAudit.id,
      name: "% الالتزام بالضوابط والسياسات المالية المعتمدة",
      description: "Initiative 4 KPI",
      formula: "FINANCIAL_CONTROLS_COMPLIANCE",
      unit: "%",
      direction: KpiDirection.INCREASE_IS_GOOD,
      aggregation: KpiAggregationMethod.LAST_VALUE,
      periodType: KpiPeriodType.QUARTERLY,
      variables: [{ code: "FINANCIAL_CONTROLS_COMPLIANCE", displayName: "نسبة الالتزام", dataType: KpiVariableDataType.PERCENTAGE, isRequired: true }],
    });

    const kpiI5CashflowModelAlignment = await ensureKpi({
      orgId: org.id,
      primaryNodeId: i5CapitalStructure.id,
      ownerUserId: headFinance.id,
      name: "درجة التوافق بين نتائج نموذج محاكاة التدفقات والواقع المالي",
      description: "Initiative 5 KPI",
      formula: "CASHFLOW_MODEL_ALIGNMENT",
      unit: "%",
      direction: KpiDirection.INCREASE_IS_GOOD,
      aggregation: KpiAggregationMethod.AVERAGE,
      periodType: KpiPeriodType.QUARTERLY,
      variables: [{ code: "CASHFLOW_MODEL_ALIGNMENT", displayName: "نسبة التوافق", dataType: KpiVariableDataType.PERCENTAGE, isRequired: true }],
    });

    const kpiI6ServicesTransferred = await ensureKpi({
      orgId: org.id,
      primaryNodeId: i6TransferServices.id,
      ownerUserId: headStrategy.id,
      name: "% الخدمات المنقولة",
      description: "Initiative 6 KPI",
      formula: "SERVICES_TRANSFERRED",
      unit: "%",
      direction: KpiDirection.INCREASE_IS_GOOD,
      aggregation: KpiAggregationMethod.LAST_VALUE,
      periodType: KpiPeriodType.QUARTERLY,
      variables: [{ code: "SERVICES_TRANSFERRED", displayName: "نسبة النقل", dataType: KpiVariableDataType.PERCENTAGE, isRequired: true }],
    });

    const kpiI6ServiceQuality = await ensureKpi({
      orgId: org.id,
      primaryNodeId: i6TransferServices.id,
      ownerUserId: headStrategy.id,
      name: "جودة الخدمات المقدمة بعد نقلها",
      description: "Initiative 6 KPI",
      formula: "SERVICE_QUALITY",
      unit: "%",
      direction: KpiDirection.INCREASE_IS_GOOD,
      aggregation: KpiAggregationMethod.AVERAGE,
      periodType: KpiPeriodType.QUARTERLY,
      variables: [{ code: "SERVICE_QUALITY", displayName: "جودة الخدمة", dataType: KpiVariableDataType.PERCENTAGE, isRequired: true }],
    });

    const kpiI7AuditPlanExecution = await ensureKpi({
      orgId: org.id,
      primaryNodeId: i7RiskAudit.id,
      ownerUserId: headAudit.id,
      name: "% تنفيذ خطة المراجعة السنوية",
      description: "Initiative 7 KPI",
      formula: "(AUDITS_DONE / AUDITS_PLANNED) * 100",
      unit: "%",
      direction: KpiDirection.INCREASE_IS_GOOD,
      aggregation: KpiAggregationMethod.LAST_VALUE,
      periodType: KpiPeriodType.QUARTERLY,
      variables: [
        { code: "AUDITS_DONE", displayName: "عدد المراجعات المنجزة", dataType: KpiVariableDataType.NUMBER, isRequired: true },
        { code: "AUDITS_PLANNED", displayName: "عدد المراجعات المخطط لها", dataType: KpiVariableDataType.NUMBER, isRequired: true },
      ],
    });

    const kpiI7RiskReduction = await ensureKpi({
      orgId: org.id,
      primaryNodeId: i7RiskAudit.id,
      ownerUserId: headAudit.id,
      name: "% انخفاض عدد المخاطر",
      description: "Initiative 7 KPI",
      formula: "((RISKS_BASELINE - RISKS_CURRENT) / RISKS_BASELINE) * 100",
      unit: "%",
      direction: KpiDirection.INCREASE_IS_GOOD,
      aggregation: KpiAggregationMethod.LAST_VALUE,
      periodType: KpiPeriodType.QUARTERLY,
      variables: [
        { code: "RISKS_BASELINE", displayName: "عدد المخاطر (خط الأساس)", dataType: KpiVariableDataType.NUMBER, isRequired: true },
        { code: "RISKS_CURRENT", displayName: "عدد المخاطر الحالي", dataType: KpiVariableDataType.NUMBER, isRequired: true },
      ],
    });

    const kpiI8OperatingModelAdoption = await ensureKpi({
      orgId: org.id,
      primaryNodeId: i8OperatingModel.id,
      ownerUserId: headStrategy.id,
      name: "% تطبيق النموذج التشغيلي المعتمد في الشركات التابعة",
      description: "Initiative 8 KPI",
      formula: "OPERATING_MODEL_ADOPTION",
      unit: "%",
      direction: KpiDirection.INCREASE_IS_GOOD,
      aggregation: KpiAggregationMethod.LAST_VALUE,
      periodType: KpiPeriodType.QUARTERLY,
      variables: [{ code: "OPERATING_MODEL_ADOPTION", displayName: "نسبة التطبيق", dataType: KpiVariableDataType.PERCENTAGE, isRequired: true }],
    });

    const kpiI8EfficiencyImprovement = await ensureKpi({
      orgId: org.id,
      primaryNodeId: i8OperatingModel.id,
      ownerUserId: headStrategy.id,
      name: "% التحسن في كفاءة العمليات التشغيلية",
      description: "Initiative 8 KPI",
      formula: "EFFICIENCY_IMPROVEMENT",
      unit: "%",
      direction: KpiDirection.INCREASE_IS_GOOD,
      aggregation: KpiAggregationMethod.AVERAGE,
      periodType: KpiPeriodType.QUARTERLY,
      variables: [{ code: "EFFICIENCY_IMPROVEMENT", displayName: "نسبة التحسن", dataType: KpiVariableDataType.PERCENTAGE, isRequired: true }],
    });

    const kpiI8RoleClarity = await ensureKpi({
      orgId: org.id,
      primaryNodeId: i8OperatingModel.id,
      ownerUserId: headStrategy.id,
      name: "مؤشر وضوح الأدوار والمساءلة",
      description: "Initiative 8 KPI",
      formula: "ROLE_CLARITY_INDEX",
      unit: "%",
      direction: KpiDirection.INCREASE_IS_GOOD,
      aggregation: KpiAggregationMethod.AVERAGE,
      periodType: KpiPeriodType.QUARTERLY,
      variables: [{ code: "ROLE_CLARITY_INDEX", displayName: "مؤشر الوضوح", dataType: KpiVariableDataType.PERCENTAGE, isRequired: true }],
    });

    const kpiI9Participation = await ensureKpi({
      orgId: org.id,
      primaryNodeId: i9Learning.id,
      ownerUserId: headHr.id,
      name: "% الموظفين المشاركين في برامج التطوير السنوية",
      description: "Initiative 9 KPI",
      formula: "(PARTICIPANTS / TOTAL_EMPLOYEES) * 100",
      unit: "%",
      direction: KpiDirection.INCREASE_IS_GOOD,
      aggregation: KpiAggregationMethod.LAST_VALUE,
      periodType: KpiPeriodType.YEARLY,
      variables: [
        { code: "PARTICIPANTS", displayName: "عدد المشاركين", dataType: KpiVariableDataType.NUMBER, isRequired: true },
        { code: "TOTAL_EMPLOYEES", displayName: "إجمالي الموظفين", dataType: KpiVariableDataType.NUMBER, isRequired: true },
      ],
    });

    const kpiI9PerformanceImprovement = await ensureKpi({
      orgId: org.id,
      primaryNodeId: i9Learning.id,
      ownerUserId: headHr.id,
      name: "% التحسن في مؤشرات الأداء الفردي بعد التدريب",
      description: "Initiative 9 KPI",
      formula: "PERFORMANCE_IMPROVEMENT",
      unit: "%",
      direction: KpiDirection.INCREASE_IS_GOOD,
      aggregation: KpiAggregationMethod.AVERAGE,
      periodType: KpiPeriodType.QUARTERLY,
      variables: [{ code: "PERFORMANCE_IMPROVEMENT", displayName: "نسبة التحسن", dataType: KpiVariableDataType.PERCENTAGE, isRequired: true }],
    });

    const kpiI10CoordinationIncrease = await ensureKpi({
      orgId: org.id,
      primaryNodeId: i10Integration.id,
      ownerUserId: headStrategy.id,
      name: "% زيادة الاجتماعات التنسيقية والقرارات المشتركة",
      description: "Initiative 10 KPI",
      formula: "COORDINATION_INCREASE",
      unit: "%",
      direction: KpiDirection.INCREASE_IS_GOOD,
      aggregation: KpiAggregationMethod.LAST_VALUE,
      periodType: KpiPeriodType.QUARTERLY,
      variables: [{ code: "COORDINATION_INCREASE", displayName: "نسبة الزيادة", dataType: KpiVariableDataType.PERCENTAGE, isRequired: true }],
    });

    const kpiI10SubsidiarySatisfaction = await ensureKpi({
      orgId: org.id,
      primaryNodeId: i10Integration.id,
      ownerUserId: headStrategy.id,
      name: "% رضا الشركات التابعة عن فعالية التواصل",
      description: "Initiative 10 KPI",
      formula: "SUBSIDIARY_SATISFACTION",
      unit: "%",
      direction: KpiDirection.INCREASE_IS_GOOD,
      aggregation: KpiAggregationMethod.AVERAGE,
      periodType: KpiPeriodType.QUARTERLY,
      variables: [{ code: "SUBSIDIARY_SATISFACTION", displayName: "نسبة الرضا", dataType: KpiVariableDataType.PERCENTAGE, isRequired: true }],
    });

    const kpiI10DuplicateTasksDecrease = await ensureKpi({
      orgId: org.id,
      primaryNodeId: i10Integration.id,
      ownerUserId: headStrategy.id,
      name: "% انخفاض نسبة تكرار المهام المشتركة",
      description: "Initiative 10 KPI",
      formula: "DUPLICATE_TASKS_DECREASE",
      unit: "%",
      direction: KpiDirection.INCREASE_IS_GOOD,
      aggregation: KpiAggregationMethod.LAST_VALUE,
      periodType: KpiPeriodType.QUARTERLY,
      variables: [{ code: "DUPLICATE_TASKS_DECREASE", displayName: "نسبة الانخفاض", dataType: KpiVariableDataType.PERCENTAGE, isRequired: true }],
    });

    const kpiI11AwarenessIndex = await ensureKpi({
      orgId: org.id,
      primaryNodeId: i11BrandComms.id,
      ownerUserId: headMarketing.id,
      name: "مؤشر الوعي بالعلامة التجارية (مبادرة 11)",
      description: "Initiative 11 KPI",
      formula: "AWARENESS_INDEX",
      unit: "%",
      direction: KpiDirection.INCREASE_IS_GOOD,
      aggregation: KpiAggregationMethod.AVERAGE,
      periodType: KpiPeriodType.QUARTERLY,
      variables: [{ code: "AWARENESS_INDEX", displayName: "المؤشر", dataType: KpiVariableDataType.PERCENTAGE, isRequired: true }],
    });

    const kpiI11DigitalEngagement = await ensureKpi({
      orgId: org.id,
      primaryNodeId: i11BrandComms.id,
      ownerUserId: headMarketing.id,
      name: "معدل التفاعل الرقمي",
      description: "Initiative 11 KPI",
      formula: "DIGITAL_ENGAGEMENT_RATE",
      unit: "%",
      direction: KpiDirection.INCREASE_IS_GOOD,
      aggregation: KpiAggregationMethod.AVERAGE,
      periodType: KpiPeriodType.MONTHLY,
      variables: [{ code: "DIGITAL_ENGAGEMENT_RATE", displayName: "معدل التفاعل", dataType: KpiVariableDataType.PERCENTAGE, isRequired: true }],
    });

    const kpiI11Campaigns = await ensureKpi({
      orgId: org.id,
      primaryNodeId: i11BrandComms.id,
      ownerUserId: headMarketing.id,
      name: "عدد الحملات التسويقية المنفذة سنويًا",
      description: "Initiative 11 KPI",
      formula: "CAMPAIGNS_COUNT",
      unit: "count",
      direction: KpiDirection.INCREASE_IS_GOOD,
      aggregation: KpiAggregationMethod.LAST_VALUE,
      periodType: KpiPeriodType.YEARLY,
      variables: [{ code: "CAMPAIGNS_COUNT", displayName: "عدد الحملات", dataType: KpiVariableDataType.NUMBER, isRequired: true }],
    });

    const kpiI11BrandEngagement = await ensureKpi({
      orgId: org.id,
      primaryNodeId: i11BrandComms.id,
      ownerUserId: headMarketing.id,
      name: "مؤشر الارتباط بالعلامة",
      description: "Initiative 11 KPI",
      formula: "BRAND_ENGAGEMENT_INDEX",
      unit: "%",
      direction: KpiDirection.INCREASE_IS_GOOD,
      aggregation: KpiAggregationMethod.AVERAGE,
      periodType: KpiPeriodType.QUARTERLY,
      variables: [{ code: "BRAND_ENGAGEMENT_INDEX", displayName: "مؤشر الارتباط", dataType: KpiVariableDataType.PERCENTAGE, isRequired: true }],
    });

    const kpiI12DigitizedProcesses = await ensureKpi({
      orgId: org.id,
      primaryNodeId: i12DigitalTransformation.id,
      ownerUserId: headIt.id,
      name: "% العمليات الأساسية التي تم رقمنتها بالكامل",
      description: "Initiative 12 KPI",
      formula: "DIGITIZED_PROCESSES_PERCENT",
      unit: "%",
      direction: KpiDirection.INCREASE_IS_GOOD,
      aggregation: KpiAggregationMethod.LAST_VALUE,
      periodType: KpiPeriodType.QUARTERLY,
      variables: [{ code: "DIGITIZED_PROCESSES_PERCENT", displayName: "نسبة الرقمنة", dataType: KpiVariableDataType.PERCENTAGE, isRequired: true }],
    });

    const kpiI12EfficiencyGain = await ensureKpi({
      orgId: org.id,
      primaryNodeId: i12DigitalTransformation.id,
      ownerUserId: headIt.id,
      name: "% التحسن في كفاءة الأداء التشغيلي نتيجة التحول الرقمي",
      description: "Initiative 12 KPI",
      formula: "DIGITAL_EFFICIENCY_GAIN",
      unit: "%",
      direction: KpiDirection.INCREASE_IS_GOOD,
      aggregation: KpiAggregationMethod.AVERAGE,
      periodType: KpiPeriodType.QUARTERLY,
      variables: [{ code: "DIGITAL_EFFICIENCY_GAIN", displayName: "نسبة التحسن", dataType: KpiVariableDataType.PERCENTAGE, isRequired: true }],
    });

    await upsertKpiValuePeriodByVariableCodes({
      kpiId: kpiIpoReadiness.id,
      periodType: KpiPeriodType.QUARTERLY,
      offset: 1,
      calculatedValue: 60,
      status: KpiValueStatus.APPROVED,
      note: "تمت المراجعة والاعتماد.",
      enteredBy: employee1.id,
      submittedBy: headStrategy.id,
      approvedBy: ceo.id,
      variableValues: { GOVERNANCE: 62, OPERATING_MODEL: 55, COMPLIANCE: 63 },
    });

    await upsertKpiValuePeriodByVariableCodes({
      kpiId: kpiVarianceReduction.id,
      periodType: KpiPeriodType.QUARTERLY,
      offset: 1,
      calculatedValue: 8,
      status: KpiValueStatus.DRAFT,
      note: "تم طلب تعديلات على المدخلات.",
      enteredBy: employee2.id,
      changesRequestedBy: headFinance.id,
      changesRequestedMessage: "يرجى مراجعة طريقة احتساب الانحرافات وإرفاق مصدر البيانات.",
      variableValues: { VARIANCE_BASELINE: 250000, VARIANCE_CURRENT: 230000 },
    });

    await upsertKpiValuePeriodByVariableCodes({
      kpiId: kpiNewSectors.id,
      periodType: KpiPeriodType.YEARLY,
      offset: 0,
      calculatedValue: 1,
      status: KpiValueStatus.APPROVED,
      note: "تم اعتماد تحديث عدد القطاعات للسنة الحالية.",
      enteredBy: admin.id,
      submittedBy: admin.id,
      approvedBy: ceo.id,
      variableValues: { SECTORS_ENTERED: 1 },
    });

    await upsertKpiValuePeriodByVariableCodes({
      kpiId: kpiEmployeeProductivity.id,
      periodType: KpiPeriodType.QUARTERLY,
      offset: 1,
      calculatedValue: 72,
      status: KpiValueStatus.SUBMITTED,
      note: "بانتظار اعتماد الإدارة العليا.",
      enteredBy: employee4.id,
      submittedBy: headHr.id,
      variableValues: { PRODUCTIVITY_PERCENT: 72 },
    });

    await upsertKpiValuePeriodByVariableCodes({
      kpiId: kpiBrandAwareness.id,
      periodType: KpiPeriodType.QUARTERLY,
      offset: 1,
      calculatedValue: 37,
      status: KpiValueStatus.DRAFT,
      note: "مسودة قبل الإرسال.",
      enteredBy: employee5.id,
      variableValues: { AWARENESS_PERCENT: 37 },
    });

    await upsertKpiValuePeriodByVariableCodes({
      kpiId: kpiGroupRevenue.id,
      periodType: KpiPeriodType.YEARLY,
      offset: 0,
      calculatedValue: 95000000,
      status: KpiValueStatus.APPROVED,
      note: "تحديث الإيرادات السنوية.",
      enteredBy: employee2.id,
      submittedBy: headFinance.id,
      approvedBy: ceo.id,
      variableValues: { TOTAL_REVENUE: 95000000 },
    });

    await upsertKpiValuePeriodByVariableCodes({
      kpiId: kpiReturnVsMarket.id,
      periodType: KpiPeriodType.QUARTERLY,
      offset: 1,
      calculatedValue: 6,
      status: KpiValueStatus.SUBMITTED,
      note: "بانتظار الاعتماد.",
      enteredBy: employee1.id,
      submittedBy: ceo.id,
      variableValues: { ROI_GROUP: 18, ROI_MARKET_AVG: 12 },
    });

    await upsertKpiValuePeriodByVariableCodes({
      kpiId: kpiNominalValueGrowth.id,
      periodType: KpiPeriodType.YEARLY,
      offset: 0,
      calculatedValue: 12,
      status: KpiValueStatus.SUBMITTED,
      note: "نتيجة مبدئية.",
      enteredBy: employee2.id,
      submittedBy: headFinance.id,
      variableValues: { NOMINAL_VALUE_BASELINE: 500000000, NOMINAL_VALUE_CURRENT: 560000000 },
    });

    await upsertKpiValuePeriodByVariableCodes({
      kpiId: kpiI7AuditPlanExecution.id,
      periodType: KpiPeriodType.QUARTERLY,
      offset: 1,
      calculatedValue: 50,
      status: KpiValueStatus.SUBMITTED,
      note: "بانتظار اعتماد PMO.",
      enteredBy: headAudit.id,
      submittedBy: headAudit.id,
      variableValues: { AUDITS_DONE: 4, AUDITS_PLANNED: 8 },
    });

    await upsertKpiValuePeriodByVariableCodes({
      kpiId: kpiI3WarehouseCompletion.id,
      periodType: KpiPeriodType.QUARTERLY,
      offset: 1,
      calculatedValue: 20,
      status: KpiValueStatus.DRAFT,
      note: "مسودة تقدم منصة البيانات.",
      enteredBy: employee3.id,
      variableValues: { DWH_BI_COMPLETION: 20 },
    });

    await upsertKpiValuePeriodByVariableCodes({
      kpiId: kpiI3DecisionCycle.id,
      periodType: KpiPeriodType.MONTHLY,
      offset: 1,
      calculatedValue: 18,
      status: KpiValueStatus.APPROVED,
      note: "تم اعتماد القياس الشهري.",
      enteredBy: ceo.id,
      submittedBy: ceo.id,
      approvedBy: ceo.id,
      variableValues: { DECISION_CYCLE_DAYS: 18 },
    });

    await upsertKpiValuePeriodByVariableCodes({
      kpiId: kpiI4PolicyUnification.id,
      periodType: KpiPeriodType.QUARTERLY,
      offset: 1,
      calculatedValue: 40,
      status: KpiValueStatus.SUBMITTED,
      note: "بانتظار مراجعة الإدارة العليا.",
      enteredBy: employee2.id,
      submittedBy: headFinance.id,
      variableValues: { POLICY_UNIFICATION: 40 },
    });

    await upsertKpiValuePeriodByVariableCodes({
      kpiId: kpiI6ServicesTransferred.id,
      periodType: KpiPeriodType.QUARTERLY,
      offset: 1,
      calculatedValue: 25,
      status: KpiValueStatus.DRAFT,
      note: "نتيجة أولية.",
      enteredBy: headStrategy.id,
      variableValues: { SERVICES_TRANSFERRED: 25 },
    });

    await upsertKpiValuePeriodByVariableCodes({
      kpiId: kpiI7RiskReduction.id,
      periodType: KpiPeriodType.QUARTERLY,
      offset: 1,
      calculatedValue: 10,
      status: KpiValueStatus.DRAFT,
      note: "مؤشر أولي.",
      enteredBy: headAudit.id,
      variableValues: { RISKS_BASELINE: 50, RISKS_CURRENT: 45 },
    });

    await upsertKpiValuePeriodByVariableCodes({
      kpiId: kpiI8OperatingModelAdoption.id,
      periodType: KpiPeriodType.QUARTERLY,
      offset: 1,
      calculatedValue: 30,
      status: KpiValueStatus.SUBMITTED,
      note: "بانتظار اعتماد PMO.",
      enteredBy: employee1.id,
      submittedBy: headStrategy.id,
      variableValues: { OPERATING_MODEL_ADOPTION: 30 },
    });

    await upsertKpiValuePeriodByVariableCodes({
      kpiId: kpiI9Participation.id,
      periodType: KpiPeriodType.YEARLY,
      offset: 0,
      calculatedValue: 35,
      status: KpiValueStatus.SUBMITTED,
      note: "نتيجة سنوية مبدئية.",
      enteredBy: employee4.id,
      submittedBy: headHr.id,
      variableValues: { PARTICIPANTS: 70, TOTAL_EMPLOYEES: 200 },
    });

    await upsertKpiValuePeriodByVariableCodes({
      kpiId: kpiI11DigitalEngagement.id,
      periodType: KpiPeriodType.MONTHLY,
      offset: 1,
      calculatedValue: 12,
      status: KpiValueStatus.DRAFT,
      note: "بيانات تفاعل أولية.",
      enteredBy: employee5.id,
      variableValues: { DIGITAL_ENGAGEMENT_RATE: 12 },
    });

    await upsertKpiValuePeriodByVariableCodes({
      kpiId: kpiI11Campaigns.id,
      periodType: KpiPeriodType.YEARLY,
      offset: 0,
      calculatedValue: 6,
      status: KpiValueStatus.APPROVED,
      note: "تم اعتماد عدد الحملات.",
      enteredBy: headMarketing.id,
      submittedBy: headMarketing.id,
      approvedBy: ceo.id,
      variableValues: { CAMPAIGNS_COUNT: 6 },
    });

    await upsertKpiValuePeriodByVariableCodes({
      kpiId: kpiI12DigitizedProcesses.id,
      periodType: KpiPeriodType.QUARTERLY,
      offset: 1,
      calculatedValue: 18,
      status: KpiValueStatus.SUBMITTED,
      note: "بانتظار المراجعة.",
      enteredBy: employee3.id,
      submittedBy: headIt.id,
      variableValues: { DIGITIZED_PROCESSES_PERCENT: 18 },
    });

    console.log("Seeded AlMoosa organization. You can login with:");
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
