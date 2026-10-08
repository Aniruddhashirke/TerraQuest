export const fmtTime = (ms: number) => {
  const t = Math.floor(ms / 1000), p = (n: number) => String(n).padStart(2, '0')
  return `${p(Math.floor(t / 3600))}:${p(Math.floor((t % 3600) / 60))}:${p(t % 60)}`
}
export const fmtKm = (km: number) => `${km.toFixed(1)} km`
export const fmtMinutes = (m: number) => {
  const t = Math.round(m)
  return t < 60 ? `${t}m` : `${Math.floor(t / 60)}h ${String(t % 60).padStart(2, '0')}m`
}
