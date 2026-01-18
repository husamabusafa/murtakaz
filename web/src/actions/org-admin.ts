"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { Role, KpiApprovalLevel } from "@/generated/prisma-client";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { ActionValidationIssue } from "@/types/actions";

async function requireOrgAdmin() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || session.user.role !== "ADMIN") {
    throw new Error("unauthorizedAdminRequired");
  }

  if (!session.user.orgId) {
    throw new Error("unauthorizedMissingOrg");
  }

  return session;
}

const managerEligibleRoles = [Role.MANAGER, Role.EXECUTIVE, Role.ADMIN] as const;

const optionalUserIdNullable = z.preprocess(
  (value) => {
    if (value === "" || value === "__none__" || value === undefined) return null;
    if (value === null) return null;
    return value;
  },
  z.string().min(1).nullable(),
);

function roleRank(role: Role) {
  if (role === Role.ADMIN) return 4;
  if (role === Role.EXECUTIVE) return 3;
  if (role === Role.MANAGER) return 1;
  return 0;
}

const createOrgUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.nativeEnum(Role),
  managerId: optionalUserIdNullable.optional(),
});

const updateOrgUserSchema = z.object({
  userId: z.string().min(1),
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  role: z.nativeEnum(Role).optional(),
  managerId: optionalUserIdNullable.optional(),
});

const deleteOrgUserSchema = z.object({
  userId: z.string().min(1),
});

function zodIssues(error: z.ZodError): ActionValidationIssue[] {
  return error.issues.map((i) => ({
    path: i.path.map((p) => (typeof p === "string" || typeof p === "number" ? p : String(p))),
    message: i.message,
  }));
}

export async function getOrgAdminUsers() {
  const session = await requireOrgAdmin();

  return prisma.user.findMany({
    where: {
      orgId: session.user.orgId,
      deletedAt: null,
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      managerId: true,
      createdAt: true,
      manager: {
        select: {
          id: true,
          name: true,
          role: true,
        },
      },
    },
  });
}

export async function getOrgAdminManagerOptions() {
  const session = await requireOrgAdmin();

  return prisma.user.findMany({
    where: {
      orgId: session.user.orgId,
      deletedAt: null,
      role: {
        in: managerEligibleRoles as unknown as Role[],
      },
    },
    orderBy: [{ role: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      role: true,
    },
  });
}

/**
 * Get organization settings for admin
 */
export async function getOrgAdminOrganizationSettings() {
  const session = await requireOrgAdmin();

  const org = await prisma.organization.findFirst({
    where: {
      id: session.user.orgId,
      deletedAt: null,
    },
    select: {
      id: true,
      name: true,
      nameAr: true,
      domain: true,
      logoUrl: true,
      mission: true,
      missionAr: true,
      vision: true,
      visionAr: true,
      about: true,
      aboutAr: true,
      kpiApprovalLevel: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const usersCount = await prisma.user.count({
    where: {
      orgId: session.user.orgId,
      deletedAt: null,
    },
  });

  const nodeTypeOptions: Array<{ id: string; code: string; displayName: string; nameAr: string | null; levelOrder: number }> = [];
  const enabledNodeTypes: Array<{ id: string; displayName: string }> = [];
  const enabledNodeTypeCounts: Array<{ nodeTypeId: string; displayName: string; count: number }> = [];

  return {
    org: org
      ? {
          ...org,
          _count: {
            users: usersCount,
            departments: 0,
            kpis: 0,
          },
        }
      : null,
    nodeTypeOptions,
    enabledNodeTypes,
    enabledNodeTypeCounts,
  };
}

const updateOrgSettingsSchema = z.object({
  name: z.string().min(1),
  nameAr: z.string().optional(),
  domain: z.string().optional(),
  logoUrl: z.string().optional(),
  mission: z.string().optional(),
  missionAr: z.string().optional(),
  vision: z.string().optional(),
  visionAr: z.string().optional(),
  about: z.string().optional(),
  aboutAr: z.string().optional(),
  kpiApprovalLevel: z.nativeEnum(KpiApprovalLevel),
});

/**
 * Update organization settings
 */
export async function updateOrgAdminOrganizationSettings(data: z.infer<typeof updateOrgSettingsSchema>) {
  const session = await requireOrgAdmin();
  const parsedResult = updateOrgSettingsSchema.safeParse(data);
  
  if (!parsedResult.success) {
    return {
      success: false as const,
      error: "validationFailed",
      issues: zodIssues(parsedResult.error),
    };
  }

  try {
    await prisma.organization.update({
      where: {
        id: session.user.orgId,
      },
      data: {
        name: parsedResult.data.name,
        nameAr: parsedResult.data.nameAr || null,
        domain: parsedResult.data.domain || null,
        logoUrl: parsedResult.data.logoUrl || null,
        mission: parsedResult.data.mission || null,
        missionAr: parsedResult.data.missionAr || null,
        vision: parsedResult.data.vision || null,
        visionAr: parsedResult.data.visionAr || null,
        about: parsedResult.data.about || null,
        aboutAr: parsedResult.data.aboutAr || null,
        kpiApprovalLevel: parsedResult.data.kpiApprovalLevel,
      },
    });

    return { success: true as const };
  } catch (error: unknown) {
    console.error("Failed to update organization", error);
    return { success: false as const, error: "failedToUpdate" };
  }
}

const updateNodeTypesSchema = z.object({
  nodeTypeIds: z.array(z.string()),
});

/**
 * Update enabled node types for organization
 */
export async function updateOrgAdminEnabledNodeTypes(data: z.infer<typeof updateNodeTypesSchema>) {
  await requireOrgAdmin();
  const parsedResult = updateNodeTypesSchema.safeParse(data);
  
  if (!parsedResult.success) {
    return {
      success: false as const,
      error: "validationFailed",
      issues: zodIssues(parsedResult.error),
    };
  }

  // For now, just return success as node types are handled elsewhere
  return { success: true as const };
}

type OrgAdminDepartmentRow = {
  id: string;
  name: string;
  nameAr: string | null;
  createdAt: string;
  _count: { users: number; managers: number };
  managers: Array<{ user: { id: string; name: string; role: string } | null }>;
};

export async function getOrgAdminDepartments(): Promise<OrgAdminDepartmentRow[]> {
  await requireOrgAdmin();
  return [];
}

const createOrgAdminDepartmentSchema = z.object({
  name: z.string().trim().min(1),
  nameAr: z.string().trim().optional(),
  managerIds: z.array(z.string().uuid()).optional(),
});

export async function createOrgAdminDepartment(data: z.infer<typeof createOrgAdminDepartmentSchema>) {
  await requireOrgAdmin();
  const parsed = createOrgAdminDepartmentSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false as const, error: "validationFailed", issues: zodIssues(parsed.error) };
  }

  return { success: false as const, error: "notImplemented" };
}

const updateOrgAdminDepartmentSchema = z.object({
  departmentId: z.string().uuid(),
  name: z.string().trim().min(1),
});

export async function updateOrgAdminDepartment(data: z.infer<typeof updateOrgAdminDepartmentSchema>) {
  await requireOrgAdmin();
  const parsed = updateOrgAdminDepartmentSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false as const, error: "validationFailed", issues: zodIssues(parsed.error) };
  }

  return { success: false as const, error: "notImplemented" };
}

const deleteOrgAdminDepartmentSchema = z.object({
  departmentId: z.string().uuid(),
});

export async function deleteOrgAdminDepartment(data: z.infer<typeof deleteOrgAdminDepartmentSchema>) {
  await requireOrgAdmin();
  const parsed = deleteOrgAdminDepartmentSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false as const, error: "validationFailed", issues: zodIssues(parsed.error) };
  }

  return { success: false as const, error: "notImplemented" };
}

function validateManagerAssignment(input: { userRole: Role; managerRole: Role | null }) {
  if (!input.managerRole) return;

  if (!managerEligibleRoles.includes(input.managerRole as (typeof managerEligibleRoles)[number])) {
    throw new Error("managerEligibleRolesError");
  }

  if (input.userRole === Role.ADMIN) {
    throw new Error("adminCannotHaveManager");
  }

  if (roleRank(input.managerRole) < roleRank(input.userRole)) {
    throw new Error("managerHigherPosition");
  }
}

export async function createOrgAdminUser(data: z.infer<typeof createOrgUserSchema>) {
  const session = await requireOrgAdmin();
  const parsedResult = createOrgUserSchema.safeParse(data);
  if (!parsedResult.success) {
    return {
      success: false,
      error: "validationFailed",
      issues: zodIssues(parsedResult.error),
    };
  }

  const parsed = parsedResult.data;

  if (parsed.role === ("SUPER_ADMIN" as unknown as Role)) {
    return { success: false, error: "cannotCreateSuperAdmin" };
  }

  let managerRole: Role | null = null;
  if (parsed.managerId) {
    const manager = await prisma.user.findFirst({
      where: {
        id: parsed.managerId,
        orgId: session.user.orgId,
        deletedAt: null,
      },
      select: { role: true },
    });
    if (!manager) return { success: false, error: "ownerNotFound" };
    managerRole = manager.role;
  }

  try {
    validateManagerAssignment({ userRole: parsed.role, managerRole });

    const result = await auth.api.signUpEmail({
      body: {
        email: parsed.email,
        password: parsed.password,
        name: parsed.name,
        role: parsed.role,
        orgId: session.user.orgId,
      },
    });

    if (!result?.user?.id) {
      return { success: false, error: "Failed to create user." };
    }

    await prisma.user.update({
      where: { id: result.user.id },
      data: {
        managerId: parsed.managerId ?? null,
      },
      select: { id: true },
    });

    return { success: true, userId: result.user.id };
  } catch (error: unknown) {
    console.error("Failed to create org user:", error);
    const message = error instanceof Error ? error.message : "Failed to create user";
    return { success: false, error: message };
  }
}

export async function updateOrgAdminUser(data: z.infer<typeof updateOrgUserSchema>) {
  const session = await requireOrgAdmin();
  const parsedResult = updateOrgUserSchema.safeParse(data);
  if (!parsedResult.success) {
    return {
      success: false,
      error: "validationFailed",
      issues: zodIssues(parsedResult.error),
    };
  }

  const parsed = parsedResult.data;

  const existing = await prisma.user.findFirst({
    where: {
      id: parsed.userId,
      orgId: session.user.orgId,
      deletedAt: null,
    },
    select: {
      id: true,
      role: true,
    },
  });

  if (!existing) {
    return { success: false, error: "userNotFound" };
  }

  const nextRole = parsed.role ?? existing.role;

  if (nextRole === ("SUPER_ADMIN" as unknown as Role)) {
    return { success: false, error: "cannotAssignSuperAdmin" };
  }

  let managerRole: Role | null = null;
  if (parsed.managerId) {
    const manager = await prisma.user.findFirst({
      where: {
        id: parsed.managerId,
        orgId: session.user.orgId,
        deletedAt: null,
      },
      select: { role: true },
    });
    if (!manager) return { success: false, error: "ownerNotFound" };
    managerRole = manager.role;
  }

  try {
    validateManagerAssignment({ userRole: nextRole, managerRole });

    const user = await prisma.user.update({
      where: { id: parsed.userId },
      data: {
        ...(typeof parsed.name === "string" ? { name: parsed.name } : {}),
        ...(typeof parsed.email === "string" ? { email: parsed.email } : {}),
        ...(typeof parsed.role !== "undefined" ? { role: parsed.role } : {}),
        ...(typeof parsed.managerId !== "undefined" ? { managerId: parsed.managerId } : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        managerId: true,
        createdAt: true,
        manager: { select: { id: true, name: true, role: true } },
      },
    });

    return { success: true, user };
  } catch (error: unknown) {
    console.error("Failed to update org user:", error);
    const message = error instanceof Error ? error.message : "Failed to update user";
    return { success: false, error: message };
  }
}

export async function deleteOrgAdminUser(data: z.infer<typeof deleteOrgUserSchema>) {
  const session = await requireOrgAdmin();
  const parsedResult = deleteOrgUserSchema.safeParse(data);
  if (!parsedResult.success) {
    return {
      success: false,
      error: "validationFailed",
      issues: zodIssues(parsedResult.error),
    };
  }

  const parsed = parsedResult.data;

  try {
    const target = await prisma.user.findFirst({
      where: {
        id: parsed.userId,
        orgId: session.user.orgId,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!target) return { success: false, error: "userNotFound" };

    await prisma.user.update({
      where: { id: parsed.userId },
      data: { deletedAt: new Date() },
      select: { id: true },
    });

    return { success: true };
  } catch (error: unknown) {
    console.error("Failed to delete org user:", error);
    const message = error instanceof Error ? error.message : "Failed to delete user";
    return { success: false, error: message };
  }
}
