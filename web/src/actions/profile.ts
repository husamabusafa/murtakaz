"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";

async function requireOrgMember() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) throw new Error("Unauthorized");
  if (!session.user.orgId) throw new Error("Unauthorized: Missing organization scope");
  return session;
}

export async function getMyProfile() {
  const session = await requireOrgMember();

  const user = await prisma.user.findFirst({
    where: {
      id: session.user.id,
      orgId: session.user.orgId,
      deletedAt: null,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      title: true,
      image: true,
      createdAt: true,
      org: { select: { id: true, name: true, domain: true } },
      manager: { select: { id: true, name: true, email: true, title: true, role: true } },
    },
  });

  if (!user) return null;

  return {
    user,
    session: {
      id: session.session.id,
      expiresAt: session.session.expiresAt,
    },
  };
}
