# CanIGo demo video: credits and licences

| Asset | Source | Licence | Notes |
|---|---|---|---|
| App footage | Recorded from this repo's build with `video/rec.mjs` (same code as canigo-app.pages.dev) | MIT (this repo) | Recorded offline: the map is hidden (no tiles), and the local-only "Developer note: add your accessibility.cloud token" line is hidden by CSS. The answers come from the bundled OpenStreetMap city packs. |
| Map/entrance data shown in the UI | © OpenStreetMap contributors (via the city packs) | ODbL 1.0 | Credited on the end card. |
| Music: "Corporate" (Pixabay ID 178689) by Artur Aravidi | Pixabay, uploaded by the user | Pixabay Content License: free, no attribution required, may be modified | Credited on the end card anyway. Edits: low-pass filter for the first 29 s, one silent beat inserted at 1:25. **Pixabay's terms say people under 13 (or under their country's digital-consent age) may only use the service with a parent or guardian's authorisation, so a parent should approve.** Keep the track's Pixabay page link: Pixabay tracks are not on YouTube's Content ID allowlist, so the link is your proof if a false claim ever comes in. |
| Sound effects (whooshes, clicks, low thump, swell) | Generated procedurally in `film/audio-src/mix.py` (numpy/scipy, filtered noise and sine tones) | Ours, no third-party content | Not AI-generated. Mixkit and Freesound were ruled out because their terms require users to be 18+. |
| Fonts: Instrument Serif, Inter Tight, JetBrains Mono | Fontsource npm packages (`@fontsource/*`) | SIL Open Font License 1.1 | Bundled locally in `film/public/fonts`. |
| CanIGo icon | `public/icon.svg` in this repo | MIT (this repo) | |
| Renderer | Remotion 4 | Remotion License: free for individuals | |

Rejected sources: Mixkit (Terms §7: you must be 18+), Freesound (registration requires 18+).
