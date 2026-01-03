
import { PrismaClient, Role, Status, RiskSeverity } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

// Helper to read JSON
const readJson = (filename: string) => {
  const filePath = path.join(process.cwd(), 'docs/data/seed', filename);
  const data = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(data);
};

// Map department names to User IDs (based on users.json)
const departmentOwnerMap: Record<string, string> = {
  "IT": "user-it",
  "Executive": "user-ceo",
  "Investment": "user-invest",
  "Finance": "user-finance",
  "Strategy & Excellence": "user-strategy",
  "Internal Audit & Risk": "user-audit",
  "HR": "user-hr",
  "Marketing & Corp Comm": "user-marketing",
  "Marketing": "user-marketing" // Alias found in kpis.json
};

const defaultOrgId = "org-1";

async function main() {
  console.log('Start seeding ...');

  // 1. Organizations
  const organizations = readJson('organizations.json');
  for (const org of organizations) {
    await prisma.organization.upsert({
      where: { id: org.id },
      update: {},
      create: {
        id: org.id,
        name: org.name,
        domain: org.domain,
      },
    });
  }

  // 2. Users
  const users = readJson('users.json');
  for (const user of users) {
    await prisma.user.upsert({
      where: { id: user.id },
      update: {},
      create: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role as Role,
        department: user.department,
        orgId: defaultOrgId,
      },
    });
  }

  // 3. Pillars
  // Pillars in JSON don't have ownerId, assigning to Strategy Head (user-strategy) by default
  const pillars = readJson('pillars.json');
  for (const pillar of pillars) {
    await prisma.pillar.upsert({
      where: { id: pillar.id },
      update: {},
      create: {
        id: pillar.id,
        orgId: defaultOrgId,
        title: pillar.title,
        description: pillar.description,
        status: pillar.status as Status,
        ownerId: "user-strategy", // Default owner
      },
    });
  }

  // 4. Goals
  // Goals in JSON don't have ownerId, assigning to Pillar owner or Strategy Head
  const goals = readJson('goals.json');
  for (const goal of goals) {
    await prisma.goal.upsert({
      where: { id: goal.id },
      update: {},
      create: {
        id: goal.id,
        orgId: defaultOrgId,
        title: goal.title,
        description: goal.description,
        pillarId: goal.pillarId,
        status: goal.status as Status,
        ownerId: "user-strategy", // Default owner
      },
    });
  }

  // 5. Initiatives
  const initiatives = readJson('initiatives.json');
  for (const init of initiatives) {
    const ownerId = departmentOwnerMap[init.owner] || "user-strategy";
    await prisma.initiative.upsert({
      where: { id: init.id },
      update: {},
      create: {
        id: init.id,
        orgId: defaultOrgId,
        title: init.title,
        description: init.description,
        goalId: init.goalId,
        pillarId: goals.find((g: any) => g.id === init.goalId)?.pillarId || "pillar-1", // Fallback if lookup fails, though data should be consistent
        status: "ACTIVE", // JSON doesn't have status, default to ACTIVE
        ownerId: ownerId,
        startDate: new Date(), // Mock dates
        endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
      },
    });
  }

  // 6. Projects
  const projects = readJson('projects.json');
  for (const proj of projects) {
    const ownerId = departmentOwnerMap[proj.owner] || "user-strategy";
    await prisma.project.upsert({
      where: { id: proj.id },
      update: {},
      create: {
        id: proj.id,
        orgId: defaultOrgId,
        title: proj.title,
        description: proj.description,
        initiativeId: proj.initiativeId,
        status: proj.status as Status,
        ownerId: ownerId,
      },
    });
  }

  // 7. KPIs
  const kpis = readJson('kpis.json');
  for (const kpi of kpis) {
    const ownerId = departmentOwnerMap[kpi.owner] || "user-strategy";
    
    // Determine parent (Goal vs Initiative vs Project) - JSON only has goalId
    // But schema allows linking to others. We'll stick to goalId as per JSON.
    
    await prisma.kPI.upsert({
      where: { id: kpi.id },
      update: {},
      create: {
        id: kpi.id,
        orgId: defaultOrgId,
        name: kpi.name,
        target: kpi.target,
        unit: kpi.unit,
        frequency: kpi.frequency,
        goalId: kpi.goalId,
        ownerId: ownerId,
      },
    });
  }

  // 8. KPI Values
  const kpiValues = readJson('kpi_values.json');
  for (const val of kpiValues) {
    // No ID in JSON, generated one or use composite check?
    // Using create since we don't have stable IDs for values in seed
    // Clean up first to avoid dupes if running multiple times? 
    // Upsert isn't easy without unique ID. We'll skip if exists or just create.
    // Ideally we shouldn't duplicate. Let's check count.
    
    const count = await prisma.kPIValue.count({
      where: {
        kpiId: val.kpiId,
        measuredAt: new Date(val.measuredAt),
      }
    });

    if (count === 0) {
      await prisma.kPIValue.create({
        data: {
          kpiId: val.kpiId,
          measuredAt: new Date(val.measuredAt),
          value: val.value,
          note: val.note,
        }
      });
    }
  }

  // 9. Risks
  const risks = readJson('risks.json');
  for (const risk of risks) {
    const ownerId = departmentOwnerMap[risk.owner] || "user-strategy";
    await prisma.risk.upsert({
      where: { id: risk.id },
      update: {},
      create: {
        id: risk.id,
        orgId: defaultOrgId,
        title: risk.title,
        description: risk.description,
        severity: risk.severity as RiskSeverity,
        status: risk.status as Status,
        initiativeId: risk.initiativeId,
        ownerId: ownerId,
      },
    });
  }

  console.log('Seeding finished.');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
