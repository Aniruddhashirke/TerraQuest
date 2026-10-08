import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/database'
import { useSession } from '../features/activity/SessionProvider'
import { fmtKm, fmtMinutes } from '../utils/format'
import { buildContext } from '../features/missions/context'
import { pickMission } from '../features/missions/engine'
import { getWording, templateText } from '../features/missions/wording'
import { speak, listen, canListen, canSpeak } from '../features/voice/voice'
import { distanceBars, summarize, streakDays, WEEKLY_WALK_GOAL, type Period } from '../features/stats/stats'
import NearbyHero from '../components/NearbyHero'
import { BarChart } from '../components/BarChart'
import GoalRing from '../components/GoalRing'
import RecentFinds from '../components/RecentFinds'
import AccountMenu from '../components/AccountMenu'

const PERIODS: [Period, string][] = [['today', 'Today'], ['week', 'Week'], ['all', 'All time']]

export default function Dashboard() {
  const s = useSession(), nav = useNavigate()
  const discoveries = useLiveQuery(() => db.discoveries.toArray(), [], [])
  const missions = useLiveQuery(() => db.missions.toArray(), [], [])
  const sessions = useLiveQuery(() => db.explorationSessions.toArray(), [], [])
  const [period, setPeriod] = useState<Period>('today')
  const [skipped, setSkipped] = useState<string[]>([])
  const [heard, setHeard] = useState('')
  const ctx = buildContext(s, discoveries, missions)
  const type = pickMission(ctx, missions, skipped)
  const [text, setText] = useState(templateText(type, ctx))
  useEffect(() => { setText(templateText(type, ctx)); getWording(type, ctx).then(setText) }, [type])
  const xp = discoveries.length * 5 + ctx.completedMissions * 10

  const walking = s.status === 'ACTIVE' || s.status === 'PAUSED'
  const live = walking ? { distanceKm: s.distanceKm, activeMs: s.activeMs } : undefined
  const now = Date.now()
  const stats = summarize(sessions, discoveries, period, now, live)
  const week = period === 'week' ? stats : summarize(sessions, discoveries, 'week', now, live)
  const streak = streakDays(sessions, discoveries, now) // saved walks + finds; a live walk counts via the week ring
  const bars = period === 'today' ? null : distanceBars(sessions, period, now, live)

  const complete = () => db.missions.add({ type, title: type, description: text, status: 'completed', reward: 10, createdAt: Date.now(), completedAt: Date.now() })
  function command(t: string) {
    setHeard(t)
    if (t.includes('next')) speak(text)
    else if (t.includes('far')) speak(`You have walked ${s.distanceKm.toFixed(1)} kilometres.`)
    else if (t.includes('what is this')) nav('/scanner')
    else speak('Sorry, try: what is next, how far have I walked, or what is this.')
  }

  return (
    <>
      <header className="homehead">
        <div>
          <h1>Good {ctx.timeOfDay}</h1>
          <small>⭐ Explorer level {Math.floor(xp / 50) + 1} · {xp} XP</small>
        </div>
        <GoalRing done={week.walks} goal={WEEKLY_WALK_GOAL} streak={streak} />
        <AccountMenu />
      </header>

      <NearbyHero />

      <div className="seg" role="tablist" aria-label="Stats period">
        {PERIODS.map(([p, label]) => (
          <button key={p} role="tab" aria-selected={period === p} onClick={() => setPeriod(p)}>{label}</button>))}
      </div>

      {period === 'today' ? (
        <div className="tiles">
          <div className="card stat"><small>Walked</small><b>{fmtKm(stats.distanceKm)}</b></div>
          <div className="card stat"><small>Time</small><b>{fmtMinutes(stats.activeMin)}</b></div>
          <div className="card stat"><small>Finds</small><b>{stats.finds}</b></div>
        </div>
      ) : (
        <>
          <section className="card stat">
            <small>{period === 'week' ? 'Distance this week' : 'Distance, all time'}</small>
            <b>{fmtKm(stats.distanceKm)}</b>
            {bars && <BarChart bars={bars} />}
            {period === 'all' && <small className="cap">Bars show the last 7 months</small>}
          </section>
          <div className="duo">
            <div className="card stat"><small>Walks</small><b>{stats.walks}</b></div>
            <div className="card stat"><small>New species</small><b>{stats.newSpecies}</b></div>
          </div>
        </>
      )}

      <section className="card stat next">
        <small>What’s next</small>
        <b>{text}</b>
        <div className="chips">
          <button className="chip" onClick={complete}>✓ Done</button>
          <button className="chip" onClick={() => setSkipped(k => [...k, type])}>Skip</button>
          {canSpeak && <button className="chip" onClick={() => speak(text)}>🔊 Read</button>}
          {canListen && <button className="chip" onClick={() => listen(command, () => setHeard('Voice unavailable, use the buttons'))}>🎤 Ask</button>}
        </div>
        {heard && <small>Heard: {heard}</small>}
      </section>

      <Link className="btn cta" to="/explore">{walking ? 'Open session' : 'Start exploring'}</Link>

      <RecentFinds finds={discoveries} />
    </>
  )
}
