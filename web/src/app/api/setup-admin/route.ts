
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const expectedSecret = process.env.SETUP_ADMIN_SECRET ?? process.env.BETTER_AUTH_SECRET;
  const providedSecret = request.headers.get("x-setup-admin-secret");

  if (!expectedSecret || !providedSecret || providedSecret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | {
        orgName?: string;
        orgDomain?: string;
        name?: string;
        email?: string;
        password?: string;
      }
    | null;

  if (!body?.orgName || !body?.name || !body?.email || !body?.password) {
    return NextResponse.json(
      { error: "Missing required fields: orgName, name, email, password" },
      { status: 400 },
    );
  }

  const existingSuperAdmin = await prisma.user.findFirst({
    where: {
      role: Role.SUPER_ADMIN,
      deletedAt: null,
    },
    select: { id: true },
  });

  if (existingSuperAdmin) {
    return NextResponse.json(
      { error: "Super admin already exists" },
      { status: 409 },
    );
  }

  const org = await prisma.organization.create({
    data: {
      name: body.orgName,
      domain: body.orgDomain || null,
    },
  });

  const result = await auth.api.signUpEmail({
    body: {
      name: body.name,
      email: body.email,
      password: body.password,
      role: Role.SUPER_ADMIN,
      orgId: org.id,
    },
  });

  return NextResponse.json({ org, user: result.user });
}
