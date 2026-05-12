"use client";

import { useState } from "react";
import {
  useCurrentAccount,
  useSignAndExecuteTransaction,
  useSignPersonalMessage,
} from "@mysten/dapp-kit";
import { Eye, ExternalLink, Loader2 } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { blobUrl, uploadJson } from "@/lib/walrus";
import { shortAddress } from "@/lib/utils";
import {
  txAttachNotes,
  txSubmissionPriority,
  txSubmissionStatus,
} from "@/lib/move";
import { sealDecrypt, type SealEnvelope } from "@/lib/seal";
import { getOrCreateSessionKey } from "@/lib/session-key";
import { PACKAGE_ID } from "@/lib/sui";
import type { FormSchema, Field, Submission } from "@/lib/schema";
import type { SubmissionSummary } from "@/lib/indexer";

const STATUS_OPTS = [
  { v: "0", l: "new" },
  { v: "1", l: "in progress" },
  { v: "2", l: "resolved" },
  { v: "3", l: "spam" },
];
const PRIORITY_OPTS = [
  { v: "0", l: "low" },
  { v: "1", l: "med" },
  { v: "2", l: "high" },
  { v: "3", l: "urgent" },
];

export function SubmissionDrawer({
  open,
  onClose,
  submission,
  payload,
  formId,
  fields,
  onChanged,
}: {
  open: boolean;
  onClose: () => void;
  submission: SubmissionSummary | null;
  payload: Submission | null;
  formId: string;
  schema: FormSchema;
  fields: Field[];
  onChanged: () => void;
}) {
  const account = useCurrentAccount();
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();
  const { mutateAsync: signPersonalMessage } = useSignPersonalMessage();
  const [busy, setBusy] = useState(false);
  const [notes, setNotes] = useState("");
  const [revealed, setRevealed] = useState<Record<string, unknown>>({});
  const [revealing, setRevealing] = useState<Record<string, boolean>>({});

  async function revealField(fieldId: string, envelope: SealEnvelope) {
    if (!account) {
      toast.error("Connect wallet to decrypt");
      return;
    }
    if (envelope.mode === "placeholder") {
      // local-dev fallback: just base64-decode
      try {
        const bytes = await sealDecrypt(envelope, {
          // unused in placeholder branch; cast satisfies the type
          // biome-ignore lint/suspicious/noExplicitAny: placeholder path skips session key
          sessionKey: undefined as any,
          packageId: PACKAGE_ID,
          formId,
        });
        const value = JSON.parse(new TextDecoder().decode(bytes));
        setRevealed((r) => ({ ...r, [fieldId]: value }));
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Decrypt failed");
      }
      return;
    }

    setRevealing((r) => ({ ...r, [fieldId]: true }));
    try {
      const sessionKey = await getOrCreateSessionKey({
        address: account.address,
        packageId: PACKAGE_ID,
        signMessage: async (msg) =>
          signPersonalMessage({ message: msg }),
      });
      const bytes = await sealDecrypt(envelope, {
        sessionKey,
        packageId: PACKAGE_ID,
        formId,
      });
      const value = JSON.parse(new TextDecoder().decode(bytes));
      setRevealed((r) => ({ ...r, [fieldId]: value }));
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Decrypt failed");
    } finally {
      setRevealing((r) => ({ ...r, [fieldId]: false }));
    }
  }

  if (!submission) return null;

  async function changeStatus(value: string) {
    if (!submission) return;
    setBusy(true);
    try {
      const tx = txSubmissionStatus({
        formId,
        submissionId: submission.id,
        status: Number(value) as 0 | 1 | 2 | 3,
      });
      await signAndExecute({ transaction: tx });
      toast.success("Status updated");
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function changePriority(value: string) {
    if (!submission) return;
    setBusy(true);
    try {
      const tx = txSubmissionPriority({
        formId,
        submissionId: submission.id,
        priority: Number(value) as 0 | 1 | 2 | 3,
      });
      await signAndExecute({ transaction: tx });
      toast.success("Priority updated");
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function saveNotes() {
    if (!submission || !notes.trim()) return;
    setBusy(true);
    try {
      const { blobId } = await uploadJson(
        { notes, savedAt: new Date().toISOString() },
        { epochs: 53 },
      );
      const tx = txAttachNotes({
        formId,
        submissionId: submission.id,
        notesBlobId: blobId,
      });
      await signAndExecute({ transaction: tx });
      toast.success("Notes attached");
      setNotes("");
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Submission</DialogTitle>
          <p className="text-xs text-muted-foreground font-mono">
            {format(new Date(submission.submittedAtMs), "MMM d, yyyy HH:mm")}
            {" · from "}
            {shortAddress(submission.submitter)}
          </p>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Status</Label>
            <Select value={String(submission.status)} onValueChange={changeStatus} disabled={busy}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTS.map((o) => (
                  <SelectItem key={o.v} value={o.v}>
                    {o.l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Priority</Label>
            <Select
              value={String(submission.priority)}
              onValueChange={changePriority}
              disabled={busy}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRIORITY_OPTS.map((o) => (
                  <SelectItem key={o.v} value={o.v}>
                    {o.l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-3 border-t border-border pt-4">
          {fields.map((f) => {
            const v = payload?.fields[f.id];
            const decrypted = revealed[f.id];
            return (
              <div key={f.id} className="space-y-1">
                <p className="text-xs font-medium">{f.label}</p>
                <FieldDisplay
                  field={f}
                  value={v}
                  decrypted={decrypted}
                  revealing={!!revealing[f.id]}
                  onReveal={() => {
                    if (v?.kind === "encrypted") {
                      revealField(f.id, v.envelope as SealEnvelope);
                    }
                  }}
                />
              </div>
            );
          })}
          {!payload && (
            <p className="text-xs text-muted-foreground">Loading payload…</p>
          )}
        </div>

        <div className="border-t border-border pt-4 space-y-2">
          <Label className="text-xs">Add note</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Internal note (stored on Walrus)…"
            rows={3}
          />
          <Button size="sm" variant="primary" onClick={saveNotes} disabled={busy || !notes.trim()}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Save note
          </Button>
          {submission.hasNotes && submission.notesBlobId && (
            <Button asChild size="sm" variant="ghost">
              <Link href={blobUrl(submission.notesBlobId)} target="_blank">
                View existing notes <ExternalLink className="h-3 w-3" />
              </Link>
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function FieldDisplay({
  field,
  value,
  decrypted,
  revealing,
  onReveal,
}: {
  field: Field;
  value: Submission["fields"][string] | undefined;
  decrypted?: unknown;
  revealing?: boolean;
  onReveal?: () => void;
}) {
  if (!value) return <p className="text-xs text-muted-foreground">—</p>;
  if (value.kind === "plaintext") {
    const v = value.value;
    if (Array.isArray(v)) {
      return (
        <div className="flex flex-wrap gap-1">
          {v.map((x, i) => (
            <Badge key={i} variant="secondary">
              {String(x)}
            </Badge>
          ))}
        </div>
      );
    }
    if (field.type === "rating") {
      return <p className="text-sm">{"★".repeat(Number(v) || 0)}{"☆".repeat(Math.max(0, (field.validation?.scale ?? 5) - (Number(v) || 0)))}</p>;
    }
    return <p className="text-sm whitespace-pre-line break-words">{String(v)}</p>;
  }
  if (value.kind === "media") {
    const url = blobUrl(value.blobId);
    if (value.mime.startsWith("image/")) {
      // eslint-disable-next-line @next/next/no-img-element
      return <img src={url} alt={value.name} className="max-h-64 rounded border border-border" />;
    }
    if (value.mime.startsWith("video/")) {
      return <video src={url} controls className="max-h-64 rounded border border-border" />;
    }
    return (
      <Link href={url} target="_blank" className="text-sky-600 underline text-sm">
        {value.name}
      </Link>
    );
  }
  if (value.kind === "encrypted") {
    if (decrypted !== undefined) {
      if (Array.isArray(decrypted)) {
        return (
          <div className="flex flex-wrap gap-1">
            {decrypted.map((x, i) => (
              <Badge key={i} variant="secondary">{String(x)}</Badge>
            ))}
          </div>
        );
      }
      return (
        <p className="text-sm whitespace-pre-line break-words bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 rounded px-2 py-1">
          {String(decrypted)}
        </p>
      );
    }
    return (
      <div className="flex items-center gap-2">
        <Badge variant="warning">
          encrypted ({value.envelope.mode})
        </Badge>
        <button
          type="button"
          onClick={onReveal}
          disabled={revealing}
          className="text-xs underline text-sky-600 hover:text-sky-700 disabled:opacity-50 inline-flex items-center gap-1"
        >
          {revealing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Eye className="h-3 w-3" />}
          Reveal
        </button>
      </div>
    );
  }
  return null;
}
