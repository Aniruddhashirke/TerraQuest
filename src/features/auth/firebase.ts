import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'

// Firebase web config is public by design (it identifies the project; security comes from Auth rules/authorized domains).
const e = (import.meta as any).env ?? {}
const cfg = { apiKey: e.VITE_FIREBASE_API_KEY, authDomain: e.VITE_FIREBASE_AUTH_DOMAIN, projectId: e.VITE_FIREBASE_PROJECT_ID, appId: e.VITE_FIREBASE_APP_ID }
export const authEnabled = !!(cfg.apiKey && cfg.authDomain && cfg.projectId && cfg.appId)
export const auth = authEnabled ? getAuth(initializeApp(cfg)) : null
