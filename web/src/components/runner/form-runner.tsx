"use client";

import { useState } from "react";
import {
  useCurrentAccount,
  useSignAndExecuteTransaction,
} from "@mysten/dapp-kit";
import { CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldRenderer } from "@/components/builder/field-renderer";
import type { FormSchema, Field, Submission } from "@/lib/schema";
import { uploadBlob, uploadJson } from "@/lib/walrus";
import { sealEncrypt } from "@/lib/seal";
import { txSubmit } from "@/lib/move";
import { PACKAGE_ID } from "@/lib/sui";

type Values = Record<string, unknown>;
type FilePending = Record<string, File>;

export function FormRunner({
  formId,
  formVersion,
  schema,
  ownerAddress,
  requireWallet,
}: {
  formId: string;
  formVersion: number;
  schema: FormSchema;
  ownerAddress: string;
  requireWallet: boolean;
}) {
  const account = useCurrentAccount();
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();
  const [values, setValues] = useState<Values>({});
  const [files, setFiles] = useState<FilePending>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<{
    submissionBlobId: string;
    txDigest: string;
  } | null>(null);

  const fields: Field[] = schema.sections.flatMap((s) => s.fields);

  function validate(): boolean {
    const errs: Record<string, string> = {};
    for (const f of fields) {
      const v = values[f.id];
      const file = files[f.id];
      if (f.required) {
        if (f.type === "screenshot" || f.type === "video") {
          if (!file) errs[f.id] = "Required";
        } else if (f.type === "checkbox") {
          if (v !== true) errs[f.id] = "Required";
        } else if (
          v === undefined ||
          v === null ||
          v === "" ||
          (Array.isArray(v) && v.length === 0)
        ) {
          errs[f.id] = "Required";
        }
      }
      const val = f.validation;
      if (val) {
        if (typeof v === "string") {
          if (val.minLength && v.length < val.minLength)
            errs[f.id] = `Minimum ${val.minLength} characters`;
          if (val.maxLength && v.length > val.maxLength)
            errs[f.id] = `Maximum ${val.maxLength} characters`;
        }
        if (typeof v === "number") {
          if (val.min !== undefined && v < val.min) errs[f.id] = `Min ${val.min}`;
          if (val.max !== undefined && v > val.max) errs[f.id] = `Max ${val.max}`;
        }
      }
      if (f.type === "email" && typeof v === "string" && v) {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) errs[f.id] = "Invalid email";
      }
      if (f.type === "url" && typeof v === "string" && v) {
        try {
          new URL(v);
        } catch {
          errs[f.id] = "Invalid URL";
        }
      }
      if (f.type === "wallet" && typeof v === "string" && v) {
        if (!/^0x[0-9a-fA-F]{1,64}$/.test(v)) errs[f.id] = "Invalid Sui address";
      }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit() {
    if (requireWallet && !account) {
      toast.error("This form requires a connected wallet");
      return;
    }
    if (!validate()) {
      toast.error("Please fix the highlighted fields");
      return;
    }
    if (PACKAGE_ID === "0x0") {
      toast.error("Move package not configured");
      return;
    }
    if (!account) {
      toast.error("Connect a wallet to submit (gas needed)");
      return;
    }

    setSubmitting(true);
    try {
      const submission: Submission = {
        formId,
        formVersion,
        submittedAt: new Date().toISOString(),
        submitter: account?.address,
        fields: {},
      };

      // 1. upload media files
      for (const f of fields) {
        if ((f.type === "screenshot" || f.type === "video") && files[f.id]) {
          const file = files[f.id];
          toast.info(`Uploading ${file.name}…`);
          const bytes = new Uint8Array(await file.arrayBuffer());
          const { blobId } = await uploadBlob(bytes, { epochs: 53 });
          submission.fields[f.id] = {
            kind: "media",
            blobId,
            mime: file.type || "application/octet-stream",
            bytes: file.size,
            name: file.name,
          };
        }
      }

      // 2. plaintext + encrypt private fields
      for (const f of fields) {
        if (f.type === "screenshot" || f.type === "video") continue;
        const v = values[f.id];
        if (v === undefined || v === null || v === "") continue;
        if (f.private) {
          const bytes = new TextEncoder().encode(JSON.stringify(v));
          const envelope = await sealEncrypt(bytes, {
            packageId: PACKAGE_ID,
            formId,
            fieldId: f.id,
          });
          submission.fields[f.id] = { kind: "encrypted", envelope };
        } else {
          submission.fields[f.id] = { kind: "plaintext", value: v };
        }
      }

      // 3. upload submission blob
      toast.info("Uploading submission to Walrus…");
      const { blobId } = await uploadJson(submission, { epochs: 53 });

      // 4. submit on-chain
      toast.info("Recording on Sui…");
      const tx = txSubmit({ formId, blobId });
      const result = await signAndExecute({ transaction: tx });

      setDone({ submissionBlobId: blobId, txDigest: result.digest });
      toast.success("Submission recorded");
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Submit failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <Card>
          <CardContent className="py-12 text-center space-y-4">
            <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto" />
            <h1 className="text-xl font-semibold">{schema.settings.successMessage}</h1>
            <div className="text-xs text-muted-foreground space-y-1 font-mono">
              <p>
                Walrus blob: <span className="break-all">{done.submissionBlobId}</span>
              </p>
              <p>
                Tx: <span className="break-all">{done.txDigest}</span>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{schema.title}</CardTitle>
          {schema.description && (
            <p className="text-sm text-muted-foreground whitespace-pre-line">
              {schema.description}
            </p>
          )}
          <p className="text-xs text-muted-foreground pt-2">
            Form by <code>{ownerAddress.slice(0, 8)}…{ownerAddress.slice(-4)}</code>
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {fields.map((f) => (
            <FieldRenderer
              key={f.id}
              field={f}
              value={values[f.id]}
              onChange={(v) => setValues((s) => ({ ...s, [f.id]: v }))}
              onFile={(file) => setFiles((s) => ({ ...s, [f.id]: file }))}
              error={errors[f.id]}
            />
          ))}
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Submit
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            Submissions stored on Walrus. Private fields encrypted via Seal.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
