# Tideform

Walrus-native feedback and form platform built for **Walrus Sessions Round 2**.

Spin up a form (bug report, feature request, survey, application) with a rich field set; share a public link; collect submissions stored on Walrus; review and triage them in a private admin dashboard. Form ownership and admin ACLs are Sui Move objects. Private fields are encrypted with Seal.

## Stack

- **Frontend** — Next.js 16 (App Router) · TypeScript · Tailwind v4 · custom UI primitives over Radix
- **Web3** — `@mysten/sui` · `@mysten/dapp-kit` · `@mysten/walrus` · `@mysten/seal`
- **Storage** — Walrus blobs (form schemas, submissions, media, notes)
- **Smart contracts** — Sui Move package `tideform` (`form`, `submission`, `events`)
- **State** — TanStack Query (server) · Zustand (builder)

## Repo layout

```
walrus-feedback/
  web/              Next.js app
    src/
      app/          routes (/, /app, /app/new, /app/[id], /f/[id], …)
      components/   builder, runner, admin, ui primitives
      lib/          sui, walrus, seal, schema, indexer, move, export
  move/             Sui Move package
    sources/        form.move, submission.move, events.move
    tests/          form_tests.move
  PLAN.md           full unhurried spec
```

## Local setup

```bash
pnpm install
cp web/.env.example web/.env.local      # fill in NEXT_PUBLIC_TIDEFORM_PACKAGE_ID after publish
pnpm dev                                # http://localhost:3000
```

## Move package

Tests:

```bash
pnpm move:test
```

Build:

```bash
pnpm move:build
```

Publish to mainnet (requires funded wallet, ~0.5 SUI):

```bash
sui client switch --env mainnet
pnpm move:publish
# copy the published packageId into web/.env.local
```

## Field types supported

short text · long text · rich text · dropdown · multi-select · checkbox · star rating · screenshot · video · URL · number · date · email · Sui wallet address.

Per-field flags: required, private (encrypted), help text, placeholder, validation.

## Architecture

```
Browser (Next.js) ─► Walrus blob store     ◄─ form schemas, submissions, media, notes
       │
       ├─► Sui Move (tideform)             ◄─ Form / Submission shared objects, events
       │       owner, admins, status, priority, tags, notes_blob_id
       │
       └─► Seal key servers                ◄─ encrypts private field values
                                             policy = caller ∈ Form.admins
```

The dashboard lists forms by querying `events::FormCreated` for the connected wallet, then fetches `Form` objects and their schema blobs. Submissions are listed via `events::SubmissionReceived` filtered by form_id, then their payload blobs are fetched and (for placeholder envelopes) decoded for display.

## Seal mainnet key servers

Tideform uses the **H2O Nodes Open mainnet key server** (`0x4a65…7286a`) — publicly available, no signup. Single-server config = threshold 1. For stronger guarantees add more verified providers (Ruby Nodes, Overclock, Enoki, etc.) and bump threshold accordingly.

If `NEXT_PUBLIC_SEAL_KEY_SERVERS` is left empty, private fields fall back to a base64 envelope marked `mode: "placeholder"` (NOT real encryption) so the rest of the pipeline still runs for local development.

## Hackathon checklist

- [x] Form builder with all required input types
- [x] Required-field flag, private-field flag, validations
- [x] Shareable form link (`/f/{formId}`)
- [x] Walrus storage for schemas, submissions, media, notes
- [x] Sui Move ownership + ACL + events
- [x] Admin dashboard: filter, search, status/priority, notes, drawer
- [x] CSV + JSON export
- [x] Move tests passing (`sui move test`)
- [ ] Mainnet publish + production deploy
- [ ] <3 min demo video, recorded via own tool, uploaded to Walrus
- [ ] DeepSurge submission

See `PLAN.md` for the full unhurried spec and stretch goals.
