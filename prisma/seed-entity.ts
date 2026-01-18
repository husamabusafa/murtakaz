import {
  KpiAggregationMethod,
  KpiApprovalLevel,
  KpiApprovalType,
  KpiDirection,
  KpiPeriodType,
  KpiSourceType,
  KpiValueStatus,
  KpiVariableDataType,
  PrismaClient,
  Role,
  Status,
 } from "../web/src/generated/prisma-client/index.js";
 import { auth } from "../web/src/lib/auth";

 const prisma = new PrismaClient();

 type Delegate = {
  deleteMany: (args?: unknown) => Promise<unknown>;
  findFirst: (args: unknown) => Promise<unknown>;
  findMany: (args: unknown) => Promise<unknown>;
  create: (args: unknown) => Promise<unknown>;
  createMany: (args: unknown) => Promise<unknown>;
  update: (args: unknown) => Promise<unknown>;
  upsert: (args: unknown) => Promise<unknown>;
 };

 const prismaOrgEntityType = (prisma as unknown as { orgEntityType?: Delegate }).orgEntityType;
 const prismaEntity = (prisma as unknown as { entity?: Delegate }).entity;
 const prismaEntityVariable = (prisma as unknown as { entityVariable?: Delegate }).entityVariable;
 const prismaEntityValue = (prisma as unknown as { entityValue?: Delegate }).entityValue;
 const prismaEntityVariableValue = (prisma as unknown as { entityVariableValue?: Delegate }).entityVariableValue;

 type OrgEntityTypeCode = "pillar" | "objective" | "department" | "initiative" | "kpi";

 function dateAtStartOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
 }

 async function assertEntitySystemReady() {
  if (!prismaOrgEntityType || !prismaEntity || !prismaEntityVariable || !prismaEntityValue || !prismaEntityVariableValue) {
   throw new Error("Prisma client is missing Entity system models. Run: npx prisma generate");
  }

  const tableChecks = (await prisma.$queryRaw`
    SELECT 'org_entity_types' AS name, to_regclass('public.org_entity_types') IS NOT NULL AS exists
    UNION ALL
    SELECT 'entities' AS name, to_regclass('public.entities') IS NOT NULL AS exists
    UNION ALL
    SELECT 'entity_variables' AS name, to_regclass('public.entity_variables') IS NOT NULL AS exists
    UNION ALL
    SELECT 'entity_values' AS name, to_regclass('public.entity_values') IS NOT NULL AS exists
    UNION ALL
    SELECT 'entity_variable_values' AS name, to_regclass('public.entity_variable_values') IS NOT NULL AS exists
  `) as Array<{ name: string; exists: boolean }>;

  const missing = tableChecks.filter((t) => !t.exists).map((t) => t.name);
  if (missing.length) {
   throw new Error(`Missing database tables for Entity system: ${missing.join(", ")}. Run: npx prisma migrate dev (or migrate reset) then npx prisma generate`);
  }
 }

 function dateAtEndOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
 }


 function evaluateFormula(input: { formula: string; valuesByCode: Record<string, number> }) {
  const trimmed = input.formula.trim();
  if (!trimmed) return { ok: false as const, error: "emptyFormula" };

  const replaced = trimmed.replace(/\b[A-Za-z_][A-Za-z0-9_]*\b/g, (token) => {
    if (Object.prototype.hasOwnProperty.call(input.valuesByCode, token)) {
      return String(input.valuesByCode[token] ?? 0);
    }
    return "0";
  });

  if (!/^[0-9+\-*/().\s]+$/.test(replaced)) {
    return { ok: false as const, error: "unsupportedFormulaCharacters" };
  }

  try {
    const result = Function(`"use strict"; return (${replaced});`)();
    const num = typeof result === "number" && Number.isFinite(result) ? result : NaN;
    if (!Number.isFinite(num)) {
      return { ok: false as const, error: "invalidFormulaResult" };
    }
    return { ok: true as const, value: num };
  } catch {
    return { ok: false as const, error: "failedToEvaluateFormula" };
  }
 }

 async function wipeDatabase() {
  await prismaEntityVariableValue?.deleteMany();
  await prismaEntityValue?.deleteMany();
  await prismaEntityVariable?.deleteMany();
  await prismaEntity?.deleteMany();

  await prisma.changeApproval.deleteMany();
  await prisma.changeRequest.deleteMany();

  await prisma.userPreference.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.verification.deleteMany();
  await prisma.user.deleteMany();

  await prismaOrgEntityType?.deleteMany();
  await prisma.organization.deleteMany();
 }

 async function ensureOrg(input: {
  domain?: string | null;
  name: string;
  nameAr?: string | null;
  kpiApprovalLevel?: KpiApprovalLevel;
  logoUrl?: string | null;
  mission?: string | null;
  missionAr?: string | null;
  vision?: string | null;
  visionAr?: string | null;
  about?: string | null;
  aboutAr?: string | null;
  contacts?: unknown;
 }) {
  const existing = (await prisma.organization.findFirst({
    where: {
      deletedAt: null,
      OR: [...(input.domain ? [{ domain: input.domain }] : []), { name: input.name }],
    },
    select: { id: true },
  })) as { id: string } | null;

  const updateData = {
    name: input.name,
    nameAr: typeof input.nameAr === "undefined" ? undefined : input.nameAr ?? null,
    domain: typeof input.domain === "undefined" ? undefined : input.domain,
    kpiApprovalLevel: input.kpiApprovalLevel ?? KpiApprovalLevel.MANAGER,
    logoUrl: typeof input.logoUrl === "undefined" ? undefined : input.logoUrl,
    mission: typeof input.mission === "undefined" ? undefined : input.mission,
    missionAr: typeof input.missionAr === "undefined" ? undefined : input.missionAr,
    vision: typeof input.vision === "undefined" ? undefined : input.vision,
    visionAr: typeof input.visionAr === "undefined" ? undefined : input.visionAr,
    about: typeof input.about === "undefined" ? undefined : input.about,
    aboutAr: typeof input.aboutAr === "undefined" ? undefined : input.aboutAr,
    contacts: typeof input.contacts === "undefined" ? undefined : (input.contacts as any),
  };

  if (existing) {
    return prisma.organization.update({ where: { id: existing.id }, data: updateData, select: { id: true } });
  }

  return prisma.organization.create({
    data: {
      name: input.name,
      nameAr: input.nameAr ?? null,
      domain: typeof input.domain === "undefined" ? null : input.domain,
      kpiApprovalLevel: input.kpiApprovalLevel ?? KpiApprovalLevel.MANAGER,
      logoUrl: input.logoUrl ?? null,
      mission: input.mission ?? null,
      missionAr: input.missionAr ?? null,
      vision: input.vision ?? null,
      visionAr: input.visionAr ?? null,
      about: input.about ?? null,
      aboutAr: input.aboutAr ?? null,
      contacts: (input.contacts as any) ?? null,
    },
    select: { id: true },
  });
 }

 async function ensureUser(input: {
  orgId: string;
  email: string;
  password: string;
  name: string;
  role: Role;
  managerId?: string | null;
  title?: string | null;
 }) {
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
          title: typeof input.title === "undefined" ? undefined : input.title,
        },
      });
      return { id: String(existingUser.id) };
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
      title: typeof input.title === "undefined" ? undefined : input.title,
    },
  });

  return { id: String(result.user.id) };
 }

 async function ensureOrgEntityTypes(orgId: string) {
  if (!prismaOrgEntityType) throw new Error("Prisma client missing orgEntityType model. Run prisma generate.");

  await prismaOrgEntityType.deleteMany({ where: { orgId } });

  const rows: Array<{ code: OrgEntityTypeCode; name: string; nameAr: string; sortOrder: number }> = [
    { code: "pillar", name: "Pillars", nameAr: "الركائز", sortOrder: 0 },
    { code: "objective", name: "Objectives", nameAr: "الأهداف", sortOrder: 1 },
    { code: "department", name: "Departments", nameAr: "الإدارات", sortOrder: 2 },
    { code: "initiative", name: "Initiatives", nameAr: "المبادرات", sortOrder: 3 },
    { code: "kpi", name: "KPIs", nameAr: "مؤشرات الأداء", sortOrder: 4 },
  ];

  await prismaOrgEntityType.createMany({
    data: rows.map((r) => ({ orgId, ...r })),
    skipDuplicates: true,
  });

  const types = (await prismaOrgEntityType.findMany({ where: { orgId }, select: { id: true, code: true } })) as Array<{
    id: string;
    code: string;
  }>;
  return new Map(types.map((t) => [String(t.code), String(t.id)] as const));
 }

 async function ensureEntity(input: {
  orgId: string;
  orgEntityTypeId: string;
  key: string;
  title: string;
  titleAr?: string | null;
  description?: string | null;
  descriptionAr?: string | null;
  ownerUserId?: string | null;
  status?: Status;
  sourceType?: KpiSourceType;
  periodType?: KpiPeriodType | null;
  unit?: string | null;
  unitAr?: string | null;
  direction?: KpiDirection;
  aggregation?: KpiAggregationMethod;
  baselineValue?: number | null;
  targetValue?: number | null;
  weight?: number | null;
  formula?: string | null;
 }) {
  if (!prismaEntity) throw new Error("Prisma client missing entity model. Run prisma generate.");

  const existing = (await prismaEntity.findFirst({
    where: { orgId: input.orgId, key: input.key, deletedAt: null },
    select: { id: true },
  })) as { id: string } | null;

  const data = {
    orgId: input.orgId,
    key: input.key,
    orgEntityTypeId: input.orgEntityTypeId,
    title: input.title,
    titleAr: input.titleAr ?? null,
    description: input.description ?? null,
    descriptionAr: input.descriptionAr ?? null,
    ownerUserId: input.ownerUserId ?? null,
    status: input.status ?? Status.ACTIVE,
    sourceType: input.sourceType ?? KpiSourceType.MANUAL,
    periodType: typeof input.periodType === "undefined" ? null : input.periodType,
    unit: input.unit ?? null,
    unitAr: input.unitAr ?? null,
    direction: input.direction ?? KpiDirection.INCREASE_IS_GOOD,
    aggregation: input.aggregation ?? KpiAggregationMethod.LAST_VALUE,
    baselineValue: typeof input.baselineValue === "undefined" ? null : input.baselineValue,
    targetValue: typeof input.targetValue === "undefined" ? null : input.targetValue,
    weight: typeof input.weight === "undefined" ? null : input.weight,
    formula: typeof input.formula === "undefined" ? null : input.formula,
  };

  if (existing) {
    const updated = (await prismaEntity.update({ where: { id: existing.id }, data, select: { id: true } })) as { id: string };
    return { id: String(updated.id) };
  }

  const created = (await prismaEntity.create({ data, select: { id: true } })) as { id: string };
  return { id: String(created.id) };
 }

 async function ensureEntityVariables(
  entityId: string,
  variables: Array<{ code: string; displayName: string; nameAr?: string | null; dataType: KpiVariableDataType; isRequired?: boolean }>,
 ) {
  if (!prismaEntityVariable) throw new Error("Prisma client missing entityVariable model. Run prisma generate.");

  for (const v of variables) {
    await prismaEntityVariable.upsert({
      where: { entity_variable_unique: { entityId, code: v.code } },
      update: {
        displayName: v.displayName,
        nameAr: v.nameAr ?? undefined,
        dataType: v.dataType,
        isRequired: v.isRequired ?? false,
      },
      create: {
        entityId,
        code: v.code,
        displayName: v.displayName,
        nameAr: v.nameAr ?? null,
        dataType: v.dataType,
        isRequired: v.isRequired ?? false,
      },
      select: { id: true },
    });
  }

  const rows = (await prismaEntityVariable.findMany({ where: { entityId }, select: { id: true, code: true } })) as Array<{
    id: string;
    code: string;
  }>;
  return new Map(rows.map((r) => [String(r.code), String(r.id)] as const));
 }

 async function createEntityValueByVariableCodes(input: {
  entityId: string;
  status: KpiValueStatus;
  approvalType?: KpiApprovalType | null;
  note?: string | null;
  enteredBy?: string | null;
  submittedBy?: string | null;
  approvedBy?: string | null;
  formula: string | null;
  variableValues: Record<string, number>;
 }) {
  if (!prismaEntityVariable || !prismaEntityValue || !prismaEntityVariableValue) {
    throw new Error("Prisma client missing entity value models. Run prisma generate.");
  }

  const vars = (await prismaEntityVariable.findMany({ where: { entityId: input.entityId }, select: { id: true, code: true } })) as Array<{
    id: string;
    code: string;
  }>;
  const idByCode = new Map(vars.map((v) => [String(v.code), String(v.id)] as const));

  const mapped = Object.entries(input.variableValues).map(([code, value]) => {
    const entityVariableId = idByCode.get(code);
    if (!entityVariableId) throw new Error(`Unknown entity variable code ${code}`);
    return { entityVariableId, value };
  });

  let calculatedValue: number | null = null;
  if (input.formula && input.formula.trim().length > 0) {
    const res = evaluateFormula({ formula: input.formula, valuesByCode: input.variableValues });
    calculatedValue = res.ok ? res.value : null;
  }

  const now = new Date();
  const submittedAt =
    input.status === KpiValueStatus.SUBMITTED || input.status === KpiValueStatus.APPROVED
      ? new Date(now.getTime() - 6 * 60 * 60 * 1000)
      : null;
  const approvedAt = input.status === KpiValueStatus.APPROVED ? new Date(now.getTime() - 2 * 60 * 60 * 1000) : null;

  const entityValue = (await prismaEntityValue.create({
    data: {
      entityId: input.entityId,
      calculatedValue,
      finalValue: calculatedValue,
      status: input.status,
      approvalType: input.approvalType ?? null,
      note: input.note ?? null,
      enteredBy: input.enteredBy ?? null,
      submittedBy: input.submittedBy ?? null,
      approvedBy: input.approvedBy ?? null,
      submittedAt,
      approvedAt,
    },
    select: { id: true },
  })) as { id: string };

  for (const vv of mapped) {
    await prismaEntityVariableValue.create({
      data: { entityValueId: entityValue.id, entityVariableId: vv.entityVariableId, value: vv.value },
      select: { id: true },
    });
  }
 }

 function sampleValueForVar(code: string) {
  switch (code) {
    case "value":
      return 68.5;
    case "impressions":
      return 85000;
    case "engagements":
      return 3400;
    case "participants":
      return 215;
    case "employees_total":
      return 280;
    case "subsidiaries_adopted":
      return 7;
    case "subsidiaries_total":
      return 10;
    default:
      return 100;
  }
} 

 async function seed() {
  await assertEntitySystemReady();
  await wipeDatabase();

  const org = await ensureOrg({
    domain: process.env.SEED_ORG_DOMAIN ?? "almousa.local",
    name: "Musa Bin Abdulaziz Al-Mousa & Sons Real Estate Holding Group",
    nameAr: "مجموعة موسى بن عبدالعزيز الموسى وأولاده العقارية القابضة",
    kpiApprovalLevel: KpiApprovalLevel.MANAGER,
    mission: "To invest in vital sectors with economic impact to create sustainable value.",
    missionAr: "نستثمر في القطاعات الحيوية ذات الأثر الاقتصادي لخلق قيمة مستدامة.",
    vision: "An ambitious investment group building sustainable growth.",
    visionAr: "مجموعة استثمارية طموحة تبني استدامة النمو.",
    about: "Seeded strategy data for the new Entity system.",
    aboutAr: "بيانات تجريبية لاستراتيجية مجموعة موسى الموسى (نظام الكيانات).",
    contacts: {
      email: "info@almousa.local",
      phone: "+966110000000",
      website: "https://almousaholding.com",
    },
  });

  const password = process.env.SEED_DEFAULT_PASSWORD ?? "password123";

  const superAdminEmail = process.env.SEED_SUPERADMIN_EMAIL ?? "superadmin@almousa.local";
  const superAdminName = process.env.SEED_SUPERADMIN_NAME ?? "Super Admin";
  const superAdminPassword = process.env.SEED_SUPERADMIN_PASSWORD ?? password;

  const superAdmin = await ensureUser({
    orgId: org.id,
    email: superAdminEmail,
    password: superAdminPassword,
    name: superAdminName,
    role: Role.SUPER_ADMIN,
    title: "Super Admin",
  });

  const ceo = await ensureUser({
    orgId: org.id,
    email: "ceo@almousa.local",
    password,
    name: "الرئيس التنفيذي للمجموعة",
    role: Role.EXECUTIVE,
    title: "CEO",
  });

  const admin = await ensureUser({
    orgId: org.id,
    email: "admin@almousa.local",
    password,
    name: "مسؤول النظام",
    role: Role.ADMIN,
    managerId: ceo.id,
    title: "Admin",
  });

  const headStrategy = await ensureUser({
    orgId: org.id,
    email: "strategy@almousa.local",
    password,
    name: "مدير الاستراتيجية والتميز المؤسسي",
    role: Role.MANAGER,
    managerId: ceo.id,
    title: "Head of Strategy",
  });

  const headFinance = await ensureUser({
    orgId: org.id,
    email: "finance@almousa.local",
    password,
    name: "مدير القطاع المالي",
    role: Role.EXECUTIVE,
    managerId: ceo.id,
    title: "CFO",
  });

  const headIt = await ensureUser({
    orgId: org.id,
    email: "it@almousa.local",
    password,
    name: "مدير تقنية المعلومات والبيانات",
    role: Role.MANAGER,
    managerId: ceo.id,
    title: "IT Director",
  });

  const headHr = await ensureUser({
    orgId: org.id,
    email: "hr@almousa.local",
    password,
    name: "مدير الموارد البشرية والخدمات العامة",
    role: Role.MANAGER,
    managerId: ceo.id,
    title: "HR Director",
  });

  const headMarketing = await ensureUser({
    orgId: org.id,
    email: "marketing@almousa.local",
    password,
    name: "مدير التسويق والاتصال المؤسسي",
    role: Role.MANAGER,
    managerId: ceo.id,
    title: "Marketing Director",
  });

  const headAudit = await ensureUser({
    orgId: org.id,
    email: "audit@almousa.local",
    password,
    name: "مدير المراجعة الداخلية والمخاطر",
    role: Role.MANAGER,
    managerId: ceo.id,
    title: "Head of Audit",
  });

  const entityTypeIdByCode = await ensureOrgEntityTypes(org.id);
  const getTypeId = (code: OrgEntityTypeCode) => {
    const id = entityTypeIdByCode.get(code);
    if (!id) throw new Error(`Missing org entity type ${code}`);
    return id;
  };

  const deptTypeId = getTypeId("department");
  const objectiveTypeId = getTypeId("objective");
  const initiativeTypeId = getTypeId("initiative");
  const kpiTypeId = getTypeId("kpi");
  const pillarTypeId = getTypeId("pillar");

  await ensureEntity({
    orgId: org.id,
    orgEntityTypeId: deptTypeId,
    key: "dept_finance",
    title: "Finance",
    titleAr: "القطاع المالي",
    ownerUserId: headFinance.id,
    sourceType: KpiSourceType.DERIVED,
    periodType: KpiPeriodType.QUARTERLY,
    unit: "score",
    formula: "0",
  });

  await ensureEntity({
    orgId: org.id,
    orgEntityTypeId: objectiveTypeId,
    key: "obj_brand_awareness",
    title: "Brand awareness",
    titleAr: "تعزيز الوعي بالعلامة التجارية",
    ownerUserId: headMarketing.id,
    sourceType: KpiSourceType.DERIVED,
    periodType: KpiPeriodType.YEARLY,
    unit: "score",
    formula: "(kpi_brand_awareness_pct + kpi_digital_engagement_rate) / 2",
  });

  await ensureEntity({
    orgId: org.id,
    orgEntityTypeId: initiativeTypeId,
    key: "init_marketing_strategy",
    title: "Marketing strategy",
    titleAr: "تحديث وتنفيذ استراتيجية شاملة للتواصل والتسويق",
    ownerUserId: headMarketing.id,
    sourceType: KpiSourceType.DERIVED,
    periodType: KpiPeriodType.QUARTERLY,
    unit: "score",
    formula: "(kpi_brand_awareness_pct + kpi_digital_engagement_rate) / 2",
  });

  await ensureEntity({
    orgId: org.id,
    orgEntityTypeId: pillarTypeId,
    key: "pillar_brand",
    title: "Brand",
    titleAr: "العلامة التجارية",
    ownerUserId: headMarketing.id,
    sourceType: KpiSourceType.DERIVED,
    periodType: KpiPeriodType.YEARLY,
    unit: "score",
    formula: "obj_brand_awareness",
  });

  const kpiSpecs: Array<{
    key: string;
    title: string;
    titleAr: string;
    periodType: KpiPeriodType;
    unit: string;
    direction: KpiDirection;
    formula: string;
    variables: Array<{ code: string; displayName: string; nameAr: string; dataType: KpiVariableDataType; isRequired?: boolean }>;
  }> = [
    {
      key: "kpi_brand_awareness_pct",
      title: "Brand awareness (%)",
      titleAr: "الوعي بالعلامة التجارية (%)",
      periodType: KpiPeriodType.QUARTERLY,
      unit: "%",
      direction: KpiDirection.INCREASE_IS_GOOD,
      formula: "value",
      variables: [{ code: "value", displayName: "Value", nameAr: "القيمة", dataType: KpiVariableDataType.PERCENTAGE, isRequired: true }],
    },
    {
      key: "kpi_digital_engagement_rate",
      title: "Digital engagement rate (%)",
      titleAr: "معدل التفاعل الرقمي (%)",
      periodType: KpiPeriodType.MONTHLY,
      unit: "%",
      direction: KpiDirection.INCREASE_IS_GOOD,
      formula: "(engagements / (impressions + 0.000001)) * 100",
      variables: [
        { code: "engagements", displayName: "Engagements", nameAr: "التفاعلات", dataType: KpiVariableDataType.NUMBER, isRequired: true },
        { code: "impressions", displayName: "Impressions", nameAr: "مرات الظهور", dataType: KpiVariableDataType.NUMBER, isRequired: true },
      ],
    },
    {
      key: "kpi_training_participation_pct",
      title: "Training participation (%)",
      titleAr: "نسبة المشاركة في التدريب (%)",
      periodType: KpiPeriodType.QUARTERLY,
      unit: "%",
      direction: KpiDirection.INCREASE_IS_GOOD,
      formula: "(participants / (employees_total + 0.000001)) * 100",
      variables: [
        { code: "participants", displayName: "Participants", nameAr: "المشاركون", dataType: KpiVariableDataType.NUMBER, isRequired: true },
        { code: "employees_total", displayName: "Employees total", nameAr: "إجمالي الموظفين", dataType: KpiVariableDataType.NUMBER, isRequired: true },
      ],
    },
    {
      key: "kpi_operating_model_adoption_pct",
      title: "Operating model adoption (%)",
      titleAr: "نسبة تطبيق النموذج التشغيلي (%)",
      periodType: KpiPeriodType.QUARTERLY,
      unit: "%",
      direction: KpiDirection.INCREASE_IS_GOOD,
      formula: "(subsidiaries_adopted / (subsidiaries_total + 0.000001)) * 100",
      variables: [
        { code: "subsidiaries_adopted", displayName: "Adopted", nameAr: "شركات طبقت", dataType: KpiVariableDataType.NUMBER, isRequired: true },
        { code: "subsidiaries_total", displayName: "Total", nameAr: "إجمالي الشركات", dataType: KpiVariableDataType.NUMBER, isRequired: true },
      ],
    },
  ];

  for (const spec of kpiSpecs) {
    const entity = await ensureEntity({
      orgId: org.id,
      orgEntityTypeId: kpiTypeId,
      key: spec.key,
      title: spec.title,
      titleAr: spec.titleAr,
      ownerUserId: admin.id,
      status: Status.ACTIVE,
      sourceType: KpiSourceType.CALCULATED,
      periodType: spec.periodType,
      unit: spec.unit,
      unitAr: spec.unit,
      direction: spec.direction,
      aggregation: KpiAggregationMethod.LAST_VALUE,
      formula: spec.formula,
    });

    await ensureEntityVariables(
      entity.id,
      spec.variables.map((v) => ({
        code: v.code,
        displayName: v.displayName,
        nameAr: v.nameAr,
        dataType: v.dataType,
        isRequired: v.isRequired,
      })),
    );

    const values: Record<string, number> = {};
    for (const v of spec.variables) values[v.code] = sampleValueForVar(v.code);

    await createEntityValueByVariableCodes({
      entityId: entity.id,
      status: KpiValueStatus.APPROVED,
      approvalType: KpiApprovalType.MANUAL,
      note: "Seeded (approved).",
      enteredBy: superAdmin.id,
      submittedBy: superAdmin.id,
      approvedBy: ceo.id,
      formula: spec.formula,
      variableValues: values,
    });
  }

  console.log("Seed complete. You can login with:");
  console.log("- superadmin:", superAdminEmail);
  console.log("- admin:", "admin@almousa.local");
  console.log("Password:", password);
 }

 async function main() {
  try {
   await seed();
  } finally {
   await prisma.$disconnect();
  }
 }

main();
