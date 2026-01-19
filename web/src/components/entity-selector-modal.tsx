"use client";

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { KpiGauge } from "@/components/charts/kpi-gauge";
import { useLocale } from "@/providers/locale-provider";
import { getAllOrgEntities } from "@/actions/entities";

const TYPE_ORDER = ["PILLAR", "OBJECTIVE", "DEPARTMENT", "INITIATIVE", "KPI"];

type EntityRow = {
  id: string;
  key: string | null;
  title: string;
  titleAr: string | null;
  status: string | null;
  unit: string | null;
  unitAr: string | null;
  targetValue: number | null;
  orgEntityType: {
    code: string;
    name: string;
    nameAr: string | null;
  };
  values: Array<{
    createdAt: Date;
    actualValue: number | null;
    calculatedValue: number | null;
    finalValue: number | null;
    status: string;
  }>;
};

type EntitySelectorModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (entityKey: string) => void;
};

export function EntitySelectorModal({ open, onOpenChange, onSelect }: EntitySelectorModalProps) {
  const { df, tr, formatNumber } = useLocale();
  const [entities, setEntities] = useState<EntityRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    if (!open) return;

    let mounted = true;
    setLoading(true);

    void (async () => {
      try {
        const result = await getAllOrgEntities();
        if (!mounted) return;
        setEntities(result);
      } catch (error) {
        console.error("Failed to load entities:", error);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [open]);

  const entitiesWithKeys = useMemo(() => {
    return (entities ?? []).filter((e) => e.key && e.key.trim().length > 0);
  }, [entities]);

  const normalizedSearch = searchQuery.trim().toLowerCase();

  const filteredBySearch = useMemo(() => {
    if (!normalizedSearch) return entitiesWithKeys;

    return entitiesWithKeys.filter((entity) => {
      const title = entity.title.toLowerCase();
      const titleAr = entity.titleAr?.toLowerCase() ?? "";
      const key = entity.key?.toLowerCase() ?? "";
      const typeCode = entity.orgEntityType.code.toLowerCase();

      return title.includes(normalizedSearch) || titleAr.includes(normalizedSearch) || key.includes(normalizedSearch) || typeCode.includes(normalizedSearch);
    });
  }, [entitiesWithKeys, normalizedSearch]);

  const types = useMemo(() => {
    const codes = new Set<string>();
    for (const e of entitiesWithKeys) {
      const code = String(e.orgEntityType.code ?? "").toUpperCase();
      if (code) codes.add(code);
    }

    const ordered = TYPE_ORDER.filter((c) => codes.has(c));
    const remaining = Array.from(codes)
      .filter((c) => !TYPE_ORDER.includes(c))
      .sort();
    return [...ordered, ...remaining];
  }, [entitiesWithKeys]);

  const filteredByTab = useMemo(() => {
    if (activeTab === "all") return filteredBySearch;
    return filteredBySearch.filter((e) => String(e.orgEntityType.code ?? "").toUpperCase() === activeTab);
  }, [activeTab, filteredBySearch]);

  function latestEntityValue(entity: EntityRow) {
    const latest = entity.values?.[0];
    if (!latest) return null;
    if (typeof latest.finalValue === "number") return latest.finalValue;
    if (typeof latest.calculatedValue === "number") return latest.calculatedValue;
    if (typeof latest.actualValue === "number") return latest.actualValue;
    return null;
  }

  function handleSelect(entityKey: string) {
    onSelect(entityKey);
    onOpenChange(false);
    setSearchQuery("");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{tr("Select Entity", "اختر الكيان")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 flex-1 flex flex-col min-h-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={tr("Search entities...", "ابحث عن الكيانات...")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              {tr("Loading entities...", "جاري تحميل الكيانات...")}
            </div>
          ) : entitiesWithKeys.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              {tr("No entities with keys found", "لا توجد كيانات بمفاتيح")}
            </div>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 min-h-0 flex flex-col">
              <TabsList className="w-full justify-start overflow-x-auto">
                <TabsTrigger value="all">{tr("All", "الكل")}</TabsTrigger>
                {types.map((typeCode) => (
                  <TabsTrigger key={typeCode} value={typeCode}>
                    {typeCode}
                  </TabsTrigger>
                ))}
              </TabsList>

              <TabsContent value={activeTab} className="flex-1 min-h-0">
                {filteredByTab.length === 0 ? (
                  <div className="flex items-center justify-center py-10 text-muted-foreground">
                    {tr("No matching entities", "لا توجد نتائج")}
                  </div>
                ) : (
                  <div className="flex-1 min-h-0 overflow-y-auto pr-2">
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {filteredByTab.map((entity) => {
                        const latest = latestEntityValue(entity);
                        const unit = df(entity.unit, entity.unitAr) || undefined;
                        const target = typeof entity.targetValue === "number" ? entity.targetValue : null;
                        const typeLabel = df(entity.orgEntityType.name, entity.orgEntityType.nameAr) || String(entity.orgEntityType.code);

                        return (
                          <button
                            key={entity.id}
                            type="button"
                            onClick={() => handleSelect(entity.key!)}
                            className="text-left"
                          >
                            <Card className="bg-card/50 backdrop-blur shadow-sm overflow-hidden hover:border-primary/40 transition-colors">
                              <CardHeader className="space-y-2">
                                <div className="min-w-0">
                                  <CardTitle className="truncate text-base">{df(entity.title, entity.titleAr)}</CardTitle>
                                  <CardDescription className="truncate">
                                    {typeLabel}
                                    {entity.key ? ` • ${String(entity.key)}` : ""}
                                  </CardDescription>
                                </div>
                              </CardHeader>

                              <CardContent className="space-y-3">
                                <KpiGauge value={latest} target={target} unit={unit} height={150} withCard={false} />

                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                  <span>{tr("Value", "القيمة")}</span>
                                  <span dir="ltr">
                                    {latest === null ? "—" : formatNumber(latest)}
                                    {unit ? ` ${unit}` : ""}
                                  </span>
                                </div>
                              </CardContent>
                            </Card>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}

          <div className="flex justify-end pt-2 border-t">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              {tr("Cancel", "إلغاء")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
