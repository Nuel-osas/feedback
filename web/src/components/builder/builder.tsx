"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  useCurrentAccount,
  useSignAndExecuteTransaction,
} from "@mysten/dapp-kit";
import { Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { uploadJson } from "@/lib/walrus";
import { addCreateForm, addUpdateSchema } from "@/lib/move";
import { suiClient, PACKAGE_ID } from "@/lib/sui";
import { FieldPalette } from "./field-palette";
import { FieldList } from "./field-list";
import { SettingsPanel } from "./settings-panel";
import { useBuilder } from "./store";

export function Builder({ existingFormId }: { existingFormId?: string }) {
  const router = useRouter();
  const account = useCurrentAccount();
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();
  const schema = useBuilder((s) => s.schema);
  const setTitle = useBuilder((s) => s.setTitle);
  const setDescription = useBuilder((s) => s.setDescription);
  const dirty = useBuilder((s) => s.dirty);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  async function handleSave() {
    if (!account) {
      toast.error("Connect your wallet first");
      return;
    }
    if (PACKAGE_ID === "0x0") {
      toast.error("Move package not deployed yet (NEXT_PUBLIC_TIDEFORM_PACKAGE_ID)");
      return;
    }
    setSaving(true);
    try {
      const ownerAddress = account.address;
      const exec = async (transaction: Parameters<typeof signAndExecute>[0]["transaction"]) =>
        signAndExecute({ transaction });

      toast.info("Encoding form schema…");
      const result = await uploadJson(schema, {
        owner: ownerAddress,
        signAndExecute: (transaction) => exec(transaction),
        epochs: 53, // Walrus mainnet caps at 53 epochs (~2 years)
        onProgress: (p) => {
          if (p.step === "encoded") toast.info("Sign register tx (1/2)…");
          else if (p.step === "registered") toast.info("Uploading to Walrus…");
          else if (p.step === "uploaded")
            toast.info(
              existingFormId
                ? "Sign certify + update (2/2)…"
                : "Sign certify + create form (2/2)…",
            );
        },
        // Bundle our form::create/update_schema into the certify PTB —
        // saves a popup.
        appendToCertify: (tx, blobId) => {
          if (existingFormId) {
            addUpdateSchema(tx, {
              formId: existingFormId,
              newSchemaBlobId: blobId,
            });
          } else {
            addCreateForm(tx, {
              schemaBlobId: blobId,
              requireWallet: schema.settings.requireWallet,
              onePerWallet: schema.settings.onePerWallet,
            });
          }
        },
      });

      if (existingFormId) {
        toast.success("Form updated");
        router.refresh();
      } else {
        await suiClient.waitForTransaction({ digest: result.finalTxDigest });
        const fullTx = await suiClient.getTransactionBlock({
          digest: result.finalTxDigest,
          options: { showEffects: true, showObjectChanges: true },
        });
        const created = fullTx.objectChanges?.find(
          (c) =>
            c.type === "created" &&
            "objectType" in c &&
            c.objectType.includes("::form::Form"),
        );
        // biome-ignore lint/suspicious/noExplicitAny: dynamic
        const formId = (created as any)?.objectId as string | undefined;
        if (formId) {
          toast.success("Form created!");
          router.push(`/app/${formId}`);
        } else {
          toast.success("Form created (could not detect ID)");
          router.push("/app");
        }
      }
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex-1 space-y-2">
          <Input
            value={schema.title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Form title"
            className="text-xl font-semibold border-none px-0 shadow-none focus-visible:ring-0"
          />
          <Textarea
            value={schema.description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Form description (markdown supported)"
            rows={2}
            className="border-none px-0 shadow-none resize-none focus-visible:ring-0"
          />
        </div>
        <Button onClick={handleSave} disabled={saving} variant="primary">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {existingFormId ? "Save changes" : "Publish form"}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-4 xl:col-span-3 space-y-4">
          <FieldPalette />
          <SettingsPanel />
        </div>
        <div className="lg:col-span-8 xl:col-span-9">
          <Card>
            <CardContent className="p-6">
              <FieldList />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
