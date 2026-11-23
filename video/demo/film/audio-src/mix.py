# Builds public/audio/mix.wav: music (low-passed during the story, one silent beat before the drop) + soft SFX in the same space.
import json, subprocess, numpy as np
from scipy.signal import butter, sosfilt, sosfilt_zi, fftconvolve
SR = 48000
BEAT = 60 / 99.2; PHASE = 0.3309
bt = lambda i: PHASE + BEAT * i
fr = lambda f: f / 30
B = lambda i: round(bt(i) * 30)  # frame of beat i (matches src/lib.tsx)
def load(path):
    raw = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', path, '-f', 'f32le', '-ac', '2', '-ar', str(SR), '-'], capture_output=True).stdout
    return np.frombuffer(raw, dtype=np.float32).reshape(-1, 2).copy()
m = load('public/audio/music.mp3')

# 1) time-varying low-pass: "heard through a door" until the reveal, opens over two beats
def cutoff(t):
    a, b = bt(46), bt(48)
    if t < a: return 750.0
    if t > b: return None
    u = (t - a) / (b - a); u = u * u * (3 - 2 * u)
    return float(np.exp(np.log(750) + (np.log(19000) - np.log(750)) * u))
blk = 256; out = m.copy(); zi = None
end = int(bt(48) * SR) + blk
for s0 in range(0, end, blk):
    c = cutoff(s0 / SR)
    seg = m[s0:s0 + blk]
    if c is None: break
    sos = butter(2, c, btype='low', fs=SR, output='sos')
    if zi is None: zi = np.stack([sosfilt_zi(sos) * seg[0, ch] for ch in range(2)], axis=-1)
    y = np.empty_like(seg)
    for ch in range(2):
        y[:, ch], zi[:, :, ch] = sosfilt(sos, seg[:, ch], zi=zi[:, :, ch])
    # compensate the level lost to the filter a little, so the story isn't too quiet
    out[s0:s0 + blk] = y * (0.55 if c < 18000 else 1.0)
# crossfade filtered -> dry over the last block region
m = out

# 2) one silent beat before source beat 140 (the drop)
g = int(round(bt(140) * SR)); gap = int(round(BEAT * SR))
fade = int(0.012 * SR)
pre = m[:g].copy(); pre[-fade:] *= np.linspace(1, 0, fade)[:, None]
post = m[g:].copy(); post[:int(0.003 * SR)] *= np.linspace(0, 1, int(0.003 * SR))[:, None]
mus = np.concatenate([pre, np.zeros((gap, 2), np.float32), post])
N = len(mus)
print('length', N / SR)

# 3) SFX (procedural, soft; put through one small room so they sit with the music)
rng = np.random.default_rng(7)
def pink(n):
    w = rng.standard_normal(n); X = np.fft.rfft(w); f = np.fft.rfftfreq(n); X[1:] /= np.sqrt(f[1:]); X[0] = 0
    y = np.fft.irfft(X, n); return y / np.abs(y).max()
def whoosh(d=0.75, lo=250, hi=2400, peak=0.62):
    n = int(d * SR); x = pink(n); t = np.linspace(0, 1, n)
    env = np.where(t < peak, (t / peak) ** 2.2, ((1 - t) / (1 - peak)) ** 1.6)
    y = np.zeros(n); h = 512
    for s0 in range(0, n, h):
        u = s0 / n; c = lo + (hi - lo) * np.sin(np.pi * min(u / peak, 1) * 0.5) if u < peak else hi - (hi - lo * 1.5) * (u - peak) / (1 - peak)
        sos = butter(2, [max(80, c * 0.55), min(SR / 2 - 100, c * 1.6)], btype='band', fs=SR, output='sos')
        y[s0:s0 + h] = sosfilt(sos, x[max(0, s0 - 2048):s0 + h])[-len(x[s0:s0 + h]):]
    y *= env; y /= np.abs(y).max() + 1e-9
    pan = np.linspace(-0.5, 0.5, n)
    return np.stack([y * np.sqrt(0.5 - pan / 2), y * np.sqrt(0.5 + pan / 2)], 1)
def tick(f0=1900):
    n = int(0.09 * SR); t = np.arange(n) / SR
    y = np.sin(2 * np.pi * f0 * t) * np.exp(-t / 0.012) * 0.7
    nz = sosfilt(butter(2, 2500, 'high', fs=SR, output='sos'), rng.standard_normal(n)) * np.exp(-t / 0.003) * 0.5
    y = y + nz; y /= np.abs(y).max(); return np.stack([y, y], 1)
def thump():
    n = int(1.1 * SR); t = np.arange(n) / SR
    f = 46 + 30 * np.exp(-t / 0.08); ph = 2 * np.pi * np.cumsum(f) / SR
    y = (np.sin(ph) + 0.25 * np.sin(2 * ph)) * np.exp(-t / 0.32)
    y += sosfilt(butter(2, 180, 'low', fs=SR, output='sos'), rng.standard_normal(n)) * np.exp(-t / 0.05) * 0.6
    y /= np.abs(y).max(); return np.stack([y, y], 1)
def swell(d):
    n = int(d * SR); x = pink(n); t = np.linspace(0, 1, n)
    y = np.zeros(n); h = 512
    for s0 in range(0, n, h):
        c = 300 * (12 ** (s0 / n))
        sos = butter(2, c, 'low', fs=SR, output='sos'); y[s0:s0 + h] = sosfilt(sos, x[max(0, s0 - 2048):s0 + h])[-len(x[s0:s0 + h]):]
    y *= t ** 2.5; y /= np.abs(y).max(); return np.stack([y, y], 1)

sfx = np.zeros((N, 2))
def put(sig, t, db, align='start'):
    s = int(round(t * SR)); g = 10 ** (db / 20)
    if align == 'peak': s -= int(np.argmax(np.abs(sig[:, 0])))
    if align == 'end': s -= len(sig)
    s = max(0, s); e = min(N, s + len(sig)); sfx[s:e] += sig[:e - s] * g
W = whoosh()
# whoosh peaks land on the cut frame
for i, db in [(15, -27), (28, -29), (34, -28), (56, -27), (88, -28), (127, -32), (131, -31), (160, -28), (184, -29), (193, -30)]:
    put(W, fr(B(i)) + 0.02, db, 'peak')
put(whoosh(1.4, 180, 1600, 0.8), fr(B(48)) + 0.05, -25, 'peak')  # reveal: slow air
put(swell(BEAT * 4), fr(B(140)), -30, 'end')                       # into the silent beat
put(thump(), fr(B(141)), -9)                                       # the drop
put(tick(1500), fr(B(11)) + 0.03, -31)                              # profile chip in the hook
# real clicks in the recordings (mousedown ≈ 0.1 s before the UI changes)
a = fr(B(56))
for c in [5.7, 9.6, 14.53]: put(tick(), a + c, -30)
a = fr(B(88))
for c in [4.07, 7.7]: put(tick(), a + c - 1.64, -30)
put(tick(), fr(B(141)) + (7.68 - 8.83), -28)                       # the Check click before the silent beat
a = fr(B(160))
for c in [12.9, 18.07, 20.43, 22.8, 25.17]: put(tick(2100), a + c - 11.8, -31)

# before the reveal the SFX are heard "through the door" too, like the music
cut = int(bt(48) * SR)
sos = butter(2, 1600, 'low', fs=SR, output='sos')
sfx[:cut] = np.stack([sosfilt(sos, sfx[:cut, ch]) for ch in range(2)], 1) * 1.4

# small room
ir_n = int(0.7 * SR); ti = np.arange(ir_n) / SR
ir = rng.standard_normal((ir_n, 2)) * np.exp(-ti / 0.18)[:, None]; ir[:int(0.004 * SR)] = 0; ir /= np.abs(ir).sum(0) ** 0.5 * 6
wet = np.stack([fftconvolve(sfx[:, ch], ir[:, ch])[:N] for ch in range(2)], 1)
sfx_room = sfx * 0.85 + wet * 0.35

mix = mus + sfx_room
mix /= max(1.0, np.abs(mix).max() / 0.95)
import wave
pcm = (np.clip(mix, -1, 1) * 32767).astype('<i2')
with wave.open('audio-src/premaster.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
# two-pass linear loudnorm: one gain for the whole film, so the "door opens" level change survives
r = subprocess.run(['ffmpeg', '-hide_banner', '-i', 'audio-src/premaster.wav', '-af', 'loudnorm=I=-14:TP=-1.5:LRA=20:print_format=json', '-f', 'null', '-'], capture_output=True, text=True).stderr
js = json.loads(r[r.rindex('{'):r.rindex('}') + 1])
af = f"loudnorm=I=-14:TP=-1.5:LRA=20:linear=true:measured_I={js['input_i']}:measured_TP={js['input_tp']}:measured_LRA={js['input_lra']}:measured_thresh={js['input_thresh']}:offset={js['target_offset']}"
subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', 'audio-src/premaster.wav', '-af', af, '-ar', str(SR), 'public/audio/mix.wav'], check=True)
print('ok')
