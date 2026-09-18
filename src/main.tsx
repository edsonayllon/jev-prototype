import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/eb-garamond'
import '@fontsource-variable/eb-garamond/wght-italic.css'
import '@fontsource-variable/cormorant-garamond'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
