"""
Procedural audio generator (stdlib only) for Corvus Protocol.
Outputs royalty-free placeholder SFX + a seamless dark-ambient music loop.
Swap in pro audio / ElevenLabs voice later at the same paths. Run: python scripts/gen_audio.py
"""
import math, os, struct, wave

SR = 22050
ROOT = os.path.join(os.path.dirname(__file__), "..", "assets", "audio")
SFX = os.path.join(ROOT, "sfx")
MUS = os.path.join(ROOT, "music")
os.makedirs(SFX, exist_ok=True)
os.makedirs(MUS, exist_ok=True)


def write(path, samples, amp=0.9):
    peak = max(1e-6, max(abs(s) for s in samples))
    scale = amp / peak
    with wave.open(path, "w") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes(b"".join(struct.pack("<h", int(max(-1, min(1, s * scale)) * 32767)) for s in samples))


def env(i, n, a=0.01, d=0.2, s=0.6, r=0.3):
    """ADSR 0..1 over sample index i of n."""
    t = i / n
    if t < a: return t / a
    if t < a + d: return 1 - (1 - s) * (t - a) / d
    if t < 1 - r: return s
    return s * max(0.0, (1 - t) / r)


def tone(freq, dur, fn=math.sin, vib=0.0, vibf=6.0):
    n = int(SR * dur)
    out = []
    for i in range(n):
        t = i / SR
        f = freq * (1 + vib * math.sin(2 * math.pi * vibf * t))
        out.append(fn(2 * math.pi * f * t))
    return out, n


def sweep(f0, f1, dur, fn=math.sin):
    n = int(SR * dur); out = []
    for i in range(n):
        t = i / SR; f = f0 + (f1 - f0) * (i / n)
        out.append(fn(2 * math.pi * f * t))
    return out, n


def mix(*layers):
    n = max(len(l) for l in layers)
    out = [0.0] * n
    for l in layers:
        for i, v in enumerate(l):
            out[i] += v
    return out


def apply_env(sig, **kw):
    n = len(sig)
    return [sig[i] * env(i, n, **kw) for i in range(n)]


# ---- SFX ----
def sfx_click():
    s, n = tone(1200, 0.05); return apply_env(s, a=0.005, d=0.02, s=0.2, r=0.5)

def sfx_place():
    s, _ = sweep(620, 200, 0.32)
    return apply_env(s, a=0.02, d=0.1, s=0.5, r=0.5)

def sfx_hit():
    s, _ = tone(320, 0.09); return apply_env(s, a=0.002, d=0.04, s=0.3, r=0.5)

def sfx_crit():
    a, n = tone(880, 0.2); b, _ = tone(1320, 0.2)
    return apply_env(mix(a, [x * 0.6 for x in b]), a=0.004, d=0.06, s=0.4, r=0.5)

def sfx_death():
    s, _ = sweep(420, 90, 0.34, fn=lambda x: math.sin(x))
    return apply_env(s, a=0.01, d=0.1, s=0.4, r=0.6)

def sfx_waveclear():
    parts = []
    for f in (523.25, 659.25, 783.99):
        s, _ = tone(f, 0.22); parts += apply_env(s, a=0.01, d=0.08, s=0.5, r=0.5)
    return parts

def sfx_boss():
    a, _ = tone(110, 1.0, vib=0.01, vibf=5); b, _ = tone(55, 1.0)
    return apply_env(mix(a, b), a=0.15, d=0.2, s=0.7, r=0.4)

def sfx_win():
    parts = []
    for f in (523.25, 659.25, 783.99, 1046.5):
        s, _ = tone(f, 0.35); parts = mix(parts, apply_env(s, a=0.02, d=0.1, s=0.6, r=0.5)) if parts else apply_env(s, a=0.02, d=0.1, s=0.6, r=0.5)
    return parts

def sfx_lose():
    s, _ = sweep(440, 196, 0.7); return apply_env(s, a=0.02, d=0.2, s=0.5, r=0.5)


for name, fn in [("click", sfx_click), ("place", sfx_place), ("hit", sfx_hit), ("crit", sfx_crit),
                 ("death", sfx_death), ("waveclear", sfx_waveclear), ("boss", sfx_boss),
                 ("win", sfx_win), ("lose", sfx_lose)]:
    write(os.path.join(SFX, f"{name}.wav"), fn(), amp=0.85)

# ---- Ambient music loop (seamless ~16s, A-minor, dark) ----
def ambient():
    dur = 16.0; n = int(SR * dur); out = [0.0] * n
    # low drones (A1, A2) — steady bed
    for freq, a in ((55.0, 0.5), (110.0, 0.3)):
        for i in range(n):
            out[i] += a * math.sin(2 * math.pi * freq * i / SR)
    # slow pad chord Am (A3 C4 E4) with a gentle volume LFO
    for freq, a in ((220.0, 0.16), (261.63, 0.13), (329.63, 0.13)):
        for i in range(n):
            lfo = 0.6 + 0.4 * math.sin(2 * math.pi * (i / SR) / 8.0)
            out[i] += a * lfo * math.sin(2 * math.pi * freq * i / SR)
    # sparse bell arpeggio (A4 E5 C5 E4), one note per 2s, soft decay
    arp = [440.0, 659.25, 523.25, 329.63, 440.0, 659.25, 783.99, 659.25]
    step = int(SR * 2.0)
    for k, f in enumerate(arp):
        start = k * step
        if start >= n: break
        ln = min(step, n - start)
        for i in range(ln):
            e = math.exp(-3.0 * i / ln)  # plucked decay
            out[start + i] += 0.14 * e * math.sin(2 * math.pi * f * i / SR)
    # equal-power crossfade the tail into the head for a seamless loop
    xf = int(SR * 1.5)
    for i in range(xf):
        g = i / xf
        out[i] = out[i] * g + out[n - xf + i] * (1 - g)
    return out[: n - xf]  # drop the now-duplicated tail

write(os.path.join(MUS, "ambient.wav"), ambient(), amp=0.5)
print("audio generated:", os.listdir(SFX), "+ music/ambient.wav")
