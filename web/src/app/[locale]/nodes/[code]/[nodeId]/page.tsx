"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Icon } from "@/components/icon";
import { StatusBadge } from "@/components/rag-badge";
import { useAuth } from "@/providers/auth-provider";
import { useLocale } from "@/providers/locale-provider";
import { getOrgNodeDetail } from "@/actions/nodes";
import type { Status } from "@prisma/client";

type Detail = Awaited<ReturnType<typeof getOrgNodeDetail>>;

function normalizeCode(code: string) {
  return code.trim().toLowerCase();
}

export default function NodeDetailPage() {
  const params = useParams<{ code: string; nodeId: string }>();
  const { t, locale, nodeTypeLabel, df } = useLocale();
  const { loading: sessionLoading } = useAuth();

  const code = typeof params?.code === "string" ? params.code : "";
  const nodeId = typeof params?.nodeId === "string" ? params.nodeId : "";
  const normalizedCode = useMemo(() => normalizeCode(code), [code]);

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Detail>(null);

  useEffect(() => {
    if (sessionLoading) return;
    if (!code || !nodeId) return;

    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const result = await getOrgNodeDetail({ code, nodeId });
        if (!mounted) return;
        setData(result);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [code, nodeId, sessionLoading]);

  const title = df(data?.node?.name, data?.node?.nameAr) || t("item");

  const currentTypeLabel = useMemo(() => {
    const typeMatch = data?.enabledNodeTypes?.find((x: any) => String(x.code).toLowerCase() === normalizedCode);
    if (!typeMatch) return code.toUpperCase();
    return df(typeMatch.displayName, typeMatch.nameAr);
  }, [code, data?.enabledNodeTypes, df, normalizedCode]);

  const childType = useMemo(() => {
    if (!data?.enabledNodeTypes?.length || !data?.node?.nodeType?.code) return null;
    const enabled = data.enabledNodeTypes;
    const idx = enabled.findIndex((it: any) => String(it.code) === String(data.node.nodeType.code));
    if (idx < 0) return null;
    const next = enabled[idx + 1] as any;
    if (!next) return null;
    return {
      code: String(next.code).toLowerCase(),
      displayName: df(next.displayName, next.nameAr),
    };
  }, [data?.enabledNodeTypes, data?.node?.nodeType?.code, df]);

  const grandChildTypeLabel = useMemo(() => {
    if (!data?.enabledNodeTypes?.length || !data?.node?.nodeType?.code) return null;
    const enabled = data.enabledNodeTypes;
    const idx = enabled.findIndex((it: any) => String(it.code) === String(data.node.nodeType.code));
    if (idx < 0) return null;
    const next = enabled[idx + 2] as any;
    if (!next) return null;
    return df(next.displayName, next.nameAr);
  }, [data?.enabledNodeTypes, data?.node?.nodeType?.code, df]);

  const pageIcon = useMemo(() => {
    const lower = normalizedCode;
    if (lower === "strategy") return "tabler:target-arrow";
    if (lower === "pillar") return "tabler:columns-3";
    if (lower === "objective") return "tabler:flag-3";
    if (lower === "initiative") return "tabler:rocket";
    if (lower === "project") return "tabler:briefcase-2";
    if (lower === "task") return "tabler:checklist";
    return "tabler:layers-subtract";
  }, [normalizedCode]);

  if (sessionLoading || loading) {
    return (
      <div className="space-y-8">
        <PageHeader title={title} subtitle={t("loadingEllipsis")} icon={<Icon name={pageIcon} className="h-5 w-5" />} />
        <Card className="bg-card/70 backdrop-blur shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">{t("loading")}</CardTitle>
            <CardDescription>{t("pleaseWait")}</CardDescription>
          </CardHeader>
          <CardContent />
        </Card>
      </div>
    );
  }

  if (!data?.node) {
    return (
      <div className="space-y-8">
        <PageHeader title={t("notFound")} subtitle={t("itemNotFoundDesc")} icon={<Icon name={pageIcon} className="h-5 w-5" />} />
        <Card className="bg-card/70 backdrop-blur shadow-sm">
          <CardContent className="p-6 text-sm text-muted-foreground">{t("itemNotFoundDesc")}</CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title={title}
        subtitle={
          childType
            ? t("exploreChildTypeAndKpisDesc", { type: childType.displayName })
            : t("exploreHierarchyDesc")
        }
        icon={<Icon name={pageIcon} className="h-5 w-5" />}
      />

      <Card className="bg-card/70 backdrop-blur shadow-sm">
        <CardHeader className="space-y-3">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: data.node.color }} />
                {title}
              </CardTitle>
              <CardDescription>
                {currentTypeLabel}
                {df(data.node.parent?.name, data.node.parent?.nameAr) ? ` • ${t("parent")}: ${df(data.node.parent?.name, data.node.parent?.nameAr)}` : ""}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={data.node.status as Status} />
              <Badge variant="outline" className="border-white/10 bg-white/5">
                {t("kpis")}: {data.kpis.length}
              </Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      {childType ? (
        <Card className="bg-card/70 backdrop-blur shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">{childType.displayName}</CardTitle>
            <CardDescription>{t("clickToOpenPageDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            {data.children.length ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {data.children.map((c) => (
                  <Card key={c.id} className="bg-card/50 backdrop-blur shadow-sm">
                    <CardHeader className="space-y-2">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                        <Link href={`/${locale}/nodes/${childType.code}/${c.id}`} className="hover:underline">
                          {df(c.name, c.nameAr)}
                        </Link>
                      </CardTitle>
                      {df(c.description, c.descriptionAr) ? <CardDescription className="line-clamp-2">{df(c.description, c.descriptionAr)}</CardDescription> : null}
                      <div className="flex items-center gap-2">
                        <StatusBadge status={c.status as Status} />
                        {grandChildTypeLabel ? (
                          <Badge variant="outline" className="border-white/10 bg-white/5">
                            {grandChildTypeLabel}: {c._count.children}
                          </Badge>
                        ) : null}
                        <Badge variant="outline" className="border-white/10 bg-white/5">
                          {t("kpis")}: {c._count.kpis}
                        </Badge>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="rounded-md border border-border bg-card/50 p-6 text-sm text-muted-foreground">
                {t("noChildItemsOfTypeYet", { type: childType.displayName })}
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}

      <Card className="bg-card/70 backdrop-blur shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">{t("kpisSubtree")}</CardTitle>
          <CardDescription>{t("allKpisLinkedToItemDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-xl border border-border">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>{t("kpi")}</TableHead>
                  <TableHead>{t("owner")}</TableHead>
                  <TableHead>{t("linkedTo")}</TableHead>
                  <TableHead>{t("target")}</TableHead>
                  <TableHead>{t("baseline")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.kpis.map((k) => (
                  <TableRow key={k.id} className="hover:bg-card/40">
                    <TableCell className="font-medium">
                      <Link href={`/${locale}/kpis/${k.id}`} className="hover:underline">
                        {df(k.name, k.nameAr)}
                      </Link>
                      {df(k.unit, k.unitAr) ? <span className="ms-2 text-xs text-muted-foreground">({df(k.unit, k.unitAr)})</span> : null}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{k.ownerUser?.name ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {df(k.primaryNode?.name, k.primaryNode?.nameAr) || "—"}
                      {k.primaryNode?.nodeType?.displayName ? (
                        <span className="ms-2 text-xs text-muted-foreground">
                          ({nodeTypeLabel(String(k.primaryNode.nodeType.code), df(k.primaryNode.nodeType.displayName, k.primaryNode.nodeType.nameAr))})
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{typeof k.targetValue === "number" ? k.targetValue : "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{typeof k.baselineValue === "number" ? k.baselineValue : "—"}</TableCell>
                  </TableRow>
                ))}

                {data.kpis.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                      {t("noKpisFound")}
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
