import { initializeApp, type FirebaseApp } from 'firebase/app'
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
      projectId: env.VITE_FIREBASE_PROJECT_ID || 'demo-jev',
      appId: env.VITE_FIREBASE_APP_ID,
    })
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
