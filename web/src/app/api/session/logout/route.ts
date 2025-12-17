import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/session-cookie";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    path: "/",
    sameSite: "lax",
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
  });
  return response;
}

