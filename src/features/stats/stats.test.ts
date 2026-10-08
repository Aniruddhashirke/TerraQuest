import { describe, it, expect } from 'vitest'
import { summarize, distanceBars, startOfWeek, streakDays } from './stats'
import type { ExplorationSession, Discovery } from '../../db/database'

const at = (m: number, d: number, h = 9) => new Date(2026, m, d, h).getTime()
const now = at(9, 8, 10) // Thu 8 Oct 2026
const sess = (t: number, distance: number, activeMinutes: number): ExplorationSession =>
  ({ startTime: t, endTime: t + activeMinutes * 60000, steps: null, distance, calories: 0, activeMinutes, route: [] })
const find = (name: string, t: number): Discovery =>
  ({ speciesName: name, category: 'plant', confidence: 1, timestamp: t, method: 'manual' })

const sessions = [sess(at(8, 28), 5000, 60), sess(at(9, 5), 3000, 40), sess(at(9, 8, 8), 2000, 38)]
const finds = [find('Rose', at(8, 28)), find('rose ', at(9, 6)), find('Myna', at(9, 7)), find('Neem', at(9, 8))]

describe('stats', () => {
  it('weeks start on Monday', () => { expect(new Date(startOfWeek(now)).getDay()).toBe(1); expect(new Date(startOfWeek(now)).getDate()).toBe(5) })
  it('summarizes today / week / all time', () => {
    expect(summarize(sessions, finds, 'today', now).distanceKm).toBeCloseTo(2)
    const w = summarize(sessions, finds, 'week', now)
    expect(w.distanceKm).toBeCloseTo(5); expect(w.walks).toBe(2); expect(w.finds).toBe(3)
    const all = summarize(sessions, finds, 'all', now)
    expect(all.distanceKm).toBeCloseTo(10); expect(all.walks).toBe(3); expect(all.newSpecies).toBe(3)
  })
  it('counts only first-ever sightings as new (case-insensitive)', () => {
    expect(summarize(sessions, finds, 'week', now).newSpecies).toBe(2) // Myna, Neem — not Rose
  })
  it('adds the live walk to distance, time and walks', () => {
    const s = summarize(sessions, finds, 'today', now, { distanceKm: 0.5, activeMs: 600000 })
    expect(s.distanceKm).toBeCloseTo(2.5); expect(s.walks).toBe(2); expect(s.activeMin).toBeCloseTo(48)
  })
  it('builds Mon..Sun bars and highlights today', () => {
    const b = distanceBars(sessions, 'week', now)
    expect(b.values.map(v => Math.round(v))).toEqual([3, 0, 0, 2, 0, 0, 0]); expect(b.highlight).toBe(3)
    expect(distanceBars(sessions, 'week', now, { distanceKm: 1, activeMs: 0 }).values[3]).toBeCloseTo(3)
  })
  it('builds 7 month bars ending this month', () => {
    const b = distanceBars(sessions, 'all', now)
    expect(b.values.length).toBe(7); expect(b.values[6]).toBeCloseTo(5); expect(b.values[5]).toBeCloseTo(5)
  })
  it('counts a streak of consecutive active days, forgiving an empty today', () => {
    expect(streakDays(sessions, finds, now)).toBe(4) // Oct 5,6,7,8 have activity; Oct 4 does not
    expect(streakDays(sessions, finds, at(9, 9, 10))).toBe(4) // today (9th) empty, yesterday counts
    expect(streakDays(sessions, finds, at(9, 10, 10))).toBe(0) // two days idle: broken
    expect(streakDays([], [], now)).toBe(0)
  })
})
