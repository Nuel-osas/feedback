"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, ExternalLink, Eye, Search } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fetchSubmissionPayload, listSubmissions } from "@/lib/indexer";
import type { FormSchema, Submission } from "@/lib/schema";
// no auto-decrypt — admin presses Reveal in the drawer to invoke Seal
import { blobUrl } from "@/lib/walrus";
import { shortAddress } from "@/lib/utils";
import { exportCSV, exportJSON } from "@/lib/export";
import { SubmissionDrawer } from "./submission-drawer";

const STATUS_LABELS = ["new", "in progress", "resolved", "spam"] as const;
const PRIORITY_LABELS = ["low", "med", "high", "urgent"] as const;
const STATUS_VARIANTS = ["info", "warning", "success", "danger"] as const;

export function SubmissionsTable({
  formId,
  schema,
}: {
  formId: string;
  schema: FormSchema;
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [openId, setOpenId] = useState<string | null>(null);

  const { data: subs = [], isLoading, refetch } = useQuery({
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
          } catch {
            // skip
          }
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
      if (search) {
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
      }
      return true;
    });
  }, [subs, payloads, search, statusFilter]);

  function doExport(kind: "csv" | "json") {
    const rows = filtered.map((s) => ({ summary: s, payload: payloads[s.id] }));
    if (kind === "csv") exportCSV(schema, rows);
    else exportJSON(schema, rows);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search submissions…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUS_LABELS.map((label, idx) => (
              <SelectItem key={label} value={String(idx)}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" variant="outline" onClick={() => doExport("csv")}>
          <Download className="h-4 w-4" /> CSV
        </Button>
        <Button size="sm" variant="outline" onClick={() => doExport("json")}>
          <Download className="h-4 w-4" /> JSON
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/30">
                <tr className="text-left">
                  <th className="px-4 py-2 font-medium">When</th>
                  <th className="px-4 py-2 font-medium">From</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 font-medium">Priority</th>
                  <th className="px-4 py-2 font-medium">Preview</th>
                  <th className="px-4 py-2 font-medium" />
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      Loading…
                    </td>
                  </tr>
                )}
                {!isLoading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      No submissions match.
                    </td>
                  </tr>
                )}
                {filtered.map((s) => {
                  const p = payloads[s.id];
                  const firstText = p
                    ? Object.values(p.fields).find((v) => v.kind === "plaintext")
                    : undefined;
                  return (
                    <tr
                      key={s.id}
                      className="border-b border-border hover:bg-muted/20 cursor-pointer"
                      onClick={() => setOpenId(s.id)}
                    >
                      <td className="px-4 py-2 whitespace-nowrap">
                        {format(new Date(s.submittedAtMs), "MMM d, HH:mm")}
                      </td>
                      <td className="px-4 py-2 font-mono text-xs">
                        {shortAddress(s.submitter)}
                      </td>
                      <td className="px-4 py-2">
                        <Badge variant={STATUS_VARIANTS[s.status] ?? "outline"}>
                          {STATUS_LABELS[s.status] ?? "?"}
                        </Badge>
                      </td>
                      <td className="px-4 py-2 text-xs">
                        {PRIORITY_LABELS[s.priority] ?? "?"}
                      </td>
                      <td className="px-4 py-2 max-w-xs truncate text-muted-foreground">
                        {firstText?.kind === "plaintext"
                          ? String(firstText.value).slice(0, 60)
                          : "—"}
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenId(s.id);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button asChild size="icon" variant="ghost">
                            <Link
                              href={blobUrl(s.blobId)}
                              target="_blank"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Link>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <SubmissionDrawer
        open={!!openId}
        onClose={() => setOpenId(null)}
        submission={openId ? subs.find((s) => s.id === openId) ?? null : null}
        payload={openId ? payloads[openId] ?? null : null}
        formId={formId}
        schema={schema}
        fields={fields}
        onChanged={() => refetch()}
      />
    </div>
  );
}
