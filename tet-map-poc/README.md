# TET Map PoC

Minimal proof-of-concept demonstrating how to render the [Trans Euro Trail](https://transeurotrail.org) vector tile basemap using [MapLibre GL](https://maplibre.org/) with React.

Shows the France (`/F/`) route: track, waypoints, and a stats overlay.

## Stack

- [Vite](https://vitejs.dev/) + React + TypeScript
- [MapLibre GL](https://maplibre.org/) — map rendering
- [PMTiles](https://protomaps.com/docs/pmtiles) — vector tile protocol
- [@protomaps/basemaps](https://github.com/protomaps/basemaps) — Protomaps light basemap style

## Running

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## What it renders

| Layer | Source | Style |
|---|---|---|
| Basemap | `tiles.trans-euro-trail.org/basemap.json` | Protomaps light |
| Track | `trans-euro-trail.org/F/track.geojson` | Orange line `#FF9D01` |
| Waypoints | `trans-euro-trail.org/F/waypoints.geojson` | Teal circles `#009A94`, zoom ≥ 7 |
| Stats overlay | `trans-euro-trail.org/F/utils.json` | Section count + total km |

The map auto-fits to the France track bounds on load.

> **Note:** The production tile worker (`tiles.trans-euro-trail.org`) has CORS settings enforced. If your origin isn't allowed, contact Lucas to get it added.

## Extending to other countries

Change the `GEOJSON_BASE` constant in [src/Map.tsx](src/Map.tsx):

```ts
const GEOJSON_BASE = 'https://trans-euro-trail.org/E' // Spain
```
