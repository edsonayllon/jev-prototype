import { initializeApp, type FirebaseApp } from 'firebase/app'
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check'
import { connectFunctionsEmulator, getFunctions, type Functions } from 'firebase/functions'

const env = import.meta.env

export const useEmulators = env.VITE_USE_EMULATORS === 'true'

/** True once .env has a real project, or when running against the emulators. */
export const isFirebaseConfigured = Boolean(env.VITE_FIREBASE_PROJECT_ID) || useEmulators

let app: FirebaseApp | null = null
let fns: Functions | null = null

export function firebaseApp(): FirebaseApp {
  if (!app) {
    app = initializeApp({
      apiKey: env.VITE_FIREBASE_API_KEY || 'demo-api-key',
      projectId: env.VITE_FIREBASE_PROJECT_ID || 'demo-tideline',
      appId: env.VITE_FIREBASE_APP_ID,
    })
    // App Check: the deployed function rejects calls without a reCAPTCHA Enterprise token.
    // Skipped against the emulators, which do not enforce it.
    const siteKey = env.VITE_RECAPTCHA_ENTERPRISE_SITE_KEY
    if (siteKey && !useEmulators) {
      initializeAppCheck(app, {
        provider: new ReCaptchaEnterpriseProvider(siteKey),
        isTokenAutoRefreshEnabled: true,
      })
    }
  }
  return app
}

export function functions(): Functions {
  if (!fns) {
    fns = getFunctions(firebaseApp(), 'us-central1')
    if (useEmulators) connectFunctionsEmulator(fns, '127.0.0.1', 5001)
  }
  return fns
}
