import type { ReactNode } from 'react'
import { NavLink, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './features/auth/AuthProvider'
import { SessionProvider } from './features/activity/SessionProvider'
import Dashboard from './pages/Dashboard'
import Explore from './pages/Explore'
import Scanner from './pages/Scanner'
import MapPage from './pages/MapPage'
import Journal from './pages/Journal'
import Login from './pages/Login'
import { HomeIcon, WalkIcon, CameraIcon, MapIcon, BookIcon } from './components/Icons'

const tabs: [string, ReactNode, string][] = [
  ['/', <HomeIcon />, 'Home'], ['/explore', <WalkIcon />, 'Explore'], ['/scanner', <CameraIcon />, 'Scan'],
  ['/map', <MapIcon />, 'Map'], ['/journal', <BookIcon />, 'Journal']]

function Shell() {
  const a = useAuth()
  if (!a.ready) return <div className="splash" role="status" aria-label="Loading" />
  if (!a.user && !a.guest) return <Login />
  return (
    <SessionProvider>
      <main>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/scanner" element={<Scanner />} />
          <Route path="/map" element={<MapPage />} />
          <Route path="/journal" element={<Journal />} />
        </Routes>
      </main>
      <nav aria-label="Main">
        <div className="navin">
          {tabs.map(([to, icon, label]) => (
            <NavLink key={to} to={to} end aria-label={label}>{icon}<span className="sr">{label}</span></NavLink>))}
        </div>
      </nav>
    </SessionProvider>
  )
}

export default function App() {
  return <AuthProvider><Shell /></AuthProvider>
}
