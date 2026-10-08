import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react'
import { saveSession, db, LocationPoint } from '../../db/database'
import { haversineM, isOutlier, estimateKcal } from '../../utils/geo'

export type Status = 'IDLE' | 'ACTIVE' | 'PAUSED' | 'COMPLETED'
export type Gps = 'idle' | 'ok' | 'denied' | 'unavailable'

interface Ctx {
  status: Status; gps: Gps; route: LocationPoint[]
  distanceKm: number; activeMs: number; kcal: number
  steps: number | null            // null = unavailable (never faked)
  weightKg: number | null; saveWeight(kg: number): Promise<void>
  start(): void; pause(): void; resume(): void; stop(): Promise<void>; reset(): void
}
const SessionCtx = createContext<Ctx>(null!)
export const useSession = () => useContext(SessionCtx)

export function SessionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('IDLE')
  const [gps, setGps] = useState<Gps>('idle')
  const [route, setRoute] = useState<LocationPoint[]>([])
  const [distM, setDistM] = useState(0)
  const [activeMs, setActiveMs] = useState(0)
  const [weight, setWeight] = useState<number | null>(null)
  const startTime = useRef(0)
  const lastPt = useRef<LocationPoint | null>(null)
  const watchId = useRef<number | null>(null)

  useEffect(() => {
    if (status !== 'ACTIVE') return
    const t = setInterval(() => setActiveMs(m => m + 1000), 1000)
    return () => clearInterval(t)
  }, [status])

  useEffect(() => () => stopWatch(), [])
  useEffect(() => { db.userProfile.get(1).then(p => setWeight(p?.weight ?? null)) }, [])

  function startWatch() {
    if (!('geolocation' in navigator)) return setGps('unavailable')
    lastPt.current = null // don't bridge the gap across a pause
    watchId.current = navigator.geolocation.watchPosition(
      p => {
        setGps('ok')
        if (p.coords.accuracy > 50) return
        const pt = { latitude: p.coords.latitude, longitude: p.coords.longitude, timestamp: p.timestamp }
        const last = lastPt.current
        if (last) {
          const d = haversineM(last, pt)
          if (d < 2 || isOutlier(last, pt, d)) return
          setDistM(x => x + d)
        }
        lastPt.current = pt
        setRoute(r => [...r, pt])
      },
      e => setGps(e.code === e.PERMISSION_DENIED ? 'denied' : 'unavailable'),
      { enableHighAccuracy: true, maximumAge: 2000 }
    )
  }
  function stopWatch() {
    if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current)
    watchId.current = null
  }

  const kcal = estimateKcal(activeMs / 3600000, weight ?? undefined)
  const value: Ctx = {
    status, gps, route, distanceKm: distM / 1000, activeMs, kcal, steps: null, weightKg: weight,
    async saveWeight(kg) { setWeight(kg); await db.userProfile.put({ id: 1, weight: kg, totalXP: 0, streak: 0, settings: {} }) },
    start() { setRoute([]); setDistM(0); setActiveMs(0); startTime.current = Date.now(); setStatus('ACTIVE'); startWatch() },
    pause() { stopWatch(); setStatus('PAUSED') },
    resume() { setStatus('ACTIVE'); startWatch() },
    async stop() {
      stopWatch()
      setStatus('COMPLETED')
      await saveSession({
        startTime: startTime.current, endTime: Date.now(), steps: null,
        distance: distM, calories: Math.round(kcal), activeMinutes: Math.round(activeMs / 60000), route
      })
    },
    reset() { setStatus('IDLE'); setGps('idle') }
  }
  return <SessionCtx.Provider value={value}>{children}</SessionCtx.Provider>
}
