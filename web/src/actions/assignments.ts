"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

/**
 * Actions for managing entity assignments
 */

async function requireOrgAdmin() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    throw new Error("unauthorized");
  }

  if (!session.user.orgId) {
    throw new Error("unauthorizedMissingOrg");
  }

  const userRole = (session.user as { role?: string }).role;
  if (userRole !== "ADMIN") {
    throw new Error("unauthorized");
  }

  return session;
}

const assignEntitySchema = z.object({
  entityId: z.string().min(1),
  userIds: z.array(z.string().min(1)).min(1),
});

export async function assignEntityToUsers(input: z.infer<typeof assignEntitySchema>) {
  try {
    const session = await requireOrgAdmin();
    const parsed = assignEntitySchema.safeParse(input);

    if (!parsed.success) {
      return { success: false as const, error: "invalidInput" };
    }

    const { entityId, userIds } = parsed.data;

    // Verify entity belongs to org
    const entity = await prisma.entity.findFirst({
      where: {
        id: entityId,
        orgId: session.user.orgId,
        deletedAt: null,
      },
    });

    if (!entity) {
      return { success: false as const, error: "entityNotFound" };
    }

    // Verify all users belong to org
    const users = await prisma.user.findMany({
      where: {
        id: { in: userIds },
        orgId: session.user.orgId,
        deletedAt: null,
      },
    });

    if (users.length !== userIds.length) {
      return { success: false as const, error: "someUsersNotFound" };
    }

    // Create assignments (upsert to handle existing ones)
    const assignments = await Promise.all(
      userIds.map((userId) =>
        prisma.userEntityAssignment.upsert({
          where: {
            user_entity_assignment_unique: {
              userId,
              entityId,
            },
          },
          create: {
            userId,
            entityId,
            assignedBy: session.user.id,
          },
          update: {
            assignedBy: session.user.id,
            updatedAt: new Date(),
          },
        })
      )
    );

    return { success: true as const, assignments };
  } catch (error: unknown) {
    console.error("[assignEntityToUsers]", error);
    return { success: false as const, error: "failedToAssign" };
  }
}

const unassignEntitySchema = z.object({
  entityId: z.string().min(1),
  userIds: z.array(z.string().min(1)).min(1),
});

export async function unassignEntityFromUsers(input: z.infer<typeof unassignEntitySchema>) {
  try {
    const session = await requireOrgAdmin();
    const parsed = unassignEntitySchema.safeParse(input);

    if (!parsed.success) {
      return { success: false as const, error: "invalidInput" };
    }

    const { entityId, userIds } = parsed.data;

    // Delete assignments
    await prisma.userEntityAssignment.deleteMany({
      where: {
        entityId,
        userId: { in: userIds },
      },
    });

    return { success: true as const };
  } catch (error: unknown) {
    console.error("[unassignEntityFromUsers]", error);
    return { success: false as const, error: "failedToUnassign" };
  }
}

const getEntityAssignmentsSchema = z.object({
  entityId: z.string().min(1),
});

export async function getEntityAssignments(input: z.infer<typeof getEntityAssignmentsSchema>) {
  try {
    const session = await requireOrgAdmin();
    const parsed = getEntityAssignmentsSchema.safeParse(input);

    if (!parsed.success) {
      return { success: false as const, error: "invalidInput", assignments: [] };
    }

    const { entityId } = parsed.data;

    // Verify entity belongs to org
    const entity = await prisma.entity.findFirst({
      where: {
        id: entityId,
        orgId: session.user.orgId,
        deletedAt: null,
      },
    });

    if (!entity) {
      return { success: false as const, error: "entityNotFound", assignments: [] };
    }

    const assignments = await prisma.userEntityAssignment.findMany({
      where: { entityId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            title: true,
          },
        },
      },
      orderBy: {
        assignedAt: "desc",
      },
    });

    return { success: true as const, assignments };
  } catch (error: unknown) {
    console.error("[getEntityAssignments]", error);
    return { success: false as const, error: "failedToFetch", assignments: [] };
  }
}

export async function getUserAssignableUsers() {
  try {
    const session = await requireOrgAdmin();

    const users = await prisma.user.findMany({
      where: {
        orgId: session.user.orgId,
        deletedAt: null,
        role: {
          in: ["EXECUTIVE", "MANAGER"],
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        title: true,
      },
      orderBy: [{ role: "asc" }, { name: "asc" }],
    });

    return { success: true as const, users };
  } catch (error: unknown) {
    console.error("[getUserAssignableUsers]", error);
    return { success: false as const, error: "failedToFetch", users: [] };
  }
}
