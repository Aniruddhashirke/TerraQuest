export interface Info { title: string; extract: string; url?: string }

export const trimExtract = (t: string, max = 380) => {
  if (t.length <= max) return t
  const cut = t.slice(0, max), i = cut.lastIndexOf('. ')
  return i > 120 ? cut.slice(0, i + 1) : cut.trimEnd() + '…'
}

// Free Wikipedia summary (no key). Tries the scientific name first, then the common name.
export async function fetchInfo(names: (string | undefined)[]): Promise<Info | null> {
  for (const n of names) {
    if (!n) continue
    try {
      const r = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(n.replace(/ /g, '_'))}?redirect=true`, { signal: AbortSignal.timeout(8000) })
      if (!r.ok) continue
      const j = await r.json()
      if (j.type !== 'standard' || !j.extract) continue
      return { title: j.title, extract: trimExtract(j.extract), url: j.content_urls?.desktop?.page }
    } catch { /* try next name */ }
  }
  return null
}
