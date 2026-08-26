# @atelier/auth

Supabase auth helpers shared by `apps/agency-site` and `apps/admin`:
`getUser`, `requireUser`, `requireAdmin`, `getRole`, and the browser / server /
service-role client factories.

## Why `@types/node` and `typescript` are runtime dependencies

They look like devDependencies and they are not. Same in `packages/db` and
`packages/shared` — keep all three in step.

`apps/admin/apphosting.yaml` sets `NODE_ENV=production` with `BUILD`
availability, so Firebase App Hosting installs with `pnpm install --prod` and
prunes every devDependency before running the build. Each app's prebuild script
then compiles this package from source (`build-workspace-deps.mjs`), and
`tsconfig.build.json` declares `"types": ["node"]`. With `@types/node` pruned,
`tsc` fails with:

```
error TS2688: Cannot find type definition file for 'node'.
```

pnpm's isolated `node_modules` is what makes this bite: the consuming app having
`@types/node` does not help, because this package can only see its own
dependencies.

It stays invisible locally — a plain `pnpm install` keeps devDependencies — and
invisible on `apps/agency-site`, whose build runs with `NODE_ENV=development` and
therefore installs them. It only surfaced when the admin backend was deployed for
the first time since June 2026.
