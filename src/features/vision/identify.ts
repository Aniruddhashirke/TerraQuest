import type { Prediction } from './classify'

// Cloud identification through our own /api/identify proxy (key stays server-side).
export async function identifyOnline(image: string): Promise<Prediction[]> {
  const r = await fetch('/api/identify', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image }), signal: AbortSignal.timeout(25000)
  })
  if (!r.ok) throw new Error('cloud ' + r.status)
  const o = await r.json()
  return [
    { label: o.commonName, score: o.confidence, category: o.category, scientific: o.scientificName ?? undefined, notes: o.notes, via: o.source },
    ...(o.alternatives ?? []).map((a: any) => ({ label: a.commonName, score: 0, category: a.category }))
  ]
}
