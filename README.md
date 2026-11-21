# CanIGo

**Know if you can get in, before you go.**

CanIGo answers one question for wheelchair users: *can I get into this building?* Pick a place on the map and CanIGo shows whether the entrance is accessible, where that answer comes from, and how fresh it is. When sources disagree, it shows both instead of guessing.

Built for [Arbiter Hacks V1](https://arbiter-hacks-v1.devpost.com/) (General Track).

## Why

Maps tell you how long the bus takes. They rarely tell you whether there are three steps at the door. The data exists in scattered places (OpenStreetMap tags, Wheelmap, city open data, street-level photos), but nobody puts it in front of you at the moment you decide whether to go.

## How it works (v0.1)

1. Tap the map or search a place.
2. CanIGo asks [accessibility.cloud](https://www.accessibility.cloud) for places within 150 m. accessibility.cloud bundles Wheelmap, OpenStreetMap and 150+ other sources.
3. Each place gets a clear answer: **You can get in**, **Partly accessible**, **Steps at the entrance**, or **Not known yet**, with the source linked.
4. One tap opens directions in Google Maps.

## Roadmap

- [x] Map, search, nearby places, one answer per place (accessibility.cloud)
- [ ] OpenStreetMap `wheelchair=*` tags directly (Overpass API)
- [ ] Street-level photos (Mapillary, Panoramax) with an AI check for steps and ramps
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

- Map tiles and search: © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors (ODbL), Nominatim
- Accessibility data: [accessibility.cloud](https://www.accessibility.cloud) by Sozialhelden e.V. and its partner sources

## License

MIT
