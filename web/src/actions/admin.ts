"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { z } from "zod";
import { Role } from "@prisma/client";

type NodeTypeRow = {
  id: string;
  code: string;
  displayName: string;
  levelOrder: number;
  canHaveKpis: boolean;
};

const prismaOrganization = (prisma as unknown as { organization: unknown }).organization as {
  create: <T>(args: unknown) => Promise<T>;
  update: <T>(args: unknown) => Promise<T>;
  findFirst: <T>(args: unknown) => Promise<T | null>;
  findMany: <T>(args: unknown) => Promise<T[]>;
  delete: (args: unknown) => Promise<unknown>;
  count: (args: unknown) => Promise<number>;
};

type PrismaWithNodeTypes = typeof prisma & {
  nodeType: {
    findMany: (args: {
      orderBy: Array<Record<string, "asc" | "desc">>;
      select: Record<keyof NodeTypeRow, true>;
    }) => Promise<NodeTypeRow[]>;
  };
  organizationNodeType: {
    createMany: (args: {
      data: Array<{ orgId: string; nodeTypeId: string }>;
      skipDuplicates?: boolean;
    }) => Promise<unknown>;
    deleteMany: (args: { where: { orgId: string } }) => Promise<unknown>;
  };
};

const prismaWithNodeTypes = prisma as unknown as PrismaWithNodeTypes;

const kpiApprovalLevelSchema = z.enum(["MANAGER", "PMO", "EXECUTIVE", "ADMIN"]);

// Schema for creating an organization
const createOrgSchema = z.object({
  name: z.string().min(2),
  domain: z.string().optional(),
  kpiApprovalLevel: kpiApprovalLevelSchema.optional(),
});

// Schema for creating a user
const createUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.nativeEnum(Role),
  orgId: z.string().uuid(),
});

const orgIdSchema = z.string().uuid();
const userIdSchema = z.string().min(1);

const createOrgUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.nativeEnum(Role),
});

const createOrgWithUsersSchema = createOrgSchema.extend({
  nodeTypeIds: z.array(z.string().uuid()).min(1),
  users: z.array(createOrgUserSchema).min(1),
});

const updateOrgSchema = z.object({
  orgId: z.string().uuid(),
  name: z.string().min(2).optional(),
  domain: z.string().optional(),
  kpiApprovalLevel: kpiApprovalLevelSchema.optional(),
});

const updateUserSchema = z.object({
  userId: z.string().min(1),
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  role: z.nativeEnum(Role).optional(),
  orgId: z.string().uuid().optional(),
});

const deleteOrgSchema = z.object({
  orgId: z.string().uuid(),
});

const deleteUserSchema = z.object({
  userId: z.string().min(1),
});

const updateOrgNodeTypesSchema = z.object({
  orgId: z.string().uuid(),
  nodeTypeIds: z.array(z.string().uuid()).min(1),
});

export type ActionValidationIssue = {
  path: Array<string | number>;
  message: string;
};

// Helper to check if current user is SUPER_ADMIN
async function requireSuperAdmin() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || session.user.role !== "SUPER_ADMIN") {
    throw new Error("Unauthorized: Super Admin access required");
  }
  return session;
}

export async function updateOrganizationNodeTypes(data: z.infer<typeof updateOrgNodeTypesSchema>) {
  await requireSuperAdmin();

  if (!prismaWithNodeTypes.organizationNodeType) {
    return {
      success: false,
      error: "Prisma client is outdated. Run `npx prisma generate` and restart the dev server.",
    };
  }

  const parsed = updateOrgNodeTypesSchema.parse(data);

  try {
    await prismaWithNodeTypes.organizationNodeType.deleteMany({ where: { orgId: parsed.orgId } });

    await prismaWithNodeTypes.organizationNodeType.createMany({
      data: parsed.nodeTypeIds.map((nodeTypeId) => ({
        orgId: parsed.orgId,
        nodeTypeId,
      })),
      skipDuplicates: true,
    });

    return { success: true };
  } catch (error: unknown) {
    console.error("Failed to update organization node types:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to update organization node types";
    return { success: false, error: errorMessage };
  }
}

export async function updateUser(data: z.infer<typeof updateUserSchema>) {
  await requireSuperAdmin();
  const parsed = updateUserSchema.parse(data);

  if (parsed.role === ("SUPER_ADMIN" as unknown as Role)) {
    return { success: false, error: "Cannot assign SUPER_ADMIN role." };
  }

  try {
    const user = await prisma.user.update({
      where: { id: parsed.userId },
      data: {
        ...(typeof parsed.name === "string" ? { name: parsed.name } : {}),
        ...(typeof parsed.email === "string" ? { email: parsed.email } : {}),
        ...(typeof parsed.role !== "undefined" ? { role: parsed.role } : {}),
        ...(typeof parsed.orgId === "string" ? { orgId: parsed.orgId } : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        org: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return { success: true, user };
  } catch (error: unknown) {
    console.error("Failed to update user:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to update user";
    return { success: false, error: errorMessage };
  }
}

export async function deleteUser(data: z.infer<typeof deleteUserSchema>) {
  await requireSuperAdmin();
  const parsed = deleteUserSchema.parse(data);

  try {
    await prisma.user.update({
      where: { id: parsed.userId },
      data: { deletedAt: new Date() },
    });
    return { success: true };
  } catch (error: unknown) {
    console.error("Failed to delete user:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to delete user";
    return { success: false, error: errorMessage };
  }
}

export async function createOrganization(data: z.infer<typeof createOrgSchema>) {
  await requireSuperAdmin();
  
  const parsed = createOrgSchema.parse(data);
  
  try {
    const org = await prismaOrganization.create<{ id: string }>({
      data: {
        name: parsed.name,
        domain: parsed.domain || null,
        ...(typeof parsed.kpiApprovalLevel !== "undefined" ? { kpiApprovalLevel: parsed.kpiApprovalLevel } : {}),
      },
      select: { id: true },
    });
    return { success: true, org };
  } catch (error) {
    console.error("Failed to create organization:", error);
    return { success: false, error: "Failed to create organization" };
  }
}

export async function getOrganizations() {
  await requireSuperAdmin();
  const orgs = await prismaOrganization.findMany<{
    id: string;
    name: string;
    domain: string | null;
    createdAt: Date;
    _count?: { users: number };
  }>({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { users: true },
      },
    },
  });
  return orgs;
}

export async function updateOrganization(data: z.infer<typeof updateOrgSchema>) {
  await requireSuperAdmin();
  const parsed = updateOrgSchema.parse(data);

  try {
    const org = await prismaOrganization.update<{
      id: string;
      name: string;
      domain: string | null;
      kpiApprovalLevel: unknown;
      createdAt: Date;
      updatedAt: Date;
      deletedAt: Date | null;
      _count: { users: number };
      users: Array<{ id: string; name: string; email: string; role: Role; createdAt: Date }>;
    }>({
      where: { id: parsed.orgId },
      data: {
        ...(typeof parsed.name === "string" ? { name: parsed.name } : {}),
        ...(typeof parsed.domain === "string" ? { domain: parsed.domain || null } : {}),
        ...(typeof parsed.kpiApprovalLevel !== "undefined" ? { kpiApprovalLevel: parsed.kpiApprovalLevel } : {}),
      },
      select: {
        id: true,
        name: true,
        domain: true,
        kpiApprovalLevel: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
        _count: { select: { users: true } },
        users: {
          where: { deletedAt: null },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            createdAt: true,
          },
        },
      },
    });

    return { success: true, org };
  } catch (error: unknown) {
    console.error("Failed to update organization:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to update organization";
    return { success: false, error: errorMessage };
  }
}

export async function deleteOrganization(data: z.infer<typeof deleteOrgSchema>) {
  await requireSuperAdmin();
  const parsed = deleteOrgSchema.parse(data);

  try {
    const now = new Date();
    await prisma.$transaction([
      prisma.user.updateMany({
        where: { orgId: parsed.orgId, deletedAt: null },
        data: { deletedAt: now },
      }),
      prisma.organization.update({
        where: { id: parsed.orgId },
        data: { deletedAt: now },
      }),
    ]);

    return { success: true };
  } catch (error: unknown) {
    console.error("Failed to delete organization:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to delete organization";
    return { success: false, error: errorMessage };
  }
}

export async function getNodeTypes() {
  await requireSuperAdmin();
  if (!prismaWithNodeTypes.nodeType) {
    throw new Error("Prisma client is outdated. Run `npx prisma generate` and restart the dev server.");
  }
  return prismaWithNodeTypes.nodeType.findMany({
    orderBy: [{ levelOrder: "asc" }, { code: "asc" }],
    select: {
      id: true,
      code: true,
      displayName: true,
      levelOrder: true,
      canHaveKpis: true,
    },
  });
}

export async function createOrganizationWithUsers(data: z.infer<typeof createOrgWithUsersSchema>) {
  await requireSuperAdmin();

  if (!prismaWithNodeTypes.organizationNodeType) {
    return {
      success: false,
      error: "Prisma client is outdated. Run `npx prisma generate` and restart the dev server.",
      issues: [{ path: ["nodeTypeIds"], message: "Server is not ready (Prisma client not regenerated)." } satisfies ActionValidationIssue],
    };
  }

  const parsedResult = createOrgWithUsersSchema.safeParse(data);
  if (!parsedResult.success) {
    return {
      success: false,
      error: "Validation failed",
      issues: parsedResult.error.issues.map((i) => ({
        path: i.path.map((p) => (typeof p === "string" || typeof p === "number" ? p : String(p))),
        message: i.message,
      } satisfies ActionValidationIssue)),
    };
  }

  const parsed = parsedResult.data;

  const hasAdmin = parsed.users.some((u) => u.role === Role.ADMIN);
  if (!hasAdmin) {
    return {
      success: false,
      error: "At least one ADMIN user is required.",
      issues: [{ path: ["users"], message: "At least one ADMIN user is required." } satisfies ActionValidationIssue],
    };
  }

  const hasSuperAdmin = parsed.users.some((u) => u.role === ("SUPER_ADMIN" as unknown as Role));
  if (hasSuperAdmin) {
    return {
      success: false,
      error: "SUPER_ADMIN users cannot be created inside an organization.",
      issues: [{ path: ["users"], message: "SUPER_ADMIN users cannot be created inside an organization." } satisfies ActionValidationIssue],
    };
  }

  const emails = parsed.users.map((u) => u.email.trim().toLowerCase());
  const uniqueEmails = new Set(emails);
  if (uniqueEmails.size !== emails.length) {
    return {
      success: false,
      error: "Duplicate emails detected in the users list.",
      issues: [{ path: ["users"], message: "Duplicate emails detected in the users list." } satisfies ActionValidationIssue],
    };
  }

  let orgId: string | null = null;
  try {
    const org = await prisma.organization.create({
      data: {
        name: parsed.name,
        domain: parsed.domain || null,
        ...(typeof parsed.kpiApprovalLevel !== "undefined" ? { kpiApprovalLevel: parsed.kpiApprovalLevel } : {}),
      },
      select: { id: true },
    });
    orgId = org.id;

    await prismaWithNodeTypes.organizationNodeType.createMany({
      data: parsed.nodeTypeIds.map((nodeTypeId) => ({
        orgId: org.id,
        nodeTypeId,
      })),
      skipDuplicates: true,
    });

    for (const user of parsed.users) {
      const result = await auth.api.signUpEmail({
        body: {
          email: user.email,
          password: user.password,
          name: user.name,
          role: user.role,
          orgId: org.id,
        },
      });

      if (!result?.user?.id) {
        throw new Error("Failed to create user");
      }
    }

    return { success: true, orgId: org.id };
  } catch (error: unknown) {
    console.error("Failed to create organization with users:", error);

    if (orgId) {
      try {
        await prismaOrganization.delete({ where: { id: orgId } });
      } catch (cleanupError) {
        console.error("Failed to rollback organization creation:", cleanupError);
      }
    }

    const errorMessage = error instanceof Error ? error.message : "Failed to create organization";
    return { success: false, error: errorMessage };
  }
}

export async function createUser(data: z.infer<typeof createUserSchema>) {
  await requireSuperAdmin();
  
  const parsed = createUserSchema.parse(data);

  try {
    // Create a credential account with hashed password via Better Auth.
    // We have `emailAndPassword.autoSignIn = false` configured, so this won't sign-in the new user.
    const result = await auth.api.signUpEmail({
      body: {
        email: parsed.email,
        password: parsed.password,
        name: parsed.name,
        role: parsed.role,
        orgId: parsed.orgId,
      },
    });

    return { success: true, user: result.user };

  } catch (error: unknown) {
    console.error("Failed to create user:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to create user";
    return { success: false, error: errorMessage };
  }
}

export async function getUsers() {
  await requireSuperAdmin();
  const users = await prisma.user.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
    include: {
      org: true,
    },
  });
  return users;
}

export async function getSuperAdminOverviewStats() {
  await requireSuperAdmin();

  const [organizations, users] = await Promise.all([
    prismaOrganization.count({ where: { deletedAt: null } }),
    prisma.user.count({ where: { deletedAt: null } }),
  ]);

  return { organizations, users };
}

export async function getOrganizationDetails(orgId: string) {
  await requireSuperAdmin();
  const parsedOrgId = orgIdSchema.parse(orgId);

  const org = await prismaOrganization.findFirst<{
    id: string;
    name: string;
    domain: string | null;
    kpiApprovalLevel: unknown;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
    _count: { users: number };
    nodeTypes: Array<{
      id: string;
      nodeTypeId: string;
      nodeType: { id: string; code: string; displayName: string; levelOrder: number; canHaveKpis: boolean };
    }>;
    users: Array<{ id: string; name: string; email: string; role: Role; createdAt: Date }>;
  }>({
    where: {
      id: parsedOrgId,
      deletedAt: null,
    },
    select: {
      id: true,
      name: true,
      domain: true,
      kpiApprovalLevel: true,
      createdAt: true,
      updatedAt: true,
      deletedAt: true,
      _count: { select: { users: true } },
      nodeTypes: {
        orderBy: { nodeType: { levelOrder: "asc" } },
        select: {
          id: true,
          nodeTypeId: true,
          nodeType: {
            select: {
              id: true,
              code: true,
              displayName: true,
              levelOrder: true,
              canHaveKpis: true,
            },
          },
        },
      },
      users: {
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
        },
      },
    },
  });

  return org;
}

export async function getUserDetails(userId: string) {
  await requireSuperAdmin();
  const parsedUserId = userIdSchema.parse(userId);

  const user = await prisma.user.findFirst({
    where: {
      id: parsedUserId,
      deletedAt: null,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      org: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  return user;
}
