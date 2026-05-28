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
