# Security Policy

## Supported versions

Baat ships continuously: `main` receives over-the-air JS updates, and
native builds are cut from tags. Only the latest release (and current
`main`) receive security fixes.

## Reporting a vulnerability

Please **do not open a public issue** for security problems.

Report privately via GitHub's private vulnerability reporting:
**Security tab → "Report a vulnerability"** on this repository. This
opens a private advisory visible only to you and the maintainer.

What to include: affected area (screen, API wrapper, build pipeline),
reproduction steps, and impact as you understand it.

## What to expect

- Acknowledgment within 7 days.
- We follow a **90-day coordinated disclosure window**: we aim to fix and
  release within 90 days of your report, after which you are free to
  disclose publicly. If we fix it sooner, disclosure can happen sooner —
  we'll coordinate with you in the advisory thread.
- Credit in the advisory if you want it.

## Scope

In scope: this repository — app code (`app/`, `src/`), E2E flows, and the
CI/release configuration (`.github/workflows/`, `fastlane/`).

Out of scope: vulnerabilities in Expo, EAS, or other upstream
dependencies (report those upstream), and issues requiring a compromised
device.

## Preventive controls

Every PR runs a tracked-credential tripwire and a gitleaks scan in CI.
Credentials live in EAS secrets and GitHub Actions secrets — never in the
repo. If you find one anyway, that is a valid report.
