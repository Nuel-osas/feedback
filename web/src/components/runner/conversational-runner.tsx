"use client";

import { useEffect, useState } from "react";
import {
  useCurrentAccount,
  useSignAndExecuteTransaction,
} from "@mysten/dapp-kit";
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FieldRenderer } from "@/components/builder/field-renderer";
import type { Field, FormSchema, Submission } from "@/lib/schema";
import { uploadBlob, uploadJson } from "@/lib/walrus";
import { sealEncrypt } from "@/lib/seal";
import { addSubmit } from "@/lib/move";
import { PACKAGE_ID } from "@/lib/sui";
import { cn } from "@/lib/utils";

type Values = Record<string, unknown>;
type FilePending = Record<string, File>;

export function ConversationalRunner({
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
  const fields: Field[] = schema.sections.flatMap((s) => s.fields);
  const [values, setValues] = useState<Values>({});
  const [files, setFiles] = useState<FilePending>({});
  const [stepIdx, setStepIdx] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<{
    submissionBlobId: string;
    txDigest: string;
  } | null>(null);

  const onIntro = stepIdx === -1;
  const total = fields.length;
  const onLast = stepIdx === total - 1;
  const field = fields[stepIdx];

  function validateCurrent(): boolean {
    if (!field) return true;
    const v = values[field.id];
    const file = files[field.id];
    if (field.required) {
      if (field.type === "screenshot" || field.type === "video") {
        if (!file) {
          setError("Required");
          return false;
        }
      } else if (field.type === "checkbox") {
        if (v !== true) {
          setError("Required");
          return false;
        }
      } else if (
        v === undefined ||
        v === null ||
        v === "" ||
        (Array.isArray(v) && v.length === 0)
      ) {
        setError("Required");
        return false;
      }
    }
    if (field.type === "email" && typeof v === "string" && v) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
        setError("Invalid email");
        return false;
      }
    }
    if (field.type === "url" && typeof v === "string" && v) {
      try {
        new URL(v);
      } catch {
        setError("Invalid URL");
        return false;
      }
    }
    setError(null);
    return true;
  }

  function next() {
    if (!validateCurrent()) return;
    if (onLast) {
      void handleSubmit();
    } else {
      setStepIdx((i) => i + 1);
    }
  }

  function back() {
    setError(null);
    setStepIdx((i) => Math.max(0, i - 1));
  }

  // Enter advances unless inside a multiline textarea
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Enter") return;
      const t = e.target as HTMLElement | null;
      if (!t) return;
      if (t.tagName === "TEXTAREA") return; // allow newline in textareas
      e.preventDefault();
      next();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIdx, values, files]);

  async function handleSubmit() {
    if (requireWallet && !account) {
      toast.error("This form requires a connected wallet");
      return;
    }
    if (PACKAGE_ID === "0x0") {
      toast.error("Move package not configured");
      return;
    }
    if (!account) {
      toast.error("Connect a wallet to submit");
      return;
    }

    setSubmitting(true);
    const ownerAddr = account.address;
    const execTx = (transaction: Parameters<typeof signAndExecute>[0]["transaction"]) =>
      signAndExecute({ transaction });

    try {
      const submission: Submission = {
        formId,
        formVersion,
        submittedAt: new Date().toISOString(),
        submitter: account.address,
        fields: {},
      };

      for (const f of fields) {
        if ((f.type === "screenshot" || f.type === "video") && files[f.id]) {
          const file = files[f.id];
          toast.info(`Uploading ${file.name}…`);
          const bytes = new Uint8Array(await file.arrayBuffer());
          const { blobId } = await uploadBlob(bytes, {
            owner: ownerAddr,
            signAndExecute: execTx,
            epochs: 53,
          });
          submission.fields[f.id] = {
            kind: "media",
            blobId,
            mime: file.type || "application/octet-stream",
            bytes: file.size,
            name: file.name,
          };
        }
      }

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

      const result = await uploadJson(submission, {
        owner: ownerAddr,
        signAndExecute: execTx,
        epochs: 53,
        appendToCertify: (tx, blobId) => {
          addSubmit(tx, { formId, blobId });
        },
      });

      setDone({ submissionBlobId: result.blobId, txDigest: result.finalTxDigest });
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
      <div className="min-h-[80vh] flex items-center justify-center px-6">
        <div className="text-center space-y-4 max-w-md">
          <CheckCircle2 className="h-14 w-14 text-emerald-500 mx-auto" />
          <h1 className="text-2xl font-semibold">{schema.settings.successMessage}</h1>
          <p className="text-xs text-muted-foreground font-mono break-all">
            Walrus: {done.submissionBlobId}
          </p>
        </div>
      </div>
    );
  }

  if (fields.length === 0) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-6">
        <p className="text-muted-foreground">This form has no fields yet.</p>
      </div>
    );
  }

  const progress = ((stepIdx + 1) / total) * 100;

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex flex-col">
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-xl">
          <p className="text-xs text-muted-foreground mb-2">
            {stepIdx + 1} of {total}
          </p>
          <h1 className="text-2xl font-semibold mb-1 leading-tight">
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </h1>
          {field.help && (
            <p className="text-sm text-muted-foreground mb-6">{field.help}</p>
          )}
          <div className="mt-6">
            <FieldRenderer
              field={{ ...field, label: "" }}
              value={values[field.id]}
              onChange={(v) => {
                setValues((s) => ({ ...s, [field.id]: v }));
                setError(null);
              }}
              onFile={(file) => {
                setFiles((s) => ({ ...s, [field.id]: file }));
                setError(null);
              }}
              error={error ?? undefined}
            />
          </div>

          <div className="mt-8 flex items-center justify-between">
            <Button
              type="button"
              variant="ghost"
              onClick={back}
              disabled={stepIdx === 0}
              size="sm"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            <p className="text-xs text-muted-foreground">
              press <kbd className="px-1.5 py-0.5 border border-border rounded text-[10px]">Enter</kbd> to {onLast ? "submit" : "continue"}
            </p>
            <Button
              type="button"
              variant="primary"
              onClick={next}
              disabled={submitting}
              size="sm"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {onLast ? "Submit" : "Continue"}
              {!submitting && !onLast && <ArrowRight className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>

      <div className="h-1 bg-muted overflow-hidden">
        <div
          className="h-full bg-sky-500 transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
