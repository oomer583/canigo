import {continueRender, delayRender, staticFile} from 'remotion';
const R = {
  latin: 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD',
  'latin-ext': 'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF',
  cyrillic: 'U+0301,U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116'
} as const;
type Sub = keyof typeof R;
const faces: [string, string, string, string, Sub[]][] = [
  ['Instrument Serif', 'instrument-serif', '400', 'normal', ['latin', 'latin-ext']],
  ['Instrument Serif', 'instrument-serif', '400', 'italic', ['latin', 'latin-ext']],
  ...(['500', '600', '700', '800'].map((w) => ['Inter Tight', 'inter-tight', w, 'normal', ['latin', 'latin-ext']]) as any),
  ...(['500', '600'].map((w) => ['JetBrains Mono', 'jetbrains-mono', w, 'normal', ['latin', 'latin-ext', 'cyrillic']]) as any)
];
const handle = delayRender('fonts');
Promise.all(faces.flatMap(([family, file, weight, style, subs]) => subs.map(async (s) => {
  const ff = new FontFace(family, `url(${staticFile(`fonts/${file}-${s}-${weight}-${style}.woff2`)}) format('woff2')`, {weight, style, unicodeRange: R[s]});
  await ff.load(); document.fonts.add(ff);
}))).then(() => continueRender(handle)).catch((e) => { console.error(e); continueRender(handle); });
