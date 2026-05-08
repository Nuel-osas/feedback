"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { FileText, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { listFormsForOwner } from "@/lib/indexer";
import { formatDistanceToNow } from "date-fns";

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
      <div className="text-center py-16">
        <p className="text-muted-foreground">Connect your wallet to see your forms.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Your forms</h1>
        <Button asChild variant="primary">
          <Link href="/app/new">
            <Plus className="h-4 w-4" /> New form
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : forms.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-sm text-muted-foreground">
            No forms yet. <Link href="/app/new" className="underline">Create your first form</Link>.
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {forms.map((f) => (
            <Card key={f.id} className="hover:border-sky-500/50 transition-colors">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center justify-between gap-2">
                  <Link href={`/app/${f.id}`} className="flex items-center gap-2 hover:underline">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="truncate">{f.id.slice(0, 10)}…</span>
                  </Link>
                  <Badge variant={f.status === 0 ? "success" : "secondary"}>
                    {f.status === 0 ? "open" : f.status === 1 ? "closed" : "archived"}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="text-muted-foreground">
                  {f.submissionsCount} submission{f.submissionsCount === 1 ? "" : "s"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Updated {formatDistanceToNow(new Date(f.updatedAtMs), { addSuffix: true })}
                </p>
                <div className="flex gap-2 pt-2">
                  <Button asChild size="sm" variant="outline" className="flex-1">
                    <Link href={`/app/${f.id}`}>View</Link>
                  </Button>
                  <Button asChild size="sm" variant="outline" className="flex-1">
                    <Link href={`/app/${f.id}/edit`}>Edit</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
