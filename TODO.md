# Tideform — TODO

Items deferred from the hackathon build. Captured here so they're easy to scan, sort, and pick up later. Numbering is stable so cross-references in commits / PRs stay valid.

## At a glance

| ID | Title | Theme | Depends on | Priority |
|---|---|---|---|---|
| [AI-1](#todo-ai-1--ai-assisted-form-creation) | AI-assisted form creation | AI / UX | — | medium |
| [AI-2](#todo-ai-2--speech-to-execute-on-the-llm) | Speech-to-execute on the LLM | AI / UX | AI-1 (shared infra) | low |
| [PAY-1](#todo-pay-1--abstract-walrus--sui-payments-sponsored-txs) | Sponsored Walrus + Sui txs | Payments / UX | — | **high** |
| [BIZ-1](#todo-biz-1--subscription-model) | Subscription model | Business | PAY-1 | medium |
| [ZK-1](#todo-zk-1--zklogin-onboarding) | zkLogin onboarding | Auth | PAY-1 (recommended) | medium |
| [ZK-2](#todo-zk-2--anonymous-rate-limited-submissions) | Anonymous, rate-limited submissions | Privacy | — | low (stretch) |

---

## TODO-AI-1 — AI-assisted form creation

**Goal:** a user describes the form they want in plain English (or another language), and Tideform scaffolds an editable schema before they drop into the builder.

**UX shape:**
- Land on `/app/new` → "Describe your form" textarea + "Start from scratch" link below.
- Submit prompt → LLM (Claude Opus 4.7 via Anthropic API) returns a `FormSchema` JSON conforming to `web/src/lib/schema.ts`.
- Render in the builder, dirty-flagged, user can edit before publishing.

**Notes:**
- Use structured output / tool-use so the LLM emits valid `FormSchema`. Validate with the existing zod schema; if it fails, retry once with the validation errors as feedback.
- Keep the LLM call server-side (Next.js Route Handler) so the API key doesn't leak.
- Cache prompt → schema pairs in Vercel KV (optional) for repeat traffic.
- Cost: probably <$0.02 per generation with Sonnet 4.6; <$0.10 with Opus.

---

## TODO-AI-2 — Speech-to-execute on the LLM

**Goal:** user clicks a mic button, speaks ("change the rating field to 10 stars", "add a wallet address field after the email"), the LLM mutates the current schema.

**UX shape:**
- Mic button in the builder header.
- Browser SpeechRecognition API (webkit) captures audio → transcript.
- Transcript + current `FormSchema` → LLM with a tool-use schema for in-place edits (`addField`, `updateField`, `removeField`, `moveField`, `setSetting`).
- Apply tool calls to the Zustand builder store one-by-one with optimistic UI.
- Show transcript + a list of applied changes ("✓ Added rating field 'Quality'").

**Notes:**
- Use `claude-opus-4-7` for accuracy on multi-step instructions; falls back to `claude-haiku-4-5` for low-latency single edits.
- Webkit SpeechRecognition works on Chrome desktop + iOS Safari; Firefox doesn't. Fall back to a typed prompt in the same modal.
- Cap turns per session; rate-limit to ~10 commands/min.
- Privacy: process the transcript server-side, never log it.

---

## TODO-PAY-1 — Abstract Walrus + Sui payments (sponsored txs)

**Goal:** respondents don't need SUI, WAL, or a connected wallet to fill out a public form. Form creators shouldn't need to think about gas economics for low-value flows either.

**Today's UX (after PTB bundling):**
- 2 wallet popups per form publish (register + certify-bundled-with-create).
- 2 wallet popups per submission, plus 2 more per media file.
- Submitter pays their own SUI + WAL, must have both pre-funded.

**UX shape after:**
- Anonymous respondents can submit with just a "Sign in with Google" (see ZK-1) or even no sign-in at all.
- Form creators see "Sponsored — paid by Tideform" badges next to fields that don't require a wallet.
- A balance/quota indicator in the creator dashboard so they know how much sponsored capacity their forms have.

**Architectures to consider:**
1. **Mysten Enoki sponsored transactions** — Enoki signs gas on behalf of the user. Tideform funds an Enoki app key with SUI. Enoki returns a partially-signed gas object; the user (or zkLogin proof) signs the rest. Rate-limited per-app, configurable.
2. **Walrus publisher we operate** — stand up our own `walrus-publisher` instance behind a CORS-permissive endpoint. Server holds WAL + SUI, accepts blob uploads from authenticated clients (HMAC or session-cookie), pays storage. Removes register/certify popups entirely for that path. Trade-off: we trust the publisher; harder to keep "Walrus-native" in a strict sense.
3. **Server-side relayer for Sui txs** — Node service that receives an unsigned PTB + a client-provided signature, adds gas, executes. Same trust model as #1.

**Order to ship:**
1. Stand up our own Walrus publisher pointed at our package (eliminates ~80% of the popup count).
2. Integrate Enoki for the remaining `form::create` / `submission::submit` txs.
3. Add quota tracking + abuse limits (per-form, per-IP, per-zkLogin-sub).

**Notes:**
- Form-owner-paid model vs platform-paid model is a billing decision; default to platform-paid w/ a free quota.
- Keep the **wallet-paid path as fallback** — power users / DAOs may want full sovereignty.
- The Move ACL (`Form.admins`, `seal_approve`) doesn't change. zkLogin and sponsored txs still produce real Sui addresses; ACLs work as-is.

---

## TODO-BIZ-1 — Subscription model

**Depends on:** PAY-1 (sponsored txs make a quota-based model possible).

**Goal:** monetize Tideform through tiered subscriptions that gate sponsored payment capacity, advanced features, and admin headcount.

**Sketched tiers (placeholder numbers):**

| Tier | $/mo | Forms | Submissions / mo | Sponsored gas | Admins / form | Notes |
|---|---|---|---|---|---|---|
| Free | $0 | 3 | 200 | $5 quota | 1 (owner only) | Tideform branding visible. |
| Pro | $19 | 25 | 5,000 | $40 quota | 5 | Remove branding, custom theme color, CSV/JSON export. |
| Team | $59 | unlimited | 50,000 | $200 quota | 25 | Webhooks, Discord notifier, AI form-builder (AI-1) included. |
| Enterprise | custom | — | — | invoiced | — | SSO via zkLogin partner OAuth, custom domain, SLA. |

**Mechanics:**
- Subscriptions billed in USD via Stripe; the platform converts to SUI/WAL on its side.
- Quota tracking lives off-chain (Postgres + Redis); each sponsored upload decrements quota.
- When quota hits zero, the form gracefully falls back to wallet-paid mode for that submitter, or shows a "form temporarily over quota" message — chosen by the form owner.
- On-chain proof of subscription is **optional** but nice — mint a non-transferable `Subscription` NFT to the owner's wallet on signup so wallet-paid power users can use it as auth without account creation.

**Notes:**
- Don't gate Walrus storage longevity by subscription — once a blob is stored, it survives until its epoch retention runs out regardless of plan changes. Surface this in pricing copy.
- Refund / cancellation: simple — cancellation stops sponsored quota at end of period; submissions and forms remain accessible. Walrus blobs are tied to whoever paid storage, so old submissions don't get nuked.
- Tax: handle via Stripe Tax or equivalent.

---

## TODO-ZK-1 — zkLogin onboarding

**Goal:** remove the wallet-extension barrier. Anyone with a Google/Apple/Twitch/Facebook account can sign in, get a real Sui address derived via zkLogin, and use Tideform without installing anything.

**UX shape:**
- "Continue with Google" button on the public form page, the landing, and the dashboard login modal.
- After OAuth, mint a zkLogin keypair, derive the user's Sui address, store the ephemeral key in `sessionStorage`.
- Show "Signed in as alice@gmail.com (0xab…cd)" in the topbar.
- Wallet extensions remain a parallel auth method — both paths land at the same `useCurrentAccount` shape.

**Pieces required:**
- `@mysten/zklogin` for proof generation.
- A small Next.js Route Handler that proxies the OAuth callback and forwards the JWT to Mysten's prover service (or our self-hosted one).
- Salt management — generate a per-user salt server-side, store it under a hash of the JWT's `sub` claim so the same identity always derives the same address.
- Wire into existing dapp-kit `WalletProvider` — write a custom adapter that exposes zkLogin as a "wallet."

Combines naturally with **PAY-1**: zkLogin users typically don't hold SUI, so they need sponsored gas to do anything useful on-chain.

**Privacy notes:**
- The OAuth provider learns the user signed into "Tideform"; it doesn't learn what they submitted (private fields are still Seal-encrypted).
- The zkLogin proof is what's on-chain — the OAuth identity is not directly linkable to the Sui address without the salt.
- Tideform's backend sees the salt and the address but never has access to private-field plaintext.

---

## TODO-ZK-2 — Anonymous, rate-limited submissions

**Status:** stretch / probably out of hackathon scope.

**Goal:** allow truly anonymous submissions (no OAuth, no wallet) that are still rate-limited and Sybil-resistant.

**Approach:** zk-proof of group membership (e.g., "I hold a Walrus Sessions attendee NFT", or "I am in this allowlist") without revealing which group member. Tideform's contract checks the proof + a nullifier; the nullifier prevents double-submission while preserving anonymity.

**Use cases:**
- Whistleblower-style feedback channels.
- Surveys where the audience is gated (e.g., only DAO members) but responses must be anonymous.
