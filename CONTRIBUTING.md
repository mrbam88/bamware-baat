# Contributing to Baat

Baat is an Expo 54 / React Native 0.81 dating app. This page is the dev
loop; the system map for AI agents is in [`AGENTS.md`](./AGENTS.md).

## Prerequisites

- Node 20 and Yarn (classic — the repo has a `yarn.lock`)
- Xcode (iOS) and/or Android Studio (Android) for simulator builds
- Ruby + Bundler only if you touch release lanes (`bundle install` installs fastlane)

## Setup and run

```bash
yarn install --frozen-lockfile
cp .env.example .env        # fill in values as needed
yarn ios                    # or: yarn android, yarn start, yarn web
```

## Before you push

Both are enforced by CI (`.github/workflows/ci.yml`) on every PR:

```bash
npx tsc --noEmit            # typecheck
yarn test                   # jest (also: test:watch, test:coverage)
```

E2E flows live in [`.maestro/`](./.maestro) (login, onboarding, discover,
matches, …) and run with [Maestro](https://maestro.mobile.dev):
`maestro test .maestro/login.yaml`. They need a booted simulator with the
app installed; CI does not run them yet.

## Conventions

- **Spec-as-issue.** Work starts from an issue with story, scope,
  out-of-scope, and acceptance criteria — the issue templates enforce
  this. PRs without an issue are fine for small fixes; say why in the PR.
- **Branches:** `type/issue#-slug`, e.g. `feat/12-photo-reorder`,
  `docs/6-oss-hygiene`.
- **Evidence-quoted PRs.** Paste the actual output that proves your
  change works (test run, typecheck, screenshot, Maestro log). "Works on
  my machine" without the quote doesn't merge.
- **All styling via theme tokens.** Colors, spacing, and typography come
  from [`src/theme`](./src/theme) through `ThemeProvider` — no inline hex
  values or magic numbers in components.
- **No secrets in the repo. Ever.** CI has a secrets tripwire and a
  gitleaks scan; credentials belong in EAS secrets or GitHub Actions
  secrets. See [`SECURITY.md`](./SECURITY.md).

## Releases

Contributors don't release. Merging to `main` ships an OTA update
automatically; native builds and store submission are tag-driven and
maintainer-gated. The full pipeline is in
[`docs/RELEASING.md`](./docs/RELEASING.md).
