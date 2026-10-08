import type { Ctx } from './context'
import type { MissionType } from './engine'

const T: Record<MissionType, (c: Ctx) => string> = {
  DISCOVER: () => 'Scan your first plant, bird or insect to start your collection.',
  MOVE: c => `You have covered ${c.distanceKm.toFixed(1)} km so far. Take a short walk and find something new.`,
  LISTEN_FOR_BIRDS: c => `You have found ${c.plantsFound} plants already. Stop near the trees and listen for a bird for 10 seconds.`,
  FIND_A_PLANT: c => `${c.birdsFound} birds spotted! Now look low and find a plant or leaf to scan.`,
  OBSERVE: c => `Nice ${c.timeOfDay} walk. Pause and look closely for one detail you have not noticed yet.`
}
export const templateText = (t: MissionType, c: Ctx) => T[t](c)

const SYSTEM = 'You are TerraQuest, an outdoor exploration coach. Never invent a detected species. Use the supplied mission and context. Encourage safe, simple outdoor actions. Do not provide medical diagnosis. Reply in at most 2 short sentences.'

// The LLM only rewords. If no proxy is configured, offline, slow or invalid => deterministic template.
// Point VITE_LLM_ENDPOINT at your own serverless proxy (POST {system,context,mission} -> {text}) so API keys never reach the browser.
export async function getWording(t: MissionType, c: Ctx): Promise<string> {
  const url = (import.meta as any).env?.VITE_LLM_ENDPOINT as string | undefined
  if (!url || !navigator.onLine) return templateText(t, c)
  try {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(5000), body: JSON.stringify({ system: SYSTEM, context: c, mission: t }) })
    const { text } = await r.json()
    return typeof text === 'string' && text.length > 0 && text.length < 300 ? text : templateText(t, c)
  } catch { return templateText(t, c) }
}
