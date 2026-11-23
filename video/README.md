# Demo recordings

`rec.mjs` records real sessions of the app (1920×1080, 30 fps) for the demo video:
intro, ask, crutches, wheelchair, cafe, sentence, languages.

    npm run build && npx vite preview --port 4173 &
    npm i --no-save puppeteer-core
    xvfb-run -a -s "-screen 0 1920x1080x24" node video/rec.mjs        # all clips → clips/
    xvfb-run -a -s "-screen 0 1920x1080x24" node video/rec.mjs cafe   # one clip

Needs Google Chrome at /usr/bin/google-chrome, ffmpeg, Xvfb. Without internet the map is hidden
and /api/understand is answered with the real API's response shape; with internet, remove those stubs.
