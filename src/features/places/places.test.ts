import { describe, it, expect } from 'vitest'
import { parsePlaces, describeStep, fmtDist, fmtMin } from './places'
import { trimExtract } from '../vision/info'

const me = { latitude: 19.0, longitude: 72.8 }
describe('places', () => {
  it('parses, dedupes by name, drops unnamed, sorts by distance', () => {
    const r = parsePlaces({ elements: [
      { type: 'way', id: 1, center: { lat: 19.02, lon: 72.8 }, tags: { name: 'Far Park', leisure: 'park' } },
      { type: 'node', id: 2, lat: 19.001, lon: 72.8, tags: { name: 'Near Garden', leisure: 'garden' } },
      { type: 'node', id: 3, lat: 19.001, lon: 72.8, tags: { name: 'Near Garden', leisure: 'garden' } },
      { type: 'node', id: 4, lat: 19.0, lon: 72.8, tags: { leisure: 'park' } }] }, me)
    expect(r.map(p => p.name)).toEqual(['Near Garden', 'Far Park'])
    expect(r[0].kind).toBe('Garden')
  })
  it('describes steps', () => {
    expect(describeStep({ maneuver: { type: 'turn', modifier: 'left' }, name: 'Park Rd', distance: 120 })).toEqual({ text: 'Turn left on Park Rd', distanceM: 120 })
    expect(describeStep({ maneuver: { type: 'arrive' } }).text).toBe('Arrive at your destination')
  })
  it('formats distance and time', () => { expect(fmtDist(450)).toBe('450 m'); expect(fmtDist(1500)).toBe('1.5 km'); expect(fmtMin(30)).toBe('1 min') })
  it('trims long info text at a sentence end', () => {
    const t = 'A'.repeat(200) + '. ' + 'B'.repeat(300)
    expect(trimExtract(t).endsWith('.')).toBe(true); expect(trimExtract('Short.')).toBe('Short.')
  })
})
