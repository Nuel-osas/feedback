"use client";

import { Download } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function ExportsPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-8 space-y-4">
      <div>
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <Download className="h-5 w-5" /> Exports
        </h1>
        <p className="text-xs text-muted-foreground">
          Bulk export submissions across all your forms
        </p>
      </div>
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Per-form CSV/JSON export lives inside each form's Submissions tab.
          Cross-form rollup exports are on the roadmap (see TODO.md).
        </CardContent>
      </Card>
    </div>
  );
}
