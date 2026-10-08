import type { ExplorationSession, Discovery, Mission } from '../../db/database'

export function buildReport(s: ExplorationSession, all: Discovery[], ms: Mission[]) {
  const ds = all.filter(d => d.timestamp >= s.startTime && d.timestamp <= s.endTime)
  const mDone = ms.filter(m => m.status === 'completed' && (m.completedAt ?? 0) >= s.startTime && (m.completedAt ?? 0) <= s.endTime)
  const by = (c: string) => ds.filter(d => d.category === c).length
  const km = (s.distance / 1000).toFixed(2)
  // Deterministic summary (no LLM needed for the offline report)
  const summary = `You explored for ${s.activeMinutes} min and covered ${km} km, finding ${ds.length} discoveries and completing ${mDone.length} missions.`
  const text = [`TerraQuest Session Report — ${new Date(s.startTime).toLocaleString()}`, `Duration: ${s.activeMinutes} min`,
    `Steps: ${s.steps ?? 'unavailable'}`, `Distance: ${km} km`, `Estimated calories: ~${s.calories} kcal`,
    `Discoveries: ${by('plant')} plants, ${by('bird')} birds, ${by('insect')} insects, ${by('other')} other`,
    ...ds.map(d => ` - ${d.speciesName} (${(d.confidence * 100).toFixed(0)}%)`), `Missions completed: ${mDone.length}`, '', summary].join('\n')
  return { ds, mDone, summary, text }
}
export function downloadReport(text: string, id?: number) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([text], { type: 'text/plain' }))
  a.download = `terraquest-report-${id ?? 'session'}.txt`; a.click()
}
