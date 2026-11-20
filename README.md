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
- Resend for planned transactional email

Copy `.env.example` to `.env.local` and provide real values when configuring services. Credentials must remain on the server. The PostgreSQL schema, seed catalogs, transactional persistence, and infrastructure checks are implemented. Administrator authentication, session authorization, and Turnstile enforcement are implemented. The four-step registration flow, guarded submission endpoint, and signed receipt are implemented. Public registration remains closed pending privacy and launch checks. CSV exports and email delivery remain in development.

## Administrator access

Admins can view registrations, statistics, and export CSV. A manually provisioned super admin can additionally manage admins. Public admin sign-up is disabled.

## Database commands

Use `pnpm db:generate`, `pnpm db:validate`, `pnpm db:check`, `pnpm db:deploy`, and `pnpm db:seed` for database setup. Review the target database before applying migrations. Keep credentials and certificate configuration in ignored local environment settings.

`pnpm test` runs disposable PostgreSQL and infrastructure tests. The opt-in `pnpm db:verify` command requires `DATABASE_TEST_MODE=dedicated-development`; it exercises real database persistence with uniquely scoped temporary records and cleans up those records.

## Authentication setup

Configure `BETTER_AUTH_URL`, a random `BETTER_AUTH_SECRET` of at least 32 characters, and a separate random `RATE_LIMIT_SECRET` of at least 32 characters in the ignored local environment file. Set `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`, and a comma-separated `TURNSTILE_ALLOWED_HOSTNAMES`. Production requires an HTTPS auth URL and real Turnstile keys; public test keys are rejected at runtime. Development can use Cloudflare's visible, always-pass public test key pair.

Run `pnpm admin:provision` from an interactive terminal to create the initial super administrator. The command prompts for account details and a hidden password, and never resets an existing account's credentials. Secure automation may provide JSON through stdin with `pnpm admin:provision --stdin`; keep credentials out of shell arguments and history.

`pnpm auth:verify` requires `DATABASE_TEST_MODE=dedicated-development` and the public development test keys. It checks the real Cloudflare test service once, then uses controlled verification responses while exercising real Better Auth and PostgreSQL operations. Temporary identities, sessions, audit records, verification values, and uniquely scoped rate-limit buckets are cleaned up.

Login and recovery submissions require Turnstile plus shared account/global limits and optional trusted-proxy IP limits. Administrator permissions are checked from the database on each protected request; disabled profiles lose access and their sessions are revoked. Password-reset screens and single-use token handling exist, but reset requests currently direct users to the organising committee. Resend reset-link delivery follows in the email phase. No permanent administrator is created automatically.

## Candidate registration

The four-step form uses shared validation, optional event updates, a separate recent-graduate status, academic catalog suggestions with typed fallbacks, grouped career selections, a required first preference, and optional GPA with its scale. Drafts stay in session storage for the current browser tab and expire after 24 hours; mandatory confirmations are reviewed again on restore. Challenge tokens are never saved in drafts.

Configure a dedicated random `REGISTRATION_RECEIPT_SECRET` of at least 32 characters. Receipt cookies are signed, HTTP-only, scoped to the receipt route, secure in production, and expire after 15 minutes. Success pages show only the server-issued reference. Registration retries retain the same request key for the same normalized payload; accepted submissions atomically create their email queue work.

Production registration requires both the site launch flag and an open event with a non-draft privacy version. Development shows a non-submitting form preview while closed. `REGISTRATION_DEV_PREVIEW=true` allows submission only outside production, subject to the selected database event's availability and notice. Never open the public event just to test the form.

`pnpm registration:verify` requires `DATABASE_TEST_MODE=dedicated-development` and the public development Turnstile keys. It creates a unique temporary event, verifies the actual submission handler and receipt/retry/failure rules, and removes its records. No email is sent. Real production Turnstile hostname/action verification and published privacy wording are launch requirements.

For parallel local QA, `EXPOSITION_QA=true` selects a separate ignored `.next-qa` development cache; production always uses its normal production output. Temporary test editions must be created and removed in the dedicated development database rather than opening the public event.
