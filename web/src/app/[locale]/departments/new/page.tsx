"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/providers/auth-provider";
import { useLocale } from "@/providers/locale-provider";
import { createOrgAdminDepartment, getOrgAdminManagerOptions } from "@/actions/org-admin";

type ManagerOption = Awaited<ReturnType<typeof getOrgAdminManagerOptions>>[number];

function formatIssues(issues: unknown): string | null {
  if (!Array.isArray(issues) || issues.length === 0) return null;
  const lines = issues
    .map((i) => {
      if (!i || typeof i !== "object") return null;
      const issue = i as { path?: unknown; message?: unknown };
      const message = typeof issue.message === "string" ? issue.message : null;
      if (!message) return null;
      const path = Array.isArray(issue.path) ? issue.path.filter((p) => typeof p === "string" || typeof p === "number") : [];
      const prefix = path.length ? `${path.join(".")}: ` : "";
      return `${prefix}${message}`;
    })
    .filter((l): l is string => Boolean(l));

  return lines.length ? lines.join("\n") : null;
}

export default function NewDepartmentPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { locale, t, te } = useLocale();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userRole = (user as any)?.role as string | undefined;

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [managersLoading, setManagersLoading] = useState(true);
  const [managers, setManagers] = useState<ManagerOption[]>([]);

  const [name, setName] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [managerIds, setManagerIds] = useState<string[]>([]);

  useEffect(() => {
    if (loading) return;
    if (!user) return;
    if (userRole !== "ADMIN") return;

    let mounted = true;
    setManagersLoading(true);
    void (async () => {
      try {
        const data = await getOrgAdminManagerOptions();
        if (!mounted) return;
        setManagers(data);
      } catch (e) {
        console.error("Failed to load manager options", e);
      } finally {
        if (mounted) setManagersLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [loading, user, userRole]);

  const selectedManagersLabel = useMemo(() => {
    if (!managerIds.length) return t("selectManager");
    return `${t("selected")}: ${managerIds.length}`;
  }, [managerIds.length, t]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const result = await createOrgAdminDepartment({
        name,
        nameAr: nameAr.trim() ? nameAr : undefined,
        managerIds,
      });

      if (!result.success) {
        const issuesText = formatIssues((result as unknown as { issues?: unknown }).issues);
        const translated = te(result.error) || result.error;
        setError(issuesText || translated || t("failedToCreateDepartment"));
        return;
      }

      router.push(`/${locale}/departments`);
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t("failedToCreateDepartment");
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8">
        <p className="text-sm text-muted-foreground">{t("loading")}</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8">
        <p className="text-sm text-muted-foreground">{t("noActiveSession")}</p>
        <Link href={`/${locale}/auth/login`} className="mt-3 inline-flex text-sm font-semibold text-primary hover:opacity-90">
          {t("goToSignIn")}
        </Link>
      </div>
    );
  }

  if (userRole !== "ADMIN") {
    return (
      <div className="rounded-2xl border border-border bg-card p-8">
        <p className="text-sm text-muted-foreground">{t("unauthorized")}</p>
        <Link href={`/${locale}/overview`} className="mt-3 inline-flex text-sm font-semibold text-primary hover:opacity-90">
          {t("back")}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader title={t("createDepartment")} subtitle={t("addDepartmentDesc")} />

      <Card className="bg-card/70 backdrop-blur shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">{t("createDepartment")}</CardTitle>
          <CardDescription>{t("addDepartmentDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error ? (
              <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive whitespace-pre-line">
                {error}
              </div>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="dept-name">{t("name")}</Label>
                <Input id="dept-name" value={name} onChange={(e) => setName(e.target.value)} required className="bg-card" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dept-name-ar">{t("nameAr")}</Label>
                <Input id="dept-name-ar" value={nameAr} onChange={(e) => setNameAr(e.target.value)} className="bg-card" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t("manager")}</Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="outline" className="w-full justify-between" disabled={managersLoading}>
                    <span>{managersLoading ? t("loading") : selectedManagersLabel}</span>
                    <ChevronDown className="h-4 w-4 opacity-60" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-[320px]" align="start">
                  <DropdownMenuLabel>{t("selectManager")}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {managers.length === 0 ? (
                    <div className="px-2 py-2 text-sm text-muted-foreground">{t("noManager")}</div>
                  ) : (
                    managers.map((m) => {
                      const checked = managerIds.includes(m.id);
                      return (
                        <DropdownMenuCheckboxItem
                          key={m.id}
                          checked={checked}
                          onCheckedChange={(next) => {
                            const isChecked = Boolean(next);
                            setManagerIds((prev) => {
                              if (isChecked) return prev.includes(m.id) ? prev : [...prev, m.id];
                              return prev.filter((x) => x !== m.id);
                            });
                          }}
                        >
                          {m.name} ({m.role})
                        </DropdownMenuCheckboxItem>
                      );
                    })
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              {managerIds.length ? (
                <div className="rounded-xl border border-border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                  {managerIds
                    .map((id) => managers.find((m) => m.id === id))
                    .filter((m): m is ManagerOption => Boolean(m))
                    .map((m) => `${m.name} (${m.role})`)
                    .join(", ")}
                </div>
              ) : null}
            </div>

            <div className="flex items-center justify-between gap-2">
              <Button type="button" variant="ghost" asChild>
                <Link href={`/${locale}/departments`}>{t("cancel")}</Link>
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? t("creating") : t("create")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
