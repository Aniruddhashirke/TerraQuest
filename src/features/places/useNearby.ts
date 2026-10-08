import { useCallback, useEffect, useState } from 'react'
import { getPosition, Pos } from '../location/position'
import { findNature, Place } from './places'
import { haversineM } from '../../utils/geo'

const KEY = 'naturelens.nearby', FRESH_MS = 30 * 60 * 1000
type Cache = { at: number; places: Place[] }
export type NearbyStatus = 'idle' | 'loading' | 'ready' | 'empty' | 'denied' | 'error'

const read = (): Cache | null => { try { return JSON.parse(localStorage.getItem(KEY) || 'null') } catch { return null } }
const write = (c: Cache) => { try { localStorage.setItem(KEY, JSON.stringify(c)) } catch { /* storage full/blocked: skip cache */ } }
const rank = (places: Place[], from: Pos): Place[] => places
  .map(p => ({ ...p, distM: haversineM({ ...from, timestamp: 0 }, { latitude: p.latitude, longitude: p.longitude, timestamp: 0 }) }))
  .sort((a, b) => a.distM - b.distM)

/** Nearest nature spots. Auto-loads only if location permission was already granted; otherwise waits for load(). */
export function useNearby() {
  const [state, setState] = useState<{ status: NearbyStatus; places: Place[] }>({ status: 'idle', places: [] })

  const load = useCallback(async () => {
    setState(s => ({ ...s, status: 'loading' }))
    const me = await getPosition()
    if (!me) return setState({ status: 'denied', places: [] })
    const cached = read()
    if (cached && Date.now() - cached.at < FRESH_MS) {
      const r = rank(cached.places, me)
      if (r.length && r[0].distM < 5000) return setState({ status: 'ready', places: r })
    }
    try {
      const p = await findNature(me)
      write({ at: Date.now(), places: p })
      setState({ status: p.length ? 'ready' : 'empty', places: p })
    } catch {
      const r = cached ? rank(cached.places, me) : []   // offline: fall back to the last result
      setState(r.length && r[0].distM < 5000 ? { status: 'ready', places: r } : { status: 'error', places: [] })
    }
  }, [])

  useEffect(() => {
    let off = false
    navigator.permissions?.query({ name: 'geolocation' as PermissionName })
      .then(r => { if (!off && r.state === 'granted') load() }).catch(() => {})
    return () => { off = true }
  }, [load])

  return { ...state, load }
}
