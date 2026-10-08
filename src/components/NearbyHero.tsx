import { useNavigate } from 'react-router-dom'
import { useNearby } from '../features/places/useNearby'
import { fmtDist } from '../features/places/places'

const WALK_M_PER_MIN = 80 // ~4.8 km/h

// Decorative backdrop (not a live map): a trail and a "you are here" dot.
const HeroMap = () => (
  <div className="heromap" aria-hidden="true">
    <svg viewBox="0 0 300 110" preserveAspectRatio="none">
      <path d="M0 78 C40 70 70 56 110 58 S160 66 180 54 S250 30 300 24" fill="none" stroke="#1d241d" strokeWidth="11" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
    <span className="dot" />
  </div>)

const COPY = {
  idle: ['Find a nature spot nearby', 'Uses your location to look up parks and reserves.', 'Find spots'],
  loading: ['Looking for spots…', 'Checking parks and reserves around you.', 'Searching…'],
  denied: ['Location is off', 'Allow location access to see spots near you.', 'Try again'],
  empty: ['No named spots within 5 km', 'Open the map to look around.', 'Try again'],
  error: ['Couldn’t load spots', 'This needs an internet connection.', 'Try again']
} as const

export default function NearbyHero() {
  const n = useNearby(), nav = useNavigate(), spot = n.places[0]

  if (n.status === 'ready' && spot) return (
    <section className="hero" aria-label="Nearby spot">
      <HeroMap />
      <div className="herobody">
        <h2>{spot.name}</h2>
        <p>{spot.kind} · {fmtDist(spot.distM)} · about {Math.max(1, Math.round(spot.distM / WALK_M_PER_MIN))} min on foot</p>
        <div className="herobtns">
          <button className="btn" onClick={() => nav('/map', { state: { go: { name: spot.name, latitude: spot.latitude, longitude: spot.longitude } } })}>Go there</button>
          <button className="btn alt" onClick={() => nav('/map', { state: { suggest: true } })}>More spots</button>
        </div>
      </div>
    </section>)

  const [title, meta, action] = COPY[(n.status === 'ready' ? 'empty' : n.status) as keyof typeof COPY]
  return (
    <section className="hero" aria-label="Nearby spot">
      <HeroMap />
      <div className="herobody">
        <h2>{title}</h2><p>{meta}</p>
        <div className="herobtns">
          <button className="btn" onClick={n.load} disabled={n.status === 'loading'}>{action}</button>
          <button className="btn alt" onClick={() => nav('/map')}>Open map</button>
        </div>
      </div>
    </section>)
}
