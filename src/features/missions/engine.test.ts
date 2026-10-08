import { describe, it, expect } from 'vitest'
import { ruleFor, pickMission } from './engine'
import type { Ctx } from './context'
import type { Mission } from '../../db/database'

const base: Ctx = { steps: null, distanceKm: 3, activeMinutes: 30, calories: 100, plantsFound: 1, birdsFound: 1, insectsFound: 0, totalDiscoveries: 2, completedMissions: 0, timeOfDay: 'morning' }
const done = (type: string, at: number): Mission => ({ type, title: type, description: '', status: 'completed', reward: 10, createdAt: at, completedAt: at })

describe('mission engine', () => {
  it('no discoveries -> DISCOVER', () => expect(ruleFor({ ...base, totalDiscoveries: 0 })).toBe('DISCOVER'))
  it('little movement -> MOVE', () => expect(ruleFor({ ...base, distanceKm: 0.3 })).toBe('MOVE'))
  it('many plants -> LISTEN_FOR_BIRDS', () => expect(ruleFor({ ...base, plantsFound: 8 })).toBe('LISTEN_FOR_BIRDS'))
  it('many birds -> FIND_A_PLANT', () => expect(ruleFor({ ...base, birdsFound: 6 })).toBe('FIND_A_PLANT'))
  it('balanced -> OBSERVE', () => expect(ruleFor(base)).toBe('OBSERVE'))
  it('uses real steps when available', () => expect(ruleFor({ ...base, steps: 500, distanceKm: 5 })).toBe('MOVE'))
  it('cooldown avoids repeating a just-completed mission', () => {
    const now = 1_000_000
    expect(pickMission({ ...base, plantsFound: 8 }, [done('LISTEN_FOR_BIRDS', now - 1000)], [], now)).not.toBe('LISTEN_FOR_BIRDS')
  })
  it('skipped missions are not offered again', () => expect(pickMission(base, [], ['OBSERVE'])).not.toBe('OBSERVE'))
  it('different state -> different task', () => expect(pickMission({ ...base, plantsFound: 8 }, [])).not.toBe(pickMission({ ...base, birdsFound: 6 }, [])))
})
