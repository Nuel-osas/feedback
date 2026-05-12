"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, Loader2, Pencil, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SubmissionsTable } from "@/components/admin/submissions-table";
import { Analytics } from "@/components/admin/analytics";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fetchForm, fetchFormSchema, type FormSummary } from "@/lib/indexer";
import type { FormSchema } from "@/lib/schema";

export default function FormDashboard({
  params,
}: {
  params: Promise<{ formId: string }>;
}) {
  const { formId } = use(params);
  const [summary, setSummary] = useState<FormSummary | null>(null);
  const [schema, setSchema] = useState<FormSchema | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const s = await fetchForm(formId);
        if (!s) throw new Error("Form not found");
        const sch = await fetchFormSchema(s.schemaBlobId);
        if (!cancelled) {
          setSummary(s);
          setSchema(sch);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [formId]);

  if (error) return <div className="p-8 text-red-500">{error}</div>;
  if (!summary || !schema)
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );

  const publicUrl =
    typeof window !== "undefined" ? `${window.location.origin}/f/${formId}` : `/f/${formId}`;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{schema.title}</h1>
          <div className="text-sm text-muted-foreground flex items-center gap-1.5">
            <span>
              {summary.submissionsCount} submissions · v{summary.version} ·
            </span>
            <Badge variant={summary.status === 0 ? "success" : "secondary"}>
              {summary.status === 0 ? "open" : summary.status === 1 ? "closed" : "archived"}
            </Badge>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              navigator.clipboard.writeText(publicUrl);
              toast.success("Public URL copied");
            }}
          >
            <Share2 className="h-4 w-4" /> Copy link
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href={`/f/${formId}`} target="_blank">
              <ExternalLink className="h-4 w-4" /> View public
            </Link>
          </Button>
          <Button asChild variant="primary" size="sm">
            <Link href={`/app/${formId}/edit`}>
              <Pencil className="h-4 w-4" /> Edit
            </Link>
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="submissions">
            Submissions ({summary.submissionsCount})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <Analytics formId={formId} schema={schema} />
        </TabsContent>
        <TabsContent value="submissions">
          <SubmissionsTable formId={formId} schema={schema} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
