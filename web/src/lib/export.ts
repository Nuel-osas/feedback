import type { FormSchema, Submission } from "./schema";
import type { SubmissionSummary } from "./indexer";

export function exportCSV(
  schema: FormSchema,
  rows: Array<{ summary: SubmissionSummary; payload?: Submission }>,
) {
  const fields = schema.sections.flatMap((s) => s.fields);
  const header = [
    "submission_id",
    "submitted_at",
    "submitter",
    "status",
    "priority",
    ...fields.map((f) => f.label),
  ];
  const lines = [header.map(csvCell).join(",")];
  for (const { summary, payload } of rows) {
    const row = [
      summary.id,
      new Date(summary.submittedAtMs).toISOString(),
      summary.submitter,
      String(summary.status),
      String(summary.priority),
      ...fields.map((f) => {
        const v = payload?.fields[f.id];
        if (!v) return "";
        if (v.kind === "plaintext") {
          return Array.isArray(v.value) ? v.value.join("; ") : String(v.value ?? "");
        }
        if (v.kind === "media") return v.blobId;
        if (v.kind === "encrypted") return `[encrypted:${v.envelope.mode}]`;
        return "";
      }),
    ];
    lines.push(row.map(csvCell).join(","));
  }
  download(`${slug(schema.title)}.csv`, lines.join("\n"), "text/csv");
}

export function exportJSON(
  schema: FormSchema,
  rows: Array<{ summary: SubmissionSummary; payload?: Submission }>,
) {
  const out = {
    form: { title: schema.title, version: schema.formVersion },
    submissions: rows.map((r) => ({ ...r.summary, payload: r.payload })),
  };
  download(
    `${slug(schema.title)}.json`,
    JSON.stringify(out, null, 2),
    "application/json",
  );
}

function csvCell(value: string): string {
  const needs = /[",\n]/.test(value);
  const esc = value.replace(/"/g, '""');
  return needs ? `"${esc}"` : esc;
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "form";
}

function download(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
