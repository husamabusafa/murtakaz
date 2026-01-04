"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { z } from "zod";
import { Role } from "@prisma/client";

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
