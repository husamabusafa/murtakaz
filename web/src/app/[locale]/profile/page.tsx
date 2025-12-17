"use client";

import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { isAdmin } from "@/lib/demo-users";
import { useAuth } from "@/providers/auth-provider";
import { useLocale } from "@/providers/locale-provider";

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const { locale } = useLocale();

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-white">
        <p className="text-sm text-slate-200">Loading profile…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-white">
        <p className="text-sm text-slate-200">No active session.</p>
        <Link href={`/${locale}/auth/login`} className="mt-3 inline-flex text-sm font-semibold text-indigo-200 hover:text-indigo-100">
          Go to sign in
        </Link>
      </div>
    );
  }

  const initials = user.name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <div className="space-y-8">
      <PageHeader title="Profile" subtitle="User profile and access scope (prototype)." />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="border-white/10 bg-white/5 text-white shadow-lg shadow-black/20">
          <CardHeader className="space-y-3">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12 border border-white/10 bg-white/5">
                <AvatarFallback className="bg-white/10 text-white">{initials}</AvatarFallback>
              </Avatar>
              <div className="space-y-0.5">
                <CardTitle className="text-base">{user.name}</CardTitle>
                <CardDescription className="text-slate-200">{user.title ?? user.role}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-100">
            <div className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-200">Email</p>
              <p className="mt-1 text-white">{user.email}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-200">Role</p>
              <p className="mt-1 text-white">{user.role}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-200">Department</p>
              <p className="mt-1 text-white">{user.department ?? "—"}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/10 bg-white/5 text-white shadow-lg shadow-black/20 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Access scope</CardTitle>
            <CardDescription className="text-slate-200">Role-based access boundaries per PRD (demo).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-slate-100">
            <div className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3">
              <p className="font-semibold text-white">What you can see</p>
              <p className="mt-1 text-xs text-slate-200">
                Executives/PMO: organization-wide dashboards and drill-down. Managers: owned initiatives/projects. Employees: assigned work and contributions.
              </p>
            </div>
            <Separator className="bg-white/10" />
            {isAdmin(user) ? (
              <Link
                href={`/${locale}/admin/users`}
                className="inline-flex items-center justify-center rounded-xl bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
              >
                Manage users
              </Link>
            ) : (
              <div className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3">
                <p className="font-semibold text-white">Admin functions</p>
                <p className="mt-1 text-xs text-slate-200">User management is restricted to ADMIN role.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
