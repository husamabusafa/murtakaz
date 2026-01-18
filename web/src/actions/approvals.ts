"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { KpiValueStatus } from "@/generated/prisma-client";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { canEditEntityValues, getSubordinateIds } from "@/lib/permissions";
import { resolveRoleRank } from "@/lib/roles";

async function requireOrgMember() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    throw new Error("unauthorized");
  }

  if (!session.user.orgId) {
    throw new Error("unauthorizedMissingOrg");
  }

  return session;
}

async function getOrgApprovalLevel(orgId: string): Promise<"MANAGER" | "EXECUTIVE" | "ADMIN"> {
  const org = await prisma.organization.findFirst({
    where: { id: orgId, deletedAt: null },
    select: { kpiApprovalLevel: true },
  });
  return (org?.kpiApprovalLevel as "MANAGER" | "EXECUTIVE" | "ADMIN") ?? "MANAGER";
}

/**
 * Submit entity value for approval
 */
export async function submitEntityForApproval(input: { entityId: string; periodId: string }) {
  const session = await requireOrgMember();
  const parsed = z.object({ 
    entityId: z.string().uuid(), 
    periodId: z.string().uuid() 
  }).safeParse(input);

  if (!parsed.success) {
    return { success: false as const, error: "invalidInput" };
  }

  try {
    // Check if user can edit this entity
    const canEdit = await canEditEntityValues(session.user.id, parsed.data.entityId, session.user.orgId);
    if (!canEdit) {
      return { success: false as const, error: "unauthorized" };
    }

    // Verify entity belongs to user's org
    const entity = await prisma.entity.findFirst({
      where: { 
        id: parsed.data.entityId, 
        orgId: session.user.orgId,
        deletedAt: null 
      },
      select: { id: true },
    });

    if (!entity) {
      return { success: false as const, error: "entityNotFound" };
    }

    const period = await prisma.entityValue.findFirst({
      where: {
        id: parsed.data.periodId,
        entityId: parsed.data.entityId,
      },
      select: { id: true, status: true },
    });

    if (!period) {
      return { success: false as const, error: "periodNotFound" };
    }

    if (period.status !== KpiValueStatus.DRAFT) {
      return { success: false as const, error: "periodNotDraft" };
    }

    // Get org approval level
    const orgApprovalLevel = await getOrgApprovalLevel(session.user.orgId);
    const userRole = session.user.role as string;
    const userRoleRank = resolveRoleRank(userRole);
    const requiredRoleRank = resolveRoleRank(orgApprovalLevel);

    // Auto-approve if user role >= required approval level
    const canAutoApprove = userRoleRank >= requiredRoleRank;

    if (canAutoApprove) {
      await prisma.entityValue.update({
        where: { id: parsed.data.periodId },
        data: {
          status: KpiValueStatus.APPROVED,
          submittedBy: session.user.id,
          submittedAt: new Date(),
          approvedBy: session.user.id,
          approvedAt: new Date(),
          approvalType: "AUTO",
        },
      });

      return { success: true as const, autoApproved: true };
    } else {
      await prisma.entityValue.update({
        where: { id: parsed.data.periodId },
        data: {
          status: KpiValueStatus.SUBMITTED,
          submittedBy: session.user.id,
          submittedAt: new Date(),
          approvalType: "MANUAL",
        },
      });

      return { success: true as const, autoApproved: false };
    }
  } catch (error: unknown) {
    console.error("Failed to submit for approval:", error);
    return { success: false as const, error: "failedToSubmit" };
  }
}

/**
 * Approve entity value (for users with approval authority)
 */
export async function approveEntityValue(input: { entityId: string; periodId: string }) {
  const session = await requireOrgMember();
  const parsed = z.object({ 
    entityId: z.string().uuid(), 
    periodId: z.string().uuid() 
  }).safeParse(input);

  if (!parsed.success) {
    return { success: false as const, error: "invalidInput" };
  }

  try {
    // Get org approval level
    const orgApprovalLevel = await getOrgApprovalLevel(session.user.orgId);
    const userRole = session.user.role as string;
    const userRoleRank = resolveRoleRank(userRole);
    const requiredRoleRank = resolveRoleRank(orgApprovalLevel);

    // Check if user has approval authority
    if (userRoleRank < requiredRoleRank) {
      return { success: false as const, error: "insufficientApprovalAuthority" };
    }

    // Verify entity belongs to user's org
    const entity = await prisma.entity.findFirst({
      where: { 
        id: parsed.data.entityId, 
        orgId: session.user.orgId,
        deletedAt: null 
      },
      select: { id: true },
    });

    if (!entity) {
      return { success: false as const, error: "entityNotFound" };
    }

    // Get the period
    const period = await prisma.entityValue.findFirst({
      where: {
        id: parsed.data.periodId,
        entityId: parsed.data.entityId,
      },
      select: { id: true, status: true },
    });

    if (!period) {
      return { success: false as const, error: "periodNotFound" };
    }

    if (period.status !== KpiValueStatus.SUBMITTED) {
      return { success: false as const, error: "periodNotSubmitted" };
    }

    await prisma.entityValue.update({
      where: { id: parsed.data.periodId },
      data: {
        status: KpiValueStatus.APPROVED,
        approvedBy: session.user.id,
        approvedAt: new Date(),
      },
    });

    return { success: true as const };
  } catch (error: unknown) {
    console.error("Failed to approve:", error);
    return { success: false as const, error: "failedToApprove" };
  }
}

/**
 * Reject entity value and return to draft
 */
export async function rejectEntityValue(input: { entityId: string; periodId: string; reason?: string }) {
  const session = await requireOrgMember();
  const parsed = z.object({ 
    entityId: z.string().uuid(), 
    periodId: z.string().uuid(),
    reason: z.string().optional(),
  }).safeParse(input);

  if (!parsed.success) {
    return { success: false as const, error: "invalidInput" };
  }

  try {
    // Get org approval level
    const orgApprovalLevel = await getOrgApprovalLevel(session.user.orgId);
    const userRole = session.user.role as string;
    const userRoleRank = resolveRoleRank(userRole);
    const requiredRoleRank = resolveRoleRank(orgApprovalLevel);

    // Check if user has approval authority
    if (userRoleRank < requiredRoleRank) {
      return { success: false as const, error: "insufficientApprovalAuthority" };
    }

    // Verify entity belongs to user's org
    const entity = await prisma.entity.findFirst({
      where: { 
        id: parsed.data.entityId, 
        orgId: session.user.orgId,
        deletedAt: null 
      },
      select: { id: true },
    });

    if (!entity) {
      return { success: false as const, error: "entityNotFound" };
    }

    const period = await prisma.entityValue.findFirst({
      where: {
        id: parsed.data.periodId,
        entityId: parsed.data.entityId,
      },
      select: { id: true, status: true, note: true },
    });

    if (!period) {
      return { success: false as const, error: "periodNotFound" };
    }

    if (period.status !== KpiValueStatus.SUBMITTED) {
      return { success: false as const, error: "periodNotSubmitted" };
    }

    // Reject and return to draft
    const rejectionNote = parsed.data.reason 
      ? `${period.note ? period.note + "\n\n" : ""}[REJECTED] ${parsed.data.reason}`
      : period.note;

    await prisma.entityValue.update({
      where: { id: parsed.data.periodId },
      data: {
        status: KpiValueStatus.DRAFT,
        note: rejectionNote,
        // Keep submitted info for audit trail
      },
    });

    return { success: true as const };
  } catch (error: unknown) {
    console.error("Failed to reject:", error);
    return { success: false as const, error: "failedToReject" };
  }
}

/**
 * Get entities with periods pending or approved for approval
 */
export async function getEntityApprovals(input?: { status?: "SUBMITTED" | "APPROVED" }) {
  const session = await requireOrgMember();
  
  // Check if user has approval authority
  const org = await prisma.organization.findFirst({
    where: { id: session.user.orgId, deletedAt: null },
    select: { kpiApprovalLevel: true },
  });
  const orgApprovalLevel = (org?.kpiApprovalLevel as "MANAGER" | "EXECUTIVE" | "ADMIN") ?? "MANAGER";
  
  const userRoleRank = resolveRoleRank(session.user.role as string);
  const requiredRoleRank = resolveRoleRank(orgApprovalLevel);
  const canApprove = userRoleRank >= requiredRoleRank;
  
  if (!canApprove) {
    throw new Error("unauthorized");
  }
  
  // Get subordinate IDs to filter entities
  const subordinateIds = await getSubordinateIds(session.user.id, session.user.orgId);
  const relevantUserIds = [session.user.id, ...subordinateIds];
  
  // Parse status filter
  const parsed = z
    .object({ status: z.enum(["SUBMITTED", "APPROVED"]).optional() })
    .optional()
    .safeParse(input);
  
  const statusFilter = parsed.success ? parsed.data?.status : undefined;
  
  const periods = await prisma.entityValue.findMany({
    where: {
      entity: {
        orgId: session.user.orgId,
        deletedAt: null,
        assignments: {
          some: {
            userId: { in: relevantUserIds },
          },
        },
      },
      status: statusFilter
        ? (statusFilter as KpiValueStatus)
        : { in: ["SUBMITTED" as KpiValueStatus, "APPROVED" as KpiValueStatus] },
    },
    orderBy: [
      { submittedAt: "desc" },
      { updatedAt: "desc" },
    ],
    select: {
      id: true,
      entityId: true,
      createdAt: true,
      finalValue: true,
      calculatedValue: true,
      actualValue: true,
      status: true,
      note: true,
      submittedAt: true,
      approvedAt: true,
      submittedByUser: { select: { id: true, name: true } },
      approvedByUser: { select: { id: true, name: true } },
      entity: {
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
        },
      },
    },
  });
  
  return periods;
}
