import { Link } from 'react-router-dom'
import type { Discovery } from '../db/database'

const ICON: Record<string, string> = { plant: '🌿', bird: '🐦', insect: '🦋', other: '🔍' }

export default function RecentFinds({ finds }: { finds: Discovery[] }) {
  const recent = [...finds].sort((a, b) => b.timestamp - a.timestamp).slice(0, 6)
  return (
    <section className="finds" aria-label="Recent finds">
      <div className="findshead"><h2>Recent finds</h2>{recent.length > 0 && <Link to="/journal">See all</Link>}</div>
      {recent.length === 0 ? (
        <div className="empty">
          <span aria-hidden="true">🌱</span>
          <p>Your first find shows up here.</p>
          <Link className="btn alt" to="/scanner">Scan something</Link>
        </div>
      ) : (
        <ul className="strip">
          {recent.map(d => (
            <li key={d.id}>
              <Link to="/map" className="find">
                {d.image ? <img src={d.image} alt="" loading="lazy" /> : <span className="ph" aria-hidden="true">{ICON[d.category] ?? ICON.other}</span>}
                <b>{d.speciesName}</b>
              </Link>
            </li>))}
        </ul>)}
    </section>)
}
