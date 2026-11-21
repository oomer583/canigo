import { useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, CircleMarker, useMapEvents, useMap } from 'react-leaflet'
import { placesNear, hasToken } from './sources/accessibilityCloud.js'
import { combine, STATUS } from './verdict.js'
import { search, distanceMeters } from './geocode.js'

const START = { lat: 52.3731, lng: 4.8926 } // Amsterdam, where open accessibility data is rich
const COLORS = { yes: '#1f8a4c', partial: '#d99a12', no: '#c2352b', unknown: '#8a8f98' }

function ClickToSearch({ onPick }) {
  useMapEvents({ click: (e) => onPick({ lat: e.latlng.lat, lng: e.latlng.lng }) })
  return null
}

function FlyTo({ target }) {
  const map = useMap()
  useEffect(() => {
    if (target) map.flyTo([target.lat, target.lng], 18, { duration: 0.8 })
  }, [target, map])
  return null
}

function Verdict({ place, onBack }) {
  const v = combine([place.record])
  const s = STATUS[v.status]
  const directions = `https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}&travelmode=transit`
  return (
    <div className="verdict">
      <button className="link" onClick={onBack}>← All places here</button>
      <h2>{place.name}</h2>
      <div className={`answer ${s.tone}`} role="status">
        <span className="dot" aria-hidden="true" />
        <strong>{s.label}</strong>
      </div>
      {v.headline?.detail && <p className="detail">{v.headline.detail}</p>}
      {v.conflict && <p className="conflict">Sources disagree. The newest one is shown first.</p>}
      <ul className="sources">
        {[v.headline, ...v.others].filter(Boolean).map((r, i) => (
          <li key={i}>
            Source: <a href={r.sourceUrl} target="_blank" rel="noreferrer">{r.source}</a>
            {r.updatedAt ? `, updated ${r.updatedAt.slice(0, 10)}` : ''}
          </li>
        ))}
      </ul>
      {v.status === 'unknown' && (
        <p className="detail">No source has checked this entrance yet.</p>
      )}
      <a className="button" href={directions} target="_blank" rel="noreferrer">
        Directions in Google Maps
      </a>
    </div>
  )
}

export default function App() {
  const [point, setPoint] = useState(null)
  const [places, setPlaces] = useState([])
  const [selected, setSelected] = useState(null)
  const [state, setState] = useState('idle') // idle | loading | done | error
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [flyTarget, setFlyTarget] = useState(null)
  const abortRef = useRef(null)

  async function lookAround(p) {
    setPoint(p)
    setSelected(null)
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl
    setState('loading')
    try {
      const found = await placesNear(p.lat, p.lng, 150, ctrl.signal)
      found.sort((a, b) => distanceMeters(p, a) - distanceMeters(p, b))
      setPlaces(found)
      setState('done')
    } catch (e) {
      if (e.name === 'AbortError') return
      setError(e.message === 'missing-token' ? 'missing-token' : e.message)
      setState('error')
    }
  }

  async function onSearch(e) {
    e.preventDefault()
    if (!query.trim()) return
    try {
      const [first] = await search(query)
      if (!first) return setError('No match for that address.'), setState('error')
      setFlyTarget(first)
      lookAround(first)
    } catch (err) {
      setError(err.message)
      setState('error')
    }
  }

  return (
    <div className="app">
      <header>
        <h1>CanIGo</h1>
        <p>Know if you can get in, before you go.</p>
        <form onSubmit={onSearch} role="search">
          <label className="sr-only" htmlFor="q">Search an address or place</label>
          <input id="q" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search a place, or tap the map" />
          <button type="submit">Search</button>
        </form>
      </header>

      <main>
        <MapContainer center={[START.lat, START.lng]} zoom={16} className="map">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickToSearch onPick={lookAround} />
          <FlyTo target={flyTarget} />
          {places.map((pl) => (
            <CircleMarker
              key={pl.id}
              center={[pl.lat, pl.lng]}
              radius={selected?.id === pl.id ? 11 : 8}
              pathOptions={{ color: '#fff', weight: 2, fillColor: COLORS[pl.record.status], fillOpacity: 1 }}
              eventHandlers={{ click: () => setSelected(pl) }}
            />
          ))}
        </MapContainer>

        <section className="panel" aria-live="polite">
          {!hasToken && (
            <p className="warn">Developer note: add your accessibility.cloud token to <code>.env</code> (see <code>.env.example</code>).</p>
          )}
          {state === 'idle' && <p>Tap a spot on the map or search for a place to see which entrances you can use.</p>}
          {state === 'loading' && <p>Checking accessibility data…</p>}
          {state === 'error' && <p className="warn">{error === 'missing-token' ? 'The data source is not connected yet.' : error}</p>}
          {state === 'done' && selected && <Verdict place={selected} onBack={() => setSelected(null)} />}
          {state === 'done' && !selected && (
            places.length === 0 ? (
              <p>No places with data within 150 m. Try another spot.</p>
            ) : (
              <ul className="places">
                {places.map((pl) => (
                  <li key={pl.id}>
                    <button onClick={() => setSelected(pl)}>
                      <span className="dot" style={{ background: COLORS[pl.record.status] }} aria-hidden="true" />
                      <span className="name">{pl.name}</span>
                      <span className="tag">{STATUS[pl.record.status].label}</span>
                      {point && <span className="dist">{Math.round(distanceMeters(point, pl))} m</span>}
                    </button>
                  </li>
                ))}
              </ul>
            )
          )}
        </section>
      </main>
    </div>
  )
}
