"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Icon } from "@/components/icon";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useLocale } from "@/providers/locale-provider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/providers/auth-provider";
import { EChart } from "@/components/charts/echart";
import type { EChartsOption } from "echarts";
import { useMemo, useState } from "react";
import {
  addKpiMeasurement,
  createDefaultKpi,
  createKpiTargetChangeRequest,
  getBaseKPI,
  kpiStorageKey,
  createPlaceholderKpi,
  type PrototypeKPI,
  useStoredEntity,
} from "@/lib/prototype-store";

export default function KPIDetailPage() {
  const params = useParams<{ kpiId: string }>();
  const { locale, tr, isArabic } = useLocale();
  const { user } = useAuth();

  const base = getBaseKPI(params.kpiId);
  const { value: kpi, update, hydrated } = useStoredEntity<PrototypeKPI>(
    kpiStorageKey(params.kpiId),
    base ? createDefaultKpi(base) : createPlaceholderKpi(params.kpiId),
  );

  const measurementSeries = useMemo(() => {
    const points = kpi.measurements.length
      ? kpi.measurements
      : [
          { id: "seed", date: new Date().toISOString().slice(0, 10), value: kpi.current, note: "Seeded from demo data" },
        ];
    return points;
  }, [kpi]);

  const trendOption = useMemo<EChartsOption>(() => {
    const dates = measurementSeries.map((m) => m.date);
    const values = measurementSeries.map((m) => m.value);
    return {
      grid: { left: 24, right: 16, top: 18, bottom: 28, containLabel: true },
      tooltip: {
        trigger: "axis",
        confine: true,
        backgroundColor: "rgba(2,6,23,0.9)",
        borderColor: "rgba(255,255,255,0.12)",
      },
      xAxis: { type: "category", data: dates, axisLabel: { color: "rgba(226,232,240,0.75)" } },
      yAxis: { type: "value", axisLabel: { color: "rgba(226,232,240,0.75)" }, splitLine: { lineStyle: { color: "rgba(148,163,184,0.12)" } } },
      series: [
        {
          type: "line",
          data: values,
          smooth: true,
          symbol: "circle",
          symbolSize: 6,
          lineStyle: { width: 3, color: "#60a5fa" },
          itemStyle: { color: "#60a5fa" },
          areaStyle: { color: "rgba(96,165,250,0.18)" },
          markLine: {
            symbol: "none",
            lineStyle: { color: "rgba(52,211,153,0.55)", type: "dashed" },
            label: { color: "rgba(226,232,240,0.75)" },
            data: [{ yAxis: kpi.target, name: "Target" }],
          },
        },
      ],
    };
  }, [kpi.target, measurementSeries]);

  if (!hydrated) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-white">
        <p className="text-sm text-slate-200">{tr("Loading KPI…", "جارٍ تحميل المؤشر…")}</p>
      </div>
    );
  }

  if (!base && kpi.name === "Unknown KPI") {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-white">
        <p className="text-sm text-slate-200">{tr("KPI not found.", "المؤشر غير موجود.")}</p>
        <Link href={`/${locale}/kpis`} className="mt-3 inline-flex text-sm font-semibold text-indigo-200 hover:text-indigo-100">
          {tr("Back to KPIs", "العودة إلى المؤشرات")}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title={isArabic ? kpi.nameAr ?? kpi.name : kpi.name}
        subtitle={`${(isArabic ? kpi.lineage.pillarAr : kpi.lineage.pillar) ?? "—"} • ${(isArabic ? kpi.lineage.initiativeAr : kpi.lineage.initiative) ?? "—"} • ${(isArabic ? kpi.lineage.projectAr : kpi.lineage.project) ?? "—"}`}
        icon={<Icon name="tabler:chart-line" className="h-5 w-5" />}
      />

      <Tabs defaultValue="summary" className="space-y-6">
        <TabsList className="border border-white/10 bg-white/5">
          <TabsTrigger value="summary" className="data-[state=active]:bg-white/10 data-[state=active]:text-white">
            {tr("Summary", "ملخص")}
          </TabsTrigger>
          <TabsTrigger value="measurements" className="data-[state=active]:bg-white/10 data-[state=active]:text-white">
            {tr("Measurements", "القياسات")}
          </TabsTrigger>
          <TabsTrigger value="governance" className="data-[state=active]:bg-white/10 data-[state=active]:text-white">
            {tr("Governance", "الحوكمة")}
          </TabsTrigger>
          <TabsTrigger value="changes" className="data-[state=active]:bg-white/10 data-[state=active]:text-white">
            {tr("Change log", "سجل التغييرات")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="grid gap-6 lg:grid-cols-3">
          <Card className="border-white/10 bg-white/5 text-white shadow-lg shadow-black/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Icon name="tabler:target-arrow" className="h-4 w-4 text-slate-100" />
                {tr("Current vs target", "الحالي مقابل المستهدف")}
              </CardTitle>
              <CardDescription className="text-slate-200">{tr("At-a-glance KPI performance.", "نظرة سريعة على أداء المؤشر.")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3">
                <p className="text-xs text-slate-200">{tr("Current", "الحالي")}</p>
                <p className="text-2xl font-semibold text-white">
                  <span dir="ltr">
                    {kpi.current}
                    {kpi.unit}
                  </span>
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3">
                <p className="text-xs text-slate-200">{tr("Target", "المستهدف")}</p>
                <p className="text-2xl font-semibold text-white">
                  <span dir="ltr">
                    {kpi.target}
                    {kpi.unit}
                  </span>
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3">
                <p className="text-xs text-slate-200">{tr("Variance", "الانحراف")}</p>
                <p className={`text-2xl font-semibold ${kpi.variance < 0 ? "text-rose-200" : "text-emerald-200"}`}>
                  <span dir="ltr">
                    {kpi.variance > 0 ? "+" : ""}
                    {kpi.variance}
                    {kpi.unit}
                  </span>
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/5 text-white shadow-lg shadow-black/20 lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Icon name="tabler:chart-line" className="h-4 w-4 text-slate-100" />
                {tr("Trend", "الاتجاه")}
              </CardTitle>
              <CardDescription className="text-slate-200">{tr("Manual measurements with target reference line.", "قياسات يدوية مع خط مرجعي للمستهدف.")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-4">
                <EChart option={trendOption} height={280} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="measurements" className="space-y-6">
          <Card className="border-white/10 bg-white/5 text-white shadow-lg shadow-black/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Icon name="tabler:plus" className="h-4 w-4 text-slate-100" />
                {tr("Add measurement", "إضافة قياس")}
              </CardTitle>
              <CardDescription className="text-slate-200">{tr("Record a periodic value with date and optional note.", "تسجيل قيمة دورية مع التاريخ وملاحظة اختيارية.")}</CardDescription>
            </CardHeader>
            <CardContent>
              <MeasurementEditor
                unit={kpi.unit}
                onSubmit={(m) =>
                  update(addKpiMeasurement(kpi, m))
                }
              />
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/5 text-white shadow-lg shadow-black/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Icon name="tabler:table" className="h-4 w-4 text-slate-100" />
                {tr("Measurement history", "سجل القياسات")}
              </CardTitle>
              <CardDescription className="text-slate-200">{tr("Latest values (sorted by date).", "آخر القيم (مرتبة حسب التاريخ).")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-hidden rounded-xl border border-white/10">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/10 hover:bg-white/0">
                      <TableHead className="text-slate-200">{tr("Date", "التاريخ")}</TableHead>
                      <TableHead className="text-slate-200">{tr("Value", "القيمة")}</TableHead>
                      <TableHead className="text-slate-200">{tr("Note", "ملاحظة")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {measurementSeries
                      .slice()
                      .reverse()
                      .map((m) => (
                        <TableRow key={m.id} className="border-white/10 hover:bg-white/5">
                          <TableCell className="text-white">{m.date}</TableCell>
                          <TableCell className="text-slate-100">
                            {m.value}
                            {kpi.unit}
                          </TableCell>
                          <TableCell className="text-slate-200">{m.note ?? "—"}</TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="governance" className="grid gap-6 lg:grid-cols-3">
          <Card className="border-white/10 bg-white/5 text-white shadow-lg shadow-black/20 lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Icon name="tabler:gavel" className="h-4 w-4 text-slate-100" />
                {tr("Governance", "الحوكمة")}
              </CardTitle>
              <CardDescription className="text-slate-200">{tr("Ownership, frequency, and data freshness.", "الملكية والدورية وحداثة البيانات.")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-100">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-200">{tr("Owner", "المالك")}</p>
                  <p className="mt-1 text-white">{kpi.owner}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-200">{tr("Frequency", "الدورية")}</p>
                  <p className="mt-1 text-white">{kpi.frequency}</p>
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-200">{tr("Freshness", "الحداثة")}</p>
                <p className="mt-1 text-white">
                  {kpi.freshnessDays} {tr("days since last update", "يومًا منذ آخر تحديث")}
                </p>
              </div>
              <Separator className="bg-white/10" />
              <div className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-200">{tr("Description", "الوصف")}</p>
                <p className="mt-1 text-slate-100">{kpi.description ?? "—"}</p>
              </div>
            </CardContent>
          </Card>

          <TargetChangeCard
            kpi={kpi}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            requestedBy={((user as any)?.department as string | undefined) ?? user?.name ?? "User"}
            onRequest={(nextTarget) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const requestedBy = ((user as any)?.department as string | undefined) ?? user?.name ?? "User";
              const cr = createKpiTargetChangeRequest({ kpi, requestedBy, nextTarget });
              update({
                ...kpi,
                changeLog: [
                  { id: `log-${Date.now()}`, at: new Date().toISOString(), actor: user?.name ?? "User", message: `Requested target change to ${nextTarget}${kpi.unit} (${cr.id})` },
                  ...kpi.changeLog,
                ],
              });
              return cr.id;
            }}
          />
        </TabsContent>

        <TabsContent value="changes">
          <Card className="border-white/10 bg-white/5 text-white shadow-lg shadow-black/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Icon name="tabler:history" className="h-4 w-4 text-slate-100" />
                {tr("Change log", "سجل التغييرات")}
              </CardTitle>
              <CardDescription className="text-slate-200">{tr("Audit-style timeline of KPI activity (prototype).", "سجل زمني بأسلوب التدقيق لنشاط المؤشر (نموذج أولي).")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {kpi.changeLog.length === 0 ? (
                <p className="text-sm text-slate-200">{tr("No activity recorded yet.", "لا يوجد نشاط مسجل حتى الآن.")}</p>
              ) : (
                kpi.changeLog.map((entry) => (
                  <div key={entry.id} className="rounded-xl border border-white/10 bg-slate-950/40 px-4 py-3">
                    <p className="text-sm font-semibold text-white">{entry.message}</p>
                    <p className="mt-1 text-xs text-slate-200">
                      {entry.actor} • {new Date(entry.at).toLocaleString()}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MeasurementEditor({
  unit,
  onSubmit,
}: {
  unit: string;
  onSubmit: (m: { date: string; value: number; note?: string }) => void;
}) {
  const { tr } = useLocale();
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [value, setValue] = useState("");
  const [note, setNote] = useState("");

  return (
    <div className="grid gap-3 md:grid-cols-3">
      <div className="space-y-2">
        <p className="text-sm font-semibold text-white">{tr("Date", "التاريخ")}</p>
        <Input value={date} onChange={(e) => setDate(e.target.value)} type="date" className="border-white/10 bg-black/20 text-white" />
      </div>
      <div className="space-y-2">
        <p className="text-sm font-semibold text-white">{tr("Value", "القيمة")}</p>
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          inputMode="decimal"
          placeholder={tr(`e.g. 12${unit}`, `مثال: 12${unit}`)}
          className="border-white/10 bg-black/20 text-white placeholder:text-slate-400"
        />
      </div>
      <div className="space-y-2 md:col-span-3">
        <p className="text-sm font-semibold text-white">{tr("Note (optional)", "ملاحظة (اختياري)")}</p>
        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={tr("Add context for this measurement…", "أضف سياقًا لهذا القياس…")}
          className="border-white/10 bg-black/20 text-white placeholder:text-slate-400"
        />
      </div>
      <div className="md:col-span-3">
        <Button
          className="bg-white text-slate-900 hover:bg-slate-100"
          disabled={!date || value.trim().length === 0 || Number.isNaN(Number(value))}
          onClick={() => {
            onSubmit({ date, value: Number(value), note: note.trim() || undefined });
            setValue("");
            setNote("");
          }}
        >
          <span className="inline-flex items-center gap-2">
            <Icon name="tabler:plus" className="h-4 w-4" />
            {tr("Add measurement", "إضافة قياس")}
          </span>
        </Button>
      </div>
    </div>
  );
}

function TargetChangeCard({
  kpi,
  requestedBy,
  onRequest,
}: {
  kpi: PrototypeKPI;
  requestedBy: string;
  onRequest: (nextTarget: number) => string;
}) {
  const { locale, tr } = useLocale();
  const [nextTarget, setNextTarget] = useState(String(kpi.target));
  const [createdId, setCreatedId] = useState<string | null>(null);

  return (
    <Card className="border-white/10 bg-white/5 text-white shadow-lg shadow-black/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon name="tabler:edit" className="h-4 w-4 text-slate-100" />
          {tr("Propose target change", "اقتراح تغيير المستهدف")}
        </CardTitle>
        <CardDescription className="text-slate-200">{tr("Creates an approval request for PMO review (prototype).", "ينشئ طلب موافقة لمراجعة PMO (نموذج أولي).")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm font-semibold text-white">{tr("New target", "المستهدف الجديد")}</p>
          <Input
            value={nextTarget}
            onChange={(e) => setNextTarget(e.target.value)}
            inputMode="decimal"
            className="border-white/10 bg-black/20 text-white"
          />
          <p className="text-xs text-slate-300">
            {tr("Requested by:", "مقدم الطلب:")} {requestedBy}
          </p>
        </div>

        <Button
          className="w-full bg-white text-slate-900 hover:bg-slate-100"
          disabled={Number.isNaN(Number(nextTarget)) || Number(nextTarget) === kpi.target}
          onClick={() => setCreatedId(onRequest(Number(nextTarget)))}
        >
          <span className="inline-flex items-center gap-2">
            <Icon name="tabler:gavel" className="h-4 w-4" />
            {tr("Submit for approval", "إرسال للموافقة")}
          </span>
        </Button>

        {createdId ? (
          <Link href={`/${locale}/approvals/${createdId}`} className="inline-flex text-sm font-semibold text-indigo-200 hover:text-indigo-100">
            {tr("View request", "عرض الطلب")} {createdId}
          </Link>
        ) : null}
      </CardContent>
    </Card>
  );
}
