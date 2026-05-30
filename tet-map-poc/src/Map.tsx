import { useEffect, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { Protocol } from 'pmtiles'
import { layers, namedFlavor } from '@protomaps/basemaps'

const TET_TILES_URL = 'https://tiles.trans-euro-trail.org/basemap.json'
const GEOJSON_BASE = 'https://trans-euro-trail.org/F'

interface UtilsData {
  trackLengths: Record<string, number>
}

export default function Map() {
  const mapContainer = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const [utilsData, setUtilsData] = useState<UtilsData | null>(null)

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return

    const protocol = new Protocol()
    maplibregl.addProtocol('pmtiles', protocol.tile)

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        glyphs:
          'https://protomaps.github.io/basemaps-assets/fonts/{fontstack}/{range}.pbf',
        sources: {
          tetTiles: {
            type: 'vector',
            url: TET_TILES_URL,
            attribution:
              '<a href="https://transeurotrail.org" target="_blank">TET®</a> · <a href="https://www.openstreetmap.org/" target="_blank">© OpenStreetMap</a>',
          },
        },
        layers: layers('tetTiles', namedFlavor('light'), { lang: 'en' }),
      },
      center: [2.2137, 46.6034],
      zoom: 5,
      maxZoom: 12,
    })

    mapRef.current = map

    map.addControl(new maplibregl.NavigationControl(), 'top-right')
    map.addControl(new maplibregl.FullscreenControl(), 'top-right')
    map.addControl(new maplibregl.ScaleControl(), 'bottom-right')

    map.on('load', () => {
      Promise.all([
        loadTracks(map),
        loadWaypoints(map),
        loadUtils(setUtilsData),
      ]).catch((err) => console.error('Failed to load TET data:', err))
    })

    return () => {
      map.remove()
      mapRef.current = null
      maplibregl.removeProtocol('pmtiles')
    }
  }, [])

  const totalKm = utilsData
    ? Object.values(utilsData.trackLengths)
        .reduce((sum, km) => sum + km, 0)
        .toFixed(0)
    : null
  const trackCount = utilsData
    ? Object.keys(utilsData.trackLengths).length
    : null

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />
      {utilsData && (
        <div
          style={{
            position: 'absolute',
            bottom: 40,
            left: 10,
            background: 'rgba(255,255,255,0.9)',
            padding: '8px 12px',
            borderRadius: 6,
            fontSize: 13,
            lineHeight: 1.6,
            pointerEvents: 'none',
          }}
        >
          <strong>France TET</strong>
          <br />
          {trackCount} sections · {totalKm} km
        </div>
      )}
    </div>
  )
}

async function loadTracks(map: maplibregl.Map) {
  const res = await fetch(`${GEOJSON_BASE}/simplified.geojson`)
  const geojson = (await res.json()) as GeoJSON.FeatureCollection

  map.addSource('tracks', { type: 'geojson', data: geojson })
  map.addLayer({
    id: 'tracks',
    type: 'line',
    source: 'tracks',
    paint: {
      'line-color': '#FF9D01',
      'line-width': 2,
    },
    layout: {
      'line-join': 'round',
      'line-cap': 'round',
    },
  })

  const bounds = new maplibregl.LngLatBounds()
  geojson.features.forEach((feature) => {
    if (feature.geometry.type === 'LineString') {
      feature.geometry.coordinates.forEach((coord) => {
        bounds.extend([coord[0], coord[1]])
      })
    } else if (feature.geometry.type === 'MultiLineString') {
      feature.geometry.coordinates.forEach((line) =>
        line.forEach((coord) => bounds.extend([coord[0], coord[1]]))
      )
    }
  })

  if (!bounds.isEmpty()) {
    map.fitBounds(bounds, { padding: 40 })
  }
}

async function loadWaypoints(map: maplibregl.Map) {
  const res = await fetch(`${GEOJSON_BASE}/waypoints.geojson`)
  const geojson = (await res.json()) as GeoJSON.FeatureCollection

  map.addSource('waypoints', { type: 'geojson', data: geojson })
  map.addLayer({
    id: 'waypoints',
    type: 'circle',
    source: 'waypoints',
    paint: {
      'circle-color': '#009A94',
      'circle-radius': 5,
      'circle-stroke-color': 'white',
      'circle-stroke-width': 1,
    },
    minzoom: 7,
  })
}

async function loadUtils(setUtilsData: (data: UtilsData) => void) {
  const res = await fetch(`${GEOJSON_BASE}/utils.json`)
  const data = (await res.json()) as UtilsData
  setUtilsData(data)
}
