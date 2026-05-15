"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { Inbox } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { listFormsForOwner, listSubmissions } from "@/lib/indexer";
import { shortAddress } from "@/lib/utils";

const STATUS_LABELS = ["new", "in progress", "resolved", "spam"] as const;
const STATUS_VARIANTS = ["info", "warning", "success", "danger"] as const;

export default function InboxPage() {
  const account = useCurrentAccount();
  const { data: forms = [] } = useQuery({
    queryKey: ["forms", account?.address],
    queryFn: () =>
      account ? listFormsForOwner(account.address) : Promise.resolve([]),
    enabled: !!account,
  });

  const { data: all = [], isLoading } = useQuery({
    queryKey: ["inbox", account?.address, forms.map((f) => f.id).join(",")],
    queryFn: async () => {
      const rows = await Promise.all(
        forms.map(async (f) => {
          const subs = await listSubmissions(f.id).catch(() => []);
          return subs.map((s) => ({ form: f, sub: s }));
        }),
      );
      return rows.flat().sort((a, b) => b.sub.submittedAtMs - a.sub.submittedAtMs);
    },
    enabled: forms.length > 0,
  });

  if (!account) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-12 text-center text-sm text-muted-foreground">
        Connect your wallet to view your inbox.
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-5">
      <div>
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <Inbox className="h-5 w-5" /> Inbox
        </h1>
        <p className="text-xs text-muted-foreground">
          Every submission across your forms · most recent first
        </p>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : all.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-sm text-muted-foreground">
            No submissions yet.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y divide-border">
              {all.slice(0, 100).map(({ form, sub }) => (
                <li key={sub.id}>
                  <Link
                    href={`/app/${form.id}?sub=${sub.id}`}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-muted/20"
                  >
                    <Badge variant={STATUS_VARIANTS[sub.status] ?? "outline"}>
                      {STATUS_LABELS[sub.status] ?? "?"}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">
                        {form.title?.trim() || "Untitled form"}
                      </p>
                      <p className="text-xs text-muted-foreground font-mono">
                        from {shortAddress(sub.submitter)}
                      </p>
                    </div>
                    <div className="text-right text-xs text-muted-foreground whitespace-nowrap">
                      <p>{formatDistanceToNow(new Date(sub.submittedAtMs), { addSuffix: true })}</p>
                      <p className="text-[10px] font-mono">
                        {format(new Date(sub.submittedAtMs), "MMM d, HH:mm")}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
