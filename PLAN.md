# Walrus Sessions 2 — Form Tooling: Full Plan (Unhurried)

This is the complete, no-shortcuts spec for the platform we'd build if we had the full ~10 days. It is the source of truth for scope, architecture, and acceptance.

---

## 1. Product Overview

**Working name:** Tideform (placeholder — change before launch)

**One-line:** A Walrus-native feedback and form platform where anyone can spin up forms (bug reports, feature requests, surveys, applications), share a link, collect rich submissions, and review them in a private, encrypted admin dashboard — with all data stored on Walrus and access controlled via Seal + Sui Move.

**Target users:**
- **Form creators:** Walrus/Sui project teams, DAO ops, hackathon organizers, oncall rotations.
- **Respondents:** Community members, end users, applicants. May or may not have a Sui wallet.
- **Admins:** Form creators + delegated reviewers with read access.

**Core value vs. Google Forms / Typeform:**
- True data sovereignty — submissions live on Walrus, not a SaaS DB.
- Cryptographic privacy — sensitive fields encrypted with Seal, decryptable only by approved admins.
- On-chain ownership — form ownership and admin ACLs are Sui Move objects. No platform-side admin to revoke your data.
- Native Web3 feel — wallet-based auth, gas paid in SUI, blob IDs are URLs.

**Success criteria for the hackathon:**
- Working mainnet deployment.
- Demo video <3 min, hosted on Walrus, recorded *with our own tool* (we collect the demo submission via Tideform).
- Public repo with clean README and one-click local setup.
- DeepSurge submission with at least one real submission visible.
- "Best Form" judging: usability, completeness, polish, Walrus-native depth.

---

## 2. Functional Requirements

### 2.1 Form Builder
- Create / edit / duplicate / archive forms.
- Form metadata: title, description (markdown), banner image, theme color, success message, redirect URL (optional).
- Field types (all required to ship):
  1. **Short text** — single line, with regex/length validation.
  2. **Long / rich text** — markdown editor, length cap.
  3. **Dropdown (single select)** — custom options, optional "other".
  4. **Multi-select / checkbox group** — min/max selections.
  5. **Single checkbox** — for confirmations / consent.
  6. **Star rating** — configurable scale (3, 5, 10).
  7. **Screenshot upload** — image only, max size, multiple allowed.
  8. **Video upload** — mp4/webm, max size, single per field.
  9. **URL** — with format validation, optional allowlist.
  10. **Number** — integer/decimal, min/max.
  11. **Date / datetime** — ISO storage.
  12. **Email** — with format validation.
  13. **Wallet address** — Sui address validation.
- Per-field properties: label, help text, placeholder, required, default, conditional visibility (`show if field X = Y`), private flag (encrypts via Seal).
- Field reordering via drag-and-drop (dnd-kit).
- Section/page breaks for long forms.
- Form-level settings: open/close dates, max submissions, single-response-per-wallet, captcha (optional), allow anonymous vs. require wallet.
- Live preview pane.
- Versioning: editing a published form creates v2; old responses tagged with version they were submitted against.

### 2.2 Sharing & Publishing
- Publish action: writes form schema to Walrus, registers `Form` object on Sui, returns shareable URL `/{shortId}` (shortId = base58 of Sui object ID).
- QR code generator for the URL.
- Embed snippet (iframe) for external sites.
- Open Graph metadata generated server-side for nice social previews.

### 2.3 Submission Flow (Public)
- Public form renderer at `/{shortId}` — works with or without wallet.
- Client-side validation per field.
- Media uploads stream directly to Walrus (chunked, with progress).
- On submit:
  1. Encrypt private fields with Seal (policy = form's admin set).
  2. Compose submission JSON (plaintext + ciphertext blobs + media blob IDs).
  3. Upload submission JSON to Walrus.
  4. Call Move `submit` entry function — emits event `(form_id, submission_blob_id, submitter, timestamp)` and appends to form's submission registry.
- Show success state with submission receipt (blob ID + tx digest), copyable link to view own submission.
- Optional: respondent gets a "view your submission" cookie/local key so they can revisit.

### 2.4 Admin Dashboard (Private)
- Wallet-gated. Only the form's admin set (Sui addresses listed on the `Form` object) can access.
- Form list view: cards with submission count, last activity, status (open/closed).
- Per-form submissions view:
  - Table with sortable columns (one column per field, plus submitted-at, submitter, status).
  - Filter chips: by status, by field value, by date range, by has-media.
  - Full-text search across plaintext fields.
  - Click row → drawer with full submission, decrypted private fields, media previews.
  - **Notes:** admins can leave private notes on a submission (stored as a separate Walrus blob, encrypted).
  - **Status / triage:** new / in-progress / resolved / spam — admin-set, stored as Move object state OR encrypted side-blob.
  - **Priority:** low / med / high / urgent.
  - **Tags:** custom labels per form.
  - **Bulk actions:** mark resolved, delete (soft — see 2.6), export selected.
- Analytics widget per form: response count over time, completion rate, field-level distributions for selects/ratings.
- **Export:** CSV (plaintext + decrypted), JSON, ZIP-with-media. Respect private-field decryption.
- **Admin management:** form owner can add/remove admin addresses (Move tx).

### 2.5 Auth
- Wallet connect via `@mysten/dapp-kit` — supports Sui Wallet, Suiet, Phantom (Sui mode), Slush.
- "Sign-in with Sui" — sign a SIWE-style message to bind session to wallet (no on-chain tx).
- Anonymous respondents allowed by default; form creators can require wallet auth per form.

### 2.6 Data Lifecycle
- Walrus epoch handling: form schemas stored with long retention (e.g., 100 epochs); submissions inherit form's retention setting.
- Renewal: dashboard surfaces blobs nearing expiry, owner can extend (pay storage).
- Deletion: Walrus blobs are not "deleted" but the Move object can mark a submission `hidden`; admins can refuse to display.

---

## 3. Non-Functional Requirements

- **Performance:** form load <1.5s on 4G; submission flow <30s for forms without media; media upload progress visible.
- **Accessibility:** WCAG 2.1 AA — keyboard nav, ARIA, color contrast, reduced motion.
- **Mobile:** fully responsive, works on iOS Safari + Android Chrome.
- **i18n:** copy externalized via `next-intl`; ship English only, structure ready for more.
- **Browser support:** evergreen Chrome/Firefox/Safari/Edge; no IE.
- **Offline-friendly drafts:** form-builder autosaves drafts to localStorage; respondents' in-progress submissions saved locally until submit.
- **Observability:** Sentry for client errors, Vercel analytics, structured logs in API routes.

---

## 4. Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌────────────────┐
│  Next.js App    │    │   Walrus Network │    │   Sui Network  │
│  (Vercel)       │◄──►│   (blob store)   │    │   (Move objs)  │
│                 │    └──────────────────┘    │                │
│  - Builder UI   │                            │  - Form obj    │
│  - Renderer UI  │◄────────────────────────►  │  - Registry    │
│  - Admin UI     │                            │  - Events      │
│  - Wallet kit   │                            └────────────────┘
└─────────────────┘             │
        │                       │
        ▼                       ▼
┌──────────────────┐    ┌──────────────────┐
│  Seal KMS        │    │  Walrus aggregator│
│  (threshold      │    │  + publisher      │
│   key servers)   │    │   endpoints       │
└──────────────────┘    └──────────────────┘
```

**Trust model:**
- Walrus stores ciphertext for private fields and plaintext for public ones — Walrus operators cannot read private fields.
- Seal key servers cooperate to release decryption keys only when on-chain policy is satisfied (caller is in `Form.admins`).
- Sui Move is the source of truth for ownership and ACLs; storage layer is content-addressed (Walrus).
- Frontend is open-source; users can self-host and verify.

---

## 5. Tech Stack

### Frontend
- **Next.js 15** (App Router, RSC where it helps, mostly client for builder).
- **TypeScript** (strict).
- **Tailwind CSS** + **shadcn/ui** + **lucide-react**.
- **react-hook-form** + **zod** for form state and validation.
- **dnd-kit** for drag-and-drop builder.
- **TipTap** for rich text fields.
- **TanStack Query** for data fetching/caching.
- **next-themes** for light/dark.

### Web3
- **@mysten/sui** — Sui SDK.
- **@mysten/dapp-kit** — wallet connect + React hooks.
- **@mysten/walrus** — Walrus client (blob upload/download, quilt for batch).
- **@mysten/seal** — Seal SDK for IBE encryption against on-chain policies.

### Backend / Infra
- Mostly serverless via Next.js Route Handlers.
- **Vercel** hosting (Edge for read paths, Node for Walrus uploads needing larger bodies).
- **Vercel Blob** *not used* — keep storage path Walrus-only.
- Optional: a tiny Postgres (Neon) for *non-authoritative* indexes/caches (e.g., search index, view counters) — never source of truth.

### Move
- **Sui Move** package: `tideform`.
- Modules: `form`, `submission`, `admin`, `events`.

### Tooling
- **pnpm** + workspaces (`/web`, `/move`, `/scripts`).
- **Biome** for lint/format (faster than ESLint+Prettier).
- **Vitest** for unit tests, **Playwright** for e2e.
- **GitHub Actions:** lint, typecheck, test, Move build, contract test, preview deploy.

---

## 6. Data Models

### 6.1 Form Schema (stored as JSON on Walrus)
```ts
type FormSchema = {
  version: number;            // schema version of this format
  formVersion: number;        // version of this form (bumps on edit)
  title: string;
  description: string;        // markdown
  bannerBlobId?: string;
  theme: { primary: string; mode: "light" | "dark" | "auto" };
  settings: {
    opensAt?: string;
    closesAt?: string;
    maxSubmissions?: number;
    requireWallet: boolean;
    onePerWallet: boolean;
    captcha: boolean;
    successMessage: string;
    redirectUrl?: string;
  };
  sections: Array<{
    id: string;
    title?: string;
    fields: Field[];
  }>;
};

type Field = {
  id: string;                 // stable across versions
  type: FieldType;
  label: string;
  help?: string;
  placeholder?: string;
  required: boolean;
  private: boolean;           // if true, value encrypted with Seal
  defaultValue?: unknown;
  validation?: Record<string, unknown>;  // type-specific
  options?: Array<{ id: string; label: string; value: string }>;
  conditional?: { fieldId: string; equals: unknown };
};
```

### 6.2 Submission (stored as JSON on Walrus)
```ts
type Submission = {
  formId: string;             // Sui object ID
  formVersion: number;
  submittedAt: string;        // ISO
  submitter?: string;         // Sui address if signed
  fields: Record<string, FieldValue>;
};

type FieldValue =
  | { kind: "plaintext"; value: unknown }
  | { kind: "media"; blobId: string; mime: string; bytes: number; name: string }
  | { kind: "encrypted"; ciphertext: string; sealId: string };  // Seal envelope
```

### 6.3 Sui Move Objects

```move
module tideform::form {
    struct Form has key {
        id: UID,
        owner: address,
        admins: vector<address>,    // includes owner
        schema_blob_id: vector<u8>, // Walrus blob ID of FormSchema
        created_at: u64,
        version: u64,
        status: u8,                 // 0=open, 1=closed, 2=archived
        submissions_count: u64,
    }

    struct Submission has key {
        id: UID,
        form_id: ID,
        blob_id: vector<u8>,
        submitter: address,
        submitted_at: u64,
        status: u8,
        priority: u8,
        tags: vector<String>,
        notes_blob_id: Option<vector<u8>>,
    }
}
```

Events emitted: `FormCreated`, `FormUpdated`, `SubmissionReceived`, `AdminAdded`, `AdminRemoved`, `SubmissionStatusChanged`.

---

## 7. Walrus Integration

- Use `WalrusClient` from `@mysten/walrus`. Configure mainnet endpoints (publisher + aggregator) per current docs.
- **Form schema upload:** `writeBlob` with `epochs: 100`, `deletable: false`. Blob ID becomes part of Form object.
- **Submission upload:** `writeBlob` with `epochs: 53` (~6 mo) by default; configurable per form.
- **Media uploads:** chunked via Walrus quilt for >1 MB; show progress.
- **Reads:** `readBlob` direct from aggregator; cache via TanStack Query + browser cache.
- **Cost model:** form creator pays for schema storage; submitter pays for their submission storage (their gas). Surface estimated cost before submit.
- **Renewal:** dashboard shows expiry; "extend storage" calls `extendBlob`.
- **Verify before display:** for submissions surfaced in admin, verify blob certified before trusting content.

---

## 8. Seal Integration

- Use `SealClient` with mainnet key server set.
- **Policy:** "address ∈ Form.admins at access time" — encoded as a Move identity-based policy referencing `Form` object.
- **Encryption flow (submitter):**
  1. Fetch Form's admin set + policy ID.
  2. For each `private: true` field, encrypt value bytes with Seal IBE → `{ciphertext, sealId}`.
  3. Embed in submission JSON; upload as one blob.
- **Decryption flow (admin):**
  1. Connect wallet → prove address.
  2. Request decryption keys from Seal key servers (threshold).
  3. Servers verify on-chain that caller is in `Form.admins` for the given policy.
  4. Decrypt client-side.
- **Key rotation:** when admin added/removed, re-encryption is *not* needed (IBE binds to policy, not keys). New admins can decrypt past submissions. Removed admins keep historical access — document this clearly. (Stretch: per-submission session keys for forward secrecy.)
- **Fallback (if Seal blocks):** libsodium `crypto_box_seal` with form owner's Sui pubkey. Documented limitation: only owner can decrypt, no admin delegation.

---

## 9. Sui Move Contracts — Detailed

### Modules
- `form.move` — `Form` object, create/update/close, admin management.
- `submission.move` — `Submission` object, create on submit, update status/priority/tags, attach notes.
- `events.move` — event definitions.
- `acl.move` — pure helpers for admin checks (used by Seal policy).

### Entry functions (selected)
- `create_form(schema_blob_id, ctx)` → returns `Form` shared object.
- `update_form_schema(form, new_schema_blob_id, ctx)` — owner only, bumps version.
- `submit_response(form, blob_id, clock, ctx)` — anyone (or wallet-required per form settings); creates `Submission`.
- `set_status(submission, status, ctx)` — admin only.
- `set_priority(submission, priority, ctx)` — admin only.
- `add_admin(form, addr, ctx)` — owner only.
- `remove_admin(form, addr, ctx)` — owner only.
- `attach_notes(submission, notes_blob_id, ctx)` — admin only.

### Tests
- Move unit tests for: ownership transitions, admin add/remove, status updates, unauthorized callers rejected, event emissions.
- Run via `sui move test`.

### Deployment
- Compile, publish to mainnet from a deploy wallet.
- Record `PACKAGE_ID` in `web/.env`.

---

## 10. Frontend Pages & Components

### Pages
- `/` — landing: hero, "create your first form", live demo form embed.
- `/login` — wallet connect (modal anywhere actually).
- `/app` — form list (creator's forms).
- `/app/new` — form builder (blank).
- `/app/{formId}/edit` — form builder (existing).
- `/app/{formId}` — admin dashboard for that form.
- `/app/{formId}/submissions/{submissionId}` — submission detail drawer (deep-linkable).
- `/app/settings` — wallet, default storage settings.
- `/f/{shortId}` — public form renderer.
- `/f/{shortId}/thanks` — submission success.
- `/f/{shortId}/{submissionId}` — respondent's view of their submission (cookie-gated).
- `/about`, `/privacy`, `/terms`.

### Component inventory (key ones)
- `FormBuilder` (composes `FieldList`, `FieldEditor`, `LivePreview`, `SettingsPanel`).
- `FieldEditor` — one per field type, all behind a `FieldEditorRegistry`.
- `FieldRenderer` — public-side mirror of editor (read-only of the schema).
- `WalletButton`, `WalrusUploadProgress`, `SealBadge`.
- `SubmissionTable` (TanStack Table), `SubmissionDrawer`, `FilterBar`, `BulkActionsBar`.
- `MediaPreview` (image / video).
- `MarkdownRenderer` (sanitized via DOMPurify).

### State
- TanStack Query for server data (Sui RPC, Walrus reads).
- Zustand for builder local state (heavy editing, undo/redo).
- URL state for filters/sorts (so links are shareable).

---

## 11. Security & Threat Model

| Threat | Mitigation |
|---|---|
| Walrus operator reads private data | Seal encryption at rest; only ciphertext leaves the client |
| Malicious submitter spams form | Rate limit per IP (Vercel Edge), optional captcha, optional wallet-required, max-submissions cap |
| Admin escalation | Move ACL is single source of truth; UI checks are advisory only |
| XSS via rich-text fields | DOMPurify on render, server-side render avoids unsafe innerHTML |
| Phishing forms | Show form owner's wallet address prominently; verified-creator badge (stretch) |
| Replay of submission tx | Move `submit_response` does not deduplicate by content; if `onePerWallet` is set, contract checks via `Table<address, bool>` on Form |
| Media containing malware | We do not execute. Browser sandbox for previews. Note in privacy policy. |
| Seal key server collusion | Threshold (e.g., 2-of-3); document trust assumption |
| Wallet drained by signing | All txs use minimal scope; show clear sign-message UI |
| CSRF on API routes | SameSite=Lax cookies + signed-message session |
| Lost private notes key | Notes encrypted to admin set, same as submissions — no recovery if all admins lose keys |

---

## 12. Testing Strategy

- **Unit (Vitest):** validation, schema migrations, encryption envelope, CSV serializer, conditional visibility resolver.
- **Component (Vitest + Testing Library):** each `FieldEditor` and `FieldRenderer`.
- **Move tests:** all entry functions, ACL, events.
- **Integration:** local Sui devnet + Walrus testnet — full submit flow.
- **e2e (Playwright):** create form → publish → submit as anon → submit as wallet → admin views → CSV export. Run against deployed preview.
- **Manual QA matrix:** iOS Safari, Android Chrome, low-bandwidth, slow Walrus aggregator, partial Seal failure, large media upload (>50MB).

---

## 13. Deployment & Ops

- **Environments:** local → Vercel preview (per PR) → Vercel production.
- **Networks:** testnet for previews, mainnet for production.
- **Env vars:** `SUI_NETWORK`, `SUI_PACKAGE_ID`, `WALRUS_PUBLISHER`, `WALRUS_AGGREGATOR`, `SEAL_KEY_SERVERS`, `SENTRY_DSN`.
- **Secrets:** none on the server beyond Sentry; client signs its own txs.
- **Monitoring:** Sentry, Vercel logs, a `/healthz` route that pings Walrus + Sui RPC.
- **Status page:** static, points to Walrus + Sui status.
- **Backups:** the chain is the backup. Snapshot Move package source + deploy tx into the repo.

---

## 14. Documentation Deliverables

- `README.md` — what it is, screenshots, quick start, deploy guide.
- `ARCHITECTURE.md` — this doc trimmed to essentials.
- `MOVE.md` — module reference.
- `SEAL.md` — encryption flow, threat model.
- `CONTRIBUTING.md`.
- In-app docs page for form creators: "How private fields work", "Storage costs", "Renewing forms".

---

## 15. Pre-flight Checklist (before coding)

- [ ] Sui mainnet wallet funded with ≥ 5 SUI for Move publish + a few txs.
- [ ] Sui testnet wallet funded (faucet) for dev.
- [ ] Walrus testnet & mainnet endpoint URLs verified against current docs (use context7 to fetch).
- [ ] Seal key server set verified for mainnet.
- [ ] Vercel account, GitHub repo created (public).
- [ ] Domain (optional) — e.g., `tideform.xyz`.
- [ ] Node 20+, pnpm 9+, sui CLI installed (`brew install sui` or from source).
- [ ] DeepSurge account registered, hackathon entry registered.
- [ ] Logo / wordmark sketched (even hand-drawn is fine).

---

## 16. Day-by-Day Plan (Unhurried, ~10 days)

| Day | Focus |
|---|---|
| 1 | Repo scaffold, Move package skeleton, wallet connect, design system (shadcn theme), CI pipeline. |
| 2 | Move modules: `form`, `submission`, `events`. Move tests. Local devnet integration. |
| 3 | Walrus client wrapper, upload/download utilities, blob expiry handling. Cost estimator. |
| 4 | Form builder UI: layout, field list, field editors for text/long-text/dropdown/checkbox. |
| 5 | Form builder cont'd: rating, screenshot, video, URL, number, date, conditional fields. Live preview. |
| 6 | Public form renderer + submission flow (no encryption yet). End-to-end test on testnet. |
| 7 | Seal integration: encryption on submit, decryption in dashboard. Key server health checks. |
| 8 | Admin dashboard: table, filters, sort, drawer, notes, statuses, priorities, tags. |
| 9 | CSV/JSON/ZIP export. Analytics widget. Polish, accessibility audit, mobile QA. Mainnet Move publish. |
| 10 | Vercel production deploy. Dogfood — collect real submissions via own form. Record demo. Upload demo to Walrus through our own tool. DeepSurge submission. |

Buffer: half-day at end for unforeseen breakage.

---

## 17. Stretch Goals (only if time)

- Conditional logic builder UI (visual rule editor).
- Form templates gallery (NPS, bug report, hackathon application).
- Webhook / Discord notifier on new submission.
- Wallet-gated forms requiring NFT/coin ownership.
- Multi-step forms with progress bar.
- Respondent receipt NFT (proof of submission).
- AI-powered triage suggestions (Claude API to summarize/categorize).
- Form analytics: completion rate, drop-off heatmap.
- Public submission view (for transparent feedback channels).
- Custom domains per form.
- Form themes / branding.

---

## 18. Submission Deliverables (DeepSurge)

- Public GitHub repo URL.
- Live mainnet app URL.
- Demo video URL — Walrus blob, embedded in submission, recorded using Tideform itself.
- One-pager: problem, solution, architecture diagram, screenshots.
- At least one real submission visible in our own deployed form.
- Tag `@WalrusProtocol` and `@walgo_xyz` on launch tweet.
- Register on Airtable form per brief.

---

## 19. Known Risks & Open Questions

- **Walrus mainnet upload reliability** — may need fallback to alternate publisher; build retry with backoff.
- **Seal mainnet readiness** — verify current SDK version supports the policy shape we need; have libsodium fallback path coded.
- **Move package upgradability** — decide upfront whether to publish as upgradeable. Default: yes, with `UpgradeCap` held by deploy wallet.
- **Gas UX for first-time users** — non-Sui users won't have SUI; consider sponsored transactions via a relayer for v2.
- **Anonymous submissions and on-chain linkability** — even "anonymous" submissions emit a tx from *some* address (sponsor or submitter). Document clearly.
- **Walrus blob expiry** — submissions older than retention window become unreadable; build expiry warnings + bulk-renewal flow.

---

## 20. Definition of Done

A feature is "done" when:
1. Code merged to `main` with passing CI.
2. Unit + integration tests cover happy path and at least one error case.
3. Works on iOS Safari + desktop Chrome.
4. Manually QA'd against mainnet.
5. Documented in user-facing docs if user-visible.
6. Telemetry/error tracking wired.

---
