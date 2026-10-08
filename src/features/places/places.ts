import type { Pos } from '../location/position'
import { haversineM } from '../../utils/geo'

export interface Place { id: string; name: string; kind: string; latitude: number; longitude: number; distM: number }
export interface Step { text: string; distanceM: number }
export interface Route { distanceM: number; durationS: number; line: [number, number][]; steps: Step[] }

const KINDS: Record<string, string> = { park: 'Park', nature_reserve: 'Nature reserve', garden: 'Garden', wood: 'Woodland', wetland: 'Wetland', water: 'Water' }
const pt = (p: Pos) => ({ latitude: p.latitude, longitude: p.longitude, timestamp: 0 })

export const fmtDist = (m: number) => (m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`)
export const fmtMin = (s: number) => `${Math.max(1, Math.round(s / 60))} min`
export const gmapsUrl = (p: Pos) => `https://www.google.com/maps/dir/?api=1&destination=${p.latitude},${p.longitude}&travelmode=walking`

export function parsePlaces(j: any, from: Pos): Place[] {
  const seen = new Set<string>()
  return (j.elements ?? []).map((e: any) => {
    const lat = e.lat ?? e.center?.lat, lon = e.lon ?? e.center?.lon, name = e.tags?.name
    if (lat == null || lon == null || !name) return null
    return { id: `${e.type}${e.id}`, name, kind: KINDS[e.tags.leisure ?? e.tags.natural] ?? 'Nature spot', latitude: lat, longitude: lon, distM: haversineM(pt(from), pt({ latitude: lat, longitude: lon })) }
  }).filter((p: Place | null) => p && !seen.has(p.name) && seen.add(p.name))
    .sort((a: Place, b: Place) => a.distM - b.distM).slice(0, 8)
}

// OpenStreetMap Overpass: named parks, reserves, gardens, woods, wetlands within ~5 km. Free, no key.
export async function findNature(from: Pos, radius = 5000): Promise<Place[]> {
  const a = `(around:${radius},${from.latitude},${from.longitude})`
  const q = `[out:json][timeout:20];(nwr["leisure"~"^(park|nature_reserve|garden)$"]["name"]${a};nwr["natural"~"^(wood|wetland)$"]["name"]${a};);out center 60;`
  const r = await fetch('https://overpass-api.de/api/interpreter', { method: 'POST', body: 'data=' + encodeURIComponent(q), signal: AbortSignal.timeout(25000) })
  if (!r.ok) throw new Error('overpass ' + r.status)
  return parsePlaces(await r.json(), from)
}

export function describeStep(s: any): Step {
  const m = s.maneuver ?? {}, on = s.name ? ` on ${s.name}` : ''
  const text = m.type === 'depart' ? `Head ${m.modifier ?? 'ahead'}${on}`
    : m.type === 'arrive' ? 'Arrive at your destination'
    : String(m.type ?? '').startsWith('roundabout') ? `Take the roundabout${on}`
    : m.type === 'turn' || m.type === 'end of road' ? `Turn ${m.modifier ?? ''}${on}`.replace('  ', ' ')
    : `Continue ${m.modifier ?? 'straight'}${on}`
  return { text, distanceM: Math.round(s.distance ?? 0) }
}

// Walking route from the public OSM foot-routing server (fair-use, fine for an MVP).
export async function getRoute(from: Pos, to: Pos): Promise<Route> {
  const r = await fetch(`https://routing.openstreetmap.de/routed-foot/route/v1/foot/${from.longitude},${from.latitude};${to.longitude},${to.latitude}?overview=full&geometries=geojson&steps=true`, { signal: AbortSignal.timeout(15000) })
  if (!r.ok) throw new Error('route ' + r.status)
  const rt = (await r.json()).routes?.[0]
  if (!rt) throw new Error('no route')
  return {
    distanceM: rt.distance, durationS: rt.duration,
    line: rt.geometry.coordinates.map(([lo, la]: [number, number]) => [la, lo] as [number, number]),
    steps: rt.legs[0].steps.map(describeStep)
  }
}
