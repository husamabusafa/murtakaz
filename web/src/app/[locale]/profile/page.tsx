"use client";

import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/providers/auth-provider";
import { useLocale } from "@/providers/locale-provider";
import { getMyProfile } from "@/actions/profile";
import { useEffect, useState } from "react";

export default function ProfilePage() {
  const { user, loading, signOut } = useAuth();
  const { locale, t } = useLocale();

  const [profile, setProfile] = useState<Awaited<ReturnType<typeof getMyProfile>> | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    if (!user) return;
    setProfileLoading(true);
    setProfileError(null);
    (async () => {
      try {
        const result = await getMyProfile();
        if (!mounted) return;
        setProfile(result);
      } catch (e: unknown) {
        if (!mounted) return;
        setProfileError(e instanceof Error ? e.message : "Failed to load profile");
      } finally {
        if (mounted) setProfileLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [user]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-card/50 p-8 text-foreground">
        <p className="text-sm text-muted-foreground">{t("loading")}</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="rounded-2xl border border-border bg-card/50 p-8 text-foreground">
        <p className="text-sm text-muted-foreground">{t("noActiveSession")}</p>
        <Link href={`/${locale}/auth/login`} className="mt-3 inline-flex text-sm font-semibold text-primary hover:opacity-90">
          {t("goToSignIn")}
        </Link>
      </div>
    );
  }

  const pUser = profile?.user ?? null;
  const pOrg = profile?.user?.org ?? null;
  const pManager = profile?.user?.manager ?? null;

  const initials = (pUser?.name ?? user.name)
    .trim()
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "?";

  return (
    <div className="space-y-8">
      <PageHeader
        title={t("profile")}
        subtitle={t("profileSubtitle")}
        actions={
          <Button variant="destructive" onClick={() => void signOut()}>
            {t("logout")}
          </Button>
        }
      />

      {profileLoading ? (
        <div className="rounded-2xl border border-border bg-card/50 p-6 text-foreground">
          <p className="text-sm text-muted-foreground">{t("loadingProfile")}</p>
        </div>
      ) : null}

      {profileError ? (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6 text-sm text-rose-200 whitespace-pre-wrap">{profileError}</div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="border-border bg-card/50 shadow-sm">
          <CardHeader className="space-y-3">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12 border border-border bg-card/50">
                {pUser?.image ? <AvatarImage src={pUser.image} alt={pUser.name} /> : null}
                <AvatarFallback className="bg-muted/30 text-foreground">{initials}</AvatarFallback>
              </Avatar>
              <div className="space-y-0.5">
                <CardTitle className="text-base">{pUser?.name ?? user.name}</CardTitle>
                <CardDescription className="text-muted-foreground">{pUser?.title ?? pUser?.role ?? "—"}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-foreground">
            <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("email")}</p>
              <p className="mt-1 text-foreground">{pUser?.email ?? "—"}</p>
            </div>
            <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("role")}</p>
              <p className="mt-1 text-foreground">{pUser?.role ?? "—"}</p>
            </div>
            <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("title")}</p>
              <p className="mt-1 text-foreground">{pUser?.title ?? "—"}</p>
            </div>
            <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("department")}</p>
              <p className="mt-1 text-foreground">—</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card/50 shadow-sm lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">{t("organization")}</CardTitle>
            <CardDescription className="text-muted-foreground">{t("orgAndReportingLineDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-foreground">
            <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("organization")}</p>
              <p className="mt-1 text-foreground">{pOrg?.name ?? "—"}</p>
              <p className="mt-1 text-xs text-muted-foreground">{pOrg?.domain ?? "—"}</p>
            </div>
            <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("directManager")}</p>
              <p className="mt-1 text-foreground">{pManager?.name ?? "—"}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {pManager?.title ? `${pManager.title} • ` : ""}
                {pManager?.email ?? ""}
              </p>
            </div>
            <Separator className="bg-muted/30" />
            {String(pUser?.role ?? "") === "SUPER_ADMIN" ? (
              <Link
                href={`/${locale}/super-admin/users`}
                className="inline-flex items-center justify-center rounded-xl bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
              >
                {t("manageUsers")}
              </Link>
            ) : (
              <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
                <p className="font-semibold text-foreground">{t("session")}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("sessionExpiresAt")}{" "}
                  {profile?.session?.expiresAt ? new Date(profile.session.expiresAt).toLocaleString() : "—"}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
