"use client";

import { use, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Builder } from "@/components/builder/builder";
import { useBuilder } from "@/components/builder/store";
import { fetchForm, fetchFormSchema } from "@/lib/indexer";

export default function EditFormPage({
  params,
}: {
  params: Promise<{ formId: string }>;
}) {
  const { formId } = use(params);
  const setSchema = useBuilder((s) => s.setSchema);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const summary = await fetchForm(formId);
        if (!summary) throw new Error("Form not found");
        const schema = await fetchFormSchema(summary.schemaBlobId);
        if (!cancelled) {
          setSchema(schema);
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load");
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [formId, setSchema]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (error) return <div className="p-8 text-red-500">{error}</div>;
  return <Builder existingFormId={formId} />;
}
