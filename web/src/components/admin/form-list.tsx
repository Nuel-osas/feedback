"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { ExternalLink, Eye, FileText, Pencil, Plus } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { listFormsForOwner } from "@/lib/indexer";
import { shortAddress } from "@/lib/utils";

export function FormList() {
  const account = useCurrentAccount();
  const address = account?.address;
  const { data: forms = [], isLoading } = useQuery({
    queryKey: ["forms", address],
    queryFn: () => (address ? listFormsForOwner(address) : Promise.resolve([])),
    enabled: !!address,
  });

  if (!address) {
    return (
      <div className="text-center py-24">
        <p className="text-muted-foreground">Connect your wallet to see your forms.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Your forms</h1>
          <p className="text-xs text-muted-foreground">
            {forms.length} {forms.length === 1 ? "form" : "forms"} ·{" "}
            <span className="font-mono">{shortAddress(address)}</span>
          </p>
        </div>
        <Button asChild variant="primary" size="sm">
          <Link href="/app/new">
            <Plus className="h-3.5 w-3.5" /> New form
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : forms.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-sm text-muted-foreground">
            No forms yet.{" "}
            <Link href="/app/new" className="underline text-sky-600">
              Create your first form
            </Link>
            .
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-muted/30 text-xs text-muted-foreground">
                  <tr>
                    <th className="text-left font-medium px-4 py-2">Form</th>
                    <th className="text-left font-medium px-4 py-2">Status</th>
                    <th className="text-right font-medium px-4 py-2">Submissions</th>
                    <th className="text-left font-medium px-4 py-2">Updated</th>
                    <th className="text-right font-medium px-4 py-2 w-24" />
                  </tr>
                </thead>
                <tbody>
                  {forms.map((f) => (
                    <tr
                      key={f.id}
                      className="border-b border-border last:border-0 hover:bg-muted/20"
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/app/${f.id}`}
                          className="flex items-center gap-2 hover:underline"
                        >
                          <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <div className="min-w-0">
                            <p className="font-medium truncate">
                              {f.title?.trim() || "Untitled form"}
                            </p>
                            <p className="text-[10px] text-muted-foreground font-mono">
                              {f.id.slice(0, 14)}…{f.id.slice(-4)}
                            </p>
                          </div>
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={f.status === 0 ? "success" : "secondary"}>
                          {f.status === 0
                            ? "open"
                            : f.status === 1
                              ? "closed"
                              : "archived"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {f.submissionsCount}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(f.updatedAtMs), {
                          addSuffix: true,
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button asChild size="icon" variant="ghost" title="Open">
                            <Link href={`/app/${f.id}`}>
                              <Eye className="h-3.5 w-3.5" />
                            </Link>
                          </Button>
                          <Button asChild size="icon" variant="ghost" title="Edit">
                            <Link href={`/app/${f.id}/edit`}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Link>
                          </Button>
                          <Button asChild size="icon" variant="ghost" title="Public link">
                            <Link href={`/f/${f.id}`} target="_blank">
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Link>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
