import { describe, it, expect } from 'vitest'
import { buildReport } from './report'
import type { ExplorationSession, Discovery, Mission } from '../../db/database'

const s: ExplorationSession = { id: 1, startTime: 1000, endTime: 2000, steps: null, distance: 1500, calories: 120, activeMinutes: 20, route: [] }
const d = (id: number, t: number, category: Discovery['category'] = 'bird'): Discovery => ({ id, speciesName: 'x' + id, category, confidence: 0.9, timestamp: t, method: 'vision' })
const m = (id: number, t: number): Mission => ({ id, type: 'OBSERVE', title: '', description: '', status: 'completed', reward: 10, createdAt: t, completedAt: t })

describe('buildReport', () => {
  it('includes only discoveries and missions inside the session window', () => {
    const r = buildReport(s, [d(1, 1500), d(2, 500), d(3, 2500)], [m(1, 1600), m(2, 3000)])
    expect(r.ds.map(x => x.id)).toEqual([1]); expect(r.mDone).toHaveLength(1)
  })
  it('summary mentions distance in km', () => expect(buildReport(s, [], []).summary).toContain('1.50 km'))
})
