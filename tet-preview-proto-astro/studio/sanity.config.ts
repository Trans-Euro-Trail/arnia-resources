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
