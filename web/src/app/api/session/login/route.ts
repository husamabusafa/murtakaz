import { NextResponse } from "next/server";
import { getDemoUserById } from "@/lib/demo-users";
import { SESSION_COOKIE_NAME } from "@/lib/session-cookie";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { userId?: string } | null;
  const user = getDemoUserById(body?.userId);

  if (!user) {
    return NextResponse.json({ error: "Invalid userId" }, { status: 400 });
  }

  const response = NextResponse.json({ ok: true, user });
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: encodeURIComponent(user.id),
    path: "/",
    sameSite: "lax",
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 12,
  });

  return response;
}

