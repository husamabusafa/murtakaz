"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { z } from "zod";
import { KpiApprovalLevel, Role } from "@prisma/client";
import { ActionValidationIssue } from "@/types/actions";

type NodeTypeRow = {
  id: string;
  code: string;
  displayName: string;
  levelOrder: number;
  canHaveKpis: boolean;
};

const prismaOrganization = (prisma as any).organization;

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
  nameAr: z.string().optional(),
  domain: z.string().optional(),
  logoUrl: z.string().url().optional().or(z.literal("")),
  mission: z.string().optional(),
  missionAr: z.string().optional(),
  vision: z.string().optional(),
  visionAr: z.string().optional(),
  about: z.string().optional(),
  aboutAr: z.string().optional(),
  contacts: z.any().optional(),
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
  nameAr: z.string().optional(),
  domain: z.string().optional(),
  logoUrl: z.string().url().optional().or(z.literal("")),
  mission: z.string().optional(),
  missionAr: z.string().optional(),
  vision: z.string().optional(),
  visionAr: z.string().optional(),
  about: z.string().optional(),
  aboutAr: z.string().optional(),
  contacts: z.any().optional(),
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

// Helper to check if current user is SUPER_ADMIN
async function requireSuperAdmin() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || session.user.role !== "SUPER_ADMIN") {
    throw new Error("unauthorized");
  }
  return session;
}

export async function updateOrganizationNodeTypes(data: z.infer<typeof updateOrgNodeTypesSchema>) {
  await requireSuperAdmin();

  if (!prismaWithNodeTypes.organizationNodeType) {
    return {
      success: false,
      error: "unexpectedError",
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
    return { success: false, error: "cannotAssignSuperAdmin" };
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
    const org = await prismaOrganization.create({
      data: {
        name: parsed.name,
        nameAr: parsed.nameAr || null,
        domain: parsed.domain || null,
        logoUrl: parsed.logoUrl || null,
        mission: parsed.mission || null,
        missionAr: parsed.missionAr || null,
        vision: parsed.vision || null,
        visionAr: parsed.visionAr || null,
        about: parsed.about || null,
        aboutAr: parsed.aboutAr || null,
        contacts: parsed.contacts || null,
        ...(typeof parsed.kpiApprovalLevel !== "undefined" ? { kpiApprovalLevel: parsed.kpiApprovalLevel } : {}),
      },
      select: { id: true },
    });
    return { success: true, org };
  } catch (error) {
    console.error("Failed to create organization:", error);
    return { success: false, error: "failedToCreate" };
  }
}

export async function getOrganizations() {
  await requireSuperAdmin();
  const orgs = await (prismaOrganization as any).findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "desc" },
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
      contacts: true,
      kpiApprovalLevel: true,
      createdAt: true,
      updatedAt: true,
      deletedAt: true,
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
    const org = await (prismaOrganization as any).update({
      where: { id: parsed.orgId },
      data: {
        ...(typeof parsed.name === "string" ? { name: parsed.name } : {}),
        ...(typeof parsed.nameAr === "string" ? { nameAr: parsed.nameAr || null } : {}),
        ...(typeof parsed.domain === "string" ? { domain: parsed.domain || null } : {}),
        ...(typeof parsed.logoUrl !== "undefined" ? { logoUrl: parsed.logoUrl || null } : {}),
        ...(typeof parsed.mission !== "undefined" ? { mission: parsed.mission || null } : {}),
        ...(typeof parsed.missionAr !== "undefined" ? { missionAr: parsed.missionAr || null } : {}),
        ...(typeof parsed.vision !== "undefined" ? { vision: parsed.vision || null } : {}),
        ...(typeof parsed.visionAr !== "undefined" ? { visionAr: parsed.visionAr || null } : {}),
        ...(typeof parsed.about !== "undefined" ? { about: parsed.about || null } : {}),
        ...(typeof parsed.aboutAr !== "undefined" ? { aboutAr: parsed.aboutAr || null } : {}),
        ...(typeof parsed.contacts !== "undefined" ? { contacts: parsed.contacts || null } : {}),
        ...(typeof parsed.kpiApprovalLevel !== "undefined" ? { kpiApprovalLevel: parsed.kpiApprovalLevel } : {}),
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
        contacts: true,
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
    throw new Error("unexpectedError");
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
      error: "unexpectedError",
    };
  }

  const parsedResult = createOrgWithUsersSchema.safeParse(data);
  if (!parsedResult.success) {
    return {
      success: false,
      error: "validationFailed",
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
      error: "atLeastOneAdminUserRequired",
      issues: [{ path: ["users"], message: "atLeastOneAdminUserRequired" } satisfies ActionValidationIssue],
    };
  }

  const hasSuperAdmin = parsed.users.some((u) => u.role === ("SUPER_ADMIN" as unknown as Role));
  if (hasSuperAdmin) {
    return {
      success: false,
      error: "cannotCreateSuperAdmin",
      issues: [{ path: ["users"], message: "cannotCreateSuperAdmin" } satisfies ActionValidationIssue],
    };
  }

  const emails = parsed.users.map((u) => u.email.trim().toLowerCase());
  const uniqueEmails = new Set(emails);
  if (uniqueEmails.size !== emails.length) {
    return {
      success: false,
      error: "validationFailed",
      issues: [{ path: ["users"], message: "validationFailed" } satisfies ActionValidationIssue],
    };
  }

  let orgId: string | null = null;
  try {
    const org = await prisma.organization.create({
      data: {
        name: parsed.name,
        nameAr: parsed.nameAr || null,
        domain: parsed.domain || null,
        logoUrl: parsed.logoUrl || null,
        mission: parsed.mission || null,
        missionAr: parsed.missionAr || null,
        vision: parsed.vision || null,
        visionAr: parsed.visionAr || null,
        about: parsed.about || null,
        aboutAr: parsed.aboutAr || null,
        contacts: parsed.contacts || null,
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
        throw new Error("failedToCreateUser");
      }
    }

    return { success: true, orgId: org.id };
  } catch (error: unknown) {
    console.error("Failed to create organization with users:", error);

    if (orgId) {
      try {
        await (prismaOrganization as any).delete({ where: { id: orgId } });
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
    (prismaOrganization as any).count({ where: { deletedAt: null } }),
    prisma.user.count({ where: { deletedAt: null } }),
  ]);

  return { organizations, users };
}

export async function getOrganizationDetails(orgId: string) {
  await requireSuperAdmin();
  const parsedOrgId = orgIdSchema.parse(orgId);

  const org = await (prismaOrganization as any).findFirst({
    where: {
      id: parsedOrgId,
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
      contacts: true,
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

  return org as any;
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
