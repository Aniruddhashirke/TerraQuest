// Shared by the Vercel function (api/identify.ts) and the Vite dev server. Runs server-side only.
const SYSTEM = `You identify wildlife and plants from one photo for a nature-walk app. Identify the main living subject as specifically as the photo supports (common name, plus scientific name if reasonably sure). If unsure, give the genus or family with lower confidence. If the subject is not a plant, animal or fungus (a screen, person, object), use category "other" and say what it is. Fungi count as "plant". Animals that are not birds or insects are "other". Never say whether anything is edible, poisonous or safe to touch. Reply with ONLY JSON: {"commonName":string,"scientificName":string|null,"category":"plant"|"bird"|"insect"|"other","confidence":number between 0 and 1,"notes":string (max 20 words: the key feature you used),"alternatives":[{"commonName":string,"category":"plant"|"bird"|"insect"|"other"}] (max 2)}`

const CATS = ['plant', 'bird', 'insect', 'other']
const cat = (c: unknown) => (CATS.includes(c as string) ? (c as string) : 'other')
const str = (s: unknown, n: number) => (typeof s === 'string' ? s.slice(0, n) : '')

export function normalize(o: any) {
  if (!o || typeof o.commonName !== 'string' || !o.commonName) throw new Error('bad model output')
  return {
    commonName: str(o.commonName, 80), scientificName: str(o.scientificName, 80) || null, category: cat(o.category),
    confidence: Math.min(1, Math.max(0, Number(o.confidence) || 0)), notes: str(o.notes, 200),
    alternatives: (Array.isArray(o.alternatives) ? o.alternatives : []).slice(0, 2)
      .filter((a: any) => a && typeof a.commonName === 'string')
      .map((a: any) => ({ commonName: str(a.commonName, 80), category: cat(a.category) }))
  }
}

export async function identify(image: string, key: string, model = 'claude-haiku-4-5-20251001') {
  const m = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/.exec(image)
  if (!m) throw new Error('bad image')
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model, max_tokens: 400, system: SYSTEM,
      messages: [{ role: 'user', content: [
        { type: 'image', source: { type: 'base64', media_type: m[1], data: m[2] } },
        { type: 'text', text: 'Identify the main subject.' }] }]
    })
  })
  if (!r.ok) throw new Error('upstream ' + r.status)
  const j: any = await r.json()
  const text: string = j.content?.find((c: any) => c.type === 'text')?.text ?? ''
  return normalize(JSON.parse(text.replace(/```json|```/g, '').trim()))
}

export type Identified = ReturnType<typeof normalize> & { source: 'llm' | 'plantnet' }

// Pl@ntNet: plant-specialist database. Used only when the cloud AI says the subject is a plant.
export async function plantnet(image: string, key: string): Promise<any[]> {
  const m = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/.exec(image)
  if (!m) throw new Error('bad image')
  const form = new FormData()
  form.append('images', new Blob([Buffer.from(m[2], 'base64')], { type: m[1] }), 'photo.jpg')
  form.append('organs', 'auto')
  const r = await fetch(`https://my-api.plantnet.org/v2/identify/all?api-key=${encodeURIComponent(key)}&lang=en&nb-results=3`, { method: 'POST', body: form })
  if (!r.ok) throw new Error('plantnet ' + r.status)
  return ((await r.json()) as any).results ?? []
}

export function mergePlantnet(base: ReturnType<typeof normalize>, results: any[]): Identified {
  const name = (r: any) => r?.species?.commonNames?.[0] || r?.species?.scientificNameWithoutAuthor
  const top = results[0]
  if (!top || !name(top)) return { ...base, source: 'llm' }
  return {
    commonName: str(name(top), 80), scientificName: str(top.species.scientificNameWithoutAuthor, 80) || null, category: 'plant',
    confidence: Math.min(1, Math.max(0, Number(top.score) || 0)),
    notes: str(`Pl@ntNet match. Cloud AI guessed: ${base.commonName}`, 200),
    alternatives: results.slice(1, 3).filter(name).map(r => ({ commonName: str(name(r), 80), category: 'plant' })),
    source: 'plantnet'
  }
}

export async function identifyAll(image: string, k: { anthropic: string; model?: string; plantnet?: string }): Promise<Identified> {
  const base = await identify(image, k.anthropic, k.model)
  if (base.category === 'plant' && k.plantnet) {
    try { return mergePlantnet(base, await plantnet(image, k.plantnet)) } catch { /* keep the cloud AI answer */ }
  }
  return { ...base, source: 'llm' }
}
