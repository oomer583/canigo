# CanIGo demo: report

**Deliverable:** `canigo-demo.mp4`, 2:16, 1080p30, H.264 + AAC 320k, −13.9 LUFS / −1.5 dBTP. Within Arbiter Hacks V1's 2–3 min limit. Submission deadline: Dec 20, 2026, 9:00pm PST.

## Structure (cuts on the music's beat grid, 99.2 BPM)
| Time | Scene | What's on screen |
|---|---|---|
| 0:00 | Hook | "I'm Ömer. 15 · Baku. I walk with a walker." + his real profile card |
| 0:09 | Problem | "wheelchair: yes / no" flickering on the beat · "Says who?" · no source, no date · "And yes — for whom?" |
| 0:29 | Reveal | Music opens up (low-pass lifts) · CanIGo + tagline |
| 0:34 | How | Real recording, one continuous camera: profile → city → search → Anne Frank Huis is red for a walker |
| 0:54 | Same door | London, crutches profile: Sixty 6 = yellow, source + date shown |
| 1:17–1:25 | Setup | Same place, same data, now a manual wheelchair · one silent beat |
| 1:25 | **Drop** | "Same door, different answer." Yellow and red split, both real answers side by side |
| 1:37 | Ask | Ready message with the user's measurements, EN/TR/AZ/RU, the phone number |
| 1:52 | Café | Whole list sorted green / yellow / red |
| 1:57 | Close | "I didn't build this for pity. I built it so others don't go through what I did." → URL, repo |

## Accuracy decisions
- No invented features: everything shown is in the recordings. The street-photo/vision feature is not shown, because it needs network access the recording environment didn't have.
- The "find me a pharmacy" clip was **cut**: in the offline recording the AI answer was stubbed, so showing it as real would have been dishonest.
- Hidden in the recordings: the map (no tiles offline) and the local-only "Developer note" token line, which the live site doesn't show. Panels are cropped to the app's content column, and the cropped header subtitle is covered with the header colour.

## QA performed
- Visual: preview stills (2 rounds) + 3 passes on rendered MP4s (v1–v3) + final check. Fixed: Ö umlaut clipped by the text mask; notes overlapping the UI (re-laid out with panels on the right); a ~1 s empty gap before the reveal; labels on the Directions button; café opening on a loading state; type tops peeking under masks; the cropped header fragment (now tracked per frame).
- Audio/sync: 3 passes. Measured on the rendered file: all 9 hard cuts on the exact beat frame, drop thump +1 ms, silent beat −75 dB, clicks placed from the cursor ripples measured in the recordings (±4 ms where the measurement was unambiguous). Fixed: the filtered intro was louder than after the reveal (dynamic loudnorm flattened it; now two-pass linear, +3.4 LU at the reveal); whooshes stood out over the muffled intro (now filtered with the music).

## Open items / your actions
1. **Parent approval for Pixabay** (their terms: under the local digital-consent age only with a parent's authorisation). Keep the track's Pixabay page URL in case YouTube ever raises a false claim.
2. Upload to YouTube (Unlisted or Public) and put the link in Devpost.
3. The music is a stock corporate track: workable with the edit, not premium. A better track can be dropped into `public/audio/music.mp3`, but the beat grid in `lib.tsx` and `mix.py` must then be re-measured.
