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
import { askText, LANGS, defaultLang } from './ask.js'
import { CATEGORIES, detectCategory } from './categories.js'
import { findNearby, currentPosition } from './nearby.js'

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


function Answer({ place, profile, photo, city }) {
  const v = forProfile(place.records, profile)
  const [copied, setCopied] = useState(false)
  const [lang, setLang] = useState(() => defaultLang(city))
  const directions = `https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}&travelmode=transit`
  const question = askText(profile, place.name, lang)
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
            {photo.ai && !photo.ai.error && photo.ai.door === 'no' && (
              <span className="ai">AI could not see the entrance in this photo.</span>
            )}
            {photo.ai && !photo.ai.error && photo.ai.door !== 'no' && (
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
            <div className="langs" role="group" aria-label="Message language">
              {LANGS.map((l) => (
                <button key={l.id} className={l.id === lang ? 'lang on' : 'lang'} onClick={() => { setLang(l.id); setCopied(false) }}>
                  {l.label}
                </button>
              ))}
            </div>
            <p className="question" lang={lang}>{question}</p>
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
  const [list, setList] = useState(null) // { category, items, note } for "coffee near me"
  const abortRef = useRef(null)

  function loadPhoto(at, ctrl) {
    setPhoto('loading')
    entrancePhoto(at.lat, at.lng, ctrl.signal)
      .then((result) => {
        if (ctrl.signal.aborted) return
        setPhoto(result)
        const rec = recordFromPhoto(result)
        if (rec) setPlace((p) => (p ? { ...p, records: [...p.records, rec] } : p))
      })
      .catch(() => !ctrl.signal.aborted && setPhoto(null))
  }

  function freshRequest() {
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl
    return ctrl
  }

  async function runCategory(category) {
    const ctrl = freshRequest()
    setQuery(category.label)
    setState('loading')
    setPlace(null)
    setPhoto(null)
    setList(null)
    let at = await currentPosition()
    let note = ''
    if (!at && city) {
      at = { lat: (city.bbox[1] + city.bbox[3]) / 2, lng: (city.bbox[0] + city.bbox[2]) / 2 }
      note = `Showing places near the centre of ${city.name}. Allow location to see places near you.`
    }
    if (!at) {
      setError('Allow location, or choose your city, to find places near you.')
      setState('error')
      return
    }
    // The user may be away from their saved city: use whichever city pack covers where they are.
    let useCity = city
    if (!note && (!city || !inside(city, at.lat, at.lng))) {
      const here = (await listCities().catch(() => [])).find((c) => inside(c, at.lat, at.lng))
      if (here) {
        useCity = here
        note = city ? `You are in ${here.name}, not ${city.name}, so CanIGo is using ${here.name} data.` : ''
      } else {
        useCity = null
        note = city ? `You are outside ${city.name}. Only online sources are used here, so the list may be short.` : ''
      }
    }
    try {
      let items = await findNearby(category, at, { city: useCity, profile, signal: ctrl.signal })
      if (items.length === 0 && !ctrl.signal.aborted) {
        items = await findNearby(category, at, { city: useCity, profile, radius: 5000, signal: ctrl.signal })
        if (items.length) note = [note, 'Nothing checked within 1.2 km, so this list goes up to 5 km.'].filter(Boolean).join(' ')
      }
      if (ctrl.signal.aborted) return
      setList({ category, items, note })
      setState('list')
    } catch (err) {
      if (err.name === 'AbortError') return
      setError(err.message)
      setState('error')
    }
  }

  function openFromList(item) {
    const ctrl = freshRequest()
    setPlace({ name: item.name, lat: item.lat, lng: item.lng, phone: item.phone, records: [...item.records], fromList: true })
    setNearby(list.items.filter((i) => i.id !== item.id))
    setState('done')
    loadPhoto(item, ctrl)
  }

  function startOver() {
    try {
      localStorage.removeItem('canigo.profile')
      localStorage.removeItem('canigo.city')
    } catch {
      // nothing saved
    }
    location.reload()
  }

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
    const category = detectCategory(query)
    if (category) return runCategory(category)
    const ctrl = freshRequest()
    setList(null)
    setState('loading')
    setPlace(null)
    setPhoto(null)
    try {
      const near = city ? { lat: (city.bbox[1] + city.bbox[3]) / 2, lng: (city.bbox[0] + city.bbox[2]) / 2 } : null
      const [target] = await search(query, ctrl.signal, near)
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
      loadPhoto({ lat: match?.lat ?? target.lat, lng: match?.lng ?? target.lng }, ctrl)
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
            <div className="needs" role="group" aria-label="Find places near you">
              {CATEGORIES.map((c) => (
                <button type="button" key={c.id} className="need" onClick={() => runCategory(c)}>
                  {c.label}
                </button>
              ))}
            </div>
          </form>

          <section aria-live="polite">
            {!hasToken && <p className="warn">Developer note: add your accessibility.cloud token to <code>.env</code>.</p>}
            {state === 'idle' && <p className="hint">Type a place name, or tap what you need. CanIGo tells you if the entrance works for you.</p>}
            {state === 'loading' && <p className="hint">Checking the entrance…</p>}
            {state === 'error' && <p className="warn">{error}</p>}
            {state === 'list' && list && (
              <div className="list">
                <h2>{list.category.label} near you</h2>
                {list.note && <p className="hint small">{list.note}</p>}
                {list.items.length === 0 && (
                  <p className="hint">No {list.category.label.toLowerCase()} places with entrance information nearby yet. Places nobody has checked are not shown.</p>
                )}
                <ul>
                  {list.items.map((i) => (
                    <li key={i.id}>
                      <button className="row-item" onClick={() => openFromList(i)}>
                        <span className="dot" style={{ background: COLORS[i.verdict.tone] }} aria-hidden="true" />
                        <span className="row-text">
                          <strong>{i.name}</strong>
                          <span>{i.verdict.title} · {i.distance < 1000 ? `${i.distance} m` : `${(i.distance / 1000).toFixed(1)} km`}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
                <p className="hint small">Only places with entrance information are listed.</p>
              </div>
            )}
            {state === 'done' && place?.fromList && list && (
              <button className="button ghost back" onClick={() => { setState('list'); setPlace(null) }}>← Back to {list.category.label.toLowerCase()} list</button>
            )}
            {state === 'done' && place && <Answer key={place.name + place.lat} place={place} profile={profile} photo={photo} city={city} />}
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
          <footer className="foot">
            <button className="link" onClick={startOver}>Start over</button>
          </footer>
        </main>
      )}
    </div>
  )
}
