# Supply chain and dependency security (4.3)

This doc describes how we reduce supply-chain and dependency risk (M3, M4 from the Security Remediation Plan).

## Dependency scanning and updates (M3)

- **Dependabot:** `.github/dependabot.yml` is configured for `npm` and `github-actions`. It opens weekly PRs for version updates and security advisories. Review and merge dependency PRs, especially for auth, payments, and data libraries.
- **CI:** On every push and PR to `main`/`master`, the CI workflow runs:
  - **Secret scan** – `npm run security:scan-secrets` (blocks on high-confidence secrets).
  - **Dependency audit** – `npm audit --audit-level=high` (fails on high or critical vulns).
  - **Lint** – `npm run lint`.
  - **CodeQL** – GitHub’s SAST for JavaScript/TypeScript (security-extended queries). Results appear under the repo’s **Security** → **Code scanning**.
- **Blocking:** The workflow is configured to block when the secret scan or `npm audit` step fails. Fix or suppress (with justification) before merging.

## Pinning and SBOM (M4)

- **Lockfile:** Commit `package-lock.json`. CI uses `npm ci` so builds are reproducible and match the lockfile.
- **Critical deps:** For critical dependencies (e.g. Supabase client, auth, payments, Expo SDK), prefer exact or narrow ranges in `package.json` and review Dependabot PRs before merging.
- **SBOM:** The CI workflow generates a CycloneDX SBOM (`sbom.json`) and uploads it as an artifact. Use it for release audits or to feed into a vulnerability database. Optional: add a step to fail on known-vuln packages using the SBOM in a later pipeline.

## Optional hardening

- **Pre-commit:** Add Husky (or similar) and run `npm run security:scan-secrets` on commit to catch secrets before push.
- **Snyk / other SCA:** You can add Snyk or another SCA tool in addition to Dependabot and `npm audit` for broader coverage.
