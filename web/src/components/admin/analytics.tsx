"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, startOfDay } from "date-fns";
import {
  ChartBar,
  CircleAlert,
  CircleCheck,
  Clock,
  Inbox,
  Star,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  fetchSubmissionPayload,
  listSubmissions,
  type SubmissionSummary,
} from "@/lib/indexer";
import type { Field, FormSchema, Submission } from "@/lib/schema";
import { cn } from "@/lib/utils";

const STATUS_LABELS = ["new", "in progress", "resolved", "spam"] as const;
const STATUS_VARIANTS = ["info", "warning", "success", "danger"] as const;
const PRIORITY_LABELS = ["low", "med", "high", "urgent"] as const;

export function Analytics({ formId, schema }: { formId: string; schema: FormSchema }) {
  const { data: subs = [], isLoading: subsLoading } = useQuery({
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
  const aggregates = useMemo(() => computeAggregates(subs), [subs]);
  const fieldStats = useMemo(
    () => computeFieldStats(fields, subs, payloads),
    [fields, subs, payloads],
  );

  if (subsLoading) return <p className="text-sm text-muted-foreground">Loading analytics…</p>;
  if (subs.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          No submissions yet — analytics will appear here as responses come in.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Top KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Kpi
          label="Submissions"
          value={String(aggregates.total)}
          Icon={Inbox}
        />
        <Kpi
          label="Open"
          value={String(aggregates.statusCounts[0] + aggregates.statusCounts[1])}
          hint={`${aggregates.statusCounts[2]} resolved`}
          Icon={Clock}
        />
        <Kpi
          label="High/urgent"
          value={String(aggregates.priorityCounts[2] + aggregates.priorityCounts[3])}
          Icon={CircleAlert}
        />
        <Kpi
          label="Last 7 days"
          value={String(aggregates.last7)}
          hint={
            aggregates.deltaPct === null
              ? undefined
              : `${aggregates.deltaPct > 0 ? "+" : ""}${aggregates.deltaPct.toFixed(0)}% vs prev`
          }
          Icon={TrendingUp}
        />
      </div>

      {/* Sparkline + status/priority breakdowns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <ChartBar className="h-4 w-4" /> Submissions over time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Sparkline points={aggregates.dailyCounts} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {STATUS_LABELS.map((label, i) => (
              <BreakdownRow
                key={label}
                label={label}
                count={aggregates.statusCounts[i]}
                total={aggregates.total}
                variant={STATUS_VARIANTS[i]}
              />
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Per-field charts */}
      {fieldStats.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {fieldStats.map((stat) => (
            <FieldChart key={stat.field.id} stat={stat} />
          ))}
        </div>
      )}

      {/* Skipped fields footer */}
      {aggregates.skippedFields.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Not charted: {aggregates.skippedFields.join(", ")} — free-text, media,
          and encrypted fields aren't aggregated automatically.
        </p>
      )}
    </div>
  );
}

// ---------------- KPI tile ----------------

function Kpi({
  label,
  value,
  hint,
  Icon,
}: {
  label: string;
  value: string;
  hint?: string;
  Icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card>
      <CardContent className="p-4 space-y-1">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">{label}</p>
          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
        <p className="text-2xl font-semibold leading-none">{value}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

// ---------------- Breakdown row ----------------

function BreakdownRow({
  label,
  count,
  total,
  variant,
}: {
  label: string;
  count: number;
  total: number;
  variant: "info" | "warning" | "success" | "danger";
}) {
  const pct = total === 0 ? 0 : (count / total) * 100;
  const colorMap = {
    info: "bg-sky-500",
    warning: "bg-amber-500",
    success: "bg-emerald-500",
    danger: "bg-red-500",
  };
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="capitalize">{label}</span>
        <span className="text-muted-foreground tabular-nums">
          {count} · {pct.toFixed(0)}%
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={cn("h-full rounded-full", colorMap[variant])}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ---------------- Sparkline (last 14 days) ----------------

function Sparkline({ points }: { points: { date: string; count: number }[] }) {
  const w = 600;
  const h = 80;
  const padX = 8;
  const padY = 8;
  const max = Math.max(1, ...points.map((p) => p.count));
  const stepX = (w - padX * 2) / Math.max(1, points.length - 1);

  const coords = points.map((p, i) => {
    const x = padX + i * stepX;
    const y = h - padY - (p.count / max) * (h - padY * 2);
    return { x, y, ...p };
  });

  const linePath = coords
    .map((c, i) => `${i === 0 ? "M" : "L"} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
    .join(" ");
  const areaPath = `${linePath} L ${coords[coords.length - 1].x.toFixed(1)} ${h - padY} L ${coords[0].x.toFixed(1)} ${h - padY} Z`;

  return (
    <div className="space-y-1">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-20" preserveAspectRatio="none">
        <path d={areaPath} fill="rgb(14 165 233 / 0.15)" />
        <path d={linePath} stroke="rgb(14 165 233)" strokeWidth={1.5} fill="none" />
        {coords.map((c) => (
          <circle key={c.date} cx={c.x} cy={c.y} r={2} fill="rgb(14 165 233)">
            <title>
              {c.date} — {c.count}
            </title>
          </circle>
        ))}
      </svg>
      <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
        <span>{points[0]?.date.slice(5)}</span>
        <span>{points[points.length - 1]?.date.slice(5)}</span>
      </div>
    </div>
  );
}

// ---------------- Field chart ----------------

type FieldStat =
  | { kind: "distribution"; field: Field; total: number; rows: { label: string; count: number }[] }
  | {
      kind: "rating";
      field: Field;
      total: number;
      avg: number;
      scale: number;
      rows: { value: number; count: number }[];
    }
  | { kind: "boolean"; field: Field; total: number; yes: number; no: number }
  | {
      kind: "number";
      field: Field;
      total: number;
      avg: number;
      min: number;
      max: number;
    };

function FieldChart({ stat }: { stat: FieldStat }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between gap-2">
          <span className="truncate">{stat.field.label}</span>
          <Badge variant="outline" className="font-normal capitalize">
            {stat.field.type.replace("_", " ")}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {stat.kind === "distribution" && <DistributionChart rows={stat.rows} />}
        {stat.kind === "rating" && <RatingChart stat={stat} />}
        {stat.kind === "boolean" && <BooleanChart stat={stat} />}
        {stat.kind === "number" && <NumberStats stat={stat} />}
      </CardContent>
    </Card>
  );
}

function DistributionChart({ rows }: { rows: { label: string; count: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <div className="space-y-1.5">
      {rows.length === 0 && <p className="text-xs text-muted-foreground">No data.</p>}
      {rows.map((r) => (
        <div key={r.label} className="flex items-center gap-2 text-xs">
          <span className="min-w-0 flex-1 truncate">{r.label}</span>
          <div className="flex-1 h-2 bg-muted rounded overflow-hidden">
            <div
              className="h-full bg-sky-500 rounded"
              style={{ width: `${(r.count / max) * 100}%` }}
            />
          </div>
          <span className="text-muted-foreground tabular-nums w-6 text-right">
            {r.count}
          </span>
        </div>
      ))}
    </div>
  );
}

function RatingChart({ stat }: { stat: Extract<FieldStat, { kind: "rating" }> }) {
  const max = Math.max(1, ...stat.rows.map((r) => r.count));
  return (
    <div className="space-y-2">
      <div className="flex items-baseline gap-2">
        <p className="text-2xl font-semibold">{stat.avg.toFixed(2)}</p>
        <p className="text-xs text-muted-foreground">avg of {stat.total}</p>
      </div>
      <div className="flex items-end gap-1 h-16">
        {stat.rows.map((r) => (
          <div key={r.value} className="flex-1 flex flex-col items-center justify-end gap-1">
            <div
              className="w-full bg-amber-400 rounded-t"
              style={{ height: `${(r.count / max) * 100}%`, minHeight: 1 }}
              title={`${r.count}`}
            />
            <span className="text-[10px] text-muted-foreground inline-flex items-center gap-0.5">
              <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
              {r.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BooleanChart({ stat }: { stat: Extract<FieldStat, { kind: "boolean" }> }) {
  const yesPct = stat.total === 0 ? 0 : (stat.yes / stat.total) * 100;
  return (
    <div className="space-y-2">
      <div className="flex h-3 rounded-full overflow-hidden bg-muted">
        <div className="h-full bg-emerald-500" style={{ width: `${yesPct}%` }} />
      </div>
      <div className="flex justify-between text-xs">
        <span className="text-emerald-600 flex items-center gap-1">
          <CircleCheck className="h-3 w-3" />
          {stat.yes} ({yesPct.toFixed(0)}%)
        </span>
        <span className="text-muted-foreground">
          {stat.no} no ({(100 - yesPct).toFixed(0)}%)
        </span>
      </div>
    </div>
  );
}

function NumberStats({ stat }: { stat: Extract<FieldStat, { kind: "number" }> }) {
  return (
    <div className="grid grid-cols-3 gap-2 text-center">
      <div>
        <p className="text-xs text-muted-foreground">min</p>
        <p className="font-semibold tabular-nums">{stat.min}</p>
      </div>
      <div>
        <p className="text-xs text-muted-foreground">avg</p>
        <p className="font-semibold tabular-nums">{stat.avg.toFixed(1)}</p>
      </div>
      <div>
        <p className="text-xs text-muted-foreground">max</p>
        <p className="font-semibold tabular-nums">{stat.max}</p>
      </div>
    </div>
  );
}

// ---------------- Aggregation ----------------

function computeAggregates(subs: SubmissionSummary[]) {
  const total = subs.length;
  const statusCounts: number[] = [0, 0, 0, 0];
  const priorityCounts: number[] = [0, 0, 0, 0];

  for (const s of subs) {
    statusCounts[s.status] = (statusCounts[s.status] ?? 0) + 1;
    priorityCounts[s.priority] = (priorityCounts[s.priority] ?? 0) + 1;
  }

  // Submissions per day for last 14 days
  const today = startOfDay(new Date());
  const byDay: Record<string, number> = {};
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    byDay[format(d, "yyyy-MM-dd")] = 0;
  }
  for (const s of subs) {
    const key = format(startOfDay(new Date(s.submittedAtMs)), "yyyy-MM-dd");
    if (key in byDay) byDay[key] = byDay[key] + 1;
  }
  const dailyCounts = Object.entries(byDay).map(([date, count]) => ({ date, count }));

  // Last 7 days vs prior 7 days
  const last7 = dailyCounts.slice(-7).reduce((a, b) => a + b.count, 0);
  const prev7 = dailyCounts.slice(-14, -7).reduce((a, b) => a + b.count, 0);
  const deltaPct = prev7 === 0 ? (last7 === 0 ? 0 : null) : ((last7 - prev7) / prev7) * 100;

  const skippedFields: string[] = [];

  return {
    total,
    statusCounts,
    priorityCounts,
    dailyCounts,
    last7,
    prev7,
    deltaPct,
    skippedFields,
  };
}

function computeFieldStats(
  fields: Field[],
  subs: SubmissionSummary[],
  payloads: Record<string, Submission>,
): FieldStat[] {
  const stats: FieldStat[] = [];
  const ANALYZABLE = new Set(["dropdown", "multi_select", "rating", "checkbox", "number"]);

  for (const field of fields) {
    if (!ANALYZABLE.has(field.type)) continue;
    if (field.private) continue;

    const values: unknown[] = [];
    for (const s of subs) {
      const fv = payloads[s.id]?.fields[field.id];
      if (!fv) continue;
      if (fv.kind !== "plaintext") continue;
      values.push(fv.value);
    }

    if (values.length === 0) continue;

    if (field.type === "dropdown") {
      const counts = new Map<string, number>();
      for (const v of values) {
        const label = labelFor(field, String(v));
        counts.set(label, (counts.get(label) ?? 0) + 1);
      }
      stats.push({
        kind: "distribution",
        field,
        total: values.length,
        rows: [...counts.entries()]
          .map(([label, count]) => ({ label, count }))
          .sort((a, b) => b.count - a.count),
      });
    } else if (field.type === "multi_select") {
      const counts = new Map<string, number>();
      for (const v of values) {
        if (!Array.isArray(v)) continue;
        for (const item of v) {
          const label = labelFor(field, String(item));
          counts.set(label, (counts.get(label) ?? 0) + 1);
        }
      }
      stats.push({
        kind: "distribution",
        field,
        total: values.length,
        rows: [...counts.entries()]
          .map(([label, count]) => ({ label, count }))
          .sort((a, b) => b.count - a.count),
      });
    } else if (field.type === "rating") {
      const scale = field.validation?.scale ?? 5;
      const rows = Array.from({ length: scale }).map((_, i) => ({
        value: i + 1,
        count: 0,
      }));
      let sum = 0;
      let n = 0;
      for (const v of values) {
        const num = Number(v);
        if (Number.isFinite(num) && num >= 1 && num <= scale) {
          rows[num - 1].count += 1;
          sum += num;
          n += 1;
        }
      }
      if (n === 0) continue;
      stats.push({
        kind: "rating",
        field,
        total: n,
        avg: sum / n,
        scale,
        rows,
      });
    } else if (field.type === "checkbox") {
      let yes = 0;
      let no = 0;
      for (const v of values) {
        if (v === true) yes += 1;
        else no += 1;
      }
      stats.push({ kind: "boolean", field, total: yes + no, yes, no });
    } else if (field.type === "number") {
      const nums = values.map((v) => Number(v)).filter((n) => Number.isFinite(n));
      if (nums.length === 0) continue;
      const sum = nums.reduce((a, b) => a + b, 0);
      stats.push({
        kind: "number",
        field,
        total: nums.length,
        avg: sum / nums.length,
        min: Math.min(...nums),
        max: Math.max(...nums),
      });
    }
  }

  return stats;
}

function labelFor(field: Field, value: string): string {
  const opt = field.options?.find((o) => o.value === value);
  return opt?.label ?? value;
}
