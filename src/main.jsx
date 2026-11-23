import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'leaflet/dist/leaflet.css'
import './styles.css'
import App from './App.jsx'
import { registerSW } from 'virtual:pwa-register'

// A new version replaces the old one as soon as it is ready, so nobody keeps using a stale build.
registerSW({ immediate: true })

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
)
