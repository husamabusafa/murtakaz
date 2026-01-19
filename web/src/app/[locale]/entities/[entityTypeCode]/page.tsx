"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { KpiGauge } from "@/components/charts/kpi-gauge";
import { useAuth } from "@/providers/auth-provider";
import { useLocale } from "@/providers/locale-provider";
import { deleteOrgEntity, getOrgEntitiesByTypeCode } from "@/actions/entities";

type ListResult = Awaited<ReturnType<typeof getOrgEntitiesByTypeCode>>;

type EntityRow = ListResult["items"][number];


function latestEntityValue(row: EntityRow) {
  const latest = row.values?.[0];
  if (!latest) return null;
  if (typeof latest.finalValue === "number") return latest.finalValue;
  if (typeof latest.calculatedValue === "number") return latest.calculatedValue;
  if (typeof latest.actualValue === "number") return latest.actualValue;
  return null;
}

export default function EntitiesByTypePage() {
  const params = useParams<{ entityTypeCode: string }>();
  const router = useRouter();
  const { user, loading } = useAuth();
  const { locale, t, df, formatNumber, te } = useLocale();
  const [mounted, setMounted] = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userRole =
    typeof (user as unknown as { role?: unknown })?.role === "string"
      ? String((user as unknown as { role?: unknown })?.role)
      : undefined;
  const canAdmin = userRole === "ADMIN";

  const entityTypeCode = String(params.entityTypeCode ?? "");

  const [loadingData, setLoadingData] = useState(true);
  const [result, setResult] = useState<ListResult>({ entityType: null, items: [], total: 0, page: 1, pageSize: 24 });
  const [q, setQ] = useState("");

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [selected, setSelected] = useState<EntityRow | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const loadData = useCallback(async () => {
    setLoadingData(true);
    try {
      const data = await getOrgEntitiesByTypeCode({
        entityTypeCode,
        q: q.trim() ? q.trim() : undefined,
        page: 1,
        pageSize: 250,
      });
      setResult(data);
    } catch (error) {
      console.error("Failed to load items", error);
      setResult({ entityType: null, items: [], total: 0, page: 1, pageSize: 24 });
    } finally {
      setLoadingData(false);
    }
  }, [entityTypeCode, q]);

  useEffect(() => {
    if (loading) return;
    if (!user) return;
    if (userRole === "SUPER_ADMIN") return;
    void loadData();
  }, [loadData, loading, user, userRole]);

  const entityType = result.entityType;
  const title = entityType ? df(entityType.name, entityType.nameAr) : entityTypeCode;

  const rows = useMemo(() => result.items ?? [], [result.items]);

  async function handleDelete() {
    if (!canAdmin) return;
    if (!selected) return;

    setSubmitting(true);
    setDeleteError(null);

    try {
      const res = await deleteOrgEntity({ entityId: selected.id });
      if (!res.success) {
        setDeleteError(te(res.error) || res.error || t("failedToDelete"));
        return;
      }

      setDeleteOpen(false);
      setSelected(null);
      await loadData();
      router.refresh();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t("failedToDelete");
      setDeleteError(message);
    } finally {
      setSubmitting(false);
    }
  }

  if (!mounted || loading) {
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

  if (userRole === "SUPER_ADMIN") {
    return (
      <div className="rounded-2xl border border-border bg-card p-8">
        <p className="text-sm text-muted-foreground">{t("unauthorized")}</p>
        <Link href={`/${locale}/super-admin`} className="mt-3 inline-flex text-sm font-semibold text-primary hover:opacity-90">
          {t("back")}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-3">
        <PageHeader title={title} subtitle={t("exploreWithLowerTypeDesc", { type: title, lowerType: title.toLowerCase() })} />

        {canAdmin ? (
          <Button asChild>
            <Link href={`/${locale}/entities/${entityTypeCode}/new`}>
              <Plus className="me-2 h-4 w-4" />
              {t("create")}
            </Link>
          </Button>
        ) : null}
      </div>

      <Card className="bg-card/70 backdrop-blur shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">{title}</CardTitle>
          <CardDescription>{t("exploreWithLowerTypeDesc", { type: title, lowerType: title.toLowerCase() })}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("search")}
              className="max-w-sm bg-background"
            />
            <Button type="button" variant="outline" onClick={() => void loadData()}>
              {t("search")}
            </Button>
          </div>

          {loadingData ? (
            <div className="rounded-xl border border-border bg-muted/10 p-8 text-center text-sm text-muted-foreground">{t("loading")}</div>
          ) : rows.length === 0 ? (
            <div className="rounded-xl border border-border bg-muted/10 p-8 text-center text-sm text-muted-foreground">{t("noItemsYet")}</div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {rows.map((e) => {
                const latest = latestEntityValue(e);
                const unit = df(e.unit, e.unitAr) || undefined;
                const gaugeTarget = typeof e.targetValue === "number" ? e.targetValue : null;
                const typeLabel = entityType ? df(entityType.name, entityType.nameAr) : entityTypeCode;

                return (
                  <Card key={e.id} className="bg-card/50 backdrop-blur shadow-sm overflow-hidden">
                    <Link href={`/${locale}/entities/${entityTypeCode}/${e.id}`} className="block">
                      <CardHeader className="space-y-2">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <CardTitle className="truncate text-base hover:text-primary transition-colors">
                              {df(e.title, e.titleAr)}
                            </CardTitle>
                            <CardDescription className="truncate">
                              {typeLabel}
                              {e.key ? ` • ${String(e.key)}` : ""}
                            </CardDescription>
                          </div>

                          {canAdmin ? (
                            <div className="flex items-center gap-2" onClick={(ev) => ev.stopPropagation()}>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-9 w-9"
                                onClick={(ev) => {
                                  ev.preventDefault();
                                  router.push(`/${locale}/entities/${entityTypeCode}/${e.id}/edit`);
                                }}
                                aria-label={t("edit")}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-9 w-9 text-destructive hover:text-destructive"
                                onClick={(ev) => {
                                  ev.preventDefault();
                                  setSelected(e);
                                  setDeleteError(null);
                                  setDeleteOpen(true);
                                }}
                                aria-label={t("delete")}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : null}
                        </div>
                      </CardHeader>

                      <CardContent className="space-y-3">
                      <KpiGauge value={latest} target={gaugeTarget} unit={unit} height={160} withCard={false} />

                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{t("status")}: {String(e.status ?? "—")}</span>
                        <span dir="ltr">{latest === null ? "—" : formatNumber(latest)}{unit ? ` ${unit}` : ""}</span>
                      </div>
                      </CardContent>
                    </Link>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={deleteOpen}
        onOpenChange={(open) => {
          setDeleteOpen(open);
          if (!open) setSelected(null);
          if (open) setDeleteError(null);
        }}
      >
        <DialogContent className="border-border bg-card text-foreground">
          <DialogHeader>
            <DialogTitle>{t("delete")}</DialogTitle>
            <DialogDescription className="text-muted-foreground">{t("delete")}</DialogDescription>
          </DialogHeader>

          {deleteError ? (
            <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive whitespace-pre-line">
              {deleteError}
            </div>
          ) : null}

          <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm">
            <p className="font-semibold">{selected ? df(selected.title, selected.titleAr) : "—"}</p>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setDeleteOpen(false)}>
              {t("cancel")}
            </Button>
            <Button type="button" variant="destructive" onClick={() => void handleDelete()} disabled={submitting}>
              {submitting ? t("deleting") : t("delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
