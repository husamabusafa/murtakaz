import {
  KpiAggregationMethod,
  KpiDirection,
  KpiPeriodType,
  KpiSourceType,
  KpiValueStatus,
  KpiVariableDataType,
  PrismaClient,
  Status,
} from "../web/src/generated/prisma-client/index.js";

const prisma = new PrismaClient();

const ORG_ID = "01c5d28d-73c7-4f0d-a551-e09faa70ffc1";

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
const prismaUserEntityAssignment = (prisma as unknown as { userEntityAssignment?: Delegate }).userEntityAssignment;

async function main() {
  console.log("🌱 Starting strategic entities seed for org:", ORG_ID);

  // Verify org exists
  const org = await prisma.organization.findUnique({
    where: { id: ORG_ID },
    select: { id: true, name: true },
  });

  if (!org) {
    throw new Error(`Organization ${ORG_ID} not found`);
  }

  console.log(`✓ Found organization: ${org.name}`);

  // Get admin user for assignments
  const adminUser = await prisma.user.findFirst({
    where: { orgId: ORG_ID, role: "ADMIN" },
    select: { id: true, name: true },
  });

  if (!adminUser) {
    console.warn("⚠️  No admin user found for assignments");
  } else {
    console.log(`✓ Found admin user: ${adminUser.name}`);
  }

  // Clean up existing entities and entity types for this org
  console.log("🧹 Cleaning up existing entities...");
  await prismaUserEntityAssignment?.deleteMany({ where: { entity: { orgId: ORG_ID } } } as never);
  await prismaEntityVariableValue?.deleteMany({ where: { entityValue: { entity: { orgId: ORG_ID } } } } as never);
  await prismaEntityValue?.deleteMany({ where: { entity: { orgId: ORG_ID } } } as never);
  await prismaEntityVariable?.deleteMany({ where: { entity: { orgId: ORG_ID } } } as never);
  await prismaEntity?.deleteMany({ where: { orgId: ORG_ID } } as never);
  await prismaOrgEntityType?.deleteMany({ where: { orgId: ORG_ID } } as never);

  console.log("✓ Cleanup complete");

  // Create entity types
  console.log("📋 Creating entity types...");
  
  const pillarType = await prismaOrgEntityType?.create({
    data: {
      orgId: ORG_ID,
      code: "PILLAR",
      name: "Strategic Pillar",
      nameAr: "الركيزة الاستراتيجية",
      sortOrder: 1,
    },
  } as never) as { id: string };

  const objectiveType = await prismaOrgEntityType?.create({
    data: {
      orgId: ORG_ID,
      code: "OBJECTIVE",
      name: "Strategic Objective",
      nameAr: "الهدف الاستراتيجي",
      sortOrder: 2,
    },
  } as never) as { id: string };

  const departmentType = await prismaOrgEntityType?.create({
    data: {
      orgId: ORG_ID,
      code: "DEPARTMENT",
      name: "Department",
      nameAr: "القسم",
      sortOrder: 3,
    },
  } as never) as { id: string };

  const initiativeType = await prismaOrgEntityType?.create({
    data: {
      orgId: ORG_ID,
      code: "INITIATIVE",
      name: "Initiative",
      nameAr: "المبادرة",
      sortOrder: 4,
    },
  } as never) as { id: string };

  const kpiType = await prismaOrgEntityType?.create({
    data: {
      orgId: ORG_ID,
      code: "KPI",
      name: "Key Performance Indicator",
      nameAr: "مؤشر الأداء الرئيسي",
      sortOrder: 5,
    },
  } as never) as { id: string };

  console.log("✓ Entity types created");

  // Create entities with hierarchical formulas
  console.log("🏗️  Creating entities...");

  // 1. Create Pillars (top level, no dependencies)
  const pillar1 = await prismaEntity?.create({
    data: {
      orgId: ORG_ID,
      orgEntityTypeId: pillarType.id,
      key: "PIL_GROWTH",
      title: "Business Growth & Expansion",
      titleAr: "النمو والتوسع التجاري",
      description: "Drive sustainable business growth through market expansion and innovation",
      descriptionAr: "دفع النمو المستدام من خلال التوسع في السوق والابتكار",
      status: Status.ACTIVE,
      sourceType: KpiSourceType.CALCULATED,
      periodType: null,
      formula: 'get("OBJ_REVENUE") + get("OBJ_MARKET")',
    },
  } as never) as { id: string };

  const pillar2 = await prismaEntity?.create({
    data: {
      orgId: ORG_ID,
      orgEntityTypeId: pillarType.id,
      key: "PIL_EXCELLENCE",
      title: "Operational Excellence",
      titleAr: "التميز التشغيلي",
      description: "Achieve operational excellence through efficiency and quality",
      descriptionAr: "تحقيق التميز التشغيلي من خلال الكفاءة والجودة",
      status: Status.ACTIVE,
      sourceType: KpiSourceType.CALCULATED,
      periodType: null,
      formula: 'get("OBJ_EFFICIENCY")',
    },
  } as never) as { id: string };

  // 2. Create Objectives (depend on KPIs)
  const objective1 = await prismaEntity?.create({
    data: {
      orgId: ORG_ID,
      orgEntityTypeId: objectiveType.id,
      key: "OBJ_REVENUE",
      title: "Increase Revenue by 25%",
      titleAr: "زيادة الإيرادات بنسبة 25%",
      description: "Achieve 25% revenue growth year-over-year",
      descriptionAr: "تحقيق نمو في الإيرادات بنسبة 25% سنوياً",
      status: Status.ACTIVE,
      sourceType: KpiSourceType.CALCULATED,
      periodType: null,
      targetValue: 125,
      baselineValue: 100,
      formula: '(get("KPI_SALES") + get("KPI_CONTRACTS")) / 2',
    },
  } as never) as { id: string };

  const objective2 = await prismaEntity?.create({
    data: {
      orgId: ORG_ID,
      orgEntityTypeId: objectiveType.id,
      key: "OBJ_MARKET",
      title: "Expand Market Share",
      titleAr: "توسيع الحصة السوقية",
      description: "Increase market share in key segments",
      descriptionAr: "زيادة الحصة السوقية في القطاعات الرئيسية",
      status: Status.ACTIVE,
      sourceType: KpiSourceType.CALCULATED,
      periodType: null,
      targetValue: 30,
      baselineValue: 20,
      formula: 'get("KPI_MARKET_SHARE")',
    },
  } as never) as { id: string };

  const objective3 = await prismaEntity?.create({
    data: {
      orgId: ORG_ID,
      orgEntityTypeId: objectiveType.id,
      key: "OBJ_EFFICIENCY",
      title: "Improve Operational Efficiency",
      titleAr: "تحسين الكفاءة التشغيلية",
      description: "Reduce operational costs and improve process efficiency",
      descriptionAr: "تقليل التكاليف التشغيلية وتحسين كفاءة العمليات",
      status: Status.ACTIVE,
      sourceType: KpiSourceType.CALCULATED,
      periodType: null,
      targetValue: 90,
      baselineValue: 75,
      formula: 'get("KPI_EFFICIENCY")',
    },
  } as never) as { id: string };

  // 3. Create Departments
  const dept1 = await prismaEntity?.create({
    data: {
      orgId: ORG_ID,
      orgEntityTypeId: departmentType.id,
      key: "DEPT_SALES",
      title: "Sales Department",
      titleAr: "قسم المبيعات",
      description: "Responsible for sales and business development",
      descriptionAr: "مسؤول عن المبيعات وتطوير الأعمال",
      status: Status.ACTIVE,
      sourceType: KpiSourceType.CALCULATED,
      periodType: null,
      formula: 'get("KPI_SALES")',
    },
  } as never) as { id: string };

  const dept2 = await prismaEntity?.create({
    data: {
      orgId: ORG_ID,
      orgEntityTypeId: departmentType.id,
      key: "DEPT_OPS",
      title: "Operations Department",
      titleAr: "قسم العمليات",
      description: "Manages day-to-day operations and processes",
      descriptionAr: "يدير العمليات والإجراءات اليومية",
      status: Status.ACTIVE,
      sourceType: KpiSourceType.CALCULATED,
      periodType: null,
      formula: 'get("KPI_EFFICIENCY")',
    },
  } as never) as { id: string };

  // 4. Create Initiatives (depend on KPIs)
  const initiative1 = await prismaEntity?.create({
    data: {
      orgId: ORG_ID,
      orgEntityTypeId: initiativeType.id,
      key: "INIT_DIGITAL",
      title: "Digital Transformation Initiative",
      titleAr: "مبادرة التحول الرقمي",
      description: "Implement digital solutions across all departments",
      descriptionAr: "تنفيذ الحلول الرقمية عبر جميع الأقسام",
      status: Status.ACTIVE,
      sourceType: KpiSourceType.CALCULATED,
      periodType: null,
      targetValue: 85,
      formula: 'get("KPI_DIGITAL_ADOPTION")',
    },
  } as never) as { id: string };

  const initiative2 = await prismaEntity?.create({
    data: {
      orgId: ORG_ID,
      orgEntityTypeId: initiativeType.id,
      key: "INIT_TRAINING",
      title: "Employee Development Program",
      titleAr: "برنامج تطوير الموظفين",
      description: "Comprehensive training and development program",
      descriptionAr: "برنامج تدريب وتطوير شامل",
      status: Status.ACTIVE,
      sourceType: KpiSourceType.CALCULATED,
      periodType: null,
      targetValue: 90,
      formula: 'get("KPI_TRAINING_HOURS")',
    },
  } as never) as { id: string };

  // 5. Create KPIs with variables (bottom level)
  console.log("📊 Creating KPIs with variables...");

  const kpi1 = await prismaEntity?.create({
    data: {
      orgId: ORG_ID,
      orgEntityTypeId: kpiType.id,
      key: "KPI_SALES",
      title: "Monthly Sales Revenue",
      titleAr: "إيرادات المبيعات الشهرية",
      description: "Total sales revenue per month",
      descriptionAr: "إجمالي إيرادات المبيعات شهرياً",
      status: Status.ACTIVE,
      sourceType: KpiSourceType.CALCULATED,
      periodType: KpiPeriodType.MONTHLY,
      unit: "SAR",
      unitAr: "ريال",
      direction: KpiDirection.INCREASE_IS_GOOD,
      aggregation: KpiAggregationMethod.SUM,
      targetValue: 5000000,
      baselineValue: 4000000,
      formula: "new_sales + recurring_sales",
      variables: {
        create: [
          {
            code: "new_sales",
            displayName: "New Customer Sales",
            nameAr: "مبيعات العملاء الجدد",
            dataType: KpiVariableDataType.NUMBER,
            isRequired: true,
            isStatic: false,
          },
          {
            code: "recurring_sales",
            displayName: "Recurring Customer Sales",
            nameAr: "مبيعات العملاء المتكررين",
            dataType: KpiVariableDataType.NUMBER,
            isRequired: true,
            isStatic: false,
          },
        ],
      },
    },
  } as never) as { id: string };

  const kpi2 = await prismaEntity?.create({
    data: {
      orgId: ORG_ID,
      orgEntityTypeId: kpiType.id,
      key: "KPI_CONTRACTS",
      title: "New Contracts Signed",
      titleAr: "العقود الجديدة الموقعة",
      description: "Number of new contracts signed per month",
      descriptionAr: "عدد العقود الجديدة الموقعة شهرياً",
      status: Status.ACTIVE,
      sourceType: KpiSourceType.CALCULATED,
      periodType: KpiPeriodType.MONTHLY,
      unit: "Contracts",
      unitAr: "عقد",
      direction: KpiDirection.INCREASE_IS_GOOD,
      aggregation: KpiAggregationMethod.SUM,
      targetValue: 50,
      baselineValue: 30,
      formula: "large_contracts * 2 + small_contracts",
      variables: {
        create: [
          {
            code: "large_contracts",
            displayName: "Large Contracts (>1M SAR)",
            nameAr: "عقود كبيرة (>1م ريال)",
            dataType: KpiVariableDataType.NUMBER,
            isRequired: true,
            isStatic: false,
          },
          {
            code: "small_contracts",
            displayName: "Small Contracts (<1M SAR)",
            nameAr: "عقود صغيرة (<1م ريال)",
            dataType: KpiVariableDataType.NUMBER,
            isRequired: true,
            isStatic: false,
          },
        ],
      },
    },
  } as never) as { id: string };

  const kpi3 = await prismaEntity?.create({
    data: {
      orgId: ORG_ID,
      orgEntityTypeId: kpiType.id,
      key: "KPI_MARKET_SHARE",
      title: "Market Share Percentage",
      titleAr: "نسبة الحصة السوقية",
      description: "Company's market share in target segments",
      descriptionAr: "حصة الشركة في السوق في القطاعات المستهدفة",
      status: Status.ACTIVE,
      sourceType: KpiSourceType.CALCULATED,
      periodType: KpiPeriodType.QUARTERLY,
      unit: "%",
      unitAr: "%",
      direction: KpiDirection.INCREASE_IS_GOOD,
      aggregation: KpiAggregationMethod.LAST_VALUE,
      targetValue: 30,
      baselineValue: 20,
      formula: "our_revenue / total_market * 100",
      variables: {
        create: [
          {
            code: "our_revenue",
            displayName: "Our Revenue",
            nameAr: "إيراداتنا",
            dataType: KpiVariableDataType.NUMBER,
            isRequired: true,
            isStatic: false,
          },
          {
            code: "total_market",
            displayName: "Total Market Size",
            nameAr: "حجم السوق الإجمالي",
            dataType: KpiVariableDataType.NUMBER,
            isRequired: true,
            isStatic: false,
          },
        ],
      },
    },
  } as never) as { id: string };

  const kpi4 = await prismaEntity?.create({
    data: {
      orgId: ORG_ID,
      orgEntityTypeId: kpiType.id,
      key: "KPI_EFFICIENCY",
      title: "Operational Efficiency Score",
      titleAr: "درجة الكفاءة التشغيلية",
      description: "Overall operational efficiency rating",
      descriptionAr: "تقييم الكفاءة التشغيلية الإجمالي",
      status: Status.ACTIVE,
      sourceType: KpiSourceType.CALCULATED,
      periodType: KpiPeriodType.MONTHLY,
      unit: "Score",
      unitAr: "نقاط",
      direction: KpiDirection.INCREASE_IS_GOOD,
      aggregation: KpiAggregationMethod.AVERAGE,
      targetValue: 90,
      baselineValue: 75,
      formula: "(process_efficiency + cost_efficiency + time_efficiency) / 3",
      variables: {
        create: [
          {
            code: "process_efficiency",
            displayName: "Process Efficiency",
            nameAr: "كفاءة العمليات",
            dataType: KpiVariableDataType.NUMBER,
            isRequired: true,
            isStatic: false,
          },
          {
            code: "cost_efficiency",
            displayName: "Cost Efficiency",
            nameAr: "كفاءة التكلفة",
            dataType: KpiVariableDataType.NUMBER,
            isRequired: true,
            isStatic: false,
          },
          {
            code: "time_efficiency",
            displayName: "Time Efficiency",
            nameAr: "كفاءة الوقت",
            dataType: KpiVariableDataType.NUMBER,
            isRequired: true,
            isStatic: false,
          },
        ],
      },
    },
  } as never) as { id: string };

  const kpi5 = await prismaEntity?.create({
    data: {
      orgId: ORG_ID,
      orgEntityTypeId: kpiType.id,
      key: "KPI_DIGITAL_ADOPTION",
      title: "Digital Adoption Rate",
      titleAr: "معدل اعتماد الحلول الرقمية",
      description: "Percentage of processes digitized",
      descriptionAr: "نسبة العمليات المرقمنة",
      status: Status.ACTIVE,
      sourceType: KpiSourceType.CALCULATED,
      periodType: KpiPeriodType.MONTHLY,
      unit: "%",
      unitAr: "%",
      direction: KpiDirection.INCREASE_IS_GOOD,
      aggregation: KpiAggregationMethod.LAST_VALUE,
      targetValue: 85,
      baselineValue: 50,
      formula: "digital_processes / total_processes * 100",
      variables: {
        create: [
          {
            code: "digital_processes",
            displayName: "Digitized Processes",
            nameAr: "العمليات المرقمنة",
            dataType: KpiVariableDataType.NUMBER,
            isRequired: true,
            isStatic: false,
          },
          {
            code: "total_processes",
            displayName: "Total Processes",
            nameAr: "إجمالي العمليات",
            dataType: KpiVariableDataType.NUMBER,
            isRequired: true,
            isStatic: false,
          },
        ],
      },
    },
  } as never) as { id: string };

  const kpi6 = await prismaEntity?.create({
    data: {
      orgId: ORG_ID,
      orgEntityTypeId: kpiType.id,
      key: "KPI_TRAINING_HOURS",
      title: "Average Training Hours per Employee",
      titleAr: "متوسط ساعات التدريب لكل موظف",
      description: "Average training hours completed per employee",
      descriptionAr: "متوسط ساعات التدريب المكتملة لكل موظف",
      status: Status.ACTIVE,
      sourceType: KpiSourceType.CALCULATED,
      periodType: KpiPeriodType.QUARTERLY,
      unit: "Hours",
      unitAr: "ساعة",
      direction: KpiDirection.INCREASE_IS_GOOD,
      aggregation: KpiAggregationMethod.AVERAGE,
      targetValue: 40,
      baselineValue: 20,
      formula: "total_training_hours / employee_count",
      variables: {
        create: [
          {
            code: "total_training_hours",
            displayName: "Total Training Hours",
            nameAr: "إجمالي ساعات التدريب",
            dataType: KpiVariableDataType.NUMBER,
            isRequired: true,
            isStatic: false,
          },
          {
            code: "employee_count",
            displayName: "Number of Employees",
            nameAr: "عدد الموظفين",
            dataType: KpiVariableDataType.NUMBER,
            isRequired: true,
            isStatic: false,
          },
        ],
      },
    },
  } as never) as { id: string };

  console.log("✓ Entities created");

  // Assign entities to admin user if available
  if (adminUser) {
    console.log("👤 Assigning entities to admin user...");
    const entityIds = [kpi1.id, kpi2.id, kpi3.id, kpi4.id, kpi5.id, kpi6.id];
    
    for (const entityId of entityIds) {
      await prismaUserEntityAssignment?.create({
        data: {
          userId: adminUser.id,
          entityId,
          assignedBy: adminUser.id,
          assignedAt: new Date(),
        },
      } as never);
    }
    console.log("✓ Assignments created");
  }

  console.log("\n✅ Seed completed successfully!");
  console.log("\n📊 Summary:");
  console.log("  - 2 Pillars (top level)");
  console.log("  - 3 Objectives (linked to KPIs)");
  console.log("  - 2 Departments (linked to KPIs)");
  console.log("  - 2 Initiatives (linked to KPIs)");
  console.log("  - 6 KPIs with variables (bottom level)");
  console.log("\n🔗 Formula Dependencies:");
  console.log("  PIL_GROWTH → OBJ_REVENUE, OBJ_MARKET");
  console.log("  PIL_EXCELLENCE → OBJ_EFFICIENCY");
  console.log("  OBJ_REVENUE → KPI_SALES, KPI_CONTRACTS");
  console.log("  OBJ_MARKET → KPI_MARKET_SHARE");
  console.log("  OBJ_EFFICIENCY → KPI_EFFICIENCY");
  console.log("  DEPT_SALES → KPI_SALES");
  console.log("  DEPT_OPS → KPI_EFFICIENCY");
  console.log("  INIT_DIGITAL → KPI_DIGITAL_ADOPTION");
  console.log("  INIT_TRAINING → KPI_TRAINING_HOURS");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
