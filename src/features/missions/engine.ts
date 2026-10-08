import type { Mission } from '../../db/database'
import type { Ctx } from './context'

export type MissionType = 'DISCOVER' | 'MOVE' | 'LISTEN_FOR_BIRDS' | 'FIND_A_PLANT' | 'OBSERVE'
const COOLDOWN_MS = 5 * 60 * 1000
const FALLBACKS: MissionType[] = ['OBSERVE', 'DISCOVER', 'MOVE', 'FIND_A_PLANT', 'LISTEN_FOR_BIRDS']

// Deterministic rules from the spec. No browser step sensor => GPS distance (1.5 km ~ 2000 steps) is the proxy, never fake steps.
export function ruleFor(c: Ctx): MissionType {
  const moved = c.steps != null ? c.steps >= 2000 : c.distanceKm >= 1.5
  if (c.totalDiscoveries === 0) return 'DISCOVER'
  if (!moved) return 'MOVE'
  if (c.plantsFound >= c.birdsFound + 3) return 'LISTEN_FOR_BIRDS'
  if (c.birdsFound >= c.plantsFound + 3) return 'FIND_A_PLANT'
  return 'OBSERVE'
}

// Rule first, then cooldown (recent completions + skipped this visit) and variety (avoid repeating the last type).
export function pickMission(c: Ctx, history: Mission[], skipped: string[] = [], now = Date.now()): MissionType {
  const done = history.filter(m => m.status === 'completed').sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0))
  const cooling = (t: string) => skipped.includes(t) || done.some(m => m.type === t && now - (m.completedAt ?? 0) < COOLDOWN_MS)
  const last = done[0]?.type
  const order = [ruleFor(c), ...FALLBACKS]
  return order.find(t => !cooling(t) && t !== last) ?? order.find(t => !cooling(t)) ?? ruleFor(c)
}
