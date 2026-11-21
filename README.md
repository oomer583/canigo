# CanIGo

**Know if you can get in, before you go.**

CanIGo answers one question for wheelchair users: *can I get into this building?* Pick a place on the map and CanIGo shows whether the entrance is accessible, where that answer comes from, and how fresh it is. When sources disagree, it shows both instead of guessing.

Built for [Arbiter Hacks V1](https://arbiter-hacks-v1.devpost.com/) (General Track).

## Why

Maps tell you how long the bus takes. They rarely tell you whether there are three steps at the door. The data exists in scattered places (OpenStreetMap tags, Wheelmap, city open data, street-level photos), but nobody puts it in front of you at the moment you decide whether to go.

## How it works

1. Pick how you get around: manual, power or wide wheelchair, walker or gait trainer, stroller, crutches, or "steps are hard for me".
2. Type where you want to go.
3. CanIGo asks two sources at once:
   - [accessibility.cloud](https://www.accessibility.cloud), which bundles Wheelmap and 150+ other datasets
   - [OpenStreetMap](https://www.openstreetmap.org) via the Overpass API, including entrance details (door width, step count) and the date each entry was last edited
4. It merges duplicate listings of the same place and gives one answer for **you**: a door narrower than you need, or more steps than you can manage, turns the answer red.
5. If sources disagree, CanIGo says so instead of guessing, and shows every source with its date.
6. CanIGo looks for a recent street photo facing the entrance (Mapillary) and asks a vision model whether it shows steps or a ramp. The photo is always shown, so you can judge for yourself.
7. If the answer is unclear, "Ask them before you go" gives you a ready message with your measurements, plus the place's phone number when known.

## Roadmap

- [x] Map, search, nearby places, one answer per place (accessibility.cloud)
- [x] "How do you get around?" profiles: doors and steps checked against what you need
- [x] Same place from two sources merged, disagreements shown
- [x] "Ask them before you go": a ready message with your measurements
- [x] OpenStreetMap directly (Overpass API): wheelchair tags, entrance door width and steps, edit dates
- [x] Street-level photo of the entrance (Mapillary) read by a vision model (Workers AI): steps? ramp?
- [ ] Panoramax photos as a second image source
- [ ] Project Sidewalk curb ramps (CC0)
- [ ] User reports: "I was there, it has a ramp"
- [ ] Saved places available offline
- [ ] Transit: step-free stations from GTFS `wheelchair_boarding`

## Run it locally

```bash
npm install
cp .env.example .env        # then paste your accessibility.cloud app token into .env
npm run dev
npm test
```

Get a free token by creating an organization and an API client at accessibility.cloud. The token is meant for browser use; keep it out of git anyway (`.env` is ignored).

## Data and credits

- Map tiles, search and entrance data: © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors (ODbL), via Nominatim and Overpass
- Street photos: [Mapillary](https://www.mapillary.com), CC BY-SA 4.0, credited to each photographer
- Image reading: Cloudflare Workers AI (Gemma 4, with Llama 4 Scout as fallback)
- Accessibility data: [accessibility.cloud](https://www.accessibility.cloud) by Sozialhelden e.V. and its partner sources

## License

MIT
