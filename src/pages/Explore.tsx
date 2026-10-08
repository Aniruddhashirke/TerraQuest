import { useSession } from '../features/activity/SessionProvider'
import { fmtTime } from '../utils/format'

export default function Explore() {
  const s = useSession()
  return (
    <>
      <h1>Explore</h1>
      <div className="card big">{fmtTime(s.activeMs)}<small>Status: {s.status}</small></div>
      <div className="grid">
        <div className="card">🚶 {s.distanceKm.toFixed(2)} km</div>
        <div className="card">🔥 ~{Math.round(s.kcal)} kcal <small>est. ({s.weightKg ? `${s.weightKg} kg` : 'default 70 kg'})</small></div>
        <div className="card">👣 {s.steps ?? <small>Step data unavailable on this device</small>}</div>
        <div className="card">📍 {s.route.length} route points</div>
      </div>
      <div className="card"><small>Your weight in kg (optional, improves calorie estimate)</small>
        <input type="number" min={20} max={300} defaultValue={s.weightKg ?? ''} placeholder="70"
          onBlur={e => { const v = Number(e.target.value); if (v >= 20 && v <= 300) s.saveWeight(v) }} /></div>
      {s.gps === 'denied' && <p className="warn">Location permission denied. Session continues without distance/map. Allow location in browser settings, then restart.</p>}
      {s.gps === 'unavailable' && <p className="warn">GPS unavailable. Session continues with time only.</p>}
      <div className="row">
        {s.status === 'IDLE' && <button className="btn" onClick={s.start}>Start exploration</button>}
        {s.status === 'ACTIVE' && <button className="btn alt" onClick={s.pause}>Pause</button>}
        {s.status === 'PAUSED' && <button className="btn" onClick={s.resume}>Resume</button>}
        {(s.status === 'ACTIVE' || s.status === 'PAUSED') && <button className="btn stop" onClick={s.stop}>Stop & save</button>}
        {s.status === 'COMPLETED' && <><p>✅ Session saved to your Journal.</p><button className="btn" onClick={s.reset}>New session</button></>}
      </div>
    </>
  )
}
