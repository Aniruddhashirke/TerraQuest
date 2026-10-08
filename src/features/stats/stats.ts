import type { ExplorationSession, Discovery } from '../../db/database'

export type Period = 'today' | 'week' | 'all'
/** The walk happening right now (not saved to the DB yet). Pass only while ACTIVE/PAUSED. */
export interface Live { distanceKm: number; activeMs: number }
export interface Summary { distanceKm: number; activeMin: number; finds: number; walks: number; newSpecies: number }
export interface Bars { labels: string[]; names: string[]; values: number[]; highlight: number }

const DAY = 86400000
export const startOfDay = (t: number) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime() }
// Weeks start on Monday
export const startOfWeek = (t: number) => {
  const d = new Date(startOfDay(t)); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d.getTime()
}
const addDays = (t: number, n: number) => { const d = new Date(t); d.setDate(d.getDate() + n); return d.getTime() }
const dayIndex = (t: number, weekStart: number) => Math.round((startOfDay(t) - weekStart) / DAY)

function range(period: Period, now: number): [number, number] {
  if (period === 'today') { const a = startOfDay(now); return [a, addDays(a, 1)] }
  if (period === 'week') { const a = startOfWeek(now); return [a, addDays(a, 7)] }
  return [0, Infinity]
}
const within = (t: number, [a, b]: [number, number]) => t >= a && t < b

export function summarize(sessions: ExplorationSession[], discoveries: Discovery[], period: Period, now: number, live?: Live): Summary {
  const r = range(period, now)
  const inside = sessions.filter(s => within(s.startTime, r))
  // "New" species = first-ever sighting falls inside the period
  const first = new Map<string, number>()
  for (const d of discoveries) {
    const k = d.speciesName.trim().toLowerCase()
    if (!k) continue
    const t = first.get(k)
    if (t === undefined || d.timestamp < t) first.set(k, d.timestamp)
  }
  let newSpecies = 0
  first.forEach(t => { if (within(t, r)) newSpecies++ })
  return {
    distanceKm: inside.reduce((a, s) => a + s.distance, 0) / 1000 + (live?.distanceKm ?? 0),
    activeMin: inside.reduce((a, s) => a + s.activeMinutes, 0) + (live ? live.activeMs / 60000 : 0),
    finds: discoveries.filter(d => within(d.timestamp, r)).length,
    walks: inside.length + (live ? 1 : 0),
    newSpecies
  }
}

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
/** week: Mon..Sun of the current week. all: the last 7 months, ending with this one. Values in km. */
export function distanceBars(sessions: ExplorationSession[], period: 'week' | 'all', now: number, live?: Live): Bars {
  if (period === 'week') {
    const a = startOfWeek(now), values: number[] = Array(7).fill(0)
    for (const s of sessions) { const i = dayIndex(s.startTime, a); if (i >= 0 && i < 7) values[i] += s.distance / 1000 }
    const today = dayIndex(now, a)
    if (live) values[today] += live.distanceKm
    return { labels: ['M', 'T', 'W', 'T', 'F', 'S', 'S'], names: WEEKDAYS, values, highlight: today }
  }
  const n = new Date(now), values: number[] = Array(7).fill(0)
  const monthsAgo = (t: number) => { const d = new Date(t); return (n.getFullYear() - d.getFullYear()) * 12 + n.getMonth() - d.getMonth() }
  for (const s of sessions) { const i = 6 - monthsAgo(s.startTime); if (i >= 0 && i < 7) values[i] += s.distance / 1000 }
  if (live) values[6] += live.distanceKm
  const months = values.map((_, i) => new Date(n.getFullYear(), n.getMonth() - 6 + i, 1))
  return {
    labels: months.map(d => d.toLocaleDateString(undefined, { month: 'narrow' })),
    names: months.map(d => d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })),
    values, highlight: 6
  }
}

export const WEEKLY_WALK_GOAL = 3

/** Consecutive days with a walk or a discovery, ending today (or yesterday, so the streak survives until you've gone out today). */
export function streakDays(sessions: ExplorationSession[], discoveries: Discovery[], now: number): number {
  const days = new Set<number>()
  sessions.forEach(s => days.add(startOfDay(s.startTime)))
  discoveries.forEach(d => days.add(startOfDay(d.timestamp)))
  let day = startOfDay(now)
  if (!days.has(day)) day = addDays(day, -1)
  let n = 0
  while (days.has(day)) { n++; day = addDays(day, -1) }
  return n
}
