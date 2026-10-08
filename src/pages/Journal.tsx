import { useState } from 'react'
import { MapContainer, TileLayer, CircleMarker, Polyline, Popup } from 'react-leaflet'
import L from 'leaflet'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, deleteSession } from '../db/database'
import { buildReport, downloadReport } from '../features/journal/report'

const COLORS: Record<string, string> = { plant: '#2f7d4f', bird: '#2a6fb3', insect: '#d9822b', other: '#777' }
const fmtDur = (min: number) => (min >= 60 ? `${Math.floor(min / 60)} h ${min % 60} min` : `${min} min`)

export default function Journal() {
  const sessions = useLiveQuery(() => db.explorationSessions.orderBy('startTime').reverse().toArray(), [], [])
  const all = useLiveQuery(() => db.discoveries.toArray(), [], [])
  const ms = useLiveQuery(() => db.missions.toArray(), [], [])
  const [openId, setOpenId] = useState<number | null>(null)
  const open = sessions.find(s => s.id === openId)

  if (open) {
    const r = buildReport(open, all, ms)
    const line = open.route.map(p => [p.latitude, p.longitude] as [number, number])
    const found = r.ds.filter(d => d.latitude != null)
    const pts = [...line, ...found.map(d => [d.latitude!, d.longitude!] as [number, number])]
    return (
      <>
        <button className="link" style={{ color: 'var(--g)' }} onClick={() => setOpenId(null)}>← Back to journal</button>
        <h1>{new Date(open.startTime).toLocaleDateString()}</h1>
        <small>{new Date(open.startTime).toLocaleTimeString()} – {new Date(open.endTime).toLocaleTimeString()}</small>
        <div className="grid" style={{ marginTop: 10 }}>
          <div className="card">🚶 {(open.distance / 1000).toFixed(2)} km<small>distance walked</small></div>
          <div className="card">⏱ {fmtDur(open.activeMinutes)}<small>active time</small></div>
          <div className="card">🔥 ~{open.calories} kcal<small>estimated</small></div>
          <div className="card">👣 {open.steps ?? <small>unavailable</small>}<small>steps</small></div>
        </div>
        <h2>🗺️ Route</h2>
        {pts.length === 0 ? <div className="card"><small>No route recorded (GPS was unavailable or denied).</small></div> : (
          <MapContainer bounds={L.latLngBounds(pts)} boundsOptions={{ padding: [24, 24], maxZoom: 17 }} style={{ height: 300, borderRadius: 14 }}>
            <TileLayer attribution="© OpenStreetMap contributors" url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {line.length > 1 && <Polyline positions={line} pathOptions={{ color: '#7a3fd1', weight: 5 }} />}
            {line.length > 0 && <CircleMarker center={line[0]} radius={7} pathOptions={{ color: '#fff', fillColor: '#2f7d4f', fillOpacity: 1 }}><Popup>Start</Popup></CircleMarker>}
            {line.length > 1 && <CircleMarker center={line[line.length - 1]} radius={7} pathOptions={{ color: '#fff', fillColor: '#b3392f', fillOpacity: 1 }}><Popup>Finish</Popup></CircleMarker>}
            {found.map(d => (
              <CircleMarker key={d.id} center={[d.latitude!, d.longitude!]} radius={10} pathOptions={{ color: COLORS[d.category], fillOpacity: 0.8 }}>
                <Popup><b>{d.speciesName}</b><br />{d.image && <img src={d.image} width={120} />}</Popup>
              </CircleMarker>))}
          </MapContainer>)}
        <h2>🌿 Discoveries ({r.ds.length})</h2>
        {r.ds.length === 0 && <div className="card"><small>Nothing scanned during this walk.</small></div>}
        {r.ds.map(d => (
          <div className="card" key={d.id} style={{ display: 'flex', gap: 10 }}>
            {d.image && <img src={d.image} width={72} height={72} style={{ objectFit: 'cover', borderRadius: 8 }} />}
            <div><b>{d.speciesName}</b>
              <small>{d.category} · {(d.confidence * 100).toFixed(0)}% · {new Date(d.timestamp).toLocaleTimeString()}{d.latitude == null && ' · no GPS'}</small></div>
          </div>))}
        <h2>🎯 Missions ({r.mDone.length})</h2>
        {r.mDone.length === 0 && <div className="card"><small>No missions completed during this walk.</small></div>}
        {r.mDone.map(m => (
          <div className="card" key={m.id}><b>{m.type.replace(/_/g, ' ').toLowerCase()}</b><small>{m.description}</small></div>))}
        <p>{r.summary}</p>
        <div className="row">
          <button className="btn" onClick={() => downloadReport(r.text, open.id)}>Save report</button>
          <button className="btn stop" onClick={async () => { await deleteSession(open.id!); setOpenId(null) }}>Delete session</button>
        </div>
      </>
    )
  }

  return (
    <>
      <h1>Journal</h1>
      {sessions.length === 0 && <div className="card"><small>No sessions yet. Start exploring!</small></div>}
      {sessions.map(s => {
        const r = buildReport(s, all, ms)
        return (
          <div className="card" key={s.id} onClick={() => setOpenId(s.id!)} style={{ cursor: 'pointer' }}>
            <b>{new Date(s.startTime).toLocaleString()}</b><br />
            {(s.distance / 1000).toFixed(2)} km · {fmtDur(s.activeMinutes)} · ~{s.calories} kcal (est.)<br />
            <small>{r.ds.length} discoveries · {r.mDone.length} missions · Steps: {s.steps ?? 'unavailable'}</small>
            <div style={{ display: 'flex', gap: 6, margin: '6px 0' }}>
              {r.ds.slice(0, 4).map(d => d.image && <img key={d.id} src={d.image} width={44} height={44} style={{ objectFit: 'cover', borderRadius: 6 }} />)}
            </div>
            <span style={{ color: 'var(--g)' }}>View session →</span>
          </div>)
      })}
    </>
  )
}
