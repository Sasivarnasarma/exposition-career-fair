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

Copy `.env.example` to `.env.local` and provide real values when configuring services. Credentials must remain on the server. Authentication, database schema, admin roles, registration, CSV exports, and email delivery are not implemented yet.

## Planned access

Admins can view registrations, statistics, and export CSV. A manually provisioned super admin can additionally manage admins. Public admin sign-up will be disabled.
