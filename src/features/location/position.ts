export type Pos = { latitude: number; longitude: number }
// One-shot fix; permission is requested only when this is called. Resolves null on denial/failure.
export const getPosition = () => new Promise<Pos | null>(res => {
  if (!('geolocation' in navigator)) return res(null)
  navigator.geolocation.getCurrentPosition(
    p => res({ latitude: p.coords.latitude, longitude: p.coords.longitude }),
    () => res(null), { enableHighAccuracy: true, timeout: 8000 })
})
