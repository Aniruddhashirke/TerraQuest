import { describe, it, expect } from 'vitest'
import { normalize } from './_identify'

describe('normalize', () => {
  it('accepts a valid answer and clamps confidence', () => {
    const r = normalize({ commonName: 'European Goldfinch', scientificName: 'Carduelis carduelis', category: 'bird', confidence: 1.7, notes: 'red face', alternatives: [] })
    expect(r.category).toBe('bird'); expect(r.confidence).toBe(1)
  })
  it('unknown category becomes other', () => expect(normalize({ commonName: 'X', category: 'dragon' }).category).toBe('other'))
  it('rejects output with no name', () => expect(() => normalize({ category: 'bird' })).toThrow())
  it('limits alternatives to 2', () => expect(normalize({ commonName: 'X', alternatives: [1, 2, 3].map(i => ({ commonName: 'a' + i })) }).alternatives).toHaveLength(2))
})

import { mergePlantnet } from './_identify'
const base = normalize({ commonName: 'Hibiscus', category: 'plant', confidence: 0.6 })
describe('mergePlantnet', () => {
  it('uses Pl@ntNet species as the top answer', () => {
    const r = mergePlantnet(base, [
      { score: 0.82, species: { scientificNameWithoutAuthor: 'Hibiscus rosa-sinensis', commonNames: ['Chinese hibiscus'] } },
      { score: 0.1, species: { scientificNameWithoutAuthor: 'Hibiscus syriacus', commonNames: [] } }])
    expect(r.source).toBe('plantnet'); expect(r.commonName).toBe('Chinese hibiscus')
    expect(r.alternatives[0].commonName).toBe('Hibiscus syriacus')
  })
  it('keeps the cloud AI answer when Pl@ntNet returns nothing', () => expect(mergePlantnet(base, []).source).toBe('llm'))
})
