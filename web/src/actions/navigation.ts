"use server";

import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function getMyOrganizationNodeTypes() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  if (!session.user.orgId) {
    return [];
  }

  const rows = await (prisma as any).organizationNodeType.findMany({
    where: {
      orgId: session.user.orgId,
    },
    orderBy: {
      nodeType: { levelOrder: "asc" },
    },
    select: {
      nodeType: {
        select: {
          id: true,
          code: true,
          displayName: true,
          nameAr: true,
          levelOrder: true,
        },
      },
    },
  });

  return (rows as any[]).map((r) => r.nodeType) as Array<{
    id: string;
    code: string;
    displayName: string;
    nameAr: string | null;
    levelOrder: number;
  }>;
}
