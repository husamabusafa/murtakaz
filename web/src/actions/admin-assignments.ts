"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

/**
 * Admin actions for managing entity assignments across the organization
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

export async function getAllEntitiesWithAssignments() {
  try {
    const session = await requireOrgAdmin();

    const entities = await prisma.entity.findMany({
      where: {
        orgId: session.user.orgId,
        deletedAt: null,
      },
      select: {
        id: true,
        title: true,
        titleAr: true,
        key: true,
        periodType: true,
        orgEntityType: {
          select: {
            code: true,
            name: true,
            nameAr: true,
          },
        },
        assignments: {
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
        },
      },
      orderBy: [
        { orgEntityType: { sortOrder: "asc" } },
        { title: "asc" },
      ],
    });

    return { success: true as const, entities };
  } catch (error: unknown) {
    console.error("[getAllEntitiesWithAssignments]", error);
    return { success: false as const, error: "failedToFetch", entities: [] };
  }
}

export async function getAllAssignableUsersForAdmin() {
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
        entityAssignments: {
          select: {
            entityId: true,
          },
        },
      },
      orderBy: [{ role: "asc" }, { name: "asc" }],
    });

    return { success: true as const, users };
  } catch (error: unknown) {
    console.error("[getAllAssignableUsersForAdmin]", error);
    return { success: false as const, error: "failedToFetch", users: [] };
  }
}

const bulkAssignSchema = z.object({
  assignments: z.array(
    z.object({
      entityId: z.string().min(1),
      userId: z.string().min(1),
    })
  ),
});

export async function bulkAssignEntities(input: z.infer<typeof bulkAssignSchema>) {
  try {
    const session = await requireOrgAdmin();
    const parsed = bulkAssignSchema.safeParse(input);

    if (!parsed.success) {
      return { success: false as const, error: "invalidInput" };
    }

    const { assignments } = parsed.data;

    // Create all assignments
    await Promise.all(
      assignments.map((assignment) =>
        prisma.userEntityAssignment.upsert({
          where: {
            user_entity_assignment_unique: {
              userId: assignment.userId,
              entityId: assignment.entityId,
            },
          },
          create: {
            userId: assignment.userId,
            entityId: assignment.entityId,
            assignedBy: session.user.id,
          },
          update: {
            assignedBy: session.user.id,
            updatedAt: new Date(),
          },
        })
      )
    );

    return { success: true as const };
  } catch (error: unknown) {
    console.error("[bulkAssignEntities]", error);
    return { success: false as const, error: "failedToAssign" };
  }
}

const bulkUnassignSchema = z.object({
  assignmentIds: z.array(z.string().min(1)),
});

export async function bulkUnassignEntities(input: z.infer<typeof bulkUnassignSchema>) {
  try {
    await requireOrgAdmin();
    const parsed = bulkUnassignSchema.safeParse(input);

    if (!parsed.success) {
      return { success: false as const, error: "invalidInput" };
    }

    const { assignmentIds } = parsed.data;

    await prisma.userEntityAssignment.deleteMany({
      where: {
        id: { in: assignmentIds },
      },
    });

    return { success: true as const };
  } catch (error: unknown) {
    console.error("[bulkUnassignEntities]", error);
    return { success: false as const, error: "failedToUnassign" };
  }
}
