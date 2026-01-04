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
  };
};

const prismaWithNodeTypes = prisma as unknown as PrismaWithNodeTypes;

// Schema for creating an organization
const createOrgSchema = z.object({
  name: z.string().min(2),
  domain: z.string().optional(),
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

export async function createOrganization(data: z.infer<typeof createOrgSchema>) {
  await requireSuperAdmin();
  
  const parsed = createOrgSchema.parse(data);
  
  try {
    const org = await prisma.organization.create({
      data: {
        name: parsed.name,
        domain: parsed.domain || null,
      },
    });
    return { success: true, org };
  } catch (error) {
    console.error("Failed to create organization:", error);
    return { success: false, error: "Failed to create organization" };
  }
}

export async function getOrganizations() {
  await requireSuperAdmin();
  const orgs = await prisma.organization.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { users: true },
      },
    },
  });
  return orgs;
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
        await prisma.organization.delete({ where: { id: orgId } });
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
    prisma.organization.count({ where: { deletedAt: null } }),
    prisma.user.count({ where: { deletedAt: null } }),
  ]);

  return { organizations, users };
}

export async function getOrganizationDetails(orgId: string) {
  await requireSuperAdmin();
  const parsedOrgId = orgIdSchema.parse(orgId);

  const org = await prisma.organization.findFirst({
    where: {
      id: parsedOrgId,
      deletedAt: null,
    },
    include: {
      _count: {
        select: { users: true },
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
