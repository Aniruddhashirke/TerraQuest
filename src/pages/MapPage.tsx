import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, CircleMarker, Popup, Polyline, useMapEvents } from 'react-leaflet'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, deleteDiscovery } from '../db/database'
import { useSession } from '../features/activity/SessionProvider'
import { getPosition, Pos } from '../features/location/position'
import { findNature, getRoute, fmtDist, fmtMin, gmapsUrl, Place, Route } from '../features/places/places'
import { haversineM } from '../utils/geo'

const COLORS: Record<string, string> = { plant: '#2f7d4f', bird: '#2a6fb3', insect: '#d9822b', other: '#777' }
const pt = (p: Pos) => ({ ...p, timestamp: 0 })
function PinDropper({ onPin }: { onPin: (p: Pos) => void }) {
  useMapEvents({ click: e => onPin({ latitude: e.latlng.lat, longitude: e.latlng.lng }) })
  return null
}

export default function MapPage() {
  const all = useLiveQuery(() => db.discoveries.orderBy('timestamp').reverse().toArray(), [], [])
  const { route: walked } = useSession()
  const [me, setMe] = useState<Pos | null | undefined>(undefined)
  const [places, setPlaces] = useState<Place[]>([])
  const [dest, setDest] = useState<{ name: string; pos: Pos } | null>(null)
  const [route, setRoute] = useState<Route | null>(null)
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  // Hand-off from Home: "Go there" sets a destination, "More spots" runs the nearby search
  const intent = useLocation().state as { go?: { name: string; latitude: number; longitude: number }; suggest?: boolean } | null
  const navigate = useNavigate()
  const handled = useRef(false)

  useEffect(() => { getPosition().then(setMe) }, [])
  useEffect(() => {
    if (me === undefined || handled.current || !intent) return
    handled.current = true
    navigate('.', { replace: true, state: null })
    if (intent.go) go(intent.go.name, intent.go)
    else if (intent.suggest) suggest()
  }, [me])
  // Live position while a destination is set
  useEffect(() => {
    if (!dest || !('geolocation' in navigator)) return
    const id = navigator.geolocation.watchPosition(p => setMe({ latitude: p.coords.latitude, longitude: p.coords.longitude }), () => {}, { enableHighAccuracy: true })
    return () => navigator.geolocation.clearWatch(id)
  }, [dest])

  const located = all.filter(d => d.latitude != null)
  const last = walked[walked.length - 1]
  const center: [number, number] | null = last ? [last.latitude, last.longitude]
    : me ? [me.latitude, me.longitude] : located[0] ? [located[0].latitude!, located[0].longitude!] : null
  const remaining = me && dest ? haversineM(pt(me), pt(dest.pos)) : null

  async function suggest() {
    if (!me) return setMsg('Turn on location to find nearby spots.')
    setBusy(true); setMsg('')
    try { const p = await findNature(me); setPlaces(p); if (!p.length) setMsg('No named nature spots found within 5 km.') }
    catch { setMsg('Could not load nearby spots (needs internet). Try again.') }
    setBusy(false)
  }
  async function go(name: string, pos: Pos) {
    setDest({ name, pos }); setRoute(null); setMsg('')
    if (!me) return setMsg('Turn on location for directions. You can still open Google Maps below.')
    try { setRoute(await getRoute(me, pos)) } catch { setMsg('Route service unavailable. Use Google Maps below.') }
  }

  return (
    <>
      <h1>Map</h1>
      {me === undefined ? <p>Locating…</p> : (
        <MapContainer center={center ?? [20, 0]} zoom={center ? 15 : 2} style={{ height: 340, borderRadius: 14 }}>
          <TileLayer attribution="© OpenStreetMap contributors" url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <PinDropper onPin={p => go('Dropped pin', p)} />
          {me && <CircleMarker center={[me.latitude, me.longitude]} radius={7} pathOptions={{ color: '#fff', fillColor: '#e33', fillOpacity: 1 }}><Popup>You are here</Popup></CircleMarker>}
          {walked.length > 1 && <Polyline positions={walked.map(p => [p.latitude, p.longitude] as [number, number])} />}
          {route && <Polyline positions={route.line} pathOptions={{ color: '#7a3fd1', weight: 5 }} />}
          {places.map(p => (
            <CircleMarker key={p.id} center={[p.latitude, p.longitude]} radius={8} pathOptions={{ color: '#0a8f8f', fillOpacity: 0.7 }}>
              <Popup><b>{p.name}</b><br />{p.kind} · {fmtDist(p.distM)}<br /><button onClick={() => go(p.name, p)}>Go here</button></Popup>
            </CircleMarker>))}
          {dest && <CircleMarker center={[dest.pos.latitude, dest.pos.longitude]} radius={11} pathOptions={{ color: '#7a3fd1', fillColor: '#7a3fd1', fillOpacity: 0.9 }}><Popup>{dest.name}</Popup></CircleMarker>}
          {located.map(d => (
            <CircleMarker key={d.id} center={[d.latitude!, d.longitude!]} radius={10} pathOptions={{ color: COLORS[d.category], fillOpacity: 0.8 }}>
              <Popup><b>{d.speciesName}</b><br />{d.category} · {(d.confidence * 100).toFixed(0)}%<br />
                {d.image && <img src={d.image} width={140} />}<br />{new Date(d.timestamp).toLocaleString()}</Popup>
            </CircleMarker>))}
        </MapContainer>)}
      {me === null && <p className="warn">Current location unavailable. Saved discoveries still show.</p>}
      <div className="row">
        <button className="btn" onClick={suggest} disabled={busy}>{busy ? 'Searching…' : '🌳 Suggest nearby spots'}</button>
      </div>
      <small>Tip: tap anywhere on the map to drop a pin and get directions.</small>
      {msg && <p className="warn">{msg}</p>}

      {dest && (
        <div className="card">
          <b>📍 {dest.name}</b>
          {route && <small>{fmtDist(route.distanceM)} · about {fmtMin(route.durationS)} on foot</small>}
          {remaining != null && <small>{remaining < 30 ? '🎉 You have arrived!' : `Live: ${fmtDist(remaining)} to go (straight line)`}</small>}
          <div className="row">
            <a className="btn" href={gmapsUrl(dest.pos)} target="_blank" rel="noreferrer">Open in Google Maps</a>
            <button className="btn alt" onClick={() => { setDest(null); setRoute(null) }}>Clear</button>
          </div>
          {route && <details><summary>Step-by-step directions</summary>
            <ol>{route.steps.map((s, i) => <li key={i}>{s.text}{s.distanceM > 0 && ` (${fmtDist(s.distanceM)})`}</li>)}</ol></details>}
        </div>
      )}

      {places.length > 0 && <h2>Suggested places</h2>}
      {places.map(p => (
        <div className="card" key={p.id}>
          <b>{p.name}</b><small>{p.kind} · {fmtDist(p.distM)} away</small>
          <button className="link" style={{ color: 'var(--g)' }} onClick={() => go(p.name, p)}>Show route</button>
        </div>))}

      <h2>History ({all.length})</h2>
      {all.length === 0 && <div className="card"><small>No discoveries yet. Use Scan.</small></div>}
      {all.map(d => (
        <div className="card" key={d.id} style={{ display: 'flex', gap: 10 }}>
          {d.image && <img src={d.image} width={64} height={64} style={{ objectFit: 'cover', borderRadius: 8 }} />}
          <div><b>{d.speciesName}</b><small>{d.category} · {(d.confidence * 100).toFixed(0)}% · {d.latitude != null ? 'GPS saved' : 'no GPS'}</small>
            <button className="link" onClick={() => deleteDiscovery(d.id!)}>Delete</button></div>
        </div>))}
    </>
  )
}
