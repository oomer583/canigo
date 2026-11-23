#!/bin/bash
# renders QA stills at given frames into out/qa/<tag>/
tag=$1; shift; mkdir -p out/qa/$tag
for f in "$@"; do npx remotion still src/index.ts CanIGo out/qa/$tag/$f.jpg --frame=$f --scale=0.5 --log=error >/dev/null 2>&1 || echo "fail $f"; done
cd out/qa/$tag && ffmpeg -loglevel error -y -pattern_type glob -i '*.jpg' -vf "scale=480:-1,tile=4x$(( ($#+3)/4 ))" sheet.png 2>/dev/null; echo sheet
