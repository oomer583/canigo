# CanIGo

**Know if you can get in, before you go.**

CanIGo tells you whether you can get into a building, based on what *you* need: how wide a door has to be for you, and how many steps you can manage. Every answer shows where it came from and how old it is. When sources disagree, it says so instead of guessing.

- **Live:** [canigo-three.vercel.app](https://canigo-three.vercel.app). Tap **"See an example in Amsterdam"** to try it without setting anything up. This one address works worldwide, including Türkiye, Iran and Russia.
<!-- - **Demo video:** add the YouTube link here -->

Built for [Arbiter Hacks V1](https://arbiter-hacks-v1.devpost.com/) (General Track).

## Why

I'm 15 and I walk with a four-wheeled walker. Map apps answer "can I get in?" with one word: a wheelchair icon, yes or no. It's for one kind of wheelchair and has no source. It doesn't say who checked, when, or how many steps there are. If you use a walker, crutches or a stroller, it tells you nothing.

The data often exists (OpenStreetMap tags, Wheelmap, open datasets, street photos), but it's scattered. CanIGo puts it together at the moment you decide whether to go.

## How it works

1. **"How do you get around?"** Seven profiles: manual, power or wide wheelchair, walker or gait trainer, stroller, crutches or a cane, "steps are hard for me". Each is two numbers: the narrowest door you can pass and how many steps you can manage (`src/profiles.js`). They describe needs, not people.
2. **Pick your city.** The app saves that city's entrance data on your device, so answers are fast and work offline. Other places still work online.
3. **Search a place, tap a category, or type a sentence.** Café, Food, Pharmacy, Toilet, Groceries, Hospital, Museum. Places you can get into come first. Or tap **"Where can I go near me?"** for a mix of nearby places of every kind that you can get into. Location is asked only when you tap, and never stored. A sentence like "find me a pharmacy within 2 km" is turned into a search by AI, and the app shows what it understood.
4. **One answer for you.** Green, yellow or red, with the reason in plain words. A door narrower than you need, or more steps than you can manage, makes it red. Steps within your limit on a place the source calls "not accessible" make it yellow, not red, so the color never contradicts the reason. A red or yellow answer always says why; if the source gives no measurements or description, CanIGo says that too. A red answer lists places of the same kind nearby that you can get into.
5. **Sources and dates.** Every source is listed with its date. Places change, so the newest record leads. An older record that says something else is shown, not hidden. If two records from about the same time (within a year) disagree, the answer is *Sources disagree*. If nobody has checked a place, it says *Not checked yet* and still lists it.
6. **AI is only a hint.** If there's a recent street photo facing the entrance, a vision model looks for steps or a ramp. If it can't see a door, nothing is shown. Its guess never outranks a real record and never creates or settles a disagreement. The photo is always shown.
7. **"Ask them before you go."** A ready message with your door width and step limit, in English, Turkish, Azerbaijani or Russian, plus the place's phone number when known.
8. **Volunteers.** Anyone can add an entrance they've seen. It's shown as *Volunteer, not verified*.

The interface is in English, Turkish, Azerbaijani and Russian and opens in the browser's language.

### Same door, different answer

Sixty 6 in London: OpenStreetMap (edited October 2025) records two steps at the entrance and marks it not wheelchair accessible.

| Profile | Answer |
| --- | --- |
| Manual wheelchair (no steps) | 🔴 Steps at the entrance |
| Crutches or a cane (up to 2 steps) | 🟡 Probably, with some effort |

This case is a test in `src/verdict.test.js`.

## Architecture

```
src/
  App.jsx                 UI (React + react-leaflet)
  profiles.js             the seven profiles
  verdict.js              records -> one answer for one profile (newest leads, disagreements, measurements)
  merge.js                the same place from several sources -> one place
  categories.js, nearby.js  category search, sorting (accessible first, then distance)
  understand.js           decides whether a query is a name or a sentence; only sentences go to AI
  geocode.js              Nominatim, then Photon, then the city packs
  ask.js                  "Ask them before you go" messages
  i18n.js                 en / tr / az / ru
  sources/
    cityPack.js           offline OpenStreetMap city packs
    osm.js                OpenStreetMap entrance tags (door width, steps, edit date)
    accessibilityCloud.js accessibility.cloud (Wheelmap and 150+ datasets)
    places.js             Overture Maps places
    streetPhoto.js        Mapillary photo + AI reading
    volunteer.js          volunteer reports
functions/api/            Cloudflare Pages Functions
  understand.js           sentence -> search (Workers AI)
  entrance.js             street photo -> "steps? ramp? door visible?" (Workers AI)
  osm.js                  OpenStreetMap lookups outside the city packs (several Overpass mirrors, cached for a day)
  contrib.js              volunteer reports (D1)
scripts/
  cities.json             the cities and their bounding boxes
  build-pack.mjs          OSM extract -> public/packs/<city>.json
  build-places.py         Overture Maps places -> public/packs/<city>-places.json
vercel.json               public mirror that forwards to the pages.dev origin
video/rec.mjs             records real app sessions for the demo video
```

- **Hosting:** Cloudflare Pages + Pages Functions. The app is a PWA (`vite-plugin-pwa`), so a saved city works offline.
- **City packs:** Overpass is not reachable from Cloudflare's servers, so a GitHub Action (`.github/workflows/city-packs.yml`) builds the packs from Geofabrik extracts with osmium, once a month and whenever `scripts/cities.json` changes. A pack whose data hasn't changed is not rewritten, so the git history doesn't fill up with identical files. 50 cities are configured, in Europe, North America, Türkiye, Azerbaijan and Georgia.
- **AI:** Cloudflare Workers AI, `@cf/meta/llama-4-scout-17b-16e-instruct` with `@cf/google/gemma-4-26b-a4b-it` as fallback. It only reads street photos and turns sentences into searches. It never decides whether a place is accessible.
- **Volunteer reports:** Cloudflare D1. No accounts, no free text beyond the place name, no IP addresses stored, a limit of 10 reports per hour, and three "this is wrong" reports hide an entry.

## Run it locally

```bash
npm install
cp .env.example .env        # paste your accessibility.cloud app token into .env
npm run dev
npm test                    # 80 tests (Vitest)
```

Get a free accessibility.cloud token by creating an organization and an API client at [accessibility.cloud](https://www.accessibility.cloud). It is meant for browser use; keep it out of git anyway (`.env` is ignored).

`npm run dev` runs the frontend only. The Pages Functions (AI, street photos, volunteer reports) need Cloudflare bindings, set in the Pages project:

| Binding | Type | Used by |
| --- | --- | --- |
| `AI` | Workers AI | `understand.js`, `entrance.js` |
| `DB` | D1 database | `contrib.js` |
| `MAPILLARY_TOKEN` | secret | `entrance.js` |

D1 table:

```sql
CREATE TABLE contributions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  steps INTEGER,
  ramp TEXT NOT NULL DEFAULT 'unknown' CHECK (ramp IN ('yes','no','unknown')),
  door_cm INTEGER,
  created_at TEXT NOT NULL,
  reports INTEGER NOT NULL DEFAULT 0,
  hidden INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_contrib_lat_lng ON contributions (lat, lng);
```

Without these bindings the app still works with the city packs and accessibility.cloud; the AI and volunteer features return "not configured".

## Turkey mirror

The engine runs on Cloudflare Pages at canigo-app.pages.dev. It stays on Cloudflare because the parts that cost money elsewhere are free here: the AI (Workers AI runs the Llama and Gemma models), the volunteer database (D1) and the Pages Functions all live on the Cloudflare free tier. That is why the project does not move off it.

canigo-app.pages.dev used to be the public address too, but it is blocked in Türkiye and some other countries, so it is no longer given out. It is kept only as the engine. The public address is a Vercel mirror that forwards every request to it and works worldwide:

- `vercel.json`, the public mirror at canigo-three.vercel.app. It builds nothing and rewrites every path to canigo-app.pages.dev. Tested from Türkiye, Iran and Russia.

Do not delete canigo-app.pages.dev, or the mirror has nothing to serve. Because the mirror makes the requests, visitors share one volunteer rate limit.

## Privacy

What you cannot collect cannot leak, so CanIGo keeps as little as possible:

- No accounts, names, emails or phone numbers.
- A volunteer report stores only the place name, its coordinates, steps, ramp and door width.
- IP addresses are never stored. The rate limit uses a hash of the address and the hour, kept for one hour in the edge cache.
- Visit counts use Cloudflare Web Analytics, which sets no cookies.

If CanIGo ever needs accounts, it will ask only for an email, and never for health details, the kind of disability, or a home address.

## Roadmap

- [x] One answer per place, for your profile (door width, steps)
- [x] Sources merged, every source with its date, newest leads, disagreements shown
- [x] Offline city packs from OpenStreetMap (monthly GitHub Action)
- [x] Overture Maps places, category search, accessible places first
- [x] Street photo of the entrance (Mapillary) read by a vision model, as a hint only
- [x] Sentence search with AI
- [x] "Ask them before you go" in four languages
- [x] Volunteer reports ("Volunteer, not verified")
- [x] Interface in English, Turkish, Azerbaijani and Russian
- [x] Works offline for a saved city (PWA)
- [x] Accessibility pass: axe (WCAG 2.2 AA) finds no issues; touch targets at least 44 px
- [x] Visit counts with Cloudflare Web Analytics (no cookies); `?nostats=1` stops counting a test device
- [x] 50 cities configured, with city search
- [x] Copies on unofficial addresses say so and link to the official app
- [ ] Panoramax photos as a second image source
- [ ] Step-free transit stations from GTFS `wheelchair_boarding`
- [ ] Volunteer reports reviewed by other volunteers

## Data and credits

- Map tiles, search and entrance data: © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors (ODbL), via Geofabrik, Nominatim and Overpass; search fallback via [Photon](https://photon.komoot.io)
- Places: [Overture Maps Foundation](https://overturemaps.org) (CDLA Permissive 2.0)
- Accessibility data: [accessibility.cloud](https://www.accessibility.cloud) by Sozialhelden e.V. and its partner sources
- Street photos: [Mapillary](https://www.mapillary.com), CC BY-SA 4.0, credited to each photographer
- Image and sentence reading: Cloudflare Workers AI (Llama 4 Scout, Gemma 4)
- Volunteers who've been there

## License

Code: MIT. The CanIGo name is not covered by the license; copies must use a different name. See [NAME.md](NAME.md).

Copies running anywhere other than the [official addresses](src/official.js) show a note pointing to the official app.
