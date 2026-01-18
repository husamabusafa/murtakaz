"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { z } from "zod";
import { KpiApprovalLevel, Role } from "@/generated/prisma-client";
import type { Prisma } from "@/generated/prisma-client";
import { ActionValidationIssue } from "@/types/actions";

type OrgEntityTypeRow = {
  id: string;
  code: string;
  name: string;
  nameAr: string | null;
  sortOrder: number;
};

type OrganizationRow = {
  id: string;
  name: string;
  nameAr: string | null;
  domain: string | null;
  logoUrl: string | null;
  mission: string | null;
  missionAr: string | null;
  vision: string | null;
  visionAr: string | null;
  about: string | null;
  aboutAr: string | null;
  contacts: Prisma.JsonValue | null;
  kpiApprovalLevel: KpiApprovalLevel;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  _count?: { users: number };
};

const prismaOrganization = (prisma as unknown as {
  organization: {
    create: (args: unknown) => Promise<unknown>;
    update: (args: unknown) => Promise<unknown>;
    delete: (args: unknown) => Promise<unknown>;
    findMany: (args: unknown) => Promise<unknown[]>;
    findFirst: (args: unknown) => Promise<unknown>;
    count: (args: unknown) => Promise<number>;
  };
}).organization;

const prismaOrgEntityType = (prisma as unknown as {
  orgEntityType?: {
    createMany: (args: { data: Array<{ orgId: string; code: string; name: string; nameAr: string | null; sortOrder: number }>; skipDuplicates?: boolean }) => Promise<unknown>;
    findMany: (args: {
      where: { orgId: string };
      orderBy: Array<Record<string, "asc" | "desc">>;
      select: Record<keyof OrgEntityTypeRow, true>;
    }) => Promise<OrgEntityTypeRow[]>;
    deleteMany: (args: { where: { orgId: string; id?: { notIn?: string[] } } }) => Promise<unknown>;
    update: (args: {
      where: { id: string };
      data: Partial<{ code: string; name: string; nameAr: string | null; sortOrder: number }>;
      select: { id: true };
    }) => Promise<{ id: string }>;
    create: (args: {
      data: { orgId: string; code: string; name: string; nameAr: string | null; sortOrder: number };
      select: { id: true };
    }) => Promise<{ id: string }>;
  };
}).orgEntityType;

const kpiApprovalLevelSchema = z.enum(["MANAGER", "EXECUTIVE", "ADMIN"]);

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

const createOrgEntityTypeSchema = z.object({
  id: z.string().uuid().optional(),
  code: z.string().trim().min(1),
  name: z.string().trim().min(1),
  nameAr: z.string().trim().optional(),
});

const createOrgWithUsersSchema = createOrgSchema.extend({
  entityTypes: z.array(createOrgEntityTypeSchema).min(1),
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
    const org = (await prismaOrganization.create({
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
    })) as { id: string };
    return { success: true, org };
  } catch (error) {
    console.error("Failed to create organization:", error);
    return { success: false, error: "failedToCreate" };
  }
}

export async function getOrganizations() {
  await requireSuperAdmin();
  const orgs = (await prismaOrganization.findMany({
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
  })) as OrganizationRow[];
  return orgs;
}

export async function updateOrganization(data: z.infer<typeof updateOrgSchema>) {
  await requireSuperAdmin();
  const parsed = updateOrgSchema.parse(data);

  try {
    const org = (await prismaOrganization.update({
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
    })) as OrganizationRow;

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
    await prisma.$transaction(async (tx) => {
      await tx.user.updateMany({
        where: { orgId: parsed.orgId, deletedAt: null },
        data: { deletedAt: now },
      });
      await (tx as unknown as { organization: { update: (args: unknown) => Promise<unknown> } }).organization.update({
        where: { id: parsed.orgId },
        data: { deletedAt: now },
      });
    });

    return { success: true };
  } catch (error: unknown) {
    console.error("Failed to delete organization:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to delete organization";
    return { success: false, error: errorMessage };
  }
}

export async function createOrganizationWithUsers(data: z.infer<typeof createOrgWithUsersSchema>) {
  await requireSuperAdmin();

  if (!prismaOrgEntityType?.createMany) {
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

  const codes = parsed.entityTypes.map((t) => t.code.trim().toLowerCase());
  const uniqueCodes = new Set(codes);
  if (uniqueCodes.size !== codes.length) {
    return {
      success: false,
      error: "validationFailed",
      issues: [{ path: ["entityTypes"], message: "validationFailed" } satisfies ActionValidationIssue],
    };
  }

  let orgId: string | null = null;
  try {
    const org = (await prismaOrganization.create({
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
    })) as { id: string };

    orgId = org.id;

    await prismaOrgEntityType.createMany({
      data: parsed.entityTypes.map((et, idx) => ({
        orgId: org.id,
        code: et.code.trim().toLowerCase(),
        name: et.name.trim(),
        nameAr: et.nameAr && et.nameAr.trim().length ? et.nameAr.trim() : null,
        sortOrder: idx,
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
        await prismaOrganization.delete({ where: { id: orgId } });
      } catch (cleanupError) {
        console.error("Failed to rollback organization creation:", cleanupError);
      }
    }

    const errorMessage = error instanceof Error ? error.message : "Failed to create organization";
    return { success: false, error: errorMessage };
  }
}

const updateOrgEntityTypesSchema = z.object({
  orgId: z.string().uuid(),
  entityTypes: z.array(createOrgEntityTypeSchema).min(1),
});

export async function updateOrganizationEntityTypes(data: z.infer<typeof updateOrgEntityTypesSchema>) {
  await requireSuperAdmin();

  if (!prismaOrgEntityType?.findMany || !prismaOrgEntityType?.update || !prismaOrgEntityType?.create || !prismaOrgEntityType?.deleteMany) {
    return {
      success: false,
      error: "unexpectedError",
    };
  }

  const parsedResult = updateOrgEntityTypesSchema.safeParse(data);
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
  const codes = parsed.entityTypes.map((t) => t.code.trim().toLowerCase());
  const uniqueCodes = new Set(codes);
  if (uniqueCodes.size !== codes.length) {
    return {
      success: false,
      error: "validationFailed",
      issues: [{ path: ["entityTypes"], message: "validationFailed" } satisfies ActionValidationIssue],
    };
  }

  try {
    const existing = await prismaOrgEntityType.findMany({
      where: { orgId: parsed.orgId },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: { id: true, code: true, name: true, nameAr: true, sortOrder: true },
    });

    const existingIdSet = new Set(existing.map((r) => r.id));
    const keepIds: string[] = [];

    for (let idx = 0; idx < parsed.entityTypes.length; idx += 1) {
      const et = parsed.entityTypes[idx];
      const nameAr = et.nameAr && et.nameAr.trim().length ? et.nameAr.trim() : null;
      const code = et.code.trim().toLowerCase();

      if (et.id && existingIdSet.has(et.id)) {
        keepIds.push(et.id);
        await prismaOrgEntityType.update({
          where: { id: et.id },
          data: {
            code,
            name: et.name.trim(),
            nameAr,
            sortOrder: idx,
          },
          select: { id: true },
        });
      } else {
        const created = await prismaOrgEntityType.create({
          data: {
            orgId: parsed.orgId,
            code,
            name: et.name.trim(),
            nameAr,
            sortOrder: idx,
          },
          select: { id: true },
        });

        keepIds.push(created.id);
      }
    }

    if (existing.length > 0) {
      await prismaOrgEntityType.deleteMany({
        where: {
          orgId: parsed.orgId,
          ...(keepIds.length ? { id: { notIn: keepIds } } : {}),
        },
      });
    }

    return { success: true };
  } catch (error: unknown) {
    console.error("Failed to update organization entity types:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to update organization entity types";
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
    prismaOrganization.count({ where: { deletedAt: null } }),
    prisma.user.count({ where: { deletedAt: null } }),
  ]);

  return { organizations, users };
}

export async function getOrganizationDetails(orgId: string) {
  await requireSuperAdmin();
  const parsedOrgId = orgIdSchema.parse(orgId);

  const org = (await prismaOrganization.findFirst({
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
    },
  })) as OrganizationRow | null;

  if (!org) return null;

  if (!prismaOrgEntityType?.findMany) {
    throw new Error("missingOrgEntityTypeModel");
  }

  const [entityTypes, users, userCount] = await Promise.all([
    prismaOrgEntityType.findMany({
      where: { orgId: org.id },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        code: true,
        name: true,
        nameAr: true,
        sortOrder: true,
      },
    }),
    prisma.user.findMany({
      where: { orgId: org.id, deletedAt: null },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    }),
    prisma.user.count({ where: { orgId: org.id, deletedAt: null } }),
  ]);

  return {
    ...org,
    entityTypes,
    users,
    _count: { users: userCount },
  } as unknown;
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
