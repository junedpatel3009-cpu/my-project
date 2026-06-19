# Deploying to Vercel

This project is built on the Lovable TanStack Start template, whose in-Lovable
build is wired to **Cloudflare Workers** via `@lovable.dev/vite-tanstack-config`.
To deploy on **Vercel** you need to swap the build target locally. The Lovable
preview will keep working as long as you don't push these changes back to the
branch Lovable syncs from — keep them on a `deploy/vercel` branch.

> TL;DR: easiest path is to click **Publish** inside Lovable (deploys to
> `*.lovable.app` with a custom domain option). Use the steps below only if you
> specifically need Vercel hosting.

---

## 1. Export to GitHub

In Lovable, top-right → **GitHub → Connect** → push the repo. Then locally:

```bash
git clone <your-repo-url>
cd <your-repo>
git checkout -b deploy/vercel
npm install
```

## 2. Replace the Lovable Vite plugin with upstream TanStack Start

Edit `vite.config.ts`:

```ts
import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    tsConfigPaths(),
    tailwindcss(),
    tanstackStart({ target: "vercel" }),
    viteReact(),
  ],
});
```

Install the missing peers (Lovable's wrapper bundled them):

```bash
npm install -D @tanstack/react-start vite-tsconfig-paths @tailwindcss/vite @vitejs/plugin-react
npm uninstall @lovable.dev/vite-tanstack-config @cloudflare/vite-plugin
```

## 3. Remove Cloudflare-only files

```bash
rm wrangler.jsonc
rm src/server.ts            # Cloudflare Worker entry; Vercel adapter generates its own
```

If anything still imports from `src/server.ts`, delete those imports — the
Vercel adapter handles the SSR entry automatically.

## 4. Verify locally

```bash
npm run build
```

You should see `.vercel/output/` produced (Vercel Build Output API v3). That's
exactly what Vercel expects — no further config needed.

## 5. Deploy

Option A — **Vercel Dashboard**: import the GitHub repo. When asked, leave the
framework as "Other" and let `vercel.json` drive the build.

Option B — **CLI**:

```bash
npm i -g vercel
vercel --prod
```

That's it. Server functions, SSR, and static assets all deploy together with
zero additional configuration.

---

## Keeping Lovable working

Don't merge the `deploy/vercel` branch back into `main`. Lovable's preview
needs the Cloudflare-targeted plugin to keep functioning. A clean workflow:

- `main` → edited inside Lovable, deploys to `*.lovable.app` via **Publish**.
- `deploy/vercel` → rebased onto `main` whenever you want to ship to Vercel.
