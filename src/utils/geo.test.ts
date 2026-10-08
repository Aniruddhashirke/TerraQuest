import { describe, it, expect } from 'vitest'
import { haversineM, isOutlier, estimateKcal } from './geo'

const p = (latitude: number, longitude: number, timestamp = 0) => ({ latitude, longitude, timestamp })
describe('geo', () => {
  it('haversine: 0.001 deg latitude is ~111 m', () => expect(haversineM(p(0, 0), p(0.001, 0))).toBeCloseTo(111.2, 0))
  it('same point is 0 m', () => expect(haversineM(p(10, 10), p(10, 10))).toBe(0))
  it('flags a GPS jump (1 km in 5 s)', () => expect(isOutlier(p(0, 0, 0), p(0.009, 0, 5000), 1000)).toBe(true))
  it('accepts walking speed (7 m in 5 s)', () => expect(isOutlier(p(0, 0, 0), p(0, 0, 5000), 7)).toBe(false))
  it('kcal scales with time and weight', () => {
    expect(estimateKcal(1, 70)).toBeCloseTo(245)
    expect(estimateKcal(2, 70)).toBeCloseTo(490)
    expect(estimateKcal(1, 80)).toBeGreaterThan(estimateKcal(1, 70))
  })
})
