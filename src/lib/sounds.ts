// Tiny WebAudio sound effects — synthesized in-browser, zero downloads.
// Kept very subtle and short to fit the cozy, minimal library feel.

const LS_KEY = "curio_sound_enabled";

let ctx: AudioContext | null = null;
function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    try {
      const Ctor = window.AudioContext
        || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      ctx = new Ctor();
    } catch { return null; }
  }
  if (ctx && ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

export function isSoundEnabled(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const v = localStorage.getItem(LS_KEY);
    return v === null ? true : v === "1";
  } catch { return true; }
}

export function setSoundEnabled(on: boolean) {
  try { localStorage.setItem(LS_KEY, on ? "1" : "0"); } catch { /* ignore */ }
  try { window.dispatchEvent(new Event("curio:sound-changed")); } catch { /* ignore */ }
}

interface ToneOpts {
  freq: number;
  duration?: number;
  type?: OscillatorType;
  gain?: number;
  sweepTo?: number;
  delay?: number;
}

function tone({ freq, duration = 0.12, type = "sine", gain = 0.05, sweepTo, delay = 0 }: ToneOpts) {
  if (!isSoundEnabled()) return;
  const ac = getCtx();
  if (!ac) return;
  try {
    const start = ac.currentTime + delay;
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    if (sweepTo) osc.frequency.exponentialRampToValueAtTime(sweepTo, start + duration);
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(gain, start + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(g).connect(ac.destination);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  } catch { /* ignore audio errors */ }
}

export const Sfx = {
  click() { tone({ freq: 880, duration: 0.045, type: "triangle", gain: 0.022 }); },
  page() { tone({ freq: 520, sweepTo: 260, duration: 0.18, type: "sine", gain: 0.035 }); },
  spinStart() { tone({ freq: 220, sweepTo: 660, duration: 0.55, type: "sawtooth", gain: 0.03 }); },
  spinLand() {
    tone({ freq: 880, duration: 0.09, type: "triangle", gain: 0.055 });
    tone({ freq: 1320, duration: 0.12, type: "sine", gain: 0.045, delay: 0.07 });
  },
  xp() {
    tone({ freq: 784, duration: 0.1, type: "triangle", gain: 0.045 });
    tone({ freq: 988, duration: 0.1, type: "triangle", gain: 0.045, delay: 0.08 });
    tone({ freq: 1318, duration: 0.16, type: "sine", gain: 0.045, delay: 0.16 });
  },
  streak() {
    tone({ freq: 523, duration: 0.12, type: "triangle", gain: 0.055 });
    tone({ freq: 659, duration: 0.12, type: "triangle", gain: 0.055, delay: 0.1 });
    tone({ freq: 784, duration: 0.18, type: "triangle", gain: 0.055, delay: 0.2 });
    tone({ freq: 1046, duration: 0.26, type: "sine", gain: 0.055, delay: 0.32 });
  },
};
