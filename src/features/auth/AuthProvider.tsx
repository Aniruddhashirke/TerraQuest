import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react'
import {
  onAuthStateChanged, signInWithPopup, signInWithRedirect, GoogleAuthProvider, RecaptchaVerifier,
  signInWithPhoneNumber, signOut as fbSignOut, type ConfirmationResult
} from 'firebase/auth'
import { auth, authEnabled } from './firebase'

export interface Account { name: string; detail: string; photo?: string }
interface Ctx {
  ready: boolean; enabled: boolean; user: Account | null; guest: boolean
  google(): Promise<void>
  sendCode(e164: string): Promise<void>      // needs <div id="recaptcha-container"> on screen
  verifyCode(code: string): Promise<void>
  continueAsGuest(): void
  signOut(): Promise<void>
}
const AuthCtx = createContext<Ctx>(null!)
export const useAuth = () => useContext(AuthCtx)

const GUEST_KEY = 'naturelens.guest'
const readGuest = () => { try { return localStorage.getItem(GUEST_KEY) === '1' } catch { return false } }
const writeGuest = (on: boolean) => { try { on ? localStorage.setItem(GUEST_KEY, '1') : localStorage.removeItem(GUEST_KEY) } catch { /* private mode: guest just won't persist */ } }

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(!authEnabled)
  const [user, setUser] = useState<Account | null>(null)
  const [guest, setGuest] = useState(readGuest)
  const verifier = useRef<RecaptchaVerifier | null>(null)
  const confirmation = useRef<ConfirmationResult | null>(null)

  // Firebase restores the saved session from IndexedDB, so this also fires when offline.
  useEffect(() => {
    if (!auth) return
    return onAuthStateChanged(auth, u => {
      setUser(u ? { name: u.displayName || u.phoneNumber || u.email || 'Explorer', detail: u.email || u.phoneNumber || '', photo: u.photoURL ?? undefined } : null)
      if (u) { writeGuest(false); setGuest(false) }
      setReady(true)
    })
  }, [])

  const value: Ctx = {
    ready, enabled: authEnabled, user, guest,
    async google() {
      if (!auth) throw new Error('not-configured')
      const provider = new GoogleAuthProvider()
      try { await signInWithPopup(auth, provider) }
      catch (e: any) {
        // Installed PWAs / some mobile browsers block popups: fall back to a full-page redirect
        if (e?.code === 'auth/popup-blocked' || e?.code === 'auth/operation-not-supported-in-this-environment') await signInWithRedirect(auth, provider)
        else throw e
      }
    },
    async sendCode(e164) {
      if (!auth) throw new Error('not-configured')
      if (!verifier.current) verifier.current = new RecaptchaVerifier(auth, 'recaptcha-container', { size: 'invisible' })
      try { confirmation.current = await signInWithPhoneNumber(auth, e164, verifier.current) }
      catch (e) { verifier.current.clear(); verifier.current = null; throw e }
    },
    async verifyCode(code) {
      if (!confirmation.current) throw Object.assign(new Error('no code requested'), { code: 'auth/code-expired' })
      await confirmation.current.confirm(code)
    },
    continueAsGuest() { writeGuest(true); setGuest(true) },
    async signOut() {
      writeGuest(false); setGuest(false)
      confirmation.current = null
      if (auth) await fbSignOut(auth)
    }
  }
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>
}
