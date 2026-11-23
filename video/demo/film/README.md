# CanIGo demo film (Remotion)

2:16, 1920×1080, 30 fps. Every UI shot is a real recording of the app made with `../../rec.mjs`.

## Rebuild
```
# 1. record the clips (from the repo root)
npm run build && npx vite preview --port 4173 &
npm i --no-save puppeteer-core
REC_H=1080 REC_OUT=clips/tall xvfb-run -a -s "-screen 0 1920x2160x24" node video/rec.mjs crutches   # also: wheelchair ask cafe
xvfb-run -a -s "-screen 0 1920x1080x24" node video/rec.mjs intro
cp clips/tall/*.mp4 clips/intro.mp4 video/demo/film/public/clips/
# 2. music: put the Pixabay track at public/audio/music.mp3 (not in git; licence forbids redistributing it on its own)
cd video/demo/film && npm ci && pip install numpy scipy
python3 audio-src/mix.py          # builds public/audio/mix.wav
npx remotion render src/index.ts CanIGo out/canigo-demo.mp4 --codec=h264 --crf=16 --audio-bitrate=320k
```
`src/hdr.json` holds the app header's position in every recorded frame. Re-measure it if you re-record (the script is in the git history of this folder: commit "visual pass 3").

## Map
- `src/lib.tsx`: beat grid (99.2 BPM, `B(i)` = frame of beat i), camera, masked type, notes
- `src/Film.tsx`: the 8 scenes, all timed in beats
- `audio-src/mix.py`: music edit (low-pass "through the door" until the reveal, one silent beat before the drop), procedural SFX, two-pass linear loudness to −14 LUFS
