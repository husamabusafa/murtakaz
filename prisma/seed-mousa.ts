import { KpiApprovalLevel, KpiDirection, KpiPeriodType, KpiSourceType, KpiValueStatus, KpiVariableDataType, PrismaClient, Role, Status, KpiAggregationMethod } from "@prisma/client";
import { auth } from "../web/src/lib/auth";

const prisma = new PrismaClient();

async function wipeDatabase() {
  console.log("🗑️  Wiping database...");
  await prisma.entityVariableValue.deleteMany();
  await prisma.entityValuePeriod.deleteMany();
  await prisma.entityVariable.deleteMany();
  await prisma.userEntityAssignment.deleteMany();
  await prisma.entity.deleteMany();
  await prisma.changeApproval.deleteMany();
  await prisma.changeRequest.deleteMany();
  await prisma.userPreference.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.verification.deleteMany();
  await prisma.user.deleteMany();
  await prisma.orgEntityType.deleteMany();
  await prisma.organization.deleteMany();
  console.log("✅ Database wiped");
}

async function main() {
  console.log("🌱 Starting Al-Mousa comprehensive seed...");
  
  await wipeDatabase();

  // Organization
  const org = await prisma.organization.create({
    data: {
      name: "Musa Bin Abdulaziz Al-Mousa & Sons Holding Group",
      nameAr: "مجموعة موسى بن عبدالعزيز الموسى وأولاده القابضة",
      domain: "almousa.local",
      kpiApprovalLevel: KpiApprovalLevel.MANAGER,
      mission: "We invest in vital sectors with economic impact to create sustainable value that embodies the Group's efficiency and leadership.",
      missionAr: "نستثمر في القطاعات الحيوية ذات الأثر الاقتصادي لخلق قيمة مستدامة تجسد كفاءة المجموعة وريادتها",
      vision: "An ambitious investment group with efficiency that builds growth sustainability in vital sectors.",
      visionAr: "مجموعة استثمارية طموحة ذات كفاءه تبني استدامة النمو في قطاعات حيوية",
      contacts: { email: "info@almousa.local", phone: "+966 11 000 0000" },
    },
  });

  // Entity Types
  const etPillar = await prisma.orgEntityType.create({
    data: { orgId: org.id, code: "PILLAR", name: "Pillar", nameAr: "ركيزة", sortOrder: 1 },
  });

  const etObjective = await prisma.orgEntityType.create({
    data: { orgId: org.id, code: "OBJECTIVE", name: "Objective", nameAr: "هدف استراتيجي", sortOrder: 2 },
  });

  const etDepartment = await prisma.orgEntityType.create({
    data: { orgId: org.id, code: "DEPARTMENT", name: "Department", nameAr: "قسم", sortOrder: 3 },
  });

  const etInitiative = await prisma.orgEntityType.create({
    data: { orgId: org.id, code: "INITIATIVE", name: "Initiative", nameAr: "مبادرة", sortOrder: 4 },
  });

  const etKPI = await prisma.orgEntityType.create({
    data: { orgId: org.id, code: "KPI", name: "KPI", nameAr: "مؤشر أداء", sortOrder: 5 },
  });

  // Users
  const pwd = "password123";
  
  const ceo = await auth.api.signUpEmail({ body: { email: "ceo@almousa.local", password: pwd, name: "عبدالله الموسى", role: Role.EXECUTIVE, orgId: org.id } });
  await prisma.user.update({ where: { id: ceo.user.id }, data: { title: "Group CEO" } });

  const admin = await auth.api.signUpEmail({ body: { email: "admin@almousa.local", password: pwd, name: "مدير النظام", role: Role.ADMIN, orgId: org.id } });
  await prisma.user.update({ where: { id: admin.user.id }, data: { managerId: ceo.user.id, title: "Administrator" } });

  const cfo = await auth.api.signUpEmail({ body: { email: "cfo@almousa.local", password: pwd, name: "خالد الأحمد", role: Role.EXECUTIVE, orgId: org.id } });
  await prisma.user.update({ where: { id: cfo.user.id }, data: { managerId: ceo.user.id, title: "CFO" } });

  const headStrategy = await auth.api.signUpEmail({ body: { email: "strategy@almousa.local", password: pwd, name: "فيصل السليمان", role: Role.MANAGER, orgId: org.id } });
  await prisma.user.update({ where: { id: headStrategy.user.id }, data: { managerId: ceo.user.id, title: "Head of Strategy" } });

  const headInvest = await auth.api.signUpEmail({ body: { email: "invest@almousa.local", password: pwd, name: "محمد العتيبي", role: Role.MANAGER, orgId: org.id } });
  await prisma.user.update({ where: { id: headInvest.user.id }, data: { managerId: cfo.user.id, title: "Head of Investment" } });

  const headFinance = await auth.api.signUpEmail({ body: { email: "finance@almousa.local", password: pwd, name: "سارة الدوسري", role: Role.MANAGER, orgId: org.id } });
  await prisma.user.update({ where: { id: headFinance.user.id }, data: { managerId: cfo.user.id, title: "Head of Finance" } });

  const headMarketing = await auth.api.signUpEmail({ body: { email: "marketing@almousa.local", password: pwd, name: "نورة القحطاني", role: Role.MANAGER, orgId: org.id } });
  await prisma.user.update({ where: { id: headMarketing.user.id }, data: { managerId: ceo.user.id, title: "Head of Marketing" } });

  const headHR = await auth.api.signUpEmail({ body: { email: "hr@almousa.local", password: pwd, name: "أحمد الشهري", role: Role.MANAGER, orgId: org.id } });
  await prisma.user.update({ where: { id: headHR.user.id }, data: { managerId: ceo.user.id, title: "Head of HR" } });

  const analyst1 = await auth.api.signUpEmail({ body: { email: "analyst1@almousa.local", password: pwd, name: "عبدالرحمن المطيري", role: Role.MANAGER, orgId: org.id } });
  await prisma.user.update({ where: { id: analyst1.user.id }, data: { managerId: headStrategy.user.id, title: "Strategy Analyst" } });

  const analyst2 = await auth.api.signUpEmail({ body: { email: "analyst2@almousa.local", password: pwd, name: "ليلى العنزي", role: Role.MANAGER, orgId: org.id } });
  await prisma.user.update({ where: { id: analyst2.user.id }, data: { managerId: headInvest.user.id, title: "Investment Analyst" } });

  console.log("✅ Users created");

  // Pillars
  const p1 = await prisma.entity.create({ data: { orgId: org.id, orgEntityTypeId: etPillar.id, key: "P1", title: "Investment Leadership & Portfolio Diversification", titleAr: "الريادة الاستثمارية وتنويع المحفظة", ownerUserId: ceo.user.id, status: Status.ACTIVE, sourceType: KpiSourceType.CALCULATED, formula: "(get('OBJ1') + get('OBJ2') + get('OBJ3')) / 3" } });
  
  const p2 = await prisma.entity.create({ data: { orgId: org.id, orgEntityTypeId: etPillar.id, key: "P2", title: "Financial Sustainability", titleAr: "الاستدامة المالية", ownerUserId: cfo.user.id, status: Status.ACTIVE, sourceType: KpiSourceType.CALCULATED, formula: "get('OBJ4')" } });
  
  const p3 = await prisma.entity.create({ data: { orgId: org.id, orgEntityTypeId: etPillar.id, key: "P3", title: "Governance & Excellence", titleAr: "الحوكمة والتميز", ownerUserId: headStrategy.user.id, status: Status.ACTIVE, sourceType: KpiSourceType.CALCULATED, formula: "(get('OBJ5') + get('OBJ6')) / 2" } });
  
  const p4 = await prisma.entity.create({ data: { orgId: org.id, orgEntityTypeId: etPillar.id, key: "P4", title: "Brand Excellence", titleAr: "التميز في العلامة التجارية", ownerUserId: headMarketing.user.id, status: Status.ACTIVE, sourceType: KpiSourceType.CALCULATED, formula: "(get('OBJ7') + get('OBJ8')) / 2" } });

  console.log("✅ Pillars created");

  // Objectives
  const obj1 = await prisma.entity.create({ data: { orgId: org.id, orgEntityTypeId: etObjective.id, key: "OBJ1", title: "Expand portfolio to 7 new sectors by 2028 with 12% CAGR", titleAr: "توسيع المحفظة إلى 7 قطاعات جديدة بحلول 2028 بنمو 12٪", ownerUserId: headInvest.user.id, status: Status.ACTIVE, sourceType: KpiSourceType.CALCULATED, formula: "(get('KPI_NEW_SECTORS') + get('KPI_CAGR') + get('KPI_PORTFOLIO_CONTRIB')) / 3" } });
  
  const obj2 = await prisma.entity.create({ data: { orgId: org.id, orgEntityTypeId: etObjective.id, key: "OBJ2", title: "Achieve 15% above market returns by 2028", titleAr: "تحقيق عوائد أعلى من السوق بنسبة 15٪ بحلول 2028", ownerUserId: headInvest.user.id, status: Status.ACTIVE, sourceType: KpiSourceType.CALCULATED, formula: "(get('KPI_ROI') + get('KPI_ANNUAL_RETURN')) / 2" } });
  
  const obj3 = await prisma.entity.create({ data: { orgId: org.id, orgEntityTypeId: etObjective.id, key: "OBJ3", title: "Raise group revenues to target by 2028", titleAr: "رفع إيرادات المجموعة للمستهدف بحلول 2028", ownerUserId: cfo.user.id, status: Status.ACTIVE, sourceType: KpiSourceType.CALCULATED, formula: "(get('KPI_TOTAL_REVENUE') + get('KPI_REVENUE_GROWTH')) / 2" } });
  
  const obj4 = await prisma.entity.create({ data: { orgId: org.id, orgEntityTypeId: etObjective.id, key: "OBJ4", title: "Reduce financial deviations by 10% by 2026", titleAr: "خفض الانحرافات المالية بنسبة 10٪ بحلول 2026", ownerUserId: headFinance.user.id, status: Status.ACTIVE, sourceType: KpiSourceType.CALCULATED, formula: "(get('KPI_FIN_DEVIATIONS') + get('KPI_BUDGET_COMPLIANCE')) / 2" } });
  
  const obj5 = await prisma.entity.create({ data: { orgId: org.id, orgEntityTypeId: etObjective.id, key: "OBJ5", title: "Achieve listing readiness by 2026", titleAr: "تحقيق الجاهزية للإدراج بحلول 2026", ownerUserId: headStrategy.user.id, status: Status.ACTIVE, sourceType: KpiSourceType.CALCULATED, formula: "(get('KPI_GOVERNANCE') + get('KPI_OPERATIONAL_MODEL')) / 2" } });
  
  const obj6 = await prisma.entity.create({ data: { orgId: org.id, orgEntityTypeId: etObjective.id, key: "OBJ6", title: "Raise employee productivity to 85% by 2027", titleAr: "رفع إنتاجية الموظفين إلى 85٪ بحلول 2027", ownerUserId: headHR.user.id, status: Status.ACTIVE, sourceType: KpiSourceType.CALCULATED, formula: "(get('KPI_EMPLOYEE_PROD') + get('KPI_TRAINING')) / 2" } });
  
  const obj7 = await prisma.entity.create({ data: { orgId: org.id, orgEntityTypeId: etObjective.id, key: "OBJ7", title: "Raise nominal value by target % over 3 years", titleAr: "رفع القيمة الاسمية بالنسبة المستهدفة على مدى 3 سنوات", ownerUserId: cfo.user.id, status: Status.ACTIVE, sourceType: KpiSourceType.CALCULATED, formula: "get('KPI_NOMINAL_VALUE')" } });
  
  const obj8 = await prisma.entity.create({ data: { orgId: org.id, orgEntityTypeId: etObjective.id, key: "OBJ8", title: "Enhance brand awareness by target % by 2028", titleAr: "تعزيز الوعي بالعلامة التجارية بالنسبة المستهدفة بحلول 2028", ownerUserId: headMarketing.user.id, status: Status.ACTIVE, sourceType: KpiSourceType.CALCULATED, formula: "(get('KPI_BRAND_AWARENESS') + get('KPI_DIGITAL_ENGAGE')) / 2" } });

  console.log("✅ Objectives created");

  // Departments
  const deptStrategy = await prisma.entity.create({ data: { orgId: org.id, orgEntityTypeId: etDepartment.id, key: "DEPT_STRATEGY", title: "Strategy & Excellence", titleAr: "الاستراتيجية والتميز", ownerUserId: headStrategy.user.id, status: Status.ACTIVE, sourceType: KpiSourceType.CALCULATED, formula: "get('INIT3')" } });
  
  const deptInvest = await prisma.entity.create({ data: { orgId: org.id, orgEntityTypeId: etDepartment.id, key: "DEPT_INVEST", title: "Investment", titleAr: "الاستثمار", ownerUserId: headInvest.user.id, status: Status.ACTIVE, sourceType: KpiSourceType.CALCULATED, formula: "get('INIT1')" } });
  
  const deptFinance = await prisma.entity.create({ data: { orgId: org.id, orgEntityTypeId: etDepartment.id, key: "DEPT_FINANCE", title: "Finance", titleAr: "المالية", ownerUserId: headFinance.user.id, status: Status.ACTIVE, sourceType: KpiSourceType.CALCULATED, formula: "get('INIT2')" } });
  
  const deptMarketing = await prisma.entity.create({ data: { orgId: org.id, orgEntityTypeId: etDepartment.id, key: "DEPT_MARKETING", title: "Marketing", titleAr: "التسويق", ownerUserId: headMarketing.user.id, status: Status.ACTIVE, sourceType: KpiSourceType.CALCULATED, formula: "get('INIT4')" } });
  
  const deptHR = await prisma.entity.create({ data: { orgId: org.id, orgEntityTypeId: etDepartment.id, key: "DEPT_HR", title: "Human Resources", titleAr: "الموارد البشرية", ownerUserId: headHR.user.id, status: Status.PLANNED, sourceType: KpiSourceType.CALCULATED, formula: "get('INIT5')" } });

  console.log("✅ Departments created");

  // Initiatives
  const init1 = await prisma.entity.create({ data: { orgId: org.id, orgEntityTypeId: etInitiative.id, key: "INIT1", title: "New Sectors Entry Program", titleAr: "برنامج الدخول في القطاعات الجديدة", ownerUserId: headInvest.user.id, status: Status.ACTIVE, sourceType: KpiSourceType.CALCULATED, formula: "(get('KPI_NEW_SECTORS') + get('KPI_PARTNERSHIPS')) / 2" } });
  
  const init2 = await prisma.entity.create({ data: { orgId: org.id, orgEntityTypeId: etInitiative.id, key: "INIT2", title: "Unified Financial System", titleAr: "النظام المالي الموحد", ownerUserId: headFinance.user.id, status: Status.ACTIVE, sourceType: KpiSourceType.CALCULATED, formula: "(get('KPI_SYSTEM_ADOPTION') + get('KPI_FIN_DEVIATIONS')) / 2" } });
  
  const init3 = await prisma.entity.create({ data: { orgId: org.id, orgEntityTypeId: etInitiative.id, key: "INIT3", title: "Governance Excellence Program", titleAr: "برنامج التميز في الحوكمة", ownerUserId: headStrategy.user.id, status: Status.ACTIVE, sourceType: KpiSourceType.CALCULATED, formula: "get('KPI_GOVERNANCE')" } });
  
  const init4 = await prisma.entity.create({ data: { orgId: org.id, orgEntityTypeId: etInitiative.id, key: "INIT4", title: "Brand Positioning Campaign", titleAr: "حملة تعزيز العلامة التجارية", ownerUserId: headMarketing.user.id, status: Status.ACTIVE, sourceType: KpiSourceType.CALCULATED, formula: "(get('KPI_BRAND_AWARENESS') + get('KPI_CAMPAIGNS')) / 2" } });
  
  const init5 = await prisma.entity.create({ data: { orgId: org.id, orgEntityTypeId: etInitiative.id, key: "INIT5", title: "Workforce Development", titleAr: "تطوير القوى العاملة", ownerUserId: headHR.user.id, status: Status.PLANNED, sourceType: KpiSourceType.CALCULATED, formula: "(get('KPI_TRAINING') + get('KPI_EMPLOYEE_PROD')) / 2" } });

  console.log("✅ Initiatives created");

  // KPIs with Variables (continuing...)

  // KPIs
  const kpi1 = await prisma.entity.create({ data: { orgId: org.id, orgEntityTypeId: etKPI.id, key: "KPI_NEW_SECTORS", title: "Number of New Sectors", titleAr: "عدد القطاعات الجديدة", ownerUserId: headInvest.user.id, status: Status.ACTIVE, sourceType: KpiSourceType.MANUAL, periodType: KpiPeriodType.YEARLY, unit: "sectors", unitAr: "قطاع", direction: KpiDirection.INCREASE_IS_GOOD, aggregation: KpiAggregationMethod.LAST_VALUE, baselineValue: 0, targetValue: 7, weight: 100 } });
  await prisma.entityVariable.create({ data: { entityId: kpi1.id, code: "count", displayName: "Sectors Count", nameAr: "عدد القطاعات", dataType: KpiVariableDataType.NUMBER, isRequired: true } });

  const kpi2 = await prisma.entity.create({ data: { orgId: org.id, orgEntityTypeId: etKPI.id, key: "KPI_CAGR", title: "CAGR", titleAr: "معدل النمو المركب", ownerUserId: headInvest.user.id, status: Status.ACTIVE, sourceType: KpiSourceType.CALCULATED, periodType: KpiPeriodType.YEARLY, unit: "%", unitAr: "٪", direction: KpiDirection.INCREASE_IS_GOOD, aggregation: KpiAggregationMethod.LAST_VALUE, baselineValue: 0, targetValue: 12, weight: 100, formula: "(Math.pow(final_val / initial_val, 1 / years) - 1) * 100" } });
  const v2a = await prisma.entityVariable.create({ data: { entityId: kpi2.id, code: "initial_val", displayName: "Initial Value", nameAr: "القيمة الابتدائية", dataType: KpiVariableDataType.NUMBER, isRequired: true } });
  const v2b = await prisma.entityVariable.create({ data: { entityId: kpi2.id, code: "final_val", displayName: "Final Value", nameAr: "القيمة النهائية", dataType: KpiVariableDataType.NUMBER, isRequired: true } });
  const v2c = await prisma.entityVariable.create({ data: { entityId: kpi2.id, code: "years", displayName: "Years", nameAr: "السنوات", dataType: KpiVariableDataType.NUMBER, isRequired: true, isStatic: true, staticValue: 3 } });

  const kpi3 = await prisma.entity.create({ data: { orgId: org.id, orgEntityTypeId: etKPI.id, key: "KPI_PORTFOLIO_CONTRIB", title: "Portfolio Contribution %", titleAr: "مساهمة المحفظة ٪", ownerUserId: headInvest.user.id, status: Status.ACTIVE, sourceType: KpiSourceType.CALCULATED, periodType: KpiPeriodType.QUARTERLY, unit: "%", unitAr: "٪", direction: KpiDirection.INCREASE_IS_GOOD, aggregation: KpiAggregationMethod.LAST_VALUE, baselineValue: 0, targetValue: 25, weight: 80, formula: "(new_inv / total) * 100" } });
  const v3a = await prisma.entityVariable.create({ data: { entityId: kpi3.id, code: "new_inv", displayName: "New Investments", nameAr: "الاستثمارات الجديدة", dataType: KpiVariableDataType.NUMBER, isRequired: true } });
  const v3b = await prisma.entityVariable.create({ data: { entityId: kpi3.id, code: "total", displayName: "Total Portfolio", nameAr: "إجمالي المحفظة", dataType: KpiVariableDataType.NUMBER, isRequired: true } });

  const kpi4 = await prisma.entity.create({ data: { orgId: org.id, orgEntityTypeId: etKPI.id, key: "KPI_PARTNERSHIPS", title: "New Partnerships", titleAr: "الشراكات الجديدة", ownerUserId: headInvest.user.id, status: Status.ACTIVE, sourceType: KpiSourceType.MANUAL, periodType: KpiPeriodType.YEARLY, unit: "partnerships", unitAr: "شراكة", direction: KpiDirection.INCREASE_IS_GOOD, aggregation: KpiAggregationMethod.SUM, baselineValue: 0, targetValue: 15, weight: 60 } });
  await prisma.entityVariable.create({ data: { entityId: kpi4.id, code: "count", displayName: "Count", nameAr: "العدد", dataType: KpiVariableDataType.NUMBER, isRequired: true } });

  const kpi5 = await prisma.entity.create({ data: { orgId: org.id, orgEntityTypeId: etKPI.id, key: "KPI_ROI", title: "ROI %", titleAr: "العائد على الاستثمار ٪", ownerUserId: cfo.user.id, status: Status.ACTIVE, sourceType: KpiSourceType.CALCULATED, periodType: KpiPeriodType.QUARTERLY, unit: "%", unitAr: "٪", direction: KpiDirection.INCREASE_IS_GOOD, aggregation: KpiAggregationMethod.LAST_VALUE, baselineValue: 8, targetValue: 15, weight: 100, formula: "(profit / investment) * 100" } });
  const v5a = await prisma.entityVariable.create({ data: { entityId: kpi5.id, code: "profit", displayName: "Net Profit", nameAr: "صافي الربح", dataType: KpiVariableDataType.NUMBER, isRequired: true } });
  const v5b = await prisma.entityVariable.create({ data: { entityId: kpi5.id, code: "investment", displayName: "Total Investment", nameAr: "إجمالي الاستثمار", dataType: KpiVariableDataType.NUMBER, isRequired: true } });

  const kpi6 = await prisma.entity.create({ data: { orgId: org.id, orgEntityTypeId: etKPI.id, key: "KPI_ANNUAL_RETURN", title: "Annual Return %", titleAr: "العائد السنوي ٪", ownerUserId: cfo.user.id, status: Status.ACTIVE, sourceType: KpiSourceType.CALCULATED, periodType: KpiPeriodType.YEARLY, unit: "%", unitAr: "٪", direction: KpiDirection.INCREASE_IS_GOOD, aggregation: KpiAggregationMethod.LAST_VALUE, baselineValue: 7, targetValue: 12, weight: 90, formula: "(Math.pow(end_val / begin_val, 1 / years) - 1) * 100" } });
  await prisma.entityVariable.create({ data: { entityId: kpi6.id, code: "begin_val", displayName: "Beginning Value", nameAr: "القيمة الابتدائية", dataType: KpiVariableDataType.NUMBER, isRequired: true } });
  await prisma.entityVariable.create({ data: { entityId: kpi6.id, code: "end_val", displayName: "Ending Value", nameAr: "القيمة النهائية", dataType: KpiVariableDataType.NUMBER, isRequired: true } });
  await prisma.entityVariable.create({ data: { entityId: kpi6.id, code: "years", displayName: "Years", nameAr: "السنوات", dataType: KpiVariableDataType.NUMBER, isRequired: true, isStatic: true, staticValue: 1 } });

  const kpi7 = await prisma.entity.create({ data: { orgId: org.id, orgEntityTypeId: etKPI.id, key: "KPI_TOTAL_REVENUE", title: "Total Revenue", titleAr: "إجمالي الإيرادات", ownerUserId: cfo.user.id, status: Status.ACTIVE, sourceType: KpiSourceType.MANUAL, periodType: KpiPeriodType.YEARLY, unit: "SAR M", unitAr: "م ريال", direction: KpiDirection.INCREASE_IS_GOOD, aggregation: KpiAggregationMethod.SUM, baselineValue: 850, targetValue: 1500, weight: 100 } });
  await prisma.entityVariable.create({ data: { entityId: kpi7.id, code: "revenue", displayName: "Revenue", nameAr: "الإيرادات", dataType: KpiVariableDataType.NUMBER, isRequired: true } });

  const kpi8 = await prisma.entity.create({ data: { orgId: org.id, orgEntityTypeId: etKPI.id, key: "KPI_REVENUE_GROWTH", title: "Revenue Growth %", titleAr: "نمو الإيرادات ٪", ownerUserId: cfo.user.id, status: Status.ACTIVE, sourceType: KpiSourceType.CALCULATED, periodType: KpiPeriodType.YEARLY, unit: "%", unitAr: "٪", direction: KpiDirection.INCREASE_IS_GOOD, aggregation: KpiAggregationMethod.LAST_VALUE, baselineValue: 5, targetValue: 15, weight: 85, formula: "((current - previous) / previous) * 100" } });
  await prisma.entityVariable.create({ data: { entityId: kpi8.id, code: "current", displayName: "Current Revenue", nameAr: "الإيرادات الحالية", dataType: KpiVariableDataType.NUMBER, isRequired: true } });
  await prisma.entityVariable.create({ data: { entityId: kpi8.id, code: "previous", displayName: "Previous Revenue", nameAr: "الإيرادات السابقة", dataType: KpiVariableDataType.NUMBER, isRequired: true } });

  const kpi9 = await prisma.entity.create({ data: { orgId: org.id, orgEntityTypeId: etKPI.id, key: "KPI_FIN_DEVIATIONS", title: "Financial Deviations %", titleAr: "الانحرافات المالية ٪", ownerUserId: headFinance.user.id, status: Status.ACTIVE, sourceType: KpiSourceType.CALCULATED, periodType: KpiPeriodType.QUARTERLY, unit: "%", unitAr: "٪", direction: KpiDirection.DECREASE_IS_GOOD, aggregation: KpiAggregationMethod.AVERAGE, baselineValue: 15, targetValue: 5, weight: 100, formula: "Math.abs(((actual - budget) / budget) * 100)" } });
  const v9a = await prisma.entityVariable.create({ data: { entityId: kpi9.id, code: "actual", displayName: "Actual Spending", nameAr: "الإنفاق الفعلي", dataType: KpiVariableDataType.NUMBER, isRequired: true } });
  const v9b = await prisma.entityVariable.create({ data: { entityId: kpi9.id, code: "budget", displayName: "Budget", nameAr: "الميزانية", dataType: KpiVariableDataType.NUMBER, isRequired: true } });

  const kpi10 = await prisma.entity.create({ data: { orgId: org.id, orgEntityTypeId: etKPI.id, key: "KPI_BUDGET_COMPLIANCE", title: "Budget Compliance %", titleAr: "الالتزام بالميزانية ٪", ownerUserId: headFinance.user.id, status: Status.ACTIVE, sourceType: KpiSourceType.CALCULATED, periodType: KpiPeriodType.QUARTERLY, unit: "%", unitAr: "٪", direction: KpiDirection.INCREASE_IS_GOOD, aggregation: KpiAggregationMethod.AVERAGE, baselineValue: 70, targetValue: 95, weight: 85, formula: "(compliant / total) * 100" } });
  await prisma.entityVariable.create({ data: { entityId: kpi10.id, code: "compliant", displayName: "Compliant Depts", nameAr: "الأقسام الملتزمة", dataType: KpiVariableDataType.NUMBER, isRequired: true } });
  await prisma.entityVariable.create({ data: { entityId: kpi10.id, code: "total", displayName: "Total Depts", nameAr: "إجمالي الأقسام", dataType: KpiVariableDataType.NUMBER, isRequired: true, isStatic: true, staticValue: 5 } });

  const kpi11 = await prisma.entity.create({ data: { orgId: org.id, orgEntityTypeId: etKPI.id, key: "KPI_SYSTEM_ADOPTION", title: "System Adoption %", titleAr: "تبني النظام ٪", ownerUserId: headFinance.user.id, status: Status.ACTIVE, sourceType: KpiSourceType.MANUAL, periodType: KpiPeriodType.QUARTERLY, unit: "%", unitAr: "٪", direction: KpiDirection.INCREASE_IS_GOOD, aggregation: KpiAggregationMethod.LAST_VALUE, baselineValue: 20, targetValue: 100, weight: 70 } });
  await prisma.entityVariable.create({ data: { entityId: kpi11.id, code: "adoption_rate", displayName: "Adoption Rate", nameAr: "معدل التبني", dataType: KpiVariableDataType.NUMBER, isRequired: true } });

  const kpi12 = await prisma.entity.create({ data: { orgId: org.id, orgEntityTypeId: etKPI.id, key: "KPI_GOVERNANCE", title: "Governance Compliance %", titleAr: "الامتثال للحوكمة ٪", ownerUserId: headStrategy.user.id, status: Status.ACTIVE, sourceType: KpiSourceType.MANUAL, periodType: KpiPeriodType.QUARTERLY, unit: "%", unitAr: "٪", direction: KpiDirection.INCREASE_IS_GOOD, aggregation: KpiAggregationMethod.LAST_VALUE, baselineValue: 60, targetValue: 100, weight: 100 } });
  await prisma.entityVariable.create({ data: { entityId: kpi12.id, code: "compliance", displayName: "Compliance %", nameAr: "نسبة الامتثال", dataType: KpiVariableDataType.NUMBER, isRequired: true } });

  const kpi13 = await prisma.entity.create({ data: { orgId: org.id, orgEntityTypeId: etKPI.id, key: "KPI_OPERATIONAL_MODEL", title: "Operational Model Activation %", titleAr: "تفعيل النموذج التشغيلي ٪", ownerUserId: headStrategy.user.id, status: Status.ACTIVE, sourceType: KpiSourceType.MANUAL, periodType: KpiPeriodType.QUARTERLY, unit: "%", unitAr: "٪", direction: KpiDirection.INCREASE_IS_GOOD, aggregation: KpiAggregationMethod.LAST_VALUE, baselineValue: 40, targetValue: 100, weight: 90 } });
  await prisma.entityVariable.create({ data: { entityId: kpi13.id, code: "activation", displayName: "Activation %", nameAr: "نسبة التفعيل", dataType: KpiVariableDataType.NUMBER, isRequired: true } });

  const kpi14 = await prisma.entity.create({ data: { orgId: org.id, orgEntityTypeId: etKPI.id, key: "KPI_EMPLOYEE_PROD", title: "Employee Productivity %", titleAr: "إنتاجية الموظفين ٪", ownerUserId: headHR.user.id, status: Status.ACTIVE, sourceType: KpiSourceType.MANUAL, periodType: KpiPeriodType.QUARTERLY, unit: "%", unitAr: "٪", direction: KpiDirection.INCREASE_IS_GOOD, aggregation: KpiAggregationMethod.AVERAGE, baselineValue: 65, targetValue: 85, weight: 100 } });
  await prisma.entityVariable.create({ data: { entityId: kpi14.id, code: "productivity", displayName: "Productivity %", nameAr: "نسبة الإنتاجية", dataType: KpiVariableDataType.NUMBER, isRequired: true } });

  const kpi15 = await prisma.entity.create({ data: { orgId: org.id, orgEntityTypeId: etKPI.id, key: "KPI_TRAINING", title: "Training Participation %", titleAr: "المشاركة في التدريب ٪", ownerUserId: headHR.user.id, status: Status.ACTIVE, sourceType: KpiSourceType.MANUAL, periodType: KpiPeriodType.QUARTERLY, unit: "%", unitAr: "٪", direction: KpiDirection.INCREASE_IS_GOOD, aggregation: KpiAggregationMethod.AVERAGE, baselineValue: 40, targetValue: 90, weight: 70 } });
  await prisma.entityVariable.create({ data: { entityId: kpi15.id, code: "participation", displayName: "Participation %", nameAr: "نسبة المشاركة", dataType: KpiVariableDataType.NUMBER, isRequired: true } });

  const kpi16 = await prisma.entity.create({ data: { orgId: org.id, orgEntityTypeId: etKPI.id, key: "KPI_NOMINAL_VALUE", title: "Nominal Value Growth %", titleAr: "نمو القيمة الاسمية ٪", ownerUserId: cfo.user.id, status: Status.ACTIVE, sourceType: KpiSourceType.CALCULATED, periodType: KpiPeriodType.YEARLY, unit: "%", unitAr: "٪", direction: KpiDirection.INCREASE_IS_GOOD, aggregation: KpiAggregationMethod.LAST_VALUE, baselineValue: 0, targetValue: 20, weight: 100, formula: "((end_val - start_val) / start_val) * 100" } });
  await prisma.entityVariable.create({ data: { entityId: kpi16.id, code: "start_val", displayName: "Starting Value", nameAr: "القيمة الابتدائية", dataType: KpiVariableDataType.NUMBER, isRequired: true } });
  await prisma.entityVariable.create({ data: { entityId: kpi16.id, code: "end_val", displayName: "Ending Value", nameAr: "القيمة النهائية", dataType: KpiVariableDataType.NUMBER, isRequired: true } });

  const kpi17 = await prisma.entity.create({ data: { orgId: org.id, orgEntityTypeId: etKPI.id, key: "KPI_BRAND_AWARENESS", title: "Brand Awareness Index", titleAr: "مؤشر الوعي بالعلامة", ownerUserId: headMarketing.user.id, status: Status.ACTIVE, sourceType: KpiSourceType.CALCULATED, periodType: KpiPeriodType.QUARTERLY, unit: "%", unitAr: "٪", direction: KpiDirection.INCREASE_IS_GOOD, aggregation: KpiAggregationMethod.LAST_VALUE, baselineValue: 30, targetValue: 70, weight: 100, formula: "(aware / target_audience) * 100" } });
  await prisma.entityVariable.create({ data: { entityId: kpi17.id, code: "aware", displayName: "Aware Audience", nameAr: "الجمهور الواعي", dataType: KpiVariableDataType.NUMBER, isRequired: true } });
  await prisma.entityVariable.create({ data: { entityId: kpi17.id, code: "target_audience", displayName: "Target Audience", nameAr: "الجمهور المستهدف", dataType: KpiVariableDataType.NUMBER, isRequired: true } });

  const kpi18 = await prisma.entity.create({ data: { orgId: org.id, orgEntityTypeId: etKPI.id, key: "KPI_DIGITAL_ENGAGE", title: "Digital Engagement Rate", titleAr: "معدل التفاعل الرقمي", ownerUserId: headMarketing.user.id, status: Status.ACTIVE, sourceType: KpiSourceType.CALCULATED, periodType: KpiPeriodType.MONTHLY, unit: "%", unitAr: "٪", direction: KpiDirection.INCREASE_IS_GOOD, aggregation: KpiAggregationMethod.AVERAGE, baselineValue: 2, targetValue: 8, weight: 80, formula: "(engagements / followers) * 100" } });
  await prisma.entityVariable.create({ data: { entityId: kpi18.id, code: "engagements", displayName: "Engagements", nameAr: "التفاعلات", dataType: KpiVariableDataType.NUMBER, isRequired: true } });
  await prisma.entityVariable.create({ data: { entityId: kpi18.id, code: "followers", displayName: "Followers", nameAr: "المتابعون", dataType: KpiVariableDataType.NUMBER, isRequired: true } });

  const kpi19 = await prisma.entity.create({ data: { orgId: org.id, orgEntityTypeId: etKPI.id, key: "KPI_CAMPAIGNS", title: "Marketing Campaigns Count", titleAr: "عدد الحملات التسويقية", ownerUserId: headMarketing.user.id, status: Status.ACTIVE, sourceType: KpiSourceType.MANUAL, periodType: KpiPeriodType.YEARLY, unit: "campaigns", unitAr: "حملة", direction: KpiDirection.INCREASE_IS_GOOD, aggregation: KpiAggregationMethod.SUM, baselineValue: 5, targetValue: 20, weight: 60 } });
  await prisma.entityVariable.create({ data: { entityId: kpi19.id, code: "count", displayName: "Campaigns Count", nameAr: "عدد الحملات", dataType: KpiVariableDataType.NUMBER, isRequired: true } });

  console.log("✅ KPIs created");

  // User Assignments
  await prisma.userEntityAssignment.createMany({ data: [
    { userId: headInvest.user.id, entityId: kpi1.id },
    { userId: headInvest.user.id, entityId: kpi2.id },
    { userId: headInvest.user.id, entityId: kpi3.id },
    { userId: headInvest.user.id, entityId: kpi4.id },
    { userId: analyst2.user.id, entityId: kpi1.id },
    { userId: analyst2.user.id, entityId: kpi4.id },
    { userId: cfo.user.id, entityId: kpi5.id },
    { userId: cfo.user.id, entityId: kpi6.id },
    { userId: cfo.user.id, entityId: kpi7.id },
    { userId: cfo.user.id, entityId: kpi8.id },
    { userId: headFinance.user.id, entityId: kpi9.id },
    { userId: headFinance.user.id, entityId: kpi10.id },
    { userId: headFinance.user.id, entityId: kpi11.id },
    { userId: headStrategy.user.id, entityId: kpi12.id },
    { userId: headStrategy.user.id, entityId: kpi13.id },
    { userId: analyst1.user.id, entityId: kpi12.id },
    { userId: headHR.user.id, entityId: kpi14.id },
    { userId: headHR.user.id, entityId: kpi15.id },
    { userId: headMarketing.user.id, entityId: kpi17.id },
    { userId: headMarketing.user.id, entityId: kpi18.id },
    { userId: headMarketing.user.id, entityId: kpi19.id },
  ]});

  console.log("✅ User assignments created");

  // Sample data for some KPIs (Q4 2024)
  const now = new Date();
  const q4Start = new Date(now.getFullYear(), 9, 1);
  const q4End = new Date(now.getFullYear(), 12, 0, 23, 59, 59, 999);

  // KPI 3: Portfolio Contribution
  const period3 = await prisma.entityValuePeriod.create({ data: { entityId: kpi3.id, periodStart: q4Start, periodEnd: q4End, actualValue: null, calculatedValue: 12.5, finalValue: 12.5, status: KpiValueStatus.DRAFT, enteredBy: headInvest.user.id } });
  await prisma.entityVariableValue.createMany({ data: [
    { entityValueId: period3.id, entityVariableId: v3a.id, value: 125000000 },
    { entityValueId: period3.id, entityVariableId: v3b.id, value: 1000000000 },
  ]});

  // KPI 5: ROI
  const period5 = await prisma.entityValuePeriod.create({ data: { entityId: kpi5.id, periodStart: q4Start, periodEnd: q4End, actualValue: null, calculatedValue: 11.2, finalValue: 11.2, status: KpiValueStatus.SUBMITTED, enteredBy: cfo.user.id, submittedBy: cfo.user.id, submittedAt: new Date(now.getTime() - 3600000) } });
  await prisma.entityVariableValue.createMany({ data: [
    { entityValueId: period5.id, entityVariableId: v5a.id, value: 112000000 },
    { entityValueId: period5.id, entityVariableId: v5b.id, value: 1000000000 },
  ]});

  // KPI 9: Financial Deviations
  const period9 = await prisma.entityValuePeriod.create({ data: { entityId: kpi9.id, periodStart: q4Start, periodEnd: q4End, actualValue: null, calculatedValue: 8.3, finalValue: 8.3, status: KpiValueStatus.APPROVED, enteredBy: headFinance.user.id, submittedBy: headFinance.user.id, submittedAt: new Date(now.getTime() - 7200000), approvedBy: cfo.user.id, approvedAt: new Date(now.getTime() - 1800000) } });
  await prisma.entityVariableValue.createMany({ data: [
    { entityValueId: period9.id, entityVariableId: v9a.id, value: 108300000 },
    { entityValueId: period9.id, entityVariableId: v9b.id, value: 100000000 },
  ]});

  console.log("✅ Sample data values created");

  console.log("🎉 Al-Mousa comprehensive seed completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
