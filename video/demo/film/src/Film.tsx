import React from 'react';
import {AbsoluteFill, Audio, Freeze, OffthreadVideo, staticFile, useCurrentFrame, interpolate, Img} from 'remotion';
import './fonts';
import {B, C, F, S, Line, Words, Grain, Vignette, Note, World, camAt, toScreen, prog, expo, inout, smooth, clamp, Key, at as K} from './lib';
export const TOTAL = 4082;

const Range: React.FC<{a: number; b: number; children: React.ReactNode}> = ({a, b, children}) => {
  const f = useCurrentFrame();
  return f >= a && f < b ? <>{children}</> : null;
};

// real app recording as a sheet in world space; time-remapped frame by frame
const Clip: React.FC<{src: string; t: number; x: number; y: number; w: number; h: number; o?: number; cx?: number; cw?: number}> = ({src, t, x, y, w, h, o = 1, cx = 150, cw = 660}) => (
  <div style={{position: 'absolute', left: x + cx, top: y, width: cw, height: h, borderRadius: 16, overflow: 'hidden', opacity: o,
    boxShadow: '0 1px 0 rgba(255,255,255,.06) inset, 0 50px 120px -30px rgba(0,0,0,.65), 0 18px 40px -18px rgba(0,0,0,.5)'}}>
    <Freeze frame={Math.max(0, Math.round(t * 30))}>
      <OffthreadVideo src={staticFile(`clips/${src}.mp4`)} muted style={{width: w, height: h, display: 'block', marginLeft: -cx}} />
    </Freeze>
  </div>
);

const DotGrid: React.FC = () => (
  <div style={{position: 'absolute', left: -3000, top: -3000, width: 8000, height: 8000,
    backgroundImage: 'radial-gradient(rgba(246,244,239,.10) 1.2px, transparent 1.4px)', backgroundSize: '40px 40px'}} />
);

const Stage: React.FC<{children?: React.ReactNode; bg?: string}> = ({children, bg = C.night}) => (
  <AbsoluteFill style={{background: bg}}>{children}</AbsoluteFill>
);

// slow drift so held frames never feel frozen
const Drift: React.FC<{a: number; b: number; dx?: number; ds?: number; children: React.ReactNode}> = ({a, b, dx = -24, ds = 0.04, children}) => {
  const f = useCurrentFrame();
  const t = interpolate(f, [a, b], [0, 1], clamp);
  return <AbsoluteFill style={{transform: `translateX(${dx * t}px) scale(${1 + ds * t})`, transformOrigin: '40% 50%'}}>{children}</AbsoluteFill>;
};

const big = (size: number, extra: React.CSSProperties = {}): React.CSSProperties => ({fontFamily: F.sans, fontWeight: 800, fontSize: size, letterSpacing: '-0.045em', lineHeight: 0.92, color: C.paper, ...extra});
const serif = (size: number, extra: React.CSSProperties = {}): React.CSSProperties => ({fontFamily: F.serif, fontWeight: 400, fontSize: size, letterSpacing: '-0.025em', lineHeight: 0.95, color: C.paper, ...extra});
const mono = (size: number, extra: React.CSSProperties = {}): React.CSSProperties => ({fontFamily: F.mono, fontWeight: 500, fontSize: size, letterSpacing: '.04em', color: C.mute, ...extra});
const label = (extra: React.CSSProperties = {}): React.CSSProperties => ({fontFamily: F.sans, fontWeight: 600, fontSize: 26, letterSpacing: '.22em', textTransform: 'uppercase', color: C.accent, ...extra});

/* ───────────── 1 · HOOK ───────────── */
const Hook: React.FC = () => {
  const f = useCurrentFrame();
  const chip = prog(f, B(11), 18);
  return (
    <Stage>
      <Drift a={0} b={B(15)} dx={-30} ds={0.05}>
        <div style={{position: 'absolute', left: 150, top: 300}}>
          <Line at={B(3)} out={B(7) - 6}><div style={label()}>15 · Baku · Azerbaijan</div></Line>
          <div style={{height: 26}} />
          <Line at={10} d={22} out={B(7) - 8}><div style={serif(250, {lineHeight: 1.25})}>I’m Ömer.</div></Line>
        </div>
        <div style={{position: 'absolute', left: 150, top: 250}}>
          <Line at={B(7)}><div style={serif(220)}>I walk</div></Line>
          <Line at={B(8)}><div style={serif(220, {fontStyle: 'italic', color: C.accent})}>with a walker.</div></Line>
        </div>
        <div style={{position: 'absolute', left: 150, top: 770, width: 640, opacity: chip, transform: `translateY(${(1 - chip) * 40}px)`}}>
          <div style={{background: '#fff', border: `3px solid ${C.brand}`, borderRadius: 18, padding: '20px 24px', boxShadow: '0 30px 60px -20px rgba(0,0,0,.6)'}}>
            <div style={{fontFamily: F.sans, fontWeight: 700, fontSize: 30, color: C.ink}}>Walker or gait trainer</div>
            <div style={{fontFamily: F.sans, fontWeight: 600, fontSize: 22, color: 'rgba(21,32,27,.62)', marginTop: 6}}>Door at least 75 cm · no steps</div>
          </div>
          <div style={{...mono(22), marginTop: 16}}>my profile in CanIGo</div>
        </div>
      </Drift>
      <Vignette /><Grain />
    </Stage>
  );
};

/* ───────────── 2 · PROBLEM ───────────── */
const Roller: React.FC = () => {
  // yes / no / yes / no flicking on the beat, settles on both
  const f = useCurrentFrame();
  const words = [
    {at: B(17), t: 'yes.', c: C.yes}, {at: B(19), t: 'no.', c: C.no}, {at: B(21), t: 'yes.', c: C.yes}, {at: B(22), t: 'no.', c: C.no}, {at: B(23), t: 'yes.', c: C.yes}
  ];
  return (
    <div style={{position: 'relative', height: 300, overflow: 'hidden'}}>
      {words.map((w, i) => {
        const next = words[i + 1]?.at ?? 1e9;
        const pin = prog(f, w.at, 9);
        const pout = prog(f, next, 9);
        if (f < w.at - 1 || f > next + 10) return null;
        return <div key={i} style={{position: 'absolute', left: 0, top: 0, ...big(300, {color: w.c}), transform: `translateY(${(1 - pin) * 105 - pout * 105}%)`}}>{w.t}</div>;
      })}
    </div>
  );
};
const Problem: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <Stage>
      <Range a={B(15)} b={B(28)}>
        <Drift a={B(15)} b={B(28)} dx={-40}>
          <div style={{position: 'absolute', left: 150, top: 190}}><Line at={B(15)} d={12}><div style={mono(26)}>MAP APPS · EVERY CITY</div></Line></div>
          <div style={{position: 'absolute', left: 140, top: 250}}><Line at={B(15) + 1} d={13}><div style={big(230)}>wheelchair:</div></Line></div>
          <div style={{position: 'absolute', left: 140, top: 500, width: 900}}><Roller /></div>
          <div style={{position: 'absolute', left: 1010, top: 560}}><Line at={B(24)}><div style={serif(200, {fontStyle: 'italic', color: C.accent})}>Says who?</div></Line></div>
          <div style={{position: 'absolute', left: 150, top: 880, display: 'flex', gap: 60}}>
            <Line at={B(25)}><div style={mono(30, {color: C.paper})}>source: <span style={{display: 'inline-block', width: 140, height: 4, background: C.paper, verticalAlign: 'middle', opacity: .6}} /></div></Line>
            <Line at={B(26)}><div style={mono(30, {color: C.paper})}>updated: <span style={{display: 'inline-block', width: 140, height: 4, background: C.paper, verticalAlign: 'middle', opacity: .6}} /></div></Line>
          </div>
        </Drift>
      </Range>
      <Range a={B(28)} b={B(34)}>
        <Drift a={B(28)} b={B(34)} dx={-30}>
          <div style={{position: 'absolute', left: 150, top: 330}}>
            <Line at={B(28)} d={12}><div style={big(140)}>Not how many steps.</div></Line>
            <div style={{height: 40}} />
            <Line at={B(30)}><div style={big(140, {color: C.mute})}>Not how wide the door is.</div></Line>
          </div>
        </Drift>
      </Range>
      <Range a={B(34)} b={B(48)}>
        <Drift a={B(34)} b={B(48)} dx={-30} ds={0.06}>
          <div style={{position: 'absolute', left: 150, top: 230}}>
            <Line at={B(34)} d={12} out={B(46) - 4}><div style={big(160)}>And yes —</div></Line>
            <Line at={B(36)} d={22} out={B(46) - 1}><div style={serif(380, {fontStyle: 'italic', color: C.accent, lineHeight: 1})}>for whom?</div></Line>
          </div>
        </Drift>
      </Range>
      <Vignette /><Grain />
    </Stage>
  );
};

/* ───────────── 3 · REVEAL ───────────── */
const Icon: React.FC<{size: number}> = ({size}) => (
  <svg width={size} height={size} viewBox="0 0 512 512"><rect width="512" height="512" rx="112" fill="#0b3d2e" /><path d="M150 330 L250 330 L362 218" stroke="#f2c14e" strokeWidth="44" strokeLinecap="round" strokeLinejoin="round" fill="none" /><path d="M150 330 L150 380 L362 380 L362 218" stroke="#f6f4ef" strokeWidth="20" strokeLinejoin="round" fill="none" opacity=".55" /><circle cx="362" cy="150" r="34" fill="#f2c14e" /></svg>
);
const Reveal: React.FC = () => {
  const f = useCurrentFrame();
  const line = prog(f, B(47), 17, inout);
  const away = prog(f, B(56) - 8, 14, Easing2);
  return (
    <Stage>
      <AbsoluteFill style={{transform: `scale(${1 + away * 5})`, opacity: 1 - away, transformOrigin: '50% 52%'}}>
        <div style={{position: 'absolute', left: 960 - 760 * line, top: 600, width: 1520 * line, height: 3, background: C.accent}} />
        <div style={{position: 'absolute', left: 0, right: 0, top: 330, display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: 44}}>
          <Line at={B(48)} d={20}><Icon size={230} /></Line>
          <Line at={B(48) + 3} d={20}><div style={big(270, {letterSpacing: '-0.055em'})}>CanIGo</div></Line>
        </div>
        <div style={{position: 'absolute', left: 0, right: 0, top: 640, display: 'flex', justifyContent: 'center'}}>
          <Words at={B(50)} step={2} text="Know if you can get in, before you go." style={serif(84, {fontStyle: 'italic'})} />
        </div>
      </AbsoluteFill>
      <Vignette /><Grain />
    </Stage>
  );
};
function Easing2(t: number) { return t * t * t; }

/* ───────────── 4 · HOW (intro clip, one continuous camera) ───────────── */
const How: React.FC = () => {
  const f = useCurrentFrame();
  const a = B(56);
  const t = (f - a) / 30; // intro clip time
  const T = (sec: number) => a + S(sec);
  const keys: Key[] = [
    K(a - 8, 480, 270, 0.55, 960),
    K(a + 12, 480, 250, 1.5, 1180, 540, expo),
    K(T(1.6), 480, 165, 1.9),
    K(T(3.4), 480, 260, 1.7),
    K(T(5.4), 480, 470, 1.85),
    K(T(7.0), 480, 480, 1.9),
    K(T(7.5), 480, 300, 1.6),
    K(T(9.4), 480, 250, 1.7),
    K(T(10.1), 480, 170, 1.9),
    K(T(14.6), 480, 185, 1.95),
    K(T(15.6), 480, 380, 1.85),
    K(B(88), 480, 390, 1.95, 1250, 540, smooth)
  ];
  const cam = camAt(keys, f);
  const p = (wx: number, wy: number) => toScreen(cam, wx, wy);
  const walker = p(186, 505), city = p(186, 232), input = p(186, 155), verdict = p(196, 388);
  return (
    <Stage>
      <World cam={cam}><DotGrid /><Clip src="intro" t={t} x={0} y={0} w={960} h={540} cx={160} cw={640} /></World>
      <Note at={T(5.8)} out={T(7.2)} x={walker.x} y={walker.y} lx={600} ly={walker.y} align="right" label="1 · How you get around" sub="7 profiles · doors and steps" />
      <Note at={T(7.7)} out={T(9.6)} x={city.x} y={city.y} lx={600} ly={city.y} align="right" label="2 · Your city" sub="saved on the phone, works offline" />
      <Note at={T(10.3)} out={T(15.0)} x={input.x} y={input.y} lx={600} ly={input.y} align="right" label="3 · Where you want to go" />
      <Note at={T(15.6)} out={B(88) - 4} x={verdict.x} y={verdict.y} lx={600} ly={verdict.y} align="right" label="Me: walker, no steps" sub="Anne Frank Huis: red" color={C.no} />
      <Vignette o={0.6} /><Grain o={0.06} />
    </Stage>
  );
};

/* ───────────── 5 · SAME DOOR ───────────── */
const SameDoor: React.FC = () => {
  const f = useCurrentFrame();
  const a = B(88);
  const tc = 1.64 + (f - a) / 30;              // crutches clip time
  const tw = Math.max(4.3, 8.83 + (f - B(141)) / 30); // wheelchair clip: result lands on the drop
  const keys: Key[] = [
    K(a - 6, 480, 330, 1.5),
    K(a + 14, 480, 477, 1.85, 1250, 540, expo),
    K(a + S(2.6), 480, 477, 1.9),
    K(a + S(3.2), 480, 165, 1.85),
    K(B(99), 480, 170, 1.9),
    K(B(100) + 8, 480, 390, 1.85),
    K(B(111), 480, 395, 1.95, 1250, 540, smooth),
    K(B(113), 400, 470, 2.4),
    K(B(123), 400, 470, 2.55, 1250, 540, smooth),
    K(B(127), 860, 0, 1.02, 960, 205),
    K(B(140), 860, 0, 1.1, 960, 195, smooth),
    K(B(141) + 10, 860, 0, 1.17, 960, 190, expo),
    K(B(160), 860, 0, 1.2, 960, 190, smooth)
  ];
  const cam = camAt(keys, f);
  const p = (wx: number, wy: number) => toScreen(cam, wx, wy);
  const wIn = prog(f, B(131), 26);
  const split = prog(f, B(141), 7, inout);
  const dim = f < B(141) ? interpolate(f, [B(140), B(140) + 3], [0, 0.45], clamp) : 0;
  const london = p(186, 477), verd = p(196, 388), src = p(206, 474);
  const lL = p(166, 672), lR = p(926, 672);
  return (
    <Stage>
      <div style={{position: 'absolute', top: 0, bottom: 0, left: 960 - 960 * split, width: 960 * split, background: C.appPartial}} />
      <div style={{position: 'absolute', top: 0, bottom: 0, left: 960, width: 960 * split, background: C.appNo}} />
      <World cam={cam}>
        <div style={{opacity: 1 - split}}><DotGrid /></div>
        <Clip src="crutches" t={tc} x={0} y={0} w={960} h={1080} />
        <div style={{position: 'absolute', left: 0, top: 0, transform: `translateY(${(1 - wIn) * 500}px)`, opacity: wIn}}>
          <Clip src="wheelchair" t={tw} x={760} y={0} w={960} h={1080} />
        </div>
      </World>
      <AbsoluteFill style={{background: '#000', opacity: dim}} />
      <Note at={a + S(1.9)} out={a + S(3.3)} x={london.x} y={london.y} lx={600} ly={london.y} align="right" label="London · crutches profile" sub="62,250 places and entrances" />
      <Note at={B(101)} out={B(111)} x={verd.x} y={verd.y} lx={600} ly={verd.y} align="right" label="Crutches: up to 2 steps" sub="2 steps here: yellow" color={C.partial} />
      <Note at={B(113) + 6} out={B(124)} x={src.x} y={src.y} lx={560} ly={src.y} align="right" label="Every answer: source + date" sub="OpenStreetMap · 2025-10-14" />
      <div style={{position: 'absolute', left: 0, right: 0, top: 58, display: 'flex', justifyContent: 'center', gap: 28}}>
        <Line at={B(136)} out={B(160) - 6}><div style={serif(118, {color: split > 0.5 ? C.night : C.paper})}>Same door,</div></Line>
        <Line at={B(141)} out={B(160) - 4}><div style={serif(118, {fontStyle: 'italic', color: split > 0.5 ? C.night : C.accent})}>different answer.</div></Line>
      </div>
      <div style={{position: 'absolute', left: 0, right: 0, top: 96, display: 'flex', justifyContent: 'center'}}>
        <Line at={B(127)} out={B(136) - 6}><div style={mono(28, {color: C.paper})}>SAME PLACE · SAME DATA · NOW A MANUAL WHEELCHAIR</div></Line>
      </div>
      <Range a={B(143)} b={B(160)}>
        <div style={{position: 'absolute', left: lL.x, top: lL.y}}><Line at={B(143)} out={B(160) - 6}><div style={mono(26, {color: C.night, fontWeight: 600})}>CRUTCHES · UP TO 2 STEPS</div></Line></div>
        <div style={{position: 'absolute', left: lR.x, top: lR.y}}><Line at={B(144)} out={B(160) - 6}><div style={mono(26, {color: C.night, fontWeight: 600})}>MANUAL WHEELCHAIR · NO STEPS</div></Line></div>
      </Range>
      <Vignette o={split > 0 ? 0.25 : 0.6} /><Grain o={0.06} />
    </Stage>
  );
};

/* ───────────── 6 · ASK ───────────── */
const Ask: React.FC = () => {
  const f = useCurrentFrame();
  const a = B(160);
  const t = 11.8 + (f - a) / 30;
  const keys: Key[] = [
    K(a - 6, 480, 520, 1.45),
    K(a + 12, 480, 500, 1.7, 1250, 540, expo),
    K(a + S(1.7), 480, 560, 1.75),
    K(a + S(3.0), 480, 440, 1.8),
    K(a + S(4.6), 480, 440, 1.85),
    K(B(184), 480, 430, 1.95, 1250, 540, smooth)
  ];
  const cam = camAt(keys, f);
  const p = (wx: number, wy: number) => toScreen(cam, wx, wy);
  const msg = p(196, 445), chips = p(196, 366), call = p(470, 525);
  return (
    <Stage>
      <World cam={cam}><DotGrid /><Clip src="ask" t={t} x={0} y={0} w={960} h={1080} /></World>
      <div style={{position: 'absolute', left: 100, top: 130, width: 560}}>
        <Line at={a + 2} out={B(184) - 8}><div style={serif(110)}>Not sure?</div></Line>
        <Line at={a + 6} out={B(184) - 6}><div style={serif(110, {fontStyle: 'italic', color: C.accent})}>Ask them</div></Line>
        <Line at={a + 9} out={B(184) - 4}><div style={serif(110, {fontStyle: 'italic', color: C.accent})}>before you go.</div></Line>
      </div>
      <Note at={a + S(4.8)} out={a + S(6.4)} x={msg.x} y={msg.y} lx={600} ly={760} align="right" label="Your measurements," sub="written for you" />
      <Note at={a + S(6.8)} out={a + S(13.0)} x={chips.x} y={chips.y} lx={600} ly={760} align="right" label="In their language" sub="EN · TR · AZ · RU" />
      <Note at={B(179)} out={B(184) - 2} x={call.x} y={call.y} lx={600} ly={920} align="right" label="+ their phone number" />
      <Vignette o={0.6} /><Grain o={0.06} />
    </Stage>
  );
};

/* ───────────── 7 · CAFÉ ───────────── */
const Cafe: React.FC = () => {
  const f = useCurrentFrame();
  const a = B(184);
  const t = 6.45 + ((f - a) / 30) * 1.6;
  const keys: Key[] = [
    K(a - 6, 480, 470, 1.4),
    K(a + 12, 480, 460, 1.6, 1250, 540, expo),
    K(B(193), 480, 500, 1.7, 1250, 540, smooth)
  ];
  const cam = camAt(keys, f);
  return (
    <Stage>
      <World cam={cam}><DotGrid /><Clip src="cafe" t={t} x={0} y={0} w={960} h={1080} /></World>
      <div style={{position: 'absolute', left: 100, top: 230, width: 560}}>
        <Line at={a + 2}><div style={serif(130)}>Or tap</div></Line>
        <Line at={a + 5}><div style={serif(130, {fontStyle: 'italic', color: C.accent})}>Café.</div></Line>
        <div style={{height: 40}} />
        <Line at={a + 12}><div style={mono(26, {color: C.paper})}>every café nearby,</div></Line>
        <Line at={a + 14}><div style={mono(26, {color: C.paper})}>sorted for you</div></Line>
        <div style={{display: 'flex', gap: 14, marginTop: 22}}>
          {[C.yes, C.partial, C.no].map((c, i) => <div key={i} style={{width: 22, height: 22, borderRadius: 11, background: c, transform: `scale(${prog(f, a + 16 + i * 3, 10)})`}} />)}
        </div>
      </div>
      <Vignette o={0.6} /><Grain o={0.06} />
    </Stage>
  );
};

/* ───────────── 8 · CLOSE ───────────── */
const Close: React.FC = () => {
  const f = useCurrentFrame();
  const up = prog(f, B(201), 18, inout);
  const end = prog(f, B(209), 24);
  return (
    <Stage>
      <Range a={B(193)} b={B(209) + 2}>
        <Drift a={B(193)} b={B(209)} dx={0} ds={0.035}>
          <div style={{position: 'absolute', left: 0, right: 0, top: 380 - up * 170, display: 'flex', justifyContent: 'center', opacity: 1 - up * 0.55}}>
            <Words at={B(193)} out={B(208) - 6} step={2} text="I didn’t build this for pity." style={serif(130)} />
          </div>
          <div style={{position: 'absolute', left: 0, right: 0, top: 430, display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
            <Words at={B(201)} out={B(208) - 2} step={2} text="I built it so others don’t go" style={serif(130, {fontStyle: 'italic', color: C.accent})} />
            <Words at={B(201) + 8} out={B(208)} step={2} text="through what I did." style={serif(130, {fontStyle: 'italic', color: C.accent})} />
          </div>
        </Drift>
      </Range>
      <Range a={B(209)} b={TOTAL}>
        <AbsoluteFill style={{transform: `scale(${1.04 - 0.04 * end})`}}>
          <div style={{position: 'absolute', left: 0, right: 0, top: 300, display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: 36}}>
            <Line at={B(209)} d={20}><Icon size={170} /></Line>
            <Line at={B(209) + 3} d={20}><div style={big(200, {letterSpacing: '-0.055em'})}>CanIGo</div></Line>
          </div>
          <div style={{position: 'absolute', left: 0, right: 0, top: 540, display: 'flex', justifyContent: 'center'}}>
            <Line at={B(211)}><div style={serif(64, {fontStyle: 'italic'})}>Know if you can get in, before you go.</div></Line>
          </div>
          <div style={{position: 'absolute', left: 0, right: 0, top: 680, display: 'flex', justifyContent: 'center', gap: 70}}>
            <Line at={B(213)}><div style={mono(34, {color: C.accent, fontWeight: 600})}>canigo-app.pages.dev</div></Line>
            <Line at={B(214)}><div style={mono(34, {color: C.paper})}>github.com/oomer583/canigo</div></Line>
          </div>
          <div style={{position: 'absolute', left: 0, right: 0, top: 930, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10}}>
            <Line at={B(216)}><div style={mono(22)}>Ömer · 15 · Baku — Arbiter Hacks V1</div></Line>
            <Line at={B(217)}><div style={mono(19, {opacity: .75})}>Data © OpenStreetMap contributors · accessibility.cloud · Music: Artur Aravidi via Pixabay</div></Line>
          </div>
        </AbsoluteFill>
      </Range>
      <Vignette /><Grain />
    </Stage>
  );
};

export const Film: React.FC = () => (
  <AbsoluteFill style={{background: C.night}}>
    <Range a={0} b={B(15)}><Hook /></Range>
    <Range a={B(15)} b={B(47)}><Problem /></Range>
    <Range a={B(47)} b={B(56)}><Reveal /></Range>
    <Range a={B(56)} b={B(88)}><How /></Range>
    <Range a={B(88)} b={B(160)}><SameDoor /></Range>
    <Range a={B(160)} b={B(184)}><Ask /></Range>
    <Range a={B(184)} b={B(193)}><Cafe /></Range>
    <Range a={B(193)} b={TOTAL}><Close /></Range>
    <Audio src={staticFile('audio/mix.wav')} />
  </AbsoluteFill>
);
