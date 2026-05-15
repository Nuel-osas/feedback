"use client";

import { Settings } from "lucide-react";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { env } from "@/lib/env";

export default function SettingsPage() {
  const account = useCurrentAccount();
  return (
    <div className="max-w-3xl mx-auto px-6 py-8 space-y-5">
      <div>
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <Settings className="h-5 w-5" /> Settings
        </h1>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Account</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <Row label="Connected wallet" value={account?.address ?? "—"} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Network</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <Row label="Sui" value={env.network} />
          <Row label="Tideform package" value={env.packageId} />
          <Row label="Walrus aggregator" value={env.walrusAggregator} />
          <Row
            label="Seal key servers"
            value={env.sealKeyServers.join(", ") || "(none — placeholder mode)"}
          />
          <Row label="Seal threshold" value={String(env.sealThreshold)} />
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[160px_1fr] gap-3">
      <span className="text-xs text-muted-foreground pt-0.5">{label}</span>
      <code className="font-mono text-xs break-all">{value}</code>
    </div>
  );
}
