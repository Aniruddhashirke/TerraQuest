import type { Discovery, Mission } from '../../db/database'

export interface Ctx {
  steps: number | null; distanceKm: number; activeMinutes: number; calories: number
  plantsFound: number; birdsFound: number; insectsFound: number; totalDiscoveries: number
  completedMissions: number; timeOfDay: 'morning' | 'afternoon' | 'evening'
}
// Compact state for the engine. Deliberately excludes coordinates and photos so nothing sensitive can leak to an external LLM.
export function buildContext(m: { steps: number | null; distanceKm: number; activeMs: number; kcal: number }, ds: Discovery[], ms: Mission[]): Ctx {
  const n = (c: string) => ds.filter(d => d.category === c).length
  const h = new Date().getHours()
  return {
    steps: m.steps, distanceKm: m.distanceKm, activeMinutes: Math.round(m.activeMs / 60000), calories: Math.round(m.kcal),
    plantsFound: n('plant'), birdsFound: n('bird'), insectsFound: n('insect'), totalDiscoveries: ds.length,
    completedMissions: ms.filter(x => x.status === 'completed').length,
    timeOfDay: h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening'
  }
}
