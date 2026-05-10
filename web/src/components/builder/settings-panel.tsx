"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DateTimePicker } from "@/components/ui/datetime-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useBuilder } from "./store";

export function SettingsPanel() {
  const schema = useBuilder((s) => s.schema);
  const setSetting = useBuilder((s) => s.setSetting);
  const setTheme = useBuilder((s) => s.setTheme);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Form settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Label>Require wallet</Label>
            <p className="text-xs text-muted-foreground">
              Submitter must connect a Sui wallet.
            </p>
          </div>
          <Switch
            checked={schema.settings.requireWallet}
            onCheckedChange={(v) => setSetting("requireWallet", v)}
          />
        </div>
        <div className="flex items-center justify-between">
          <div>
            <Label>One submission per wallet</Label>
            <p className="text-xs text-muted-foreground">
              Enforced on-chain.
            </p>
          </div>
          <Switch
            checked={schema.settings.onePerWallet}
            onCheckedChange={(v) => setSetting("onePerWallet", v)}
          />
        </div>

        <div className="space-y-1.5">
          <Label>Success message</Label>
          <Textarea
            rows={2}
            value={schema.settings.successMessage}
            onChange={(e) => setSetting("successMessage", e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Opens at</Label>
          <DateTimePicker
            value={schema.settings.opensAt}
            onChange={(v) => setSetting("opensAt", v)}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Closes at</Label>
          <DateTimePicker
            value={schema.settings.closesAt}
            onChange={(v) => setSetting("closesAt", v)}
          />
        </div>

        <div className="space-y-1.5">
          <Label>Max submissions</Label>
          <Input
            type="number"
            value={schema.settings.maxSubmissions ?? ""}
            onChange={(e) =>
              setSetting(
                "maxSubmissions",
                e.target.value === "" ? undefined : Number(e.target.value),
              )
            }
          />
        </div>

        <div className="space-y-1.5">
          <Label>Theme color</Label>
          <Input
            type="color"
            value={schema.theme.primary}
            onChange={(e) => setTheme(e.target.value)}
            className="h-9 w-20 p-1"
          />
        </div>
      </CardContent>
    </Card>
  );
}
