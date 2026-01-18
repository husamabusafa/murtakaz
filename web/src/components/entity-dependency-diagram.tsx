"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

interface EntityNode {
  id: string;
  key: string;
  title: string;
  titleAr: string | null;
  formula: string | null;
  entityType: { code: string; name: string; nameAr: string | null };
  dependencies: EntityNode[];
}

interface EntityDependencyDiagramProps {
  tree: EntityNode | null;
  locale: string;
  loading?: boolean;
}

export function EntityDependencyDiagram({ tree, locale, loading }: EntityDependencyDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mermaidRef = useRef<typeof import("mermaid").default | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rendering, setRendering] = useState(false);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const mod = await import("mermaid");
        const m = mod.default;
        mermaidRef.current = m;
        m.initialize({
          startOnLoad: false,
          theme: "dark",
          securityLevel: "loose",
          themeVariables: {
            primaryColor: "#60a5fa",
            primaryTextColor: "#e2e8f0",
            primaryBorderColor: "#3b82f6",
            lineColor: "#64748b",
            secondaryColor: "#1e293b",
            tertiaryColor: "#0f172a",
            background: "#020617",
            mainBkg: "#0f172a",
            secondBkg: "#1e293b",
            darkMode: true,
          },
          flowchart: {
            curve: "basis",
            padding: 20,
            htmlLabels: true,
          },
        });
        setInitialized(true);
      } catch (e) {
        console.error("Failed to init mermaid:", e);
        setError(e instanceof Error ? e.message : "Failed to initialize diagram renderer");
      }
    };

    void init();
  }, []);

  useEffect(() => {
    if (!initialized) return;
    if (!tree || !containerRef.current) return;
    const mermaid = mermaidRef.current;
    if (!mermaid) return;

    const renderDiagram = async () => {
      setRendering(true);
      setError(null);

      try {
        const mermaidSyntax = generateMermaidSyntax(tree, locale);
        
        const container = containerRef.current;
        if (!container) return;

        container.innerHTML = "";

        const { svg } = await mermaid.render(`mermaid-${tree.id}`, mermaidSyntax);
        container.innerHTML = svg;

        const svgElement = container.querySelector("svg");
        if (svgElement) {
          svgElement.style.maxWidth = "100%";
          svgElement.style.height = "auto";
        }
      } catch (err) {
        console.error("Failed to render Mermaid diagram:", err);
        setError(err instanceof Error ? err.message : "Failed to render diagram");
      } finally {
        setRendering(false);
      }
    };

    void renderDiagram();
  }, [initialized, tree, locale]);

  if (loading || rendering) {
    return (
      <Card className="bg-card/70 backdrop-blur shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">
            {locale === "ar" ? "شجرة الاعتماديات" : "Dependency Tree"}
          </CardTitle>
          <CardDescription>
            {locale === "ar" ? "جارٍ تحميل الرسم البياني..." : "Loading diagram..."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-card/70 backdrop-blur shadow-sm border-destructive/40">
        <CardHeader>
          <CardTitle className="text-base text-destructive">
            {locale === "ar" ? "خطأ في الرسم البياني" : "Diagram Error"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!tree) {
    return (
      <Card className="bg-card/70 backdrop-blur shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">
            {locale === "ar" ? "شجرة الاعتماديات" : "Formula Dependency Tree"}
          </CardTitle>
          <CardDescription>
            {locale === "ar" ? "لا توجد صيغة أو اعتماديات لعرضها." : "No formula dependencies to display."}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="bg-card/70 backdrop-blur shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">
          {locale === "ar" ? "شجرة الاعتماديات" : "Formula Dependency Tree"}
        </CardTitle>
        <CardDescription>
          {locale === "ar" 
            ? "رسم بياني يوضح العلاقات بين الكيانات بناءً على الصيغ" 
            : "Visual representation of entity relationships based on formulas"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div 
          ref={containerRef} 
          className="w-full overflow-x-auto rounded-lg bg-muted/20 p-4"
        />
      </CardContent>
    </Card>
  );
}

function generateMermaidSyntax(tree: EntityNode, locale: string): string {
  const lines: string[] = ["graph TD"];
  const defined = new Set<string>();
  const expanded = new Set<string>();
  const edges = new Set<string>();

  function sanitizeId(id: string): string {
    return id.replace(/[^a-zA-Z0-9]/g, "_");
  }

  function getNodeLabel(node: EntityNode): string {
    const title = locale === "ar" && node.titleAr ? node.titleAr : node.title;
    const typeLabel = locale === "ar" && node.entityType.nameAr 
      ? node.entityType.nameAr 
      : node.entityType.name;
    const safeTitle = escapeHtml(String(title ?? ""));
    const safeKey = escapeHtml(String(node.key ?? ""));
    const safeType = escapeHtml(String(typeLabel ?? ""));
    return `${safeTitle}<br/>${safeKey}<br/>${safeType}`;
  }

  function ensureNode(node: EntityNode, depth: number) {
    const nodeId = sanitizeId(node.id);

    if (defined.has(nodeId)) return;
    defined.add(nodeId);

    const label = getNodeLabel(node);

    lines.push(`  ${nodeId}["${label}"]:::${depth === 0 ? "root" : "dependency"}`);
  }

  function addEdge(from: EntityNode, to: EntityNode) {
    const fromId = sanitizeId(from.id);
    const toId = sanitizeId(to.id);
    edges.add(`${fromId} --> ${toId}`);
  }

  function expand(node: EntityNode, depth: number) {
    const nodeId = sanitizeId(node.id);
    ensureNode(node, depth);

    if (expanded.has(nodeId)) return;
    expanded.add(nodeId);

    for (const dep of node.dependencies ?? []) {
      ensureNode(dep, depth + 1);
      addEdge(node, dep);
      expand(dep, depth + 1);
    }
  }

  expand(tree, 0);

  for (const e of edges) {
    lines.push(`  ${e}`);
  }

  lines.push("");
  lines.push("  classDef root fill:#60a5fa,stroke:#3b82f6,stroke-width:3px,color:#fff");
  lines.push("  classDef dependency fill:#1e293b,stroke:#64748b,stroke-width:2px,color:#e2e8f0");

  return lines.join("\n");
}

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/\n/g, " ")
    .replace(/\r/g, " ");
}
