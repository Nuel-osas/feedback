"use client";

import { use, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { FormRunner } from "@/components/runner/form-runner";
import { fetchForm, fetchFormSchema } from "@/lib/indexer";
import type { FormSchema } from "@/lib/schema";

export default function PublicFormPage({
  params,
}: {
  params: Promise<{ formId: string }>;
}) {
  const { formId } = use(params);
  const [data, setData] = useState<{
    schema: FormSchema;
    owner: string;
    version: number;
    requireWallet: boolean;
    closed: boolean;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const summary = await fetchForm(formId);
        if (!summary) throw new Error("Form not found");
        const schema = await fetchFormSchema(summary.schemaBlobId);
        if (!cancelled) {
          setData({
            schema,
            owner: summary.owner,
            version: summary.version,
            requireWallet: summary.requireWallet,
            closed: summary.status !== 0,
          });
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [formId]);

  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;
  if (!data)
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  if (data.closed)
    return (
      <div className="p-8 text-center text-muted-foreground">
        This form is closed and not accepting submissions.
      </div>
    );
  return (
    <FormRunner
      formId={formId}
      formVersion={data.version}
      schema={data.schema}
      ownerAddress={data.owner}
      requireWallet={data.requireWallet}
    />
  );
}
