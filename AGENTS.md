<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Commit messages

Follow this style for all commits:

- Use emoji-first Conventional Commits: `<gitmoji> <type>(<scope>): <imperative summary>`.
- Choose an appropriate emoji and type: 🎉 init (initial setup), ✨ feat (functionality), 🐛 fix (bug fixes), 📝 docs (documentation), ♻️ refactor (restructuring), ⚡ perf (performance), ✅ test (tests), 🔧 chore (maintenance/configuration), 👷 ci (continuous integration).
- Keep the entire title under 70 characters, including the emoji, type, scope, spaces, and summary.
- Use a concise scope for the affected area; omit it when unnecessary.
- Use an imperative summary such as "add", "fix", or "update", without past tense or a trailing period.
- Leave one blank line after the title. Write the body as factual bullets, each beginning with `- `.
- Describe actual changes and relevant validation. Never invent test results, repeat the title, or add filler.
- Keep each commit focused on one coherent change.
- For breaking changes, add `!` before the colon and explain the change in a `BREAKING CHANGE:` footer.

Example:

```text
✨ feat(settings): add persistent theme preferences

- Add validated theme settings and local storage
- Apply the selected theme when the application starts
- Update the Settings interface and setup documentation
- Verify persistence and invalid-value recovery
```

## Personal information

Do not include personal names, usernames, absolute local filesystem paths, or private machine details in project source, documentation, UI, logs, examples, commit messages, or user-facing responses. Use repository-relative paths and generic placeholders where needed. Keep private asset locations out of tracked files.
