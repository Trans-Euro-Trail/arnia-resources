# Prototype A — Astro + Sanity Draft Preview on Cloudflare

## Implementation Spec for Claude Code

This document specifies a complete, runnable prototype. Execute the steps in order. Do not deviate from file paths, package versions, or code snippets unless a step explicitly instructs improvisation.

---

## Outcome

A working Astro site deployed to Cloudflare Pages that:
- Serves published Sanity content as static pages at `/[slug]`
- Serves draft Sanity content on-demand at `/preview/[slug]` (token-gated)
- Renders two block types: a static Astro `Paragraph` and a hydrated React `Counter` with a CMS-managed label
- Is launchable from a "Preview" button inside Sanity Studio

---

## Prerequisites (human, not Claude Code)

Before starting, the user must have:
- Node.js 20+ installed
- A Cloudflare account with API token (for `wrangler`)
- A Sanity account
- `wrangler` authenticated: `wrangler login`
- `sanity` CLI: `npm install -g sanity@latest`
- Sanity CLI authenticated: `sanity login`

Claude Code should stop and ask the user to confirm these before proceeding.

---

## Repository layout

Create a monorepo with two workspaces:

```
tet-preview-proto-astro/
├── package.json           # workspace root
├── .gitignore
├── README.md
├── studio/                # Sanity Studio
│   ├── package.json
│   ├── sanity.config.ts
│   ├── sanity.cli.ts
│   └── schemas/
│       ├── index.ts
│       └── page.ts
└── web/                   # Astro site
    ├── package.json
    ├── astro.config.mjs
    ├── tsconfig.json
    ├── wrangler.toml
    ├── .env.example
    └── src/
        ├── env.d.ts
        ├── lib/
        │   └── sanity.ts
        ├── components/
        │   ├── Paragraph.astro
        │   └── Counter.tsx
        └── pages/
            ├── index.astro
            ├── [slug].astro
            └── preview/
                └── [slug].astro
```

---

## Step 1 — Initialise the monorepo root

Create `package.json` at the root:

```json
{
  "name": "tet-preview-proto-astro",
  "private": true,
  "workspaces": ["studio", "web"],
  "scripts": {
    "dev:studio": "npm -w studio run dev",
    "dev:web": "npm -w web run dev",
    "build:web": "npm -w web run build",
    "deploy:web": "npm -w web run deploy"
  }
}
```

Create `.gitignore`:

```
node_modules
.env
.env.local
dist
.astro
.wrangler
.vercel
.DS_Store
```

---

## Step 2 — Create the Sanity Studio

### 2.1 Scaffold

```bash
cd studio
npm init -y
npm install sanity@latest @sanity/vision@latest styled-components@^6 react@^18 react-dom@^18
npm install -D typescript @types/react
```

### 2.2 `studio/sanity.cli.ts`

```ts
import { defineCliConfig } from 'sanity/cli';

export default defineCliConfig({
  api: {
    projectId: process.env.SANITY_STUDIO_PROJECT_ID!,
    dataset: process.env.SANITY_STUDIO_DATASET || 'production',
  },
});
```

### 2.3 `studio/sanity.config.ts`

```ts
import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { visionTool } from '@sanity/vision';
import { schemaTypes } from './schemas';

const PREVIEW_SECRET = process.env.SANITY_STUDIO_PREVIEW_SECRET || 'dev-secret';
const PREVIEW_ORIGIN = process.env.SANITY_STUDIO_PREVIEW_ORIGIN || 'http://localhost:4321';

export default defineConfig({
  name: 'default',
  title: 'TET Preview Prototype — Astro',
  projectId: process.env.SANITY_STUDIO_PROJECT_ID!,
  dataset: process.env.SANITY_STUDIO_DATASET || 'production',
  plugins: [structureTool(), visionTool()],
  schema: { types: schemaTypes },
  document: {
    productionUrl: async (prev, { document }) => {
      const slug = (document as any).slug?.current;
      if (!slug) return prev;
      return `${PREVIEW_ORIGIN}/preview/${slug}?token=${PREVIEW_SECRET}`;
    },
  },
});
```

### 2.4 `studio/schemas/index.ts`

```ts
import page from './page';
export const schemaTypes = [page];
```

### 2.5 `studio/schemas/page.ts`

```ts
export default {
  name: 'page',
  title: 'Page',
  type: 'document',
  fields: [
    { name: 'title', title: 'Title', type: 'string' },
    {
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: 'title' },
    },
    {
      name: 'blocks',
      title: 'Blocks',
      type: 'array',
      of: [
        {
          name: 'paragraph',
          title: 'Paragraph',
          type: 'object',
          fields: [
            {
              name: 'body',
              title: 'Body',
              type: 'array',
              of: [{ type: 'block' }],
            },
          ],
          preview: {
            select: { body: 'body' },
            prepare({ body }: any) {
              const first = body?.[0]?.children?.[0]?.text || '(empty paragraph)';
              return { title: `Paragraph: ${first.slice(0, 40)}` };
            },
          },
        },
        {
          name: 'counter',
          title: 'Counter',
          type: 'object',
          fields: [
            {
              name: 'label',
              title: 'Label',
              type: 'string',
              validation: (Rule: any) => Rule.required(),
            },
          ],
          preview: {
            select: { label: 'label' },
            prepare({ label }: any) {
              return { title: `Counter: ${label || '(no label)'}` };
            },
          },
        },
      ],
    },
  ],
};
```

### 2.6 Add scripts to `studio/package.json`

```json
{
  "scripts": {
    "dev": "sanity dev",
    "build": "sanity build",
    "deploy": "sanity deploy"
  }
}
```

### 2.7 Initialise the Sanity project

Claude Code should instruct the user to run, interactively:

```bash
cd studio
npx sanity@latest init --env
```

Select: create new project, default dataset (`production`), no template. This writes `.env` with `SANITY_STUDIO_PROJECT_ID` and `SANITY_STUDIO_DATASET`.

Then, manually add to `studio/.env`:

```
SANITY_STUDIO_PREVIEW_SECRET=dev-secret-change-me
SANITY_STUDIO_PREVIEW_ORIGIN=http://localhost:4321
```

### 2.8 Create a Sanity API read token

The user must do this via the Sanity dashboard:
1. Go to manage.sanity.io → this project → API → Tokens
2. Create a token named `astro-preview`, permissions: **Viewer**
3. Copy the token — it will go into the Astro `.env` in the next step

---

## Step 3 — Create the Astro app

### 3.1 Scaffold

```bash
cd ../
npm create astro@latest web -- --template minimal --typescript strict --no-install --no-git
cd web
npm install
npm install @astrojs/cloudflare @astrojs/react react@^18 react-dom@^18
npm install @sanity/client @portabletext/to-html
npm install -D @types/react @types/react-dom wrangler
```

### 3.2 `web/astro.config.mjs`

```js
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';

export default defineConfig({
  output: 'hybrid',
  adapter: cloudflare(),
  integrations: [react()],
});
```

### 3.3 `web/src/env.d.ts`

```ts
/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly SANITY_PROJECT_ID: string;
  readonly SANITY_DATASET: string;
  readonly SANITY_READ_TOKEN: string;
  readonly PREVIEW_SECRET: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

### 3.4 `web/.env.example`

```
SANITY_PROJECT_ID=
SANITY_DATASET=production
SANITY_READ_TOKEN=
PREVIEW_SECRET=dev-secret-change-me
```

Claude Code must instruct the user to copy this to `.env` and fill in the values from step 2.

### 3.5 `web/src/lib/sanity.ts`

```ts
import { createClient } from '@sanity/client';

const projectId = import.meta.env.SANITY_PROJECT_ID;
const dataset = import.meta.env.SANITY_DATASET;

export const sanityClient = createClient({
  projectId,
  dataset,
  apiVersion: '2024-01-01',
  useCdn: true,
});

export const sanityDraftClient = createClient({
  projectId,
  dataset,
  apiVersion: '2024-01-01',
  useCdn: false,
  perspective: 'previewDrafts',
  token: import.meta.env.SANITY_READ_TOKEN,
});
```

### 3.6 `web/src/components/Paragraph.astro`

```astro
---
import { toHTML } from '@portabletext/to-html';
const { block } = Astro.props;
---
<div style="margin: 1rem 0;">
  <Fragment set:html={toHTML(block.body || [])} />
</div>
```

### 3.7 `web/src/components/Counter.tsx`

```tsx
import { useState } from 'react';

export default function Counter({ label }: { label: string }) {
  const [count, setCount] = useState(0);
  return (
    <div style={{ margin: '1rem 0', padding: '0.5rem', border: '1px solid #ccc' }}>
      <strong>{label}:</strong> {count}{' '}
      <button onClick={() => setCount((c) => c + 1)}>+1</button>
    </div>
  );
}
```

### 3.8 `web/src/pages/index.astro`

```astro
---
import { sanityClient } from '../lib/sanity';
const pages = await sanityClient.fetch(
  `*[_type == "page" && defined(slug.current)]{ title, "slug": slug.current }`
);
---
<html>
  <head><title>Pages</title></head>
  <body>
    <h1>Published pages</h1>
    <ul>
      {pages.map((p: any) => <li><a href={`/${p.slug}`}>{p.title}</a></li>)}
    </ul>
  </body>
</html>
```

### 3.9 `web/src/pages/[slug].astro`

```astro
---
import { sanityClient } from '../lib/sanity';
import Paragraph from '../components/Paragraph.astro';
import Counter from '../components/Counter.tsx';

export async function getStaticPaths() {
  const pages = await sanityClient.fetch(
    `*[_type == "page" && defined(slug.current)]{ "slug": slug.current }`
  );
  return pages.map((p: any) => ({ params: { slug: p.slug } }));
}

const { slug } = Astro.params;
const page = await sanityClient.fetch(
  `*[_type == "page" && slug.current == $slug][0]`,
  { slug }
);

if (!page) return Astro.redirect('/404');
---
<html>
  <head><title>{page.title}</title></head>
  <body>
    <h1>{page.title}</h1>
    {page.blocks?.map((block: any) => {
      if (block._type === 'paragraph') return <Paragraph block={block} />;
      if (block._type === 'counter') return <Counter client:load label={block.label} />;
      return null;
    })}
  </body>
</html>
```

### 3.10 `web/src/pages/preview/[slug].astro`

```astro
---
export const prerender = false;

import { sanityDraftClient } from '../../lib/sanity';
import Paragraph from '../../components/Paragraph.astro';
import Counter from '../../components/Counter.tsx';

const token = Astro.url.searchParams.get('token');
if (token !== import.meta.env.PREVIEW_SECRET) {
  return new Response('Unauthorized', { status: 401 });
}

const { slug } = Astro.params;
const page = await sanityDraftClient.fetch(
  `*[_type == "page" && slug.current == $slug][0]`,
  { slug }
);

if (!page) return new Response('Not found', { status: 404 });
---
<html>
  <head><title>DRAFT: {page.title}</title></head>
  <body>
    <div style="background: #ffd; padding: 8px; text-align: center;">
      DRAFT PREVIEW — not publicly visible
    </div>
    <h1>{page.title}</h1>
    {page.blocks?.map((block: any) => {
      if (block._type === 'paragraph') return <Paragraph block={block} />;
      if (block._type === 'counter') return <Counter client:load label={block.label} />;
      return null;
    })}
  </body>
</html>
```

### 3.11 `web/wrangler.toml`

```toml
name = "tet-preview-proto-astro"
compatibility_date = "2024-09-01"
compatibility_flags = ["nodejs_compat"]
pages_build_output_dir = "./dist"
```

### 3.12 Scripts in `web/package.json`

Ensure these scripts exist:

```json
{
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "wrangler pages dev ./dist",
    "deploy": "astro build && wrangler pages deploy ./dist"
  }
}
```

---

## Step 4 — Verify locally

Run in two terminals:

```bash
# Terminal 1
npm run dev:studio
# Terminal 2
npm run dev:web
```

Manual verification checklist:
1. Studio loads at `http://localhost:3333`
2. Astro app loads at `http://localhost:4321`
3. Create a page in Studio with one paragraph block and one counter block (label: "Test counter"), **do not publish**
4. From the Studio document view, click the "..." menu → open preview URL
5. Confirm the new tab shows the draft, counter increments when clicked
6. Publish the document
7. Visit `http://localhost:4321/<slug>` — the published version renders

---

## Step 5 — Deploy to Cloudflare

### 5.1 Create the Pages project

```bash
cd web
wrangler pages project create tet-preview-proto-astro --production-branch main
```

### 5.2 Set secrets

```bash
wrangler pages secret put SANITY_READ_TOKEN --project-name tet-preview-proto-astro
wrangler pages secret put PREVIEW_SECRET --project-name tet-preview-proto-astro
```

Paste the values when prompted.

### 5.3 Set non-secret env vars

Via the Cloudflare dashboard: Pages → `tet-preview-proto-astro` → Settings → Environment variables → Production. Add:
- `SANITY_PROJECT_ID`
- `SANITY_DATASET` (value: `production`)

Claude Code cannot set these non-secret variables via CLI reliably across Wrangler versions — instruct the user to do this manually via the dashboard.

### 5.4 Deploy

```bash
cd web
npm run deploy
```

Wrangler will print the deployed URL, e.g. `https://tet-preview-proto-astro.pages.dev`.

### 5.5 Update Studio to point at production

Edit `studio/.env`:

```
SANITY_STUDIO_PREVIEW_ORIGIN=https://tet-preview-proto-astro.pages.dev
```

Restart `npm run dev:studio`.

---

## Step 6 — Test scenarios

### Scenario 1: Basic preview
1. Create a draft in Studio with 1 paragraph
2. Open preview
3. Edit paragraph, save draft
4. Refresh preview tab — change appears

### Scenario 2: Many new blocks of existing types
1. On the same draft, add 10 more paragraphs and 5 counters with distinct labels
2. Do not publish
3. Refresh preview tab
4. Verify all 15 new blocks render, all counters increment independently
5. Visit the published URL `/<slug>` — confirm it still shows only the originally-published content

### Scenario 3: Cloudflare-specific observation
1. After ~5 minutes of idle, refresh the preview tab — note cold-start latency
2. Inspect network headers on `/<slug>` — should be served from Cloudflare cache (static asset)
3. Inspect network headers on `/preview/<slug>` — should show Pages Function execution
4. Attempt to access `/preview/<slug>` without a token — must return 401

---

## README content

Create `README.md` at the repo root with:

```markdown
# TET Preview Prototype — Astro

Minimal Astro + Sanity + Cloudflare Pages prototype testing the draft preview UX.

## Setup
See the implementation spec. Key steps:
1. `npm install` at root
2. Initialise Sanity: `cd studio && npx sanity@latest init --env`
3. Copy `web/.env.example` → `web/.env`, fill in values
4. `npm run dev:studio` and `npm run dev:web`

## Deploy
1. `cd web`
2. `wrangler pages project create tet-preview-proto-astro --production-branch main`
3. `wrangler pages secret put SANITY_READ_TOKEN --project-name tet-preview-proto-astro`
4. `wrangler pages secret put PREVIEW_SECRET --project-name tet-preview-proto-astro`
5. Set `SANITY_PROJECT_ID` and `SANITY_DATASET` in the Cloudflare dashboard
6. `npm run deploy`

## What this tests
- Draft preview loop: click Preview in Studio → new tab with draft content
- Static Astro components + hydrated React islands, both rendered from Sanity content
- Many new blocks of existing types in a draft
- Real Cloudflare Pages deployment with Pages Functions for SSR routes
```

---

## Instructions for Claude Code

1. Execute steps 1–3 end-to-end, creating all files exactly as specified.
2. Stop after step 3 and prompt the user to:
   - Run `npx sanity@latest init --env` inside `studio/`
   - Create a Sanity API read token
   - Fill in `web/.env` from the token and Sanity project info
3. Resume with step 4 (local verification) once the user confirms `.env` is populated.
4. For step 5 (deploy), execute the `wrangler` commands and prompt the user to manually add non-secret env vars in the Cloudflare dashboard before deploying.
5. Do not upgrade package versions without asking.
6. Do not add features, styling, or components beyond what this spec defines.
7. If any `wrangler` or `sanity` command fails, report the exact error to the user — do not attempt creative recovery.
