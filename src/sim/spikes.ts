export interface SpikeChannel {
  spikes: number[];
  rate: number;
  targetRate: number;
  windowSec: number;
  onSpike?: () => void;
}

export function createSpikeChannel(
  baselineHz: number,
  windowSec = 3,
  onSpike?: () => void,
): SpikeChannel {
  return {
    spikes: [],
    rate: baselineHz,
    targetRate: baselineHz,
    windowSec,
    onSpike,
  };
}

export function setSpikeRate(ch: SpikeChannel, hz: number): void {
  ch.targetRate = hz;
}

export function tickSpikeChannel(
  ch: SpikeChannel,
  now: number,
  dt: number,
): void {
  // No smoothing — rate follows target exactly so coupling to upstream signals is instant
  ch.rate = ch.targetRate;

  // Poisson sampling: P(spike in dt) = rate * dt for small rate*dt
  if (Math.random() < ch.rate * dt) {
    ch.spikes.push(now);
    ch.onSpike?.();
  }

  // Drop spikes that have scrolled off the window
  const cutoff = now - ch.windowSec;
  while (ch.spikes.length > 0 && ch.spikes[0] < cutoff) {
    ch.spikes.shift();
  }
}
