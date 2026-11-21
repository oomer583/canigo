import { useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, CircleMarker, useMap } from 'react-leaflet'
import { placesNear, hasToken } from './sources/accessibilityCloud.js'
import { osmNear } from './sources/osm.js'
import { listCities, loadCity, saveCity, loadPack, packNear, inside } from './sources/cityPack.js'
import { entrancePhoto, recordFromPhoto } from './sources/streetPhoto.js'
import { forProfile } from './verdict.js'
import { search, distanceMeters } from './geocode.js'
import { mergePlaces, nameKey } from './merge.js'
import { PROFILES, loadProfile, saveProfile } from './profiles.js'

const COLORS = { yes: '#1f8a4c', partial: '#d99a12', no: '#c2352b', unknown: '#8a8f98' }
const OSM_STATUS = { yes: 'yes', limited: 'partial', no: 'no' }

function Recenter({ at }) {
  const map = useMap()
  useEffect(() => {
    if (at) map.setView([at.lat, at.lng], 18)
  }, [at, map])
  return null
}

function ProfilePicker({ current, onPick }) {
  return (
    <div className="picker">
      <h2>How do you get around?</h2>
      <p>CanIGo checks doors and steps against what you need. You can change this any time.</p>
      <div className="choices">
        {PROFILES.map((p) => (
          <button key={p.id} className={current?.id === p.id ? 'choice on' : 'choice'} onClick={() => onPick(p)}>
            <strong>{p.label}</strong>
            <span>
              Door at least {p.widthCm} cm · {p.steps === 0 ? 'no steps' : `up to ${p.steps} step${p.steps > 1 ? 's' : ''}`}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

function CityPicker({ current, onPick }) {
  const [cities, setCities] = useState(null)
  useEffect(() => {
    listCities().then(setCities).catch(() => setCities([]))
  }, [])
  return (
    <div className="picker">
      <h2>Which city do you live in?</h2>
      <p>CanIGo saves that city's entrance data on your phone, so answers come fast and work offline. Other places still work online.</p>
      {cities === null && <p className="hint">Loading cities…</p>}
      <div className="choices">
        {(cities || []).map((c) => (
          <button key={c.id} className={current?.id === c.id ? 'choice on' : 'choice'} onClick={() => onPick(c)}>
            <strong>{c.name}</strong>
            <span>{c.country} · {c.count.toLocaleString('en')} places and entrances · {Math.max(1, Math.round(c.bytes / 1e6))} MB</span>
          </button>
        ))}
        <button className="choice" onClick={() => onPick(null)}>
          <strong>My city is not listed</strong>
          <span>Use online sources only</span>
        </button>
      </div>
    </div>
  )
}

// Pick the accessibility record that belongs to the place the user searched for.
function matchPlace(groups, target) {
  const key = nameKey(target.name)
  const named = groups.filter((g) => {
    const k = nameKey(g.name)
    return key && k && (k.includes(key) || key.includes(k))
  })
  const pool = named.length ? named : groups.filter((g) => distanceMeters(g, target) <= 25)
  return pool.sort((a, b) => distanceMeters(a, target) - distanceMeters(b, target))[0] || null
}

function askText(profile, placeName) {
  const steps = profile.steps === 0 ? 'I cannot use steps' : `I can manage up to ${profile.steps} step${profile.steps > 1 ? 's' : ''}`
  return `Hello! I would like to visit ${placeName}. I use a ${profile.label.toLowerCase()} and need a door at least ${profile.widthCm} cm wide. ${steps}. Is your entrance step-free, and how wide is the door? Thank you!`
}

function Answer({ place, profile, photo }) {
  const v = forProfile(place.records, profile)
  const [copied, setCopied] = useState(false)
  const directions = `https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}&travelmode=transit`
  const question = askText(profile, place.name)
  async function copy() {
    try {
      await navigator.clipboard.writeText(question)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }
  return (
    <article className="answer-card">
      <h2>{place.name}</h2>
      <div className={`answer ${v.tone}`} role="status">
        <span className="dot" aria-hidden="true" />
        <strong>{v.title}</strong>
      </div>
      {v.reasons.map((r) => (
        <p key={r} className="detail">{r}</p>
      ))}
      {v.headline?.detail && <p className="detail">{v.headline.detail}</p>}
      {v.conflict && (
        <p className="conflict">
          {v.undated ? 'Some sources say yes, some say no, and none is dated. Ask them before you go.' : 'Sources disagree. The newest one leads; check the others below.'}
        </p>
      )}
      {v.status === 'unknown' && <p className="detail">No source has checked this entrance yet.</p>}
      {place.records.length > 0 && (
        <ul className="sources">
          {[v.headline, ...v.others].filter(Boolean).map((r, i) => (
            <li key={i}>
              <span className="dot" style={{ background: COLORS[r.status] }} aria-hidden="true" />{' '}
              <a href={r.sourceUrl} target="_blank" rel="noreferrer">{r.source}</a>
              {r.updatedAt ? `, ${String(r.updatedAt).slice(0, 10)}` : ''}
            </li>
          ))}
        </ul>
      )}
      {photo === 'loading' && <p className="hint small">Looking for a street photo of the entrance…</p>}
      {photo && photo !== 'loading' && photo.photo && (
        <figure className="photo">
          <img src={photo.photo.url} alt={`Street photo near ${place.name}`} loading="lazy" />
          <figcaption>
            {photo.ai && !photo.ai.error && (
              <span className="ai">
                AI reading: steps {photo.ai.steps}, ramp {photo.ai.ramp}.{photo.ai.note ? ` ${photo.ai.note}` : ''}
              </span>
            )}
            <span>
              Photo {photo.photo.capturedAt.slice(0, 10)}{photo.photo.author ? ` by ${photo.photo.author}` : ''},{' '}
              <a href={photo.photo.page} target="_blank" rel="noreferrer">Mapillary</a>, CC BY-SA 4.0. AI can be wrong; look at the photo yourself.
            </span>
          </figcaption>
        </figure>
      )}
      <div className="actions">
        <a className="button" href={directions} target="_blank" rel="noreferrer">Directions</a>
        {(v.tone !== 'yes' || v.conflict) && (
          <details className="ask" open={v.conflict || v.aiOnly || v.status === 'unknown'}>
            <summary>Ask them before you go</summary>
            <p className="question">{question}</p>
            <div className="ask-actions">
              <button onClick={copy}>{copied ? 'Copied' : 'Copy message'}</button>
              {place.phone && <a className="button ghost" href={`tel:${place.phone.replace(/\s/g, '')}`}>Call {place.phone}</a>}
            </div>
          </details>
        )}
      </div>
    </article>
  )
}

export default function App() {
  const [profile, setProfile] = useState(() => loadProfile())
  const [picking, setPicking] = useState(() => !loadProfile())
  const [city, setCity] = useState(() => loadCity())
  const [pickingCity, setPickingCity] = useState(false)
  const [query, setQuery] = useState('')
  const [state, setState] = useState('idle') // idle | loading | done | error
  const [error, setError] = useState('')
  const [place, setPlace] = useState(null)
  const [nearby, setNearby] = useState([])
  const [photo, setPhoto] = useState(null)
  const abortRef = useRef(null)

  function pick(p) {
    const first = !profile
    setProfile(p)
    saveProfile(p)
    setPicking(false)
    if (first && !city) setPickingCity(true)
  }

  function pickCity(c) {
    setCity(c)
    saveCity(c)
    setPickingCity(false)
    if (c) loadPack(c.id).catch(() => {})
  }

  useEffect(() => {
    if (city) loadPack(city.id).catch(() => {})
  }, [city])

  async function onSearch(e) {
    e.preventDefault()
    if (!query.trim()) return
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl
    setState('loading')
    setPlace(null)
    setPhoto(null)
    try {
      const [target] = await search(query, ctrl.signal)
      if (!target) {
        setError('No place found with that name. Try adding the city.')
        setState('error')
        return
      }
      const [ac, osm] = await Promise.allSettled([
        hasToken ? placesNear(target.lat, target.lng, 80, ctrl.signal) : Promise.resolve([]),
        city && inside(city, target.lat, target.lng)
          ? loadPack(city.id).then((pack) => packNear(pack, target.lat, target.lng, 60))
          : Promise.race([
              osmNear(target.lat, target.lng, 60, ctrl.signal),
              new Promise((_, reject) => setTimeout(() => reject(new Error('osm-timeout')), 6000))
            ])
      ])
      if (ctrl.signal.aborted) return
      const acPlaces = ac.status === 'fulfilled' ? ac.value : []
      const osmData = osm.status === 'fulfilled' ? osm.value : { places: [], entrances: [] }
      const groups = mergePlaces([...osmData.places, ...acPlaces])
      const match = matchPlace(groups, target)
      const records = match ? [...match.records] : []
      const at = match || target
      const entrance = osmData.entrances
        .filter((e) => distanceMeters(e, at) <= 30 && (e.doorWidthCm != null || e.steps != null || e.status !== 'unknown' || e.detail))
        .sort((a, b) => (b.main - a.main) || distanceMeters(a, at) - distanceMeters(b, at))[0]
      if (entrance) {
        records.push({
          source: entrance.main ? 'OpenStreetMap (main entrance)' : 'OpenStreetMap (entrance)',
          sourceUrl: entrance.url,
          status: entrance.status,
          detail: entrance.detail,
          doorWidthCm: entrance.doorWidthCm,
          steps: entrance.steps,
          updatedAt: entrance.updatedAt
        })
      }
      if (osm.status !== 'fulfilled' && target.osmWheelchair && OSM_STATUS[target.osmWheelchair]) {
        records.push({ source: 'OpenStreetMap', sourceUrl: 'https://www.openstreetmap.org', status: OSM_STATUS[target.osmWheelchair], detail: null, updatedAt: null, doorWidthCm: null, steps: null })
      }
      setPlace({
        name: match?.name || target.name,
        lat: match?.lat ?? target.lat,
        lng: match?.lng ?? target.lng,
        phone: match?.phone || target.phone,
        records
      })
      setNearby(groups.filter((g) => g !== match))
      setState('done')
      setPhoto('loading')
      const at2 = { lat: match?.lat ?? target.lat, lng: match?.lng ?? target.lng }
      entrancePhoto(at2.lat, at2.lng, ctrl.signal)
        .then((result) => {
          if (ctrl.signal.aborted) return
          setPhoto(result)
          const rec = recordFromPhoto(result)
          if (rec) setPlace((p) => (p ? { ...p, records: [...p.records, rec] } : p))
        })
        .catch(() => !ctrl.signal.aborted && setPhoto(null))
    } catch (err) {
      if (err.name === 'AbortError') return
      setError(err.message)
      setState('error')
    }
  }

  return (
    <div className="app">
      <header>
        <div className="brand">
          <h1>CanIGo</h1>
          <p>Know if you can get in, before you go.</p>
        </div>
        {profile && !picking && !pickingCity && (
          <div className="chips">
            <button className="profile-chip" onClick={() => setPicking(true)}>
              {profile.label} · change
            </button>
            <button className="profile-chip" onClick={() => setPickingCity(true)}>
              {city ? city.name : 'No city'} · change
            </button>
          </div>
        )}
      </header>

      {picking ? (
        <ProfilePicker current={profile} onPick={pick} />
      ) : pickingCity ? (
        <CityPicker current={city} onPick={pickCity} />
      ) : (
        <main className="flow">
          <form onSubmit={onSearch} role="search" className="search">
            <label htmlFor="q">Where do you want to go?</label>
            <div className="row">
              <input id="q" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="e.g. Rijksmuseum Amsterdam" autoComplete="off" />
              <button type="submit">Check</button>
            </div>
          </form>

          <section aria-live="polite">
            {!hasToken && <p className="warn">Developer note: add your accessibility.cloud token to <code>.env</code>.</p>}
            {state === 'idle' && <p className="hint">Type the name of a café, shop, museum or office. CanIGo tells you if its entrance works for you.</p>}
            {state === 'loading' && <p className="hint">Checking the entrance…</p>}
            {state === 'error' && <p className="warn">{error}</p>}
            {state === 'done' && place && <Answer place={place} profile={profile} photo={photo} />}
          </section>

          {state === 'done' && place && (
            <div className="mini-map">
              <MapContainer center={[place.lat, place.lng]} zoom={18} className="map" scrollWheelZoom={false}>
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Recenter at={place} />
                {nearby.map((g) => (
                  <CircleMarker key={g.id} center={[g.lat, g.lng]} radius={5} pathOptions={{ color: '#fff', weight: 1, fillColor: COLORS[forProfile(g.records, profile).tone], fillOpacity: 0.7 }} />
                ))}
                <CircleMarker center={[place.lat, place.lng]} radius={12} pathOptions={{ color: '#15201b', weight: 3, fillColor: COLORS[forProfile(place.records, profile).tone], fillOpacity: 1 }} />
              </MapContainer>
            </div>
          )}
        </main>
      )}
    </div>
  )
}
