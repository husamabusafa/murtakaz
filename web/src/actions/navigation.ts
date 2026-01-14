"use server";

import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const prismaOrgEntityType = (prisma as unknown as { orgEntityType?: unknown }).orgEntityType as
  | {
      findMany: <T>(args: unknown) => Promise<T[]>;
    }
  | undefined;

export async function getMyOrganizationEntityTypes() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  if (!session.user.orgId) {
    return [];
  }
  if (!prismaOrgEntityType?.findMany) {
    return [];
  }

  const rows = await prismaOrgEntityType.findMany<{
    id: string;
    code: string;
    name: string;
    nameAr: string | null;
    sortOrder: number;
  }>({
    where: {
      orgId: session.user.orgId,
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      code: true,
      name: true,
      nameAr: true,
      sortOrder: true,
    },
  });

  return rows.map((r) => ({
    id: String(r.id),
    code: String(r.code),
    name: String(r.name),
    nameAr: r.nameAr ? String(r.nameAr) : null,
    sortOrder: Number(r.sortOrder ?? 0),
  }));
}
