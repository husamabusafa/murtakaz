import { NextResponse } from "next/server";
import { getDemoUserById } from "@/lib/demo-users";
import { SESSION_COOKIE_NAME } from "@/lib/session-cookie";

export async function GET(request: Request) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const match = cookieHeader.match(new RegExp(`${SESSION_COOKIE_NAME}=([^;]+)`));
  const userId = match ? decodeURIComponent(match[1]) : null;

  const user = getDemoUserById(userId);
  return NextResponse.json({ user });
}

