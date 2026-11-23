import React from 'react';
import {useCurrentFrame, interpolate, Easing} from 'remotion';

export const FPS = 30;
export const BEAT = 60 / 99.2;
export const PHASE = 0.3309;
// beat i of the edited soundtrack (one silent beat inserted before src beat 140, so the grid is uniform)
export const bt = (i: number) => PHASE + BEAT * i;
export const B = (i: number) => Math.round(bt(i) * FPS);
export const S = (sec: number) => Math.round(sec * FPS);

export const C = {
  night: '#06231a', brand: '#0b3d2e', paper: '#f6f4ef', ink: '#15201b', accent: '#f2c14e',
  yes: '#3cb371', partial: '#f0a419', no: '#e4573f', mute: 'rgba(246,244,239,.55)',
  appYes: '#1f8a4c', appPartial: '#d99a12', appNo: '#c2352b'
};
export const F = {
  serif: "'Instrument Serif', serif", sans: "'Inter Tight', sans-serif", mono: "'JetBrains Mono', monospace"
};

export const expo = Easing.bezier(0.16, 1, 0.3, 1);
export const inout = Easing.bezier(0.65, 0, 0.35, 1);
export const smooth = Easing.bezier(0.45, 0, 0.2, 1);
export const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

export const prog = (f: number, a: number, d: number, e = expo) => interpolate(f, [a, a + d], [0, 1], {...clamp, easing: e});

// --- camera: keyframes in world units; interpolated with per-segment easing
export type Key = {f: number; x: number; y: number; s: number; r?: number; e?: (t: number) => number};
export const camAt = (keys: Key[], f: number) => {
  if (f <= keys[0].f) return keys[0];
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i], b = keys[i + 1];
    if (f <= b.f) {
      const t = (b.e || inout)((f - a.f) / Math.max(1, b.f - a.f));
      // scale interpolated in log space so zooms feel even
      return {f, x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, s: Math.exp(Math.log(a.s) + (Math.log(b.s) - Math.log(a.s)) * t), r: (a.r || 0) + ((b.r || 0) - (a.r || 0)) * t};
    }
  }
  return keys[keys.length - 1];
};
// put world point (cx,cy) at screen (sx,sy) at scale s
export const at = (f: number, cx: number, cy: number, s: number, sx = 1250, sy = 540, e?: (t: number) => number): Key => ({f, x: cx - (sx - 960) / s, y: cy - (sy - 540) / s, s, e});
export const toScreen = (c: {x: number; y: number; s: number}, wx: number, wy: number) => ({x: 960 + (wx - c.x) * c.s, y: 540 + (wy - c.y) * c.s});

export const World: React.FC<{cam: {x: number; y: number; s: number; r?: number}; children: React.ReactNode}> = ({cam, children}) => (
  <div style={{position: 'absolute', left: 0, top: 0, width: 1920, height: 1080, overflow: 'hidden'}}>
    <div style={{position: 'absolute', left: 0, top: 0, transformOrigin: '0 0',
      transform: `translate(960px,540px) rotate(${cam.r || 0}deg) scale(${cam.s}) translate(${-cam.x}px,${-cam.y}px)`}}>{children}</div>
  </div>
);

// --- masked line reveal: text rises from behind a horizontal edge, leaves upward
export const Line: React.FC<{at: number; out?: number; d?: number; style?: React.CSSProperties; children: React.ReactNode; from?: number}> = ({at, out, d = 16, style, children, from = 1.6}) => {
  const f = useCurrentFrame();
  const pin = prog(f, at, d);
  const pout = out === undefined ? 0 : prog(f, out, 12, Easing.bezier(0.7, 0, 0.84, 0));
  const y = (1 - pin) * from * 100 - pout * 160;
  return (
    <div style={{overflow: 'hidden', paddingBottom: '0.14em', marginBottom: '-0.14em', paddingTop: '0.36em', marginTop: '-0.36em', ...style}}>
      <div style={{transform: `translateY(${y}%)`, willChange: 'transform'}}>{children}</div>
    </div>
  );
};

// words in one line, staggered
export const Words: React.FC<{at: number; out?: number; text: string; step?: number; style?: React.CSSProperties; wordStyle?: (i: number) => React.CSSProperties}> = ({at, out, text, step = 3, style, wordStyle}) => (
  <div style={{display: 'flex', flexWrap: 'wrap', columnGap: '0.24em', ...style}}>
    {text.split(' ').map((w, i) => (
      <Line key={i} at={at + i * step} out={out === undefined ? undefined : out + i * 1}><span style={wordStyle ? wordStyle(i) : undefined}>{w}</span></Line>
    ))}
  </div>
);

export const Grain: React.FC<{o?: number}> = ({o = 0.08}) => {
  const f = useCurrentFrame();
  const seed = Math.floor(f / 2) % 24;
  return (
    <svg width={1920} height={1080} style={{position: 'absolute', inset: 0, opacity: o, mixBlendMode: 'overlay', pointerEvents: 'none'}}>
      <filter id={`g${seed}`}><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={2} seed={seed} /><feColorMatrix type="saturate" values="0" /></filter>
      <rect width="1920" height="1080" filter={`url(#g${seed})`} />
    </svg>
  );
};

export const Vignette: React.FC<{o?: number}> = ({o = 0.55}) => (
  <div style={{position: 'absolute', inset: 0, pointerEvents: 'none', background: `radial-gradient(ellipse 75% 70% at 50% 48%, rgba(0,0,0,0) 55%, rgba(0,0,0,${o}) 100%)`}} />
);

// annotation: dot on target, hairline leader to a label (all in screen space)
export const Note: React.FC<{at: number; out?: number; x: number; y: number; lx: number; ly: number; label: React.ReactNode; sub?: React.ReactNode; color?: string; align?: 'left' | 'right'}> = ({at, out, x, y, lx, ly, label, sub, color = C.accent, align = 'left'}) => {
  const f = useCurrentFrame();
  const p = prog(f, at, 14);
  const po = out === undefined ? 0 : prog(f, out, 10, inout);
  const vis = 1 - po;
  const len = Math.hypot(lx - x, ly - y), ang = Math.atan2(ly - y, lx - x) * 180 / Math.PI;
  return (
    <div style={{position: 'absolute', inset: 0, opacity: vis, pointerEvents: 'none'}}>
      <div style={{position: 'absolute', left: x - 7, top: y - 7, width: 14, height: 14, borderRadius: 7, background: color, transform: `scale(${prog(f, at, 10)})`, boxShadow: `0 0 0 6px ${color}33`}} />
      <div style={{position: 'absolute', left: x, top: y, width: len * prog(f, at + 3, 14), height: 2, background: color, transformOrigin: '0 50%', transform: `rotate(${ang}deg)`}} />
      <div style={{position: 'absolute', left: align === 'left' ? lx + 14 : undefined, right: align === 'right' ? 1920 - lx + 14 : undefined, top: ly - 20, textAlign: align, opacity: p}}>
        <Line at={at + 6}><div style={{fontFamily: F.mono, fontWeight: 600, fontSize: 26, color: C.paper, letterSpacing: '.02em', whiteSpace: 'nowrap', textShadow: '0 2px 18px rgba(0,0,0,.5)'}}>{label}</div></Line>
        {sub && <Line at={at + 10}><div style={{fontFamily: F.mono, fontSize: 21, color: C.mute, marginTop: 8, whiteSpace: 'nowrap', textShadow: '0 2px 18px rgba(0,0,0,.5)'}}>{sub}</div></Line>}
      </div>
    </div>
  );
};
