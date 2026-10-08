import { useEffect, useRef, useState } from 'react'
import { openCamera, stopCamera, toDataUrl, fileToDataUrl, shrink } from '../features/camera/capture'
import { classify, Prediction } from '../features/vision/classify'
import { fetchInfo, Info } from '../features/vision/info'
import { identifyOnline } from '../features/vision/identify'
import { getPosition } from '../features/location/position'
import { saveDiscovery } from '../db/database'

export default function Scanner() {
  const video = useRef<HTMLVideoElement>(null)
  const stream = useRef<MediaStream | null>(null)
  const [camOn, setCamOn] = useState(false)
  const [img, setImg] = useState<string | null>(null)
  const [preds, setPreds] = useState<Prediction[]>([])
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [saved, setSaved] = useState('')
  const [sel, setSel] = useState(0)
  const [info, setInfo] = useState<Info | 'loading' | 'none' | null>(null)
  const [source, setSource] = useState<'cloud' | 'device'>('device')
  const bigRef = useRef('')

  useEffect(() => () => stopCamera(stream.current), [])

  async function startCam() {
    setError('')
    try { stream.current = await openCamera(video.current!); setCamOn(true) }
    catch { setError('Camera permission denied or unavailable. Allow camera access and retry, or upload a photo instead.') }
  }
  const snap = () => {
    const v = video.current!
    analyze(toDataUrl(v, v.videoWidth, v.videoHeight, 768))
    stopCamera(stream.current); setCamOn(false)
  }
  async function analyze(big: string) {
    bigRef.current = big
    setPreds([]); setSel(0); setInfo(null); setSaved(''); setError(''); setBusy('Identifying…')
    setImg(await shrink(big, 320))
    try {
      let list: Prediction[] | null = null
      if (navigator.onLine) { try { list = await identifyOnline(big); setSource('cloud') } catch { /* fall back */ } }
      if (!list) { list = await classify(big); setSource('device') }
      setPreds(list)
    } catch { setError('Identification failed. Check your connection and tap Retry.') }
    setBusy('')
  }
  async function showInfo() {
    const t = preds[sel]; if (!t) return
    setInfo('loading')
    setInfo((await fetchInfo([t.scientific, t.label])) ?? 'none')
  }
  async function save() {
    const top = preds[sel]; if (!top || !img) return
    const pos = await getPosition()
    await saveDiscovery({
      speciesName: top.scientific ? `${top.label} (${top.scientific})` : top.label, category: top.category, confidence: top.score, image: img,
      latitude: pos?.latitude, longitude: pos?.longitude, timestamp: Date.now(), method: 'vision'
    })
    setSaved(pos ? 'Saved with GPS location ✅' : 'Saved without location (GPS unavailable) ✅')
  }

  const top = preds[sel]
  return (
    <>
      <h1>Scanner</h1>
      <video ref={video} playsInline muted style={{ width: '100%', borderRadius: 14, display: camOn ? 'block' : 'none' }} />
      {img && !camOn && <img src={img} alt="capture" style={{ width: '100%', borderRadius: 14 }} />}
      <div className="row">
        {!camOn && <button className="btn" onClick={startCam}>📷 Open camera</button>}
        {camOn && <button className="btn" onClick={snap}>Capture</button>}
        <label className="btn alt">Upload photo
          <input type="file" accept="image/*" hidden onChange={async e => e.target.files?.[0] && analyze(await fileToDataUrl(e.target.files[0]))} />
        </label>
        {img && error && <button className="btn alt" onClick={() => analyze(bigRef.current)}>Retry</button>}
      </div>
      {busy && <p>{busy}</p>}
      {error && <p className="warn">{error}</p>}
      {top && (
        <div className="card">
          <b>{top.score >= 0.5 || source === 'cloud' && top.score === 0 ? top.label : `Possible: ${top.label}`}</b>
          {top.scientific && <small><i>{top.scientific}</i></small>}
          <small>{top.category}{top.score > 0 && ` · ${(top.score * 100).toFixed(0)}% confidence`}</small>
          {top.notes && <small>{top.notes}</small>}
          <small>{source === 'cloud' ? (top.via === 'plantnet' ? '🌿 Matched with the Pl@ntNet plant database (photo sent for analysis)' : '☁️ Identified by cloud AI (photo sent securely for analysis)') : '📱 Basic on-device match (limited list, works offline)'}</small>
          {preds[0].score < 0.3 && <small>Not sure. Get closer with one subject in the centre.</small>}
          {info === null && top.category !== 'other' && <button className="btn alt" onClick={showInfo}>ℹ️ More info</button>}
          {info === 'loading' && <small>Loading info…</small>}
          {info === 'none' && <small>No extra info found (this needs an internet connection).</small>}
          {info && typeof info === 'object' && (
            <div className="info"><b>{info.title}</b><br />{info.extract}
              {info.url && <><br /><a href={info.url} target="_blank" rel="noreferrer">Read more on Wikipedia</a></>}</div>)}
          <p className="warn">AI identification can be wrong. Never rely on it to decide whether a plant or mushroom is safe to touch or eat.</p>
          {saved ? <p>{saved}</p> : <button className="btn" onClick={save}>Save discovery</button>}
        </div>
      )}
    </>
  )
}
