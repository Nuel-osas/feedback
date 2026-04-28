import { suiClient, PACKAGE_ID } from "./sui";
import { readJson } from "./walrus";
import type { FormSchema, Submission } from "./schema";

export type FormSummary = {
  id: string;
  owner: string;
  admins: string[];
  schemaBlobId: string;
  version: number;
  status: number;
  submissionsCount: number;
  requireWallet: boolean;
  onePerWallet: boolean;
  createdAtMs: number;
  updatedAtMs: number;
};

export type SubmissionSummary = {
  id: string;
  formId: string;
  blobId: string;
  submitter: string;
  submittedAtMs: number;
  status: number;
  priority: number;
  tags: string[];
  hasNotes: boolean;
  notesBlobId?: string;
};

function bytesToString(bytes: number[] | string): string {
  if (typeof bytes === "string") return bytes;
  return new TextDecoder().decode(new Uint8Array(bytes));
}

export async function fetchForm(formId: string): Promise<FormSummary | null> {
  const obj = await suiClient.getObject({
    id: formId,
    options: { showContent: true, showType: true },
  });
  if (!obj.data?.content || obj.data.content.dataType !== "moveObject") return null;
  // biome-ignore lint/suspicious/noExplicitAny: dynamic move struct
  const f = (obj.data.content as any).fields;
  return {
    id: formId,
    owner: f.owner,
    admins: f.admins?.fields?.contents ?? [],
    schemaBlobId: bytesToString(f.schema_blob_id),
    version: Number(f.version),
    status: Number(f.status),
    submissionsCount: Number(f.submissions_count),
    requireWallet: !!f.require_wallet,
    onePerWallet: !!f.one_per_wallet,
    createdAtMs: Number(f.created_at_ms),
    updatedAtMs: Number(f.updated_at_ms),
  };
}

export async function fetchFormSchema(blobId: string): Promise<FormSchema> {
  return readJson<FormSchema>(blobId);
}

/**
 * List forms owned by an address by querying FormCreated events.
 * Filters off-chain to those whose owner matches.
 */
export async function listFormsForOwner(owner: string): Promise<FormSummary[]> {
  if (PACKAGE_ID === "0x0") return [];
  const events = await suiClient.queryEvents({
    query: { MoveEventType: `${PACKAGE_ID}::events::FormCreated` },
    limit: 200,
    order: "descending",
  });

  const ids = events.data
    .filter((e) => (e.parsedJson as { owner?: string })?.owner === owner)
    .map((e) => (e.parsedJson as { form_id?: string })?.form_id)
    .filter((id): id is string => !!id);

  const forms = await Promise.all(ids.map((id: string) => fetchForm(id).catch(() => null)));
  return forms.filter((f): f is FormSummary => f !== null);
}

/**
 * List submission events for a form.
 */
export async function listSubmissions(formId: string): Promise<SubmissionSummary[]> {
  if (PACKAGE_ID === "0x0") return [];
  const events = await suiClient.queryEvents({
    query: { MoveEventType: `${PACKAGE_ID}::events::SubmissionReceived` },
    limit: 1000,
    order: "descending",
  });

  const filtered = events.data.filter(
    (e) => (e.parsedJson as { form_id?: string })?.form_id === formId,
  );

  const ids = filtered
    .map((e) => (e.parsedJson as { submission_id?: string })?.submission_id)
    .filter((id): id is string => !!id);

  if (ids.length === 0) return [];

  const objs = await suiClient.multiGetObjects({
    ids,
    options: { showContent: true },
  });

  const out: SubmissionSummary[] = [];
  for (const o of objs) {
    if (!o.data?.content || o.data.content.dataType !== "moveObject") continue;
    // biome-ignore lint/suspicious/noExplicitAny: parsed
    const s = (o.data.content as any).fields;
    out.push({
      id: o.data.objectId,
      formId: s.form_id,
      blobId: bytesToString(s.blob_id),
      submitter: s.submitter,
      submittedAtMs: Number(s.submitted_at_ms),
      status: Number(s.status),
      priority: Number(s.priority),
      tags: s.tags ?? [],
      hasNotes: !!s.has_notes,
      notesBlobId: s.has_notes ? bytesToString(s.notes_blob_id) : undefined,
    });
  }
  return out;
}

export async function fetchSubmissionPayload(blobId: string): Promise<Submission> {
  return readJson<Submission>(blobId);
}
