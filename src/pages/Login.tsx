import { FormEvent, useEffect, useState } from 'react'
import { useAuth } from '../features/auth/AuthProvider'

const CODES: [string, string][] = [['+91', 'India'], ['+1', 'US / Canada'], ['+44', 'UK'], ['+61', 'Australia'], ['+65', 'Singapore'], ['+971', 'UAE'], ['+49', 'Germany']]
const RESEND_S = 30

const MESSAGES: Record<string, string> = {
  'auth/invalid-phone-number': 'That phone number doesn’t look right.',
  'auth/missing-phone-number': 'Enter your phone number.',
  'auth/too-many-requests': 'Too many attempts. Please wait a while and try again.',
  'auth/quota-exceeded': 'SMS limit reached for now. Try Google sign-in or try later.',
  'auth/invalid-verification-code': 'Wrong code. Check the SMS and try again.',
  'auth/code-expired': 'That code expired. Request a new one.',
  'auth/network-request-failed': 'No internet connection. Sign-in needs a connection.',
  'auth/unauthorized-domain': 'This site’s domain isn’t authorised in Firebase (Authentication → Settings → Authorized domains).',
  'auth/operation-not-allowed': 'This sign-in method isn’t enabled in Firebase yet.',
  'auth/captcha-check-failed': 'Verification check failed. Reload and try again.'
}
const friendly = (e: any) => (e?.code === 'auth/popup-closed-by-user' || e?.code === 'auth/cancelled-popup-request') ? '' : MESSAGES[e?.code] ?? 'Something went wrong. Please try again.'

const GoogleG = () => (
  <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
  </svg>)

export default function Login() {
  const a = useAuth()
  const [step, setStep] = useState<'phone' | 'code'>('phone')
  const [cc, setCc] = useState('+91'), [num, setNum] = useState(''), [code, setCode] = useState('')
  const [busy, setBusy] = useState(false), [err, setErr] = useState(''), [wait, setWait] = useState(0)

  useEffect(() => {
    if (wait <= 0) return
    const t = setTimeout(() => setWait(w => w - 1), 1000)
    return () => clearTimeout(t)
  }, [wait])

  const digits = num.replace(/\D/g, '').replace(/^0+/, '')
  const phoneOk = cc === '+91' ? digits.length === 10 : digits.length >= 6 && digits.length <= 14
  const e164 = cc + digits

  async function run(fn: () => Promise<void>) {
    setBusy(true); setErr('')
    try { await fn() } catch (e) { setErr(friendly(e)) }
    setBusy(false)
  }
  const send = (e?: FormEvent) => { e?.preventDefault(); if (!phoneOk) return setErr('Enter a valid phone number.'); run(async () => { await a.sendCode(e164); setStep('code'); setCode(''); setWait(RESEND_S) }) }
  const verify = (e: FormEvent) => { e.preventDefault(); if (code.length !== 6) return setErr('Enter the 6-digit code.'); run(() => a.verifyCode(code)) }

  return (
    <div className="login">
      <img className="brand-logo" src="/terraquest-logo.jpeg" alt="TerraQuest logo" />
      <h1>TerraQuest</h1>
      <p className="tag">Explore. Scan. Discover.</p>

      {!a.enabled && <p className="warn">Sign-in isn’t set up yet. Add your Firebase keys (see README), or continue as a guest.</p>}

      <button className="btn alt gbtn" disabled={busy || !a.enabled} onClick={() => run(a.google)}><GoogleG /> Continue with Google</button>
      <div className="or"><span>or</span></div>

      {step === 'phone' ? (
        <form onSubmit={send}>
          <label htmlFor="phone">Phone number</label>
          <div className="phone">
            <select aria-label="Country code" value={cc} onChange={e => setCc(e.target.value)}>
              {CODES.map(([c, n]) => <option key={c} value={c}>{c} {n}</option>)}
            </select>
            <input id="phone" type="tel" inputMode="tel" autoComplete="tel-national" placeholder="98765 43210"
              value={num} onChange={e => setNum(e.target.value)} />
          </div>
          <button className="btn cta" type="submit" disabled={busy || !a.enabled || !phoneOk}>{busy ? 'Sending…' : 'Send code'}</button>
        </form>
      ) : (
        <form onSubmit={verify}>
          <label htmlFor="otp">Enter the 6-digit code sent to {cc} {digits}</label>
          <input id="otp" className="otp" type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} autoFocus
            placeholder="······" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))} />
          <button className="btn cta" type="submit" disabled={busy || code.length !== 6}>{busy ? 'Verifying…' : 'Verify and continue'}</button>
          <div className="alt-row">
            <button type="button" className="textbtn" onClick={() => { setStep('phone'); setErr('') }}>Change number</button>
            <button type="button" className="textbtn" disabled={busy || wait > 0} onClick={() => send()}>{wait > 0 ? `Resend in ${wait}s` : 'Resend code'}</button>
          </div>
        </form>)}

      <p className="err" role="alert" aria-live="polite">{err}</p>
      <div id="recaptcha-container" />

      <button className="textbtn guest" onClick={a.continueAsGuest}>Continue as guest</button>
      <small>Guest finds stay on this phone only.</small>
    </div>)
}
