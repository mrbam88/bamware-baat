# ADR 0001 — Retire @bamware/client-core; the app's inline API layer is the client-side contract surface

- Status: accepted
- Date: 2026-08-21
- Issue: mrbam88/bamware-dating-app#6
- Decision: **Option B — retire** (issue #6 offered revive-as-contract-package vs retire)

## Context

The June 2026 matches-pagination change (`ba563f9` service-side, fixed
app-side in `d4954d4`) broke chat silently for ~6 weeks because client and
server share no contract. Issue #6 asked for a decision: revive
`@bamware/client-core` as a shared Zod contract package (Option A) or retire
it (Option B).

Audit findings (2026-08-21, service ground truth = `bamware-dating-service`
`origin/main` @ `4b024e0`):

1. **The package was already abandoned by every consumer, deliberately.**
   - dating-service inlined its logger and dropped the dep (`646086f`).
   - bamware-web inlined logger/audit and dropped the dep (`e71e2b7`) after
     the cross-repo `file:`/tarball dependency repeatedly broke Vercel
     builds.
   - bamware-auth-service removed it (`a19e749`).
   - The app's only remaining use is a 107-line vendored stub
     (`vendor/client-core`) exposing Logger/AuditService — none of the
     package's API surface.
2. **client-core `main` never contained API contracts.** Its modules are
   logger/auth/query/audit. The contract work exists only on unmerged
   `feat/6-contracts` branches (client-core `f37f9c3`, service `564a3bf`).
3. **The unmerged contract branch proves the drift problem it was meant to
   solve.** It was cut 2026-07-23 and went stale the *same day* (cultural
   profile fields, service PR #17, are missing from it). It is now three
   schema-changing merges behind (`d3a43b6`, `b5eb86c`, `4b024e0`).
4. **The app's inline `src/api/*.ts` layer has effectively replaced the
   package.** All eight modules were verified field-by-field against the
   service's `src/schemas/*.ts` on current `origin/main`: MatchPage
   envelope, enriched match fields, prompts, cultural fields, safety,
   devices, photos — no drift found.
5. **The stub was actively harmful.** Its Sentry/CloudWatch/Datadog
   transports are empty no-ops, so production builds silently emit no
   remote logs, and the smoke tests (`not.toThrow()`) can never catch it.

## Why not Option A (revive)

- Option A's entire payoff — a service shape change becoming a compile
  error in the app — only materializes when the **service** imports the
  shared schemas. Service-side changes are outside this ticket's fence and
  cross-repo contract changes are a Bilal-only gate (bamware-ai AGENTS.md).
  A contracts package the service does not consume is a third hand-synced
  copy of the types, and finding #3 shows exactly how fast that copy rots.
- Distribution is unsolved: `file:` sibling links and committed tarballs
  each broke builds before (that history is why web and the service left).
  GitHub Packages or git deps mean CI/auth config — also Bilal-only gates.
- The org is solo-founder with two repos in the pair. The coordination
  discipline in bamware-ai `docs/contracts.md` (service shape change ⇒
  matching app PR; app verifies against service `src/schemas/*.ts` on
  current main) is the working mitigation, and it is what caught nothing
  drifting today.

## Decision

Retire `@bamware/client-core` from the app:

- `vendor/client-core` deleted; `file:` dependency and Jest
  `moduleNameMapper` removed.
- The genuinely used surface (Logger, transports, AuditService) is folded
  into `src/lib/logging.ts` as first-class app code, behavior-identical.
  The no-op remote transports are now explicitly documented in-code and
  tracked as a follow-up issue (wiring them is a behavior change, out of
  scope here).
- `src/api/*.ts` stays the single client-side contract surface. Every
  module keeps its contract-note comments naming the service schema it
  mirrors; verification against service `origin/main` `src/schemas/*.ts`
  before building on a shape remains mandatory (bamware-ai
  `docs/contracts.md`).
- The `bamware-client-core` repo gets a tombstone note; it is not deleted.
  The `feat/6-contracts` branches (client-core `f37f9c3`, service
  `564a3bf`) are left intact as the starting point if Option A is ever
  revisited with the service-side gate opened.

## Consequences

- One less package, one less resolution alias, no dead `file:` dep.
- Contract safety still rests on the cross-repo PR discipline, not the
  compiler. If the app/service pair ever gains a second client or a second
  maintainer, revisit Option A — the branches preserve the work.
- Production remote logging remains a no-op until the follow-up issue is
  done; this ADR changes structure, not behavior.
