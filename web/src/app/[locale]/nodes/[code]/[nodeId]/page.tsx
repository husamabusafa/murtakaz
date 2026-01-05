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
import { getOrgAdminNodeDetail } from "@/actions/org-admin";
import type { Status } from "@prisma/client";

type Detail = Awaited<ReturnType<typeof getOrgAdminNodeDetail>>;

function normalizeCode(code: string) {
  return code.trim().toLowerCase();
}

export default function NodeDetailPage() {
  const params = useParams<{ code: string; nodeId: string }>();
  const { tr, locale } = useLocale();
  const { user, loading: sessionLoading } = useAuth();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userRole = (user as any)?.role as string | undefined;

  const code = typeof params?.code === "string" ? params.code : "";
  const nodeId = typeof params?.nodeId === "string" ? params.nodeId : "";
  const normalizedCode = useMemo(() => normalizeCode(code), [code]);

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Detail>(null);

  useEffect(() => {
    if (sessionLoading) return;
    if (userRole !== "ADMIN") return;
    if (!code || !nodeId) return;

    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const result = await getOrgAdminNodeDetail({ code, nodeId });
        if (!mounted) return;
        setData(result);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [code, nodeId, sessionLoading, userRole]);

  const title = data?.node?.name ?? tr("Node", "عقدة");

  const currentTypeLabel = useMemo(() => {
    const t = data?.enabledNodeTypes?.find((x) => String(x.code).toLowerCase() === normalizedCode);
    return t?.displayName ?? code.toUpperCase();
  }, [code, data?.enabledNodeTypes, normalizedCode]);

  const childType = useMemo(() => {
    if (!data?.enabledNodeTypes?.length || !data?.node?.nodeType?.code) return null;
    const enabled = data.enabledNodeTypes;
    const idx = enabled.findIndex((t) => String(t.code) === String(data.node.nodeType.code));
    if (idx < 0) return null;
    const next = enabled[idx + 1];
    if (!next) return null;
    return {
      code: String(next.code).toLowerCase(),
      displayName: next.displayName,
    };
  }, [data?.enabledNodeTypes, data?.node?.nodeType?.code]);

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
        <PageHeader title={title} subtitle={tr("Loading...", "جارٍ التحميل...")} icon={<Icon name={pageIcon} className="h-5 w-5" />} />
        <Card className="bg-card/70 backdrop-blur shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">{tr("Loading", "جارٍ التحميل")}</CardTitle>
            <CardDescription>{tr("Please wait", "يرجى الانتظار")}</CardDescription>
          </CardHeader>
          <CardContent />
        </Card>
      </div>
    );
  }

  if (userRole !== "ADMIN") {
    return (
      <div className="space-y-8">
        <PageHeader title={title} subtitle={tr("Unauthorized", "غير مصرح")} icon={<Icon name={pageIcon} className="h-5 w-5" />} />
        <Card className="bg-card/70 backdrop-blur shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">{tr("Access denied", "تم رفض الوصول")}</CardTitle>
            <CardDescription>{tr("Only organization admins can access this page.", "هذه الصفحة متاحة لمسؤولي المؤسسة فقط.")}</CardDescription>
          </CardHeader>
          <CardContent />
        </Card>
      </div>
    );
  }

  if (!data?.node) {
    return (
      <div className="space-y-8">
        <PageHeader title={tr("Not found", "غير موجود")} subtitle={tr("Node was not found.", "لم يتم العثور على العقدة.")} icon={<Icon name={pageIcon} className="h-5 w-5" />} />
        <Card className="bg-card/70 backdrop-blur shadow-sm">
          <CardContent className="p-6 text-sm text-muted-foreground">{tr("Node not found.", "العقدة غير موجودة.")}</CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title={title}
        subtitle={tr("Explore children and aggregated KPIs for this node.", "استعرض العقد التابعة والمؤشرات المجمعة لهذه العقدة.")}
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
                {data.node.parent ? ` • ${tr("Parent", "الأعلى")}: ${data.node.parent.name}` : ""}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={data.node.status as Status} />
              <Badge variant="outline" className="border-white/10 bg-white/5">
                {tr("KPIs", "المؤشرات")}: {data.kpis.length}
              </Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card className="bg-card/70 backdrop-blur shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">
            {childType ? tr("Children", "العُقد التابعة") + ` (${childType.displayName})` : tr("Children", "العُقد التابعة")}
          </CardTitle>
          <CardDescription>{tr("Click a child node to open its page.", "اضغط على عقدة تابعة لفتح صفحتها.")}</CardDescription>
        </CardHeader>
        <CardContent>
          {data.children.length ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {data.children.map((c) => (
                <Card key={c.id} className="bg-card/50 backdrop-blur shadow-sm">
                  <CardHeader className="space-y-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                      <Link href={`/${locale}/nodes/${childType?.code ?? normalizedCode}/${c.id}`} className="hover:underline">
                        {c.name}
                      </Link>
                    </CardTitle>
                    {c.description ? <CardDescription className="line-clamp-2">{c.description}</CardDescription> : null}
                    <div className="flex items-center gap-2">
                      <StatusBadge status={c.status as Status} />
                      <Badge variant="outline" className="border-white/10 bg-white/5">
                        {tr("Children", "العُقد التابعة")}: {c._count.children}
                      </Badge>
                      <Badge variant="outline" className="border-white/10 bg-white/5">
                        {tr("KPIs", "المؤشرات")}: {c._count.kpis}
                      </Badge>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          ) : (
            <div className="rounded-md border border-border bg-card/50 p-6 text-sm text-muted-foreground">{tr("No children.", "لا توجد عقد تابعة.")}</div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-card/70 backdrop-blur shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">{tr("KPIs (subtree)", "المؤشرات (ضمن الشجرة)")}</CardTitle>
          <CardDescription>{tr("All KPIs linked to this node or any descendant node.", "كل المؤشرات المرتبطة بهذه العقدة أو أي عقدة تحتها.")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-xl border border-border">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>{tr("KPI", "المؤشر")}</TableHead>
                  <TableHead>{tr("Owner", "المالك")}</TableHead>
                  <TableHead>{tr("Node", "العقدة")}</TableHead>
                  <TableHead>{tr("Target", "المستهدف")}</TableHead>
                  <TableHead>{tr("Baseline", "الأساس")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.kpis.map((k) => (
                  <TableRow key={k.id} className="hover:bg-card/40">
                    <TableCell className="font-medium">
                      <Link href={`/${locale}/kpis/${k.id}`} className="hover:underline">
                        {k.name}
                      </Link>
                      {k.unit ? <span className="ms-2 text-xs text-muted-foreground">({k.unit})</span> : null}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{k.ownerUser?.name ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {k.primaryNode?.name ?? "—"}
                      {k.primaryNode?.nodeType?.displayName ? (
                        <span className="ms-2 text-xs text-muted-foreground">({k.primaryNode.nodeType.displayName})</span>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{typeof k.targetValue === "number" ? k.targetValue : "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{typeof k.baselineValue === "number" ? k.baselineValue : "—"}</TableCell>
                  </TableRow>
                ))}

                {data.kpis.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                      {tr("No KPIs found.", "لا توجد مؤشرات.")}
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
