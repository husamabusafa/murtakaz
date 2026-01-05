"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export type ActionValidationIssue = {
  path: (string | number)[];
  message: string;
};

async function requireOrgAdmin() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized: Organization admin access required");
  }

  if (!session.user.orgId) {
    throw new Error("Unauthorized: Missing organization scope");
  }

  return session;
}

const managerEligibleRoles = [Role.MANAGER, Role.PMO, Role.EXECUTIVE, Role.ADMIN] as const;

const optionalUserIdNullable = z.preprocess(
  (value) => {
    if (value === "" || value === "__none__" || value === undefined) return null;
    if (value === null) return null;
    return value;
  },
  z.string().min(1).nullable(),
);

const optionalUuidNullable = z.preprocess(
  (value) => {
    if (value === "" || value === "__none__" || value === undefined) return null;
    if (value === null) return null;
    return value;
  },
  z.string().uuid().nullable(),
);

function roleRank(role: Role) {
  if (role === Role.ADMIN) return 4;
  if (role === Role.EXECUTIVE) return 3;
  if (role === Role.PMO) return 2;
  if (role === Role.MANAGER) return 1;
  return 0;
}

const createOrgUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.nativeEnum(Role),
  managerId: optionalUserIdNullable.optional(),
  departmentId: optionalUuidNullable.optional(),
});

const updateOrgUserSchema = z.object({
  userId: z.string().min(1),
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  role: z.nativeEnum(Role).optional(),
  managerId: optionalUserIdNullable.optional(),
  departmentId: optionalUuidNullable.optional(),
});

const deleteOrgUserSchema = z.object({
  userId: z.string().min(1),
});

const createOrgDepartmentSchema = z.object({
  name: z.string().min(2),
});

const updateOrgDepartmentSchema = z.object({
  departmentId: z.string().uuid(),
  name: z.string().min(2),
});

const deleteOrgDepartmentSchema = z.object({
  departmentId: z.string().uuid(),
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
      departmentId: true,
      createdAt: true,
      manager: {
        select: {
          id: true,
          name: true,
          role: true,
        },
      },
      department: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });
}

export async function createOrgAdminDepartment(data: z.infer<typeof createOrgDepartmentSchema>) {
  const session = await requireOrgAdmin();
  const parsedResult = createOrgDepartmentSchema.safeParse(data);
  if (!parsedResult.success) {
    return {
      success: false,
      error: "Validation failed",
      issues: zodIssues(parsedResult.error),
    };
  }

  const parsed = parsedResult.data;

  try {
    const department = await prisma.department.create({
      data: {
        orgId: session.user.orgId,
        name: parsed.name,
      },
      select: {
        id: true,
        name: true,
        createdAt: true,
      },
    });

    return { success: true, department };
  } catch (error: unknown) {
    console.error("Failed to create department:", error);
    const message = error instanceof Error ? error.message : "Failed to create department";
    return { success: false, error: message };
  }
}

export async function updateOrgAdminDepartment(data: z.infer<typeof updateOrgDepartmentSchema>) {
  const session = await requireOrgAdmin();
  const parsedResult = updateOrgDepartmentSchema.safeParse(data);
  if (!parsedResult.success) {
    return {
      success: false,
      error: "Validation failed",
      issues: zodIssues(parsedResult.error),
    };
  }

  const parsed = parsedResult.data;

  try {
    const existing = await prisma.department.findFirst({
      where: {
        id: parsed.departmentId,
        orgId: session.user.orgId,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!existing) return { success: false, error: "Department not found." };

    const department = await prisma.department.update({
      where: { id: parsed.departmentId },
      data: { name: parsed.name },
      select: { id: true, name: true, createdAt: true },
    });

    return { success: true, department };
  } catch (error: unknown) {
    console.error("Failed to update department:", error);
    const message = error instanceof Error ? error.message : "Failed to update department";
    return { success: false, error: message };
  }
}

export async function deleteOrgAdminDepartment(data: z.infer<typeof deleteOrgDepartmentSchema>) {
  const session = await requireOrgAdmin();
  const parsedResult = deleteOrgDepartmentSchema.safeParse(data);
  if (!parsedResult.success) {
    return {
      success: false,
      error: "Validation failed",
      issues: zodIssues(parsedResult.error),
    };
  }

  const parsed = parsedResult.data;

  try {
    const existing = await prisma.department.findFirst({
      where: {
        id: parsed.departmentId,
        orgId: session.user.orgId,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!existing) return { success: false, error: "Department not found." };

    await prisma.department.update({
      where: { id: parsed.departmentId },
      data: { deletedAt: new Date() },
      select: { id: true },
    });

    return { success: true };
  } catch (error: unknown) {
    console.error("Failed to delete department:", error);
    const message = error instanceof Error ? error.message : "Failed to delete department";
    return { success: false, error: message };
  }
}

export async function getOrgAdminDepartments() {
  const session = await requireOrgAdmin();

  return prisma.department.findMany({
    where: {
      orgId: session.user.orgId,
      deletedAt: null,
    },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      createdAt: true,
      _count: {
        select: {
          users: true,
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

function validateManagerAssignment(input: { userRole: Role; managerRole: Role | null }) {
  if (!input.managerRole) return;

  if (!managerEligibleRoles.includes(input.managerRole as (typeof managerEligibleRoles)[number])) {
    throw new Error("Manager must be MANAGER, PMO, EXECUTIVE, or ADMIN.");
  }

  if (input.userRole === Role.ADMIN) {
    throw new Error("ADMIN users cannot have a manager.");
  }

  if (roleRank(input.managerRole) < roleRank(input.userRole)) {
    throw new Error("Manager must be in a higher or equal position than the user.");
  }
}

export async function createOrgAdminUser(data: z.infer<typeof createOrgUserSchema>) {
  const session = await requireOrgAdmin();
  const parsedResult = createOrgUserSchema.safeParse(data);
  if (!parsedResult.success) {
    return {
      success: false,
      error: "Validation failed",
      issues: zodIssues(parsedResult.error),
    };
  }

  const parsed = parsedResult.data;

  if (parsed.role === ("SUPER_ADMIN" as unknown as Role)) {
    return { success: false, error: "Cannot create SUPER_ADMIN users inside an organization." };
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
    if (!manager) return { success: false, error: "Selected manager was not found." };
    managerRole = manager.role;
  }

  try {
    validateManagerAssignment({ userRole: parsed.role, managerRole });

    if (parsed.departmentId) {
      const department = await prisma.department.findFirst({
        where: {
          id: parsed.departmentId,
          orgId: session.user.orgId,
          deletedAt: null,
        },
        select: { id: true },
      });
      if (!department) return { success: false, error: "Selected department was not found." };
    }

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
        departmentId: parsed.departmentId ?? null,
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
      error: "Validation failed",
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
    return { success: false, error: "User not found." };
  }

  const nextRole = parsed.role ?? existing.role;

  if (nextRole === ("SUPER_ADMIN" as unknown as Role)) {
    return { success: false, error: "Cannot assign SUPER_ADMIN role." };
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
    if (!manager) return { success: false, error: "Selected manager was not found." };
    managerRole = manager.role;
  }

  try {
    validateManagerAssignment({ userRole: nextRole, managerRole });

    if (parsed.departmentId) {
      const department = await prisma.department.findFirst({
        where: {
          id: parsed.departmentId,
          orgId: session.user.orgId,
          deletedAt: null,
        },
        select: { id: true },
      });
      if (!department) return { success: false, error: "Selected department was not found." };
    }

    const user = await prisma.user.update({
      where: { id: parsed.userId },
      data: {
        ...(typeof parsed.name === "string" ? { name: parsed.name } : {}),
        ...(typeof parsed.email === "string" ? { email: parsed.email } : {}),
        ...(typeof parsed.role !== "undefined" ? { role: parsed.role } : {}),
        ...(typeof parsed.managerId !== "undefined" ? { managerId: parsed.managerId } : {}),
        ...(typeof parsed.departmentId !== "undefined" ? { departmentId: parsed.departmentId } : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        managerId: true,
        departmentId: true,
        createdAt: true,
        manager: { select: { id: true, name: true, role: true } },
        department: { select: { id: true, name: true } },
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
      error: "Validation failed",
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

    if (!target) return { success: false, error: "User not found." };

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
