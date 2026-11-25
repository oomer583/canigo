import { useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, CircleMarker, useMap } from 'react-leaflet'
import { placesNear, hasToken } from './sources/accessibilityCloud.js'
import { osmNear } from './sources/osm.js'
import { listCities, loadCity, saveCity, loadPack, packNear, inside } from './sources/cityPack.js'
import { entrancePhoto, recordFromPhoto } from './sources/streetPhoto.js'
import { forProfile } from './verdict.js'
import { search, distanceMeters, withoutCity } from './geocode.js'
import { mergePlaces, nameKey } from './merge.js'
import { PROFILES, loadProfile, saveProfile } from './profiles.js'
import { askText, LANGS, defaultLang } from './ask.js'
import { CATEGORIES, detectCategory } from './categories.js'
import { findNearby, uncheckedNearby, currentPosition, searchCityPacks, alternativesNear, accessibleAround } from './nearby.js'
import { looksLikeSentence, understand } from './understand.js'
import { volunteerNear, sendVolunteer, reportWrong } from './sources/volunteer.js'
import { notCounted } from './stats.js'
import { t, UI_LANGS, loadLang, saveLang, setLanguage } from './i18n.js'

const COLORS = { yes: '#1f8a4c', partial: '#d99a12', no: '#c2352b', unknown: '#8a8f98' }
const OSM_STATUS = { yes: 'yes', limited: 'partial', no: 'no' }
// Not a category: every kind of place, only the ones this person can get into.
const AROUND = { id: 'around', label: 'Places you can get into', tags: [] }

function Recenter({ at }) {
  const map = useMap()
  useEffect(() => {
    if (at) map.setView([at.lat, at.lng], 18)
  }, [at, map])
  return null
}

function ProfilePicker({ current, onPick, onDemo, uiLang, onLang }) {
  return (
    <main className="picker">
      {!current && (
        <section className="intro">
          <LangPicker value={uiLang} onChange={onLang} />
          <h2>{t('Steps, ramps, door width: know before you go.')}</h2>
          <p className="why">{t("Map apps only say whether a place suits a wheelchair. CanIGo compares steps and door width with what you need, and shows where every answer comes from.")}</p>
          <ol>
            <li>{t('Tell CanIGo how you get around.')}</li>
            <li>{t('Pick your city.')}</li>
            <li>{t('Search a place, or tap what you need. It tells you if the entrance works for you.')}</li>
          </ol>
          <button className="button ghost" onClick={onDemo}>{t('Just looking? See an example in Amsterdam')}</button>
        </section>
      )}
      <h2>{t('How do you get around?')}</h2>
      <p>{t('CanIGo checks doors and steps against what you need. You can change this any time.')}</p>
      <div className="choices">
        {PROFILES.map((p) => (
          <button key={p.id} className={current?.id === p.id ? 'choice on' : 'choice'} onClick={() => onPick(p)}>
            <strong>{t(p.label)}</strong>
            <span>
              {t('Door at least {w} cm', { w: p.widthCm })} · {p.steps === 0 ? t('no steps') : p.steps === 1 ? t('up to 1 step') : t('up to {n} steps', { n: p.steps })}
            </span>
          </button>
        ))}
      </div>
    </main>
  )
}

function LangPicker({ value, onChange }) {
  return (
    <label className="lang-pick">
      <span aria-hidden="true">🌐</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={t('Language')}>
        {UI_LANGS.map((l) => (
          <option key={l.id} value={l.id}>{l.label}</option>
        ))}
      </select>
    </label>
  )
}

const fold = (s) => String(s).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/ı/g, 'i')

function CityPicker({ current, onPick }) {
  const [cities, setCities] = useState(null)
  const [find, setFind] = useState('')
  useEffect(() => {
    listCities().then((list) => setCities([...list].sort((a, b) => a.name.localeCompare(b.name)))).catch(() => setCities([]))
  }, [])
  const shown = (cities || []).filter((c) => !find.trim() || fold(`${c.name} ${c.country}`).includes(fold(find.trim())))
  return (
    <main className="picker">
      <h2>{t('Which city do you live in?')}</h2>
      <p>{t("CanIGo saves that city's entrance data on your phone, so answers come fast and work offline. Other places still work online.")}</p>
      {cities === null && <p className="hint">{t('Loading cities…')}</p>}
      {cities && cities.length > 8 && (
        <input className="city-search" type="search" value={find} onChange={(e) => setFind(e.target.value)} placeholder={t('Search for your city')} aria-label={t('Search for your city')} autoComplete="off" />
      )}
      {cities && find.trim() && shown.length === 0 && <p className="hint">{t('No city found.')}</p>}
      <div className="choices">
        {shown.map((c) => (
          <button key={c.id} className={current?.id === c.id ? 'choice on' : 'choice'} onClick={() => onPick(c)}>
            <strong>{c.name}</strong>
            <span>{c.country} · {t('{count} places and entrances', { count: c.count.toLocaleString('en') })} · {Math.max(1, Math.round(c.bytes / 1e6))} MB</span>
          </button>
        ))}
        <button className="choice" onClick={() => onPick(null)}>
          <strong>{t('My city is not listed')}</strong>
          <span>{t('Use online sources only')}</span>
        </button>
      </div>
    </main>
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


function VolunteerForm({ place, onAdded }) {
  const [open, setOpen] = useState(false)
  const [steps, setSteps] = useState('')
  const [ramp, setRamp] = useState('unknown')
  const [door, setDoor] = useState('')
  const [state, setState] = useState('idle') // idle | saving | done | error
  const [error, setError] = useState('')
  async function submit(e) {
    e.preventDefault()
    setState('saving')
    try {
      const rec = await sendVolunteer({ name: place.name, lat: place.lat, lng: place.lng, steps: steps === '' ? null : Number(steps), ramp, doorCm: door === '' ? null : Number(door) })
      onAdded(rec)
      setState('done')
    } catch (err) {
      setError(err.message)
      setState('error')
    }
  }
  if (state === 'done') return <p className="thanks">{t('Thank you. The next person who checks {name} will see what you added.', { name: place.name })}</p>
  if (!open) return <button className="link add-entrance" onClick={() => setOpen(true)}>{t('Been here? Add what the entrance is like')}</button>
  return (
    <form className="volunteer" onSubmit={submit}>
      <h3>{t('What is the entrance like?')}</h3>
      <p className="hint small">{t('Only add what you saw yourself. It will be shown as "Volunteer, not verified".')}</p>
      <fieldset>
        <legend>{t('Steps at the entrance (count)')}</legend>
        {[['0', t('None')], ['1', '1'], ['2', '2'], ['3', '3'], ['4', t('4 or more')], ['', t("Don't know")]].map(([v, l]) => (
          <label key={l} className={steps === v ? 'pill on' : 'pill'}>
            <input type="radio" name="steps" value={v} checked={steps === v} onChange={() => setSteps(v)} /> {l}
          </label>
        ))}
      </fieldset>
      <fieldset>
        <legend>{t('Ramp')}</legend>
        {[['yes', t('Yes')], ['no', t('No')], ['unknown', t("Don't know")]].map(([v, l]) => (
          <label key={v} className={ramp === v ? 'pill on' : 'pill'}>
            <input type="radio" name="ramp" value={v} checked={ramp === v} onChange={() => setRamp(v)} /> {l}
          </label>
        ))}
      </fieldset>
      <label className="door">
        {t('Door width in cm, if you measured it')}
        <input type="number" inputMode="numeric" min="40" max="300" value={door} onChange={(e) => setDoor(e.target.value)} placeholder={t('e.g. 85')} />
      </label>
      {state === 'error' && <p className="warn">{error}</p>}
      <div className="ask-actions">
        <button type="submit" disabled={state === 'saving'}>{state === 'saving' ? t('Saving…') : t('Add')}</button>
        <button type="button" className="button ghost" onClick={() => setOpen(false)}>{t('Cancel')}</button>
      </div>
    </form>
  )
}

function Answer({ place, profile, photo, city, onAdded, onWrong, onOpen }) {
  const v = forProfile(place.records, profile)
  const [copied, setCopied] = useState(false)
  const [alts, setAlts] = useState([])
  useEffect(() => {
    let live = true
    setAlts([])
    if (v.tone === 'no' && place.category) {
      alternativesNear(place, { city, profile }).then((a) => { if (live) setAlts(a) }).catch(() => {})
    }
    return () => { live = false }
  }, [place.name, place.lat, place.category, v.tone, profile?.id, city?.id]) // eslint-disable-line react-hooks/exhaustive-deps
  const [lang, setLang] = useState(() => defaultLang(city))
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
      {place.outside && <p className="hint small">{t('This place is outside {city}, so CanIGo checked online sources only.', { city: place.outside })}</p>}
      <div className={`answer ${v.tone}`} role="status">
        <span className="dot" aria-hidden="true" />
        <strong>{t(v.title)}</strong>
      </div>
      {v.reasons.map((r) => (
        <p key={r.key} className="detail">{t(r.key, r.vars?.source ? { ...r.vars, source: t(r.vars.source) } : r.vars)}</p>
      ))}
      {v.headline?.detail && <p className="detail">{v.headline.detail}</p>}
      {v.headline?.volunteer && <p className="conflict">{t('Added by a volunteer and not verified. Ask them before you go if you are unsure.')}</p>}
      {v.conflict && (
        <p className="conflict">
          {t('Sources from about the same time disagree. Ask them before you go.')}
        </p>
      )}
      {v.older && (
        <p className="detail">
          {t('An older source{year} said {what}. The newest information leads, because places change.', { year: v.older.updatedAt ? ` (${v.older.updatedAt.slice(0, 4)})` : '', what: t(v.older.status === 'yes' ? 'you could get in' : v.older.status === 'no' ? 'you could not get in' : 'it was partly accessible') })}
        </p>
      )}
      {v.status === 'unknown' && <p className="detail">{t('No source has checked this entrance yet.')}</p>}
      {place.records.length > 0 && (
        <ul className="sources">
          {[v.headline, ...v.others].filter(Boolean).map((r, i) => (
            <li key={i}>
              <span className="dot" style={{ background: COLORS[r.status] }} aria-hidden="true" />{' '}
              {r.sourceUrl ? <a href={r.sourceUrl} target="_blank" rel="noreferrer">{t(r.source)}</a> : <span>{t(r.source)}</span>}
              {r.updatedAt ? `, ${String(r.updatedAt).slice(0, 10)}` : ''}
              {r.volunteer && r.contribId != null && (
                <button className="link small" onClick={() => onWrong(r)}>{t('Wrong?')}</button>
              )}
            </li>
          ))}
        </ul>
      )}
      {photo === 'loading' && (
        <div className="skeleton photo-loading" role="status">
          <p className="loading-line small"><span className="spinner" aria-hidden="true" />{t('Looking for a street photo of the entrance…')}</p>
          <div className="bone photo" />
        </div>
      )}
      {photo && photo !== 'loading' && photo.photo && (
        <figure className="photo">
          <img src={photo.photo.url} alt={t('Street photo near {name}', { name: place.name })} loading="lazy" />
          <figcaption>
            {photo.ai && !photo.ai.error && photo.ai.door === 'no' && (
              <span className="ai">{t('AI could not see the entrance in this photo.')}</span>
            )}
            {photo.ai && !photo.ai.error && photo.ai.door !== 'no' && (
              <span className="ai">
                {t('AI reading: steps {steps}, ramp {ramp}.', { steps: photo.ai.steps, ramp: photo.ai.ramp })}{photo.ai.note ? ` ${photo.ai.note}` : ''}
              </span>
            )}
            <span>
              {photo.photo.author ? t('Photo {date} by {author}', { date: photo.photo.capturedAt.slice(0, 10), author: photo.photo.author }) : t('Photo {date}', { date: photo.photo.capturedAt.slice(0, 10) })},{' '}
              <a href={photo.photo.page} target="_blank" rel="noreferrer">Mapillary</a>, CC BY-SA 4.0. {t('AI can be wrong; look at the photo yourself.')}
            </span>
          </figcaption>
        </figure>
      )}
      {alts.length > 0 && (
        <div className="alternatives">
          <h3 className="subhead">{t('Places nearby you can get into')}</h3>
          <ul>
            {alts.map((i) => (
              <li key={i.id}>
                <button className="row-item" onClick={() => onOpen(i)}>
                  <span className="dot" style={{ background: COLORS[i.verdict.tone] }} aria-hidden="true" />
                  <span className="row-text">
                    <strong>{i.name}</strong>
                    <span>{t(i.verdict.title)} · {distanceMeters(i, place) < 1000 ? `${Math.round(distanceMeters(i, place))} m` : `${(distanceMeters(i, place) / 1000).toFixed(1)} km`}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="actions">
        {(v.tone !== 'yes' || v.conflict) && (
          <details className="ask" open={v.conflict || v.aiOnly || v.status === 'unknown'}>
            <summary>{t('Ask them before you go')}</summary>
            <div className="langs" role="group" aria-label={t('Message language')}>
              {LANGS.map((l) => (
                <button key={l.id} className={l.id === lang ? 'lang on' : 'lang'} onClick={() => { setLang(l.id); setCopied(false) }}>
                  {l.label}
                </button>
              ))}
            </div>
            <p className="question" lang={lang}>{question}</p>
            <div className="ask-actions">
              <button onClick={copy}>{copied ? t('Copied') : t('Copy message')}</button>
              {place.phone && <a className="button ghost" href={`tel:${place.phone.replace(/\s/g, '')}`}>{t('Call {phone}', { phone: place.phone })}</a>}
            </div>
          </details>
        )}
        <VolunteerForm key={place.name + place.lat} place={place} onAdded={onAdded} />
      </div>
    </article>
  )
}

export default function App() {
  const [uiLang, setUiLang] = useState(() => loadLang())
  setLanguage(uiLang)
  useEffect(() => {
    document.documentElement.lang = uiLang
  }, [uiLang])
  function changeLang(id) {
    setUiLang(id)
    saveLang(id)
  }
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

  function addRecord(rec) {
    setPlace((p) => (p ? { ...p, records: [...p.records, rec] } : p))
  }

  async function markWrong(rec) {
    await reportWrong(rec.contribId).catch(() => {})
    setPlace((p) => (p ? { ...p, records: p.records.filter((r) => r !== rec) } : p))
  }

  function loadPhoto(at, ctrl) {
    volunteerNear(at, ctrl.signal)
      .then((recs) => !ctrl.signal.aborted && recs.forEach(addRecord))
      .catch(() => {})
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

  async function runCategory(category, { inCity = false, km = null, understood = null } = {}) {
    const ctrl = freshRequest()
    if (!understood) setQuery(category.id === 'around' ? '' : t(category.label))
    setState('loading')
    setPlace(null)
    setPhoto(null)
    setList(null)
    let at = inCity ? null : await currentPosition()
    if (at) at.fromGps = true
    let note = ''
    if (!at && city) {
      at = { lat: (city.bbox[1] + city.bbox[3]) / 2, lng: (city.bbox[0] + city.bbox[2]) / 2 }
      note = inCity ? t('Showing places near the centre of {city}.', { city: city.name }) : t('Showing places near the centre of {city}. Allow location to see places near you.', { city: city.name })
    }
    if (!at) {
      setError(t('Allow location, or choose your city, to find places near you.'))
      setState('error')
      return
    }
    // The chosen city always wins: away from it, search its centre instead of where the user is.
    // "Near me" means near the user. Away from the chosen city, use the CanIGo city they are in;
    // outside every CanIGo city, use online sources around them. Never a list from another country.
    let useCity = city
    if (city && at.fromGps && !inside(city, at.lat, at.lng)) {
      const here = (await listCities().catch(() => [])).find((c) => inside(c, at.lat, at.lng))
      useCity = here || null
      note = here
        ? t('You are in {city}, so this list uses {city}.', { city: here.name })
        : t('You are not in a CanIGo city, so this list uses online sources only.')
    }
    try {
      const suits = (p) => forProfile(p.records, profile).tone !== 'no'
      if (understood) note = [km ? t('Understood as: {category} within {km} km.', { category: t(category.label), km }) : t('Understood as: {category}.', { category: t(category.label) }), note].filter(Boolean).join(' ')
      const fetchList = (radius) => category.id === 'around'
        ? accessibleAround(at, { city: useCity, profile, radius, signal: ctrl.signal })
        : findNearby(category, at, { city: useCity, profile, radius, signal: ctrl.signal })
      let items = await fetchList(km ? km * 1000 : undefined)
      // Nothing close: widen step by step, and say so. A distance the user gave is kept.
      // Far away, only places you can get into are worth listing: a red place 24 km away helps nobody.
      for (const step of km ? [] : [5, 25]) {
        if (items.length || ctrl.signal.aborted) break
        items = (await fetchList(step * 1000)).filter(suits)
        if (items.length) note = [note, t('Nothing checked close to you, so this list goes up to {km} km and shows only places that work for you.', { km: step })].filter(Boolean).join(' ')
      }
      if (ctrl.signal.aborted) return
      const unchecked = category.id === 'around' ? [] : await uncheckedNearby(category, at, { city: useCity, checked: items, radius: km ? km * 1000 : undefined })
      if (ctrl.signal.aborted) return
      setList({ category, items, unchecked, note, km, centre: inCity || !at.fromGps ? null : city, nearMe: !!at.fromGps })
      setState('list')
    } catch (err) {
      if (err.name === 'AbortError') return
      setError(err.message)
      setState('error')
    }
  }

  // From "Places nearby you can get into" on a red answer.
  function openAlternative(item) {
    const ctrl = freshRequest()
    setPlace({ name: item.name, lat: item.lat, lng: item.lng, phone: item.phone, category: item.category, records: [...item.records] })
    setQuery(item.name)
    setNearby([])
    setState('done')
    loadPhoto(item, ctrl)
  }

  function openFromList(item) {
    const ctrl = freshRequest()
    setPlace({ name: item.name, lat: item.lat, lng: item.lng, phone: item.phone, category: item.category, records: [...item.records], fromList: true })
    setNearby([...list.items, ...(list.unchecked || [])].filter((i) => i.id !== item.id))
    setState('done')
    loadPhoto(item, ctrl)
  }


  // One tap for judges and first-time visitors: walker, Amsterdam, Anne Frank Huis.
  const [demo, setDemo] = useState(false)
  function startDemo() {
    const p = PROFILES.find((x) => x.id === 'walker') || PROFILES[0]
    const ams = { id: 'amsterdam', name: 'Amsterdam', country: 'Netherlands', bbox: [4.72, 52.27, 5.08, 52.43] }
    setProfile(p)
    saveProfile(p)
    setCity(ams)
    saveCity(ams)
    setPicking(false)
    setPickingCity(false)
    setQuery('Anne Frank Huis')
    setDemo(true)
  }
  useEffect(() => {
    if (demo && city?.id === 'amsterdam' && query === 'Anne Frank Huis') {
      setDemo(false)
      onSearch({ preventDefault() {} })
    }
  }, [demo, city, query]) // eslint-disable-line react-hooks/exhaustive-deps

  function startOver() {
    // Back to the first screen. The chosen language stays.
    try {
      localStorage.removeItem('canigo.profile')
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
    let name = query
    // A sentence the word match can't read: AI turns it into a category or a place name.
    if (looksLikeSentence(query)) {
      const intent = await understand(query, ctrl.signal)
      if (ctrl.signal.aborted) return
      if (intent?.category) return runCategory(intent.category, { km: intent.km, understood: query })
      if (intent?.name) name = intent.name
    }
    try {
      // If the geocoder is down or unreachable, fall back to the city packs instead of failing.
      let [target] = await search(name, ctrl.signal, city).catch((e) => {
        if (ctrl.signal.aborted) throw e
        return []
      })
      if (!target && city) target = await searchCityPacks(city, withoutCity(name, city.name))
      // Not in the chosen city: look everywhere, so a place in another town can still be checked
      // (with online sources) and a volunteer who went there can still add its entrance.
      let outside = null
      if (!target && city) {
        const [far] = await search(name, ctrl.signal, null).catch(() => [])
        if (far) { target = far; outside = city.name }
      }
      if (!target) {
        setError(city ? t('No place with that name found in {city}. Check the spelling, or change the city at the top.', { city: city.name }) : t('No place found with that name. Try adding the city.'))
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
        category: match?.category || target.category || null,
        outside,
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
          <p>{t('Know if you can get in, before you go.')}</p>
        </div>
        {profile && !picking && !pickingCity && (
          <div className="chips">
            <button className="profile-chip" onClick={() => setPicking(true)}>
              {t(profile.label)} · {t('change')}
            </button>
            <button className="profile-chip" onClick={() => setPickingCity(true)}>
              {city ? city.name : t('No city')} · {t('change')}
            </button>
          </div>
        )}
      </header>

      {picking ? (
        <ProfilePicker current={profile} onPick={pick} onDemo={startDemo} uiLang={uiLang} onLang={changeLang} />
      ) : pickingCity ? (
        <CityPicker current={city} onPick={pickCity} />
      ) : (
        <main className="flow">
          <form onSubmit={onSearch} role="search" className="search">
            <label htmlFor="q">{t('Where do you want to go?')}</label>
            <div className="row">
              <input id="q" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('e.g. Rijksmuseum Amsterdam')} autoComplete="off" />
              <button type="submit">{t('Check')}</button>
            </div>
            <div className="needs" role="group" aria-label={t('Find places near you')}>
              {CATEGORIES.map((c) => (
                <button type="button" key={c.id} className="need" onClick={() => runCategory(c)}>
                  {t(c.label)}
                </button>
              ))}
            </div>
          </form>

          <section aria-live="polite">
            {!hasToken && <p className="warn">Developer note: add your accessibility.cloud token to <code>.env</code>.</p>}
            {state === 'idle' && <p className="hint">{t('Type a place name, or tap what you need. CanIGo tells you if the entrance works for you.')}</p>}
            {state === 'idle' && (
              <div className="around">
                <button className="button" onClick={() => runCategory(AROUND)}>{t('Where can I go near me?')}</button>
                <p className="hint small">{t('CanIGo asks for your location only when you tap this, and never stores it.')}</p>
              </div>
            )}
            {state === 'loading' && (
              <div className="skeleton" role="status" aria-live="polite">
                <p className="loading-line"><span className="spinner" aria-hidden="true" />{t('Checking the entrance…')}</p>
                <div className="bone title" />
                <div className="bone verdict" />
                <div className="bone line" />
                <div className="bone line short" />
                <div className="bone photo" />
              </div>
            )}
            {state === 'error' && <p className="warn">{error}</p>}
            {state === 'list' && list && (
              <div className="list">
                <h2>{list.category.id === 'around'
                  ? (list.nearMe ? t('Places near you that you can get into') : t('Places in {city} that you can get into', { city: city?.name || t('the city centre') }))
                  : list.nearMe ? t('{category} near you', { category: t(list.category.label) }) : t('{category} in {city}', { category: t(list.category.label), city: city?.name || t('the city centre') })}</h2>
                {list.note && <p className="hint small">{list.note}</p>}
                {list.category.id === 'health' && <p className="conflict">{t("In an emergency, call 112. Don't wait to check the entrance.")}</p>}
                {list.items.length === 0 && list.unchecked.length === 0 && (
                  <>
                    <p className="hint">{list.km ? t('No places found within {km} km yet.', { km: list.km }) : t('No places found near you yet.')}</p>
                    {list.km && list.km < 25 && (
                      <button className="button ghost" onClick={() => runCategory(list.category, { km: Math.min(25, Math.max(5, list.km * 3)), understood: query })}>
                        {t('Look up to {km} km', { km: Math.min(25, Math.max(5, list.km * 3)) })}
                      </button>
                    )}
                    {list.centre && (
                      <button className="button ghost" onClick={() => runCategory(list.category, { inCity: true })}>
                        {t('Show places in central {city}', { city: list.centre.name })}
                      </button>
                    )}
                  </>
                )}
                <ul>
                  {list.items.map((i) => (
                    <li key={i.id}>
                      <button className="row-item" onClick={() => openFromList(i)}>
                        <span className="dot" style={{ background: COLORS[i.verdict.tone] }} aria-hidden="true" />
                        <span className="row-text">
                          <strong>{i.name}</strong>
                          <span>{i.kind ? t(i.kind.label) : t(i.verdict.title)} · {i.distance < 1000 ? `${i.distance} m` : `${(i.distance / 1000).toFixed(1)} km`}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
                {list.unchecked.length > 0 && (
                  <>
                    <h3 className="subhead">{t('Not checked yet')}</h3>
                    <p className="hint small">{t('These places exist, but nobody has said what their entrance is like. Ask them before you go.')}</p>
                    <ul>
                      {list.unchecked.map((i) => (
                        <li key={i.id}>
                          <button className="row-item" onClick={() => openFromList(i)}>
                            <span className="dot" style={{ background: COLORS.unknown }} aria-hidden="true" />
                            <span className="row-text">
                              <strong>{i.name}</strong>
                              <span>{t('Entrance not checked')} · {i.distance < 1000 ? `${i.distance} m` : `${(i.distance / 1000).toFixed(1)} km`}</span>
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            )}
            {state === 'done' && place?.fromList && list && (
              <button className="button ghost back" onClick={() => { setState('list'); setPlace(null) }}>{t('← Back to the list')}</button>
            )}
            {state === 'done' && place && <Answer key={place.name + place.lat} place={place} profile={profile} photo={photo} city={city} onAdded={addRecord} onWrong={markWrong} onOpen={openAlternative} />}
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
            {profile && <button className="link" onClick={startOver}>{t('Start over')}</button>}
            {notCounted() && <p className="hint small">Visits from this device are not counted.</p>}
            <p className="credits">{t('Data: © OpenStreetMap contributors, accessibility.cloud, Overture Maps Foundation, volunteers. Photos: Mapillary (CC BY-SA).')}</p>
            <LangPicker value={uiLang} onChange={changeLang} />
          </footer>
        </main>
      )}
    </div>
  )
}
