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
- Better Auth for planned admin authentication
- Resend for planned transactional email

Copy `.env.example` to `.env.local` and provide real values when configuring services. Credentials must remain on the server. The PostgreSQL schema, seed catalogs, transactional persistence, and infrastructure checks are implemented. Administrator login, public registration endpoints, CSV exports, Turnstile enforcement, and email delivery remain in development.

## Planned access

Admins can view registrations, statistics, and export CSV. A manually provisioned super admin can additionally manage admins. Public admin sign-up will be disabled.

## Database commands

Use `pnpm db:generate`, `pnpm db:validate`, `pnpm db:check`, `pnpm db:deploy`, and `pnpm db:seed` for database setup. Review the target database before applying migrations. Keep credentials and certificate configuration in ignored local environment settings.

`pnpm test` runs disposable PostgreSQL and infrastructure tests. The opt-in `pnpm db:verify` command requires `DATABASE_TEST_MODE=dedicated-development`; it exercises real database persistence with uniquely scoped temporary records and cleans up those records.
