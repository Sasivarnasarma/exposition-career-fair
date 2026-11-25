# Exposition Career Fair

Standalone site planned for https://careerfair.exposition.lk.

## Development

Requires Node.js 22.12+ and pnpm. Use the pnpm version in package.json.

```sh
pnpm install
pnpm dev
```

## Code quality

| Command             | Purpose                                                                |
| ------------------- | ---------------------------------------------------------------------- |
| `pnpm lint`         | Check Next.js, React, and TypeScript lint rules; fail on warnings      |
| `pnpm lint:fix`     | Apply available ESLint fixes                                           |
| `pnpm format`       | Format files and sort Tailwind classes                                 |
| `pnpm format:check` | Check formatting without changing files                                |
| `pnpm typecheck`    | Generate Next.js route types and run TypeScript without emitting files |
| `pnpm check`        | Run formatting, lint, and type checks                                  |
| `pnpm check:ci`     | Run all checks followed by a production build                          |

Run `pnpm check` before committing and `pnpm check:ci` before deployment.
Prettier uses two spaces, double quotes, semicolons, and LF line endings.
Generated output, environment files, and static assets are excluded from formatting.
ESLint retains Next.js Core Web Vitals and TypeScript rules; formatting is handled by Prettier.

## Foundation

- Next.js App Router, React, TypeScript, Tailwind CSS
- shadcn/ui configuration and styling utilities, Radix UI, Lucide, Motion, Sonner
- React Hook Form and Zod
- PostgreSQL with Prisma and the pg adapter
- Better Auth for administrator authentication
- Resend for transactional email

Copy `.env.example` to `.env.local` and provide real values when configuring services. Credentials must remain on the server. The PostgreSQL schema, seed catalogs, transactional persistence, and infrastructure checks are implemented. Administrator authentication, session authorization, and Turnstile enforcement are implemented. The four-step registration flow, guarded submission endpoint, and signed receipt are implemented. Public registration is enabled. The admin dashboard and CSV exports are implemented.

## Administrator access

Admins can view registrations, statistics, and export CSV. A manually provisioned super admin can additionally manage admins. Public admin sign-up is disabled.

## Database commands

Use `pnpm db:generate`, `pnpm db:validate`, `pnpm db:check`, `pnpm db:deploy`, and `pnpm db:seed` for database setup. Review the target database before applying migrations. Keep credentials and certificate configuration in ignored local environment settings. For hosted environments, set `DATABASE_CA_CERT` to the complete PEM certificate, with actual line breaks or literal `\n` separators. This takes precedence over the optional `DATABASE_CA_CERT_FILE` used locally. Both application connections and migration commands use the same CA with certificate verification enabled. Migration commands create and clean up a temporary certificate file when inline content is supplied.

`pnpm test` runs disposable PostgreSQL and infrastructure tests. The opt-in `pnpm db:verify` command requires `DATABASE_TEST_MODE=dedicated-development`; it exercises real database persistence with uniquely scoped temporary records and cleans up those records.

## Authentication setup

Configure `BETTER_AUTH_URL`, a random `BETTER_AUTH_SECRET` of at least 32 characters, and a separate random `RATE_LIMIT_SECRET` of at least 32 characters in the ignored local environment file. Set `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`, and a comma-separated `TURNSTILE_ALLOWED_HOSTNAMES`. Production requires an HTTPS auth URL and real Turnstile keys; public test keys are rejected at runtime. Development can use Cloudflare's visible, always-pass public test key pair.

Run `pnpm admin:provision` from an interactive terminal to create the initial super administrator. The command prompts for account details and a hidden password, and never resets an existing account's credentials. Secure automation may provide JSON through stdin with `pnpm admin:provision --stdin`; keep credentials out of shell arguments and history.

`pnpm auth:verify` requires `DATABASE_TEST_MODE=dedicated-development` and the public development test keys. It checks the real Cloudflare test service once, then uses controlled verification responses while exercising real Better Auth and PostgreSQL operations. Temporary identities, sessions, audit records, verification values, and uniquely scoped rate-limit buckets are cleaned up.

Login and recovery submissions require Turnstile plus shared account/global limits and optional trusted-proxy IP limits. Administrator permissions are checked from the database on each protected request; disabled profiles lose access and their sessions are revoked. Password-reset requests queue encrypted email work and single-use links; successful resets revoke existing sessions. No permanent administrator is created automatically.

## Candidate registration

The four-step form uses shared validation, optional event updates, a separate recent-graduate status, academic catalog suggestions with typed fallbacks, grouped career selections, a required first preference, and optional GPA. Drafts stay in session storage for the current browser tab and expire after 24 hours; mandatory confirmations are reviewed again on restore. Challenge tokens are never saved in drafts.

Configure a dedicated random `REGISTRATION_RECEIPT_SECRET` of at least 32 characters. Receipt cookies are signed, HTTP-only, scoped to the receipt route, secure in production, and expire after 15 minutes. Success pages show only the server-issued reference. Registration retries retain the same request key for the same normalized payload; accepted submissions atomically create their email queue work.

Production registration requires both the site launch flag and an open event with a non-draft privacy version. `REGISTRATION_DEV_PREVIEW=true` allows submission only outside production, subject to the selected database event's availability and notice. Use a disposable development event for automated registration tests.

`pnpm registration:verify` requires `DATABASE_TEST_MODE=dedicated-development` and the public development Turnstile keys. It creates a unique temporary event, verifies the actual submission handler and receipt/retry/failure rules, and removes its records. No email is sent. Real production Turnstile hostname/action verification and published privacy wording are launch requirements.

For parallel local QA, `EXPOSITION_QA=true` selects a separate ignored `.next-qa` development cache; Vercel production builds use the standard `.next` output. Local production builds use an isolated `.next-production` output so a running development server can keep its cache. Temporary test editions must be created and removed in the dedicated development database rather than opening the public event.

## Email delivery and verification

Registration queues durable confirmation work in its transaction. Request handlers use Next.js `after()` to attempt delivery after returning the response; queued work survives request or provider failures. Vercel Hobby's daily recovery cron calls the bearer-protected `/api/internal/email-jobs` endpoint. Immediate sending does not require a paid scheduler. Failed/expired links can be requested again through the protected verification/recovery screens. Daily recovery cannot guarantee prompt retry during a long provider outage; use a more frequent external scheduler or a plan supporting frequent cron if required.

Configure the server-only `RESEND_API_KEY`, verified `EMAIL_FROM` (or `RESEND_FROM_EMAIL` plus `FROM_NAME`), `EMAIL_PAYLOAD_SECRET` (64 random hex characters), and `CRON_SECRET` (32+ random characters). Set `EMAIL_DELIVERY_ENABLED=true` only after sender/delivery verification. Preview deployments never drain the delivery queue. Non-production live sending is restricted to `EMAIL_TEST_RECIPIENT`. Keep private sender/recipient values only in ignored configuration.

`pnpm email:preview` generates placeholder HTML under locally excluded preview output. `pnpm email:work` processes a bounded queue batch. Sent means accepted by the email provider; it does not assert inbox delivery or candidate verification. Queue payloads contain encrypted rendered messages for stable idempotent retries and are cleared on terminal outcomes. Verification/invitation token hashes are stored separately. The worker leases jobs with PostgreSQL locking, keeps stable provider idempotency keys, limits attempts, and stops ambiguous retries before the provider's 24-hour deduplication window expires. Failed jobs require an explicitly fresh request; secrets must not be rotated while pending encrypted payloads need them.

Candidate verification links use a URL fragment, are scrubbed into memory by the page, and require an explicit action rather than consuming on GET. Links expire after 48 hours. Password-reset links expire after one hour and invitations after 48 hours; acceptance creates only an ordinary admin. Public admin sign-up stays disabled. Super administrators can create and revoke invitations from the team-access workspace.

Candidate retention is 90 days after the event, as approved for this project. The published Privacy Notice describes this and the configured service providers. The organising team must execute the deletion process and manage exports/provider backups; no automatic deletion is enabled before the event date and operations are finalized. Registration is enabled through the site flag and the selected event’s availability.

## Organiser workspace

The protected overview shows event-specific registration and verification counts, recent registrations and academic/career/referral breakdowns. Multi-select charts distinguish all selections from one first preference. The event selector does not open registration or change event settings.

The candidate directory combines server-side search, academic/career/verification filters and 25-record pagination. Detail views are read-only and expose contact, academic, career, consent and email-delivery information only to active authorised administrators. Candidate editing, deletion and employer sharing are outside this workflow.

CSV downloads explicitly select matching candidates or the entire selected event. Exports use the same filters as the directory, UTF-8 with a BOM, quoted fields and spreadsheet-formula protection. Keyset batches run against a consistent database snapshot; requests are recorded before streaming so interrupted downloads remain auditable, and completion records add counts and a request reference without storing search values. Downloads are private, uncached and rate-limited. Large downloads are bounded by the worker request duration; interrupted downloads must be retried. Organisers must secure downloaded files and apply the approved retention period.

Only super administrators can view team access, invite organisers, revoke invitations or change account status. Invitations create ordinary administrators. Deactivation revokes sessions and pending invitations issued by that account; reactivation requires a fresh sign-in. Self-deactivation, removal of the last active super administrator and API role changes are rejected.

`pnpm admin:verify` requires `DATABASE_TEST_MODE=dedicated-development` and the public development Turnstile keys. It creates scoped temporary identities and event records, verifies service/API permissions, combined filters, statistics, pagination, multi-batch CSV exports, auditing and account lifecycle rules, then removes its fixtures. It blocks external delivery calls and sends no emails.

## Quality and security verification

`pnpm check:ci` checks formatting, lint, types, schema, automated tests and production compilation. `pnpm audit:security` checks current registry advisories at high severity or above. The targeted Effect patch override for Prisma configuration tooling addresses GHSA-7589-6fvf-x4pw; retain it until the parent dependency includes a patched version.

`pnpm turnstile:verify` calls Cloudflare using only its official public test keys to verify success, failure and spent-token rejection. Production still rejects dummy keys and requires separate staging validation of real hostname/action checks.

`pnpm http:verify` requires the dedicated-development database opt-in. It starts an owned loopback QA server with an isolated event, temporary accounts, public test challenges and email sending disabled, then verifies actual route responses, registration/replay/receipt, verification, both roles, exports, revocation, headers and an optimized image response. It closes its server and deletes scoped fixtures afterward. Runtime and asset measurements are diagnostic; they do not measure keyboard access, responsive layout or browser Web Vitals. The QA cache uses its own ignored output directory. In development with `EXPOSITION_QA=true`, the browser logs Web Vitals names and numeric values only. This diagnostic hook is absent from production rendering and does not collect URLs, identifiers or performance entries; development samples are not production performance scores.

`pnpm assets:report` measures source photos and all generated production JS/CSS/font files after a build. Combined chunk totals are not per-route transfer sizes. Real browser tests are still required for layout shifts, animation cost, mobile/tablet layouts, reduced motion and accessibility.

Response headers restrict resource origins, embedding, object content, form destinations, content sniffing and unused browser permissions. API and private workflow routes receive no-referrer, noindex and private/no-store headers. HTTPS production also enables HSTS. The CSP explicitly permits Cloudflare challenge scripts/frames. It retains inline bootstrap scripts/styles for Cache Components and Motion; it is a baseline policy rather than a nonce-based strict CSP. Production does not permit eval. A nonce strategy would require revisiting partial prerendering, so validate browser compatibility on staging before launch.
