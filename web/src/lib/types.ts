export type Health = "GREEN" | "AMBER" | "RED";
export type Status = "PLANNED" | "ACTIVE" | "AT_RISK" | "COMPLETED";

export interface KPI {
  id: string;
  name: string;
  nameAr?: string;
  description?: string;
  descriptionAr?: string;
  target: number;
  unit: string;
  current: number;
  variance: number;
  frequency: string;
  owner: string;
  freshnessDays: number;
  lineage: {
    pillar?: string;
    pillarAr?: string;
    initiative?: string;
    initiativeAr?: string;
    project?: string;
    projectAr?: string;
  };
}

export interface Pillar {
  id: string;
  title: string;
  titleAr?: string;
  owner: string;
  status: Status;
  health: Health;
  goals: string[];
  goalsAr?: string[];
  initiatives: Initiative[];
}

export interface Initiative {
  id: string;
  title: string;
  titleAr?: string;
  owner: string;
  status: Status;
  health: Health;
  start?: string;
  end?: string;
  projects: Project[];
  kpis: KPI[];
  risks: Risk[];
}

export interface Project {
  id: string;
  title: string;
  titleAr?: string;
  description?: string;
  descriptionAr?: string;
  owner: string;
  status: Status;
  health: Health;
  milestonesComplete: number;
  milestonesTotal: number;
  dependencies?: string[];
  tags?: string[];
}

export interface Risk {
  id: string;
  title: string;
  titleAr?: string;
  description?: string;
  descriptionAr?: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  owner: string;
  status: Status;
  escalated?: boolean;
  context: {
    pillar?: string;
    pillarAr?: string;
    initiative?: string;
    initiativeAr?: string;
    project?: string;
    projectAr?: string;
  };
}

export interface ChangeRequest {
  id: string;
  entityType: string;
  entityName: string;
  requestedBy: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  ageDays: number;
}
