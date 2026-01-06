"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, ChevronRight, Search } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";

export type NodePickerNode = {
  id: string;
  name: string;
  parentId: string | null;
  nodeType?: { displayName?: string | null } | null;
};

function buildMaps(nodes: NodePickerNode[]) {
  const nodeById = new Map<string, NodePickerNode>();
  const childrenByParent = new Map<string | null, string[]>();

  for (const n of nodes) {
    nodeById.set(n.id, n);
    const list = childrenByParent.get(n.parentId ?? null) ?? [];
    list.push(n.id);
    childrenByParent.set(n.parentId ?? null, list);
  }

  for (const [k, list] of childrenByParent) {
    list.sort((a, b) => {
      const na = nodeById.get(a)?.name ?? "";
      const nb = nodeById.get(b)?.name ?? "";
      return na.localeCompare(nb);
    });
    childrenByParent.set(k, list);
  }

  const roots = childrenByParent.get(null) ?? [];
  return { nodeById, childrenByParent, roots };
}

function buildAncestorSet(input: { startIds: Set<string>; parentById: Map<string, string | null> }) {
  const out = new Set<string>();
  for (const id of input.startIds) {
    let cur: string | null | undefined = id;
    while (cur) {
      const parent = input.parentById.get(cur);
      if (!parent) break;
      out.add(parent);
      cur = parent;
    }
  }
  return out;
}

export function NodePickerTree(props: {
  nodes: NodePickerNode[];
  selectedId: string | null;
  onSelect: (nodeId: string) => void;
  searchPlaceholder: string;
  clearLabel: string;
  typeFallbackLabel: string;
  variant?: "light" | "dark";
  heightClassName?: string;
  showSelectedIndicator?: boolean;
  showClear?: boolean;
}) {
  const { nodeById, childrenByParent, roots } = useMemo(() => buildMaps(props.nodes), [props.nodes]);

  const parentById = useMemo(() => {
    const m = new Map<string, string | null>();
    for (const n of props.nodes) m.set(n.id, n.parentId ?? null);
    return m;
  }, [props.nodes]);

  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    setQuery("");
    setExpanded(new Set(roots));
  }, [roots]);

  const visibleIds = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;

    const matches = new Set<string>();
    for (const n of props.nodes) {
      const label = `${n.nodeType?.displayName ?? props.typeFallbackLabel}: ${n.name}`.toLowerCase();
      if (label.includes(q)) matches.add(n.id);
    }

    const ancestors = buildAncestorSet({ startIds: matches, parentById });
    const all = new Set<string>();
    for (const id of matches) all.add(id);
    for (const id of ancestors) all.add(id);
    return all;
  }, [parentById, props.nodes, props.typeFallbackLabel, query]);

  const hasVisibleSubtree = useMemo(() => {
    if (!visibleIds) return null;
    const memo = new Map<string, boolean>();

    const dfs = (id: string): boolean => {
      const cached = memo.get(id);
      if (typeof cached === "boolean") return cached;

      let ok = visibleIds.has(id);
      for (const child of childrenByParent.get(id) ?? []) {
        if (dfs(child)) ok = true;
      }

      memo.set(id, ok);
      return ok;
    };

    return { dfs };
  }, [childrenByParent, visibleIds]);

  const defaultExpandForQuery = useMemo(() => {
    const q = query.trim();
    if (!q || !visibleIds) return null;

    const toExpand = new Set<string>();
    for (const id of visibleIds) {
      let cur = parentById.get(id);
      while (cur) {
        toExpand.add(cur);
        cur = parentById.get(cur) ?? null;
      }
    }
    return toExpand;
  }, [parentById, query, visibleIds]);

  useEffect(() => {
    if (!defaultExpandForQuery) return;
    setExpanded((prev) => {
      const next = new Set(prev);
      for (const id of defaultExpandForQuery) next.add(id);
      return next;
    });
  }, [defaultExpandForQuery]);

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const variant = props.variant ?? "light";
  const inputClassName =
    variant === "dark"
      ? "border-white/10 bg-black/20 text-white placeholder:text-slate-400"
      : "border-border bg-card text-foreground placeholder:text-muted-foreground";
  const scrollClassName =
    variant === "dark"
      ? "rounded-xl border border-white/10 bg-slate-950/40"
      : "rounded-xl border border-border bg-card";
  const rowHoverClassName = variant === "dark" ? "hover:bg-white/5" : "hover:bg-accent";
  const labelMutedClassName = variant === "dark" ? "text-slate-200" : "text-muted-foreground";
  const checkClassName = variant === "dark" ? "bg-white/10 text-white" : "bg-muted text-foreground";

  const showSelectedIndicator = props.showSelectedIndicator ?? true;
  const showClear = props.showClear ?? true;

  const renderNode = (id: string, depth: number) => {
    if (visibleIds && hasVisibleSubtree && !hasVisibleSubtree.dfs(id)) return null;

    const n = nodeById.get(id);
    if (!n) return null;

    const children = childrenByParent.get(id) ?? [];
    const hasChildren = children.length > 0;
    const isExpanded = expanded.has(id);
    const isSelected = props.selectedId === id;

    return (
      <div key={id}>
        <div
          className={`flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 ${rowHoverClassName}`}
          style={{ paddingLeft: 8 + depth * 16 }}
        >
          <div className="flex min-w-0 flex-1 items-center gap-2">
            {hasChildren ? (
              <button
                type="button"
                onClick={() => toggle(id)}
                className="inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-black/5"
                aria-label={isExpanded ? "Collapse" : "Expand"}
              >
                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>
            ) : (
              <div className="h-7 w-7" />
            )}

            <button
              type="button"
              onClick={() => props.onSelect(id)}
              className="min-w-0 flex-1 text-left"
            >
              <div className="truncate text-sm">
                <span className={labelMutedClassName}>{n.nodeType?.displayName ?? props.typeFallbackLabel}:</span> {n.name}
              </div>
            </button>
          </div>

          {showSelectedIndicator && isSelected ? (
            <div className={`inline-flex h-7 w-7 items-center justify-center rounded-md ${checkClassName}`}>
              <Check className="h-4 w-4" />
            </div>
          ) : null}
        </div>

        {hasChildren && isExpanded ? <div>{children.map((c) => renderNode(c, depth + 1))}</div> : null}
      </div>
    );
  };

  return (
    <div className="grid gap-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={props.searchPlaceholder} className={`pl-9 ${inputClassName}`} />
      </div>

      <ScrollArea className={`${props.heightClassName ?? "h-[420px]"} ${scrollClassName} p-2`}>
        <div className="space-y-0.5">{roots.map((r) => renderNode(r, 0))}</div>
      </ScrollArea>

      {showClear ? (
        <div className="flex justify-end">
          <Button type="button" variant="outline" onClick={() => props.onSelect("")}
          >
            {props.clearLabel}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export function NodePickerDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nodes: NodePickerNode[];
  selectedId: string | null;
  onSelect: (nodeId: string) => void;
  title: string;
  description?: string;
  searchPlaceholder: string;
  clearLabel: string;
  typeFallbackLabel: string;
}) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="sm:max-w-[720px]">
        <DialogHeader>
          <DialogTitle>{props.title}</DialogTitle>
          {props.description ? <DialogDescription>{props.description}</DialogDescription> : null}
        </DialogHeader>

        <NodePickerTree
          nodes={props.nodes}
          selectedId={props.selectedId}
          onSelect={(id) => {
            props.onSelect(id);
            props.onOpenChange(false);
          }}
          searchPlaceholder={props.searchPlaceholder}
          clearLabel={props.clearLabel}
          typeFallbackLabel={props.typeFallbackLabel}
          variant="dark"
        />
      </DialogContent>
    </Dialog>
  );
}
