"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Download, Search } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  fetchSubmissionPayload,
  listSubmissions,
  type SubmissionSummary,
} from "@/lib/indexer";
import type { FormSchema, Submission } from "@/lib/schema";
import { exportCSV, exportJSON } from "@/lib/export";
import { shortAddress } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { SubmissionDetail } from "./submission-detail";

const STATUS_LABELS = ["new", "in progress", "resolved", "spam"] as const;
const STATUS_VARIANTS = ["info", "warning", "success", "danger"] as const;
const PRIORITY_LABELS = ["low", "med", "high", "urgent"] as const;

export function SubmissionsInbox({
  formId,
  schema,
}: {
  formId: string;
  schema: FormSchema;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedId = searchParams.get("sub");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: subs = [], refetch } = useQuery({
    queryKey: ["submissions", formId],
    queryFn: () => listSubmissions(formId),
  });

  const { data: payloads = {} } = useQuery({
    queryKey: ["submission-payloads", formId, subs.map((s) => s.id).join(",")],
    queryFn: async () => {
      const out: Record<string, Submission> = {};
      await Promise.all(
        subs.map(async (s) => {
          try {
            out[s.id] = await fetchSubmissionPayload(s.blobId);
          } catch {}
        }),
      );
      return out;
    },
    enabled: subs.length > 0,
  });

  const fields = useMemo(() => schema.sections.flatMap((s) => s.fields), [schema]);

  const filtered = useMemo(() => {
    return subs.filter((s) => {
      if (statusFilter !== "all" && String(s.status) !== statusFilter) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      if (s.submitter.toLowerCase().includes(q)) return true;
      const p = payloads[s.id];
      if (p) {
        for (const v of Object.values(p.fields)) {
          if (v.kind === "plaintext" && JSON.stringify(v.value).toLowerCase().includes(q))
            return true;
        }
      }
      return false;
    });
  }, [subs, payloads, search, statusFilter]);

  // Default-select first row if nothing selected yet
  useEffect(() => {
    if (!selectedId && filtered.length > 0) {
      router.replace(`?sub=${filtered[0].id}`, { scroll: false });
    }
  }, [selectedId, filtered, router]);

  // Keyboard nav (↑/↓ and j/k)
  useEffect(() => {
    if (filtered.length === 0) return;
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement) {
        const tag = e.target.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || e.target.isContentEditable) return;
      }
      const idx = filtered.findIndex((s) => s.id === selectedId);
      if (e.key === "ArrowDown" || e.key === "j") {
        e.preventDefault();
        const next = filtered[Math.min(filtered.length - 1, idx + 1)];
        if (next) router.replace(`?sub=${next.id}`, { scroll: false });
      } else if (e.key === "ArrowUp" || e.key === "k") {
        e.preventDefault();
        const prev = filtered[Math.max(0, idx - 1)];
        if (prev) router.replace(`?sub=${prev.id}`, { scroll: false });
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [filtered, selectedId, router]);

  const selected = filtered.find((s) => s.id === selectedId) ?? null;

  function doExport(kind: "csv" | "json") {
    const rows = filtered.map((s) => ({ summary: s, payload: payloads[s.id] }));
    if (kind === "csv") exportCSV(schema, rows);
    else exportJSON(schema, rows);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search submissions…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36 h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUS_LABELS.map((l, i) => (
              <SelectItem key={l} value={String(i)}>
                {l}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" variant="outline" onClick={() => doExport("csv")}>
          <Download className="h-3.5 w-3.5" /> CSV
        </Button>
        <Button size="sm" variant="outline" onClick={() => doExport("json")}>
          <Download className="h-3.5 w-3.5" /> JSON
        </Button>
        <span className="text-xs text-muted-foreground ml-auto hidden md:inline">
          ↑ / ↓ to navigate
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-3 h-[calc(100vh-16rem)] min-h-[400px]">
        <Card className="overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No submissions match.
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {filtered.map((s) => {
                const p = payloads[s.id];
                const preview = p
                  ? Object.values(p.fields).find((v) => v.kind === "plaintext")
                  : undefined;
                const previewText =
                  preview?.kind === "plaintext"
                    ? String(preview.value).slice(0, 64)
                    : p && Object.values(p.fields).some((v) => v.kind === "encrypted")
                      ? "🔒 encrypted submission"
                      : "—";
                const isActive = s.id === selectedId;
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => router.replace(`?sub=${s.id}`, { scroll: false })}
                      className={cn(
                        "w-full text-left px-3 py-2.5 hover:bg-muted/30 transition-colors block",
                        isActive && "bg-sky-50 dark:bg-sky-950/30 border-l-2 border-l-sky-500",
                      )}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <Badge variant={STATUS_VARIANTS[s.status] ?? "outline"}>
                          {STATUS_LABELS[s.status] ?? "?"}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                          {formatDistanceToNow(new Date(s.submittedAtMs), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                      <p className="text-xs font-mono text-muted-foreground truncate">
                        {shortAddress(s.submitter)}
                      </p>
                      <p className="text-xs text-foreground/80 truncate mt-1">
                        {previewText}
                      </p>
                      <div className="flex gap-1 mt-1.5">
                        {s.priority !== 1 && (
                          <span className="text-[9px] text-muted-foreground uppercase tracking-wide">
                            {PRIORITY_LABELS[s.priority]}
                          </span>
                        )}
                        {s.tags.length > 0 &&
                          s.tags.slice(0, 2).map((t) => (
                            <Badge key={t} variant="outline" className="text-[9px] py-0">
                              {t}
                            </Badge>
                          ))}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card className="overflow-y-auto">
          {selected ? (
            <SubmissionDetail
              submission={selected}
              payload={payloads[selected.id]}
              formId={formId}
              fields={fields}
              onChanged={() => refetch()}
            />
          ) : (
            <div className="h-full flex items-center justify-center text-sm text-muted-foreground p-8 text-center">
              Select a submission to view details.
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
