// Procedural Geiger-counter clicks. One short bandpass-filtered noise burst per spike.
// Reuses a single noise buffer across all clicks to avoid GC churn.

export interface ClickAudio {
  enable(): Promise<boolean>;
  disable(): void;
  isEnabled(): boolean;
  click(channel: string): void;
  unlockTone(channel: string): void;
}

const PITCHES: Record<string, number> = {
  avb: 1100,
  awc: 1700,
  ash: 600,
  afd: 1300,
  asj: 1900,
};

const MASTER_GAIN = 0.18;

// Loose audio coupling: only ~half of spikes click, and never two within 90ms.
// Keeps high-rate bursts feeling like activity instead of morse code.
const PLAY_PROBABILITY = 0.5;
const REFRACTORY_SEC = 0.09;

export function createClickAudio(): ClickAudio {
  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  let noiseBuf: AudioBuffer | null = null;
  let enabled = false;
  let lastClickAt = -Infinity;

  async function enable(): Promise<boolean> {
    if (!ctx) {
      try {
        const AudioCtor =
          window.AudioContext ??
          (window as unknown as { webkitAudioContext?: typeof AudioContext })
            .webkitAudioContext;
        if (!AudioCtor) return false;
        ctx = new AudioCtor();

        master = ctx.createGain();
        master.gain.value = MASTER_GAIN;
        master.connect(ctx.destination);

        // Pre-bake 100ms of white noise — every click resamples a slice of this
        const length = Math.floor(ctx.sampleRate * 0.1);
        noiseBuf = ctx.createBuffer(1, length, ctx.sampleRate);
        const data = noiseBuf.getChannelData(0);
        for (let i = 0; i < length; i++) {
          data[i] = Math.random() * 2 - 1;
        }
      } catch {
        return false;
      }
    }
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
    enabled = true;
    return true;
  }

  function disable(): void {
    enabled = false;
  }

  function click(channel: string): void {
    if (!enabled || !ctx || !master || !noiseBuf) return;
    if (Math.random() > PLAY_PROBABILITY) return;

    const t0 = ctx.currentTime;
    if (t0 - lastClickAt < REFRACTORY_SEC) return;
    lastClickAt = t0;

    const pitch = PITCHES[channel] ?? 1100;

    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = pitch;
    filter.Q.value = 9;

    const env = ctx.createGain();
    env.gain.setValueAtTime(0, t0);
    env.gain.linearRampToValueAtTime(0.55, t0 + 0.001);
    env.gain.exponentialRampToValueAtTime(0.001, t0 + 0.04);

    src.connect(filter);
    filter.connect(env);
    env.connect(master);

    src.start(t0);
    src.stop(t0 + 0.06);
  }

  function unlockTone(channel: string): void {
    if (!enabled || !ctx || !master) return;

    const t0 = ctx.currentTime;
    const target = PITCHES[channel] ?? 1100;

    // Two-octave-rise sine = "instrument warming up" feel
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(target / 2.5, t0);
    osc.frequency.exponentialRampToValueAtTime(target, t0 + 0.55);

    const env = ctx.createGain();
    env.gain.setValueAtTime(0, t0);
    env.gain.linearRampToValueAtTime(0.22, t0 + 0.06);
    env.gain.exponentialRampToValueAtTime(0.001, t0 + 0.85);

    osc.connect(env);
    env.connect(master);
    osc.start(t0);
    osc.stop(t0 + 0.9);
  }

  return {
    enable,
    disable,
    isEnabled: () => enabled,
    click,
    unlockTone,
  };
}
