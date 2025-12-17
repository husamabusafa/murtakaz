import type { ChangeRequest, Health, Initiative, KPI, Pillar, Project, Risk, Status } from "@/lib/types";
import seedPillars from "@/content/seed/pillars.json";
import seedGoals from "@/content/seed/goals.json";
import seedInitiatives from "@/content/seed/initiatives.json";
import seedProjects from "@/content/seed/projects.json";
import seedKpis from "@/content/seed/kpis.json";
import seedKpiValues from "@/content/seed/kpi_values.json";
import seedRisks from "@/content/seed/risks.json";
import { changeRequests as baseChangeRequests } from "@/lib/mock-change-requests";

type SeedPillar = (typeof seedPillars)[number];
type SeedGoal = (typeof seedGoals)[number];
type SeedProject = (typeof seedProjects)[number];
type SeedKpi = (typeof seedKpis)[number];
type SeedKpiValue = (typeof seedKpiValues)[number];
type SeedRisk = (typeof seedRisks)[number];

function toHealthFromRiskSeverity(severity?: SeedRisk["severity"]): Health {
  if (severity === "CRITICAL") return "RED";
  if (severity === "HIGH") return "AMBER";
  if (severity === "MEDIUM") return "AMBER";
  return "GREEN";
}

function maxHealth(healths: Health[]): Health {
  if (healths.includes("RED")) return "RED";
  if (healths.includes("AMBER")) return "AMBER";
  return "GREEN";
}

function normalizeStatus(input: string | undefined): Status {
  if (input === "ACTIVE" || input === "PLANNED" || input === "AT_RISK" || input === "COMPLETED") return input;
  return "ACTIVE";
}

function pillarOwnerFor(pillar: SeedPillar): string {
  const key = pillar.id;
  if (key === "pillar-1") return "Strategy & Excellence";
  if (key === "pillar-2") return "Marketing & Corp Comm";
  if (key === "pillar-3") return "Finance";
  if (key === "pillar-4") return "Investment";
  return "Strategy Office";
}

function projectMilestonesFor(status: Status) {
  if (status === "COMPLETED") return { milestonesTotal: 6, milestonesComplete: 6 };
  if (status === "PLANNED") return { milestonesTotal: 6, milestonesComplete: 0 };
  if (status === "AT_RISK") return { milestonesTotal: 6, milestonesComplete: 1 };
  return { milestonesTotal: 6, milestonesComplete: 2 };
}

function kpiUnitShort(unit: string): string {
  if (unit.toLowerCase().includes("sar")) return " SAR";
  if (unit.toLowerCase().includes("percentage")) return "%";
  if (unit.toLowerCase().includes("count")) return "";
  if (unit.toLowerCase().includes("score")) return "";
  return "";
}

function latestKpiValue(kpiId: string): SeedKpiValue | null {
  const values = seedKpiValues.filter((v) => v.kpiId === kpiId);
  if (values.length === 0) return null;
  return values
    .slice()
    .sort((a, b) => new Date(a.measuredAt).getTime() - new Date(b.measuredAt).getTime())
    .at(-1) as SeedKpiValue;
}

export function buildSeedModel(): {
  pillars: Pillar[];
  kpis: KPI[];
  changeRequests: ChangeRequest[];
  summaryStats: { pillars: number; initiatives: number; projects: number; kpis: number; risks: number };
} {
  const goalById = new Map<string, SeedGoal>(seedGoals.map((g) => [g.id, g]));
  void goalById;

  const projectsByInitiative = new Map<string, SeedProject[]>();
  for (const proj of seedProjects) {
    const list = projectsByInitiative.get(proj.initiativeId) ?? [];
    list.push(proj);
    projectsByInitiative.set(proj.initiativeId, list);
  }

  const risksByInitiative = new Map<string, SeedRisk[]>();
  for (const risk of seedRisks) {
    const list = risksByInitiative.get(risk.initiativeId) ?? [];
    list.push(risk);
    risksByInitiative.set(risk.initiativeId, list);
  }

  const kpisByGoal = new Map<string, SeedKpi[]>();
  for (const kpi of seedKpis) {
    const list = kpisByGoal.get(kpi.goalId) ?? [];
    list.push(kpi);
    kpisByGoal.set(kpi.goalId, list);
  }

  const pillars: Pillar[] = seedPillars.map((pillar) => {
    const goals = seedGoals.filter((g) => g.pillarId === pillar.id);
    const initiativesSeed = goals.flatMap((goal) => seedInitiatives.filter((i) => i.goalId === goal.id));

    const initiatives: Initiative[] = initiativesSeed.map((seedInit) => {
      const goal = goalById.get(seedInit.goalId);
      const projectsSeed = projectsByInitiative.get(seedInit.id) ?? [];
      const risksSeed = risksByInitiative.get(seedInit.id) ?? [];
      const initStatus: Status = "ACTIVE";
      const initHealth = maxHealth(risksSeed.map((r) => toHealthFromRiskSeverity(r.severity)));

      const projects: Project[] = projectsSeed.map((p) => {
        const status = normalizeStatus(p.status);
        const milestones = projectMilestonesFor(status);
        const health = initHealth === "RED" ? "AMBER" : initHealth;
        return {
          id: p.id,
          title: p.title,
          titleAr: p.titleAr,
          description: p.description,
          descriptionAr: p.descriptionAr,
          owner: p.owner,
          status,
          health,
          milestonesComplete: milestones.milestonesComplete,
          milestonesTotal: milestones.milestonesTotal,
          dependencies: [],
          tags: [p.owner],
        };
      });

      const risks: Risk[] = risksSeed.map((r) => ({
        id: r.id,
        title: r.title,
        titleAr: r.titleAr,
        description: r.description,
        descriptionAr: r.descriptionAr,
        severity: r.severity as Risk["severity"],
        owner: r.owner,
        status: normalizeStatus(r.status),
        escalated: r.severity === "HIGH" || r.severity === "CRITICAL",
        context: {
          pillar: pillar.title,
          pillarAr: pillar.titleAr,
          initiative: seedInit.title,
          initiativeAr: seedInit.titleAr,
        },
      }));

      const goalKpis = goal ? kpisByGoal.get(goal.id) ?? [] : [];
      const kpis: KPI[] = goalKpis.map((kpiSeed) => {
        const latest = latestKpiValue(kpiSeed.id);
        const current = latest?.value ?? 0;
        const unitSuffix = kpiUnitShort(kpiSeed.unit);
        const target = kpiSeed.target ?? 0;
        return {
          id: kpiSeed.id,
          name: kpiSeed.name,
          nameAr: kpiSeed.nameAr,
          description: goal?.description ?? "",
          descriptionAr: goal?.descriptionAr ?? "",
          target,
          unit: unitSuffix,
          current,
          variance: Number((current - target).toFixed(2)),
          frequency: kpiSeed.frequency,
          owner: kpiSeed.owner,
          freshnessDays: latest ? 3 : 12,
          lineage: {
            pillar: pillar.title,
            pillarAr: pillar.titleAr,
            initiative: seedInit.title,
            initiativeAr: seedInit.titleAr,
            project: projects.at(0)?.title,
            projectAr: projects.at(0)?.titleAr,
          },
        };
      });

      return {
        id: seedInit.id,
        title: seedInit.title,
        titleAr: seedInit.titleAr,
        owner: seedInit.owner,
        status: initStatus,
        health: initHealth,
        start: seedInit.duration,
        end: seedInit.budget,
        projects,
        kpis,
        risks,
      };
    });

    const health = maxHealth(initiatives.map((i) => i.health));

    return {
      id: pillar.id,
      title: pillar.title,
      titleAr: pillar.titleAr,
      owner: pillarOwnerFor(pillar),
      status: normalizeStatus(pillar.status),
      health,
      goals: seedGoals.filter((g) => g.pillarId === pillar.id).map((g) => g.title),
      goalsAr: seedGoals.filter((g) => g.pillarId === pillar.id).map((g) => g.titleAr),
      initiatives,
    };
  });

  const kpis: KPI[] = pillars.flatMap((p) => p.initiatives.flatMap((i) => i.kpis));
  const risks: Risk[] = pillars.flatMap((p) => p.initiatives.flatMap((i) => i.risks));
  const projects: Project[] = pillars.flatMap((p) => p.initiatives.flatMap((i) => i.projects));

  return {
    pillars,
    kpis,
    changeRequests: baseChangeRequests,
    summaryStats: {
      pillars: pillars.length,
      initiatives: pillars.flatMap((p) => p.initiatives).length,
      projects: projects.length,
      kpis: kpis.length,
      risks: risks.length,
    },
  };
}
