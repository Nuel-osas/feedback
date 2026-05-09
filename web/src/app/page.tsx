import Link from "next/link";
import {
  Database,
  Lock,
  Sparkles,
  Waves,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function HomePage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16 space-y-24">
      <section className="text-center space-y-6">
        <Badge variant="info" className="mx-auto">
          <Waves className="h-3 w-3" /> Walrus Sessions 2 build
        </Badge>
        <h1 className="text-5xl font-semibold tracking-tight">
          Forms that live on Walrus.
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Tideform is a feedback and form platform with on-chain ownership and
          encrypted private fields. Every form schema and submission is a Walrus
          blob. Access is gated by Sui Move and Seal.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Button asChild variant="primary" size="lg">
            <Link href="/app/new">Create a form</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/app">Open dashboard</Link>
          </Button>
        </div>
      </section>

      <section className="grid sm:grid-cols-3 gap-6">
        <Feature
          Icon={Database}
          title="Walrus-native storage"
          body="Form schemas and submissions are stored as Walrus blobs. The blob ID is the URL — share, embed, archive."
        />
        <Feature
          Icon={Lock}
          title="Seal-encrypted fields"
          body="Toggle 'private' on any field. Submitter encrypts to the form's admin policy; only admins can decrypt."
        />
        <Feature
          Icon={Sparkles}
          title="Sui Move ownership"
          body="Form access lives in a Move shared object. Add or remove admins on-chain — no platform middleman."
        />
      </section>

      <section className="grid sm:grid-cols-2 gap-6 items-start">
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">Built for the brief</h2>
          <ul className="space-y-2 text-sm">
            {[
              "Rich text, dropdowns, multi-select, ratings, screenshots, video, URLs, dates, more",
              "Required fields, validations, theme color",
              "Shareable links",
              "Walrus-stored submissions, organized per form",
              "Encrypted private fields via Seal",
              "Admin dashboard: filter, sort, triage, notes, export CSV/JSON",
              "Wallet-based auth, anonymous submissions optional",
            ].map((line) => (
              <li key={line} className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 mt-0.5 text-emerald-500 shrink-0" />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-lg border border-border bg-card p-6 space-y-3">
          <p className="text-sm font-mono text-muted-foreground">$ submit</p>
          <pre className="text-xs font-mono bg-muted/30 rounded p-3 whitespace-pre-wrap">{`1. Encrypt private fields with Seal
2. Upload media to Walrus
3. Bundle submission JSON to Walrus
4. Call submit_response on Sui
5. Event emits, dashboard updates`}</pre>
        </div>
      </section>

      <footer className="text-center text-xs text-muted-foreground pt-8 border-t border-border">
        Open source. Built for{" "}
        <a
          href="https://walrus.xyz"
          target="_blank"
          rel="noreferrer"
          className="underline hover:text-foreground"
        >
          Walrus Sessions Round 2
        </a>
        .
      </footer>
    </div>
  );
}

function Feature({
  Icon,
  title,
  body,
}: {
  Icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
}) {
  return (
    <div className="space-y-2">
      <div className="h-9 w-9 rounded-md bg-sky-500/10 text-sky-500 flex items-center justify-center">
        <Icon className="h-4 w-4" />
      </div>
      <h3 className="font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
