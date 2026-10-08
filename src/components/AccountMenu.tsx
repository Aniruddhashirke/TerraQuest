import { useEffect, useState } from 'react'
import { useAuth } from '../features/auth/AuthProvider'

export default function AccountMenu() {
  const a = useAuth(), [open, setOpen] = useState(false)
  useEffect(() => {
    if (!open) return
    const close = () => setOpen(false)
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [open])
  const label = a.user?.name ?? 'Guest'
  return (
    <div className="acct">
      <button className="avatar" aria-haspopup="menu" aria-expanded={open} aria-label="Account"
        onClick={e => { e.stopPropagation(); setOpen(o => !o) }}>
        {a.user?.photo ? <img src={a.user.photo} alt="" referrerPolicy="no-referrer" /> : label.trim().charAt(0).toUpperCase()}
      </button>
      {open && (
        <div className="menu" role="menu" onClick={e => e.stopPropagation()}>
          <b>{label}</b>
          <small>{a.user ? a.user.detail : 'Data stays on this device'}</small>
          <button className="btn alt" role="menuitem" onClick={a.signOut}>{a.user ? 'Sign out' : 'Sign in'}</button>
        </div>)}
    </div>)
}
