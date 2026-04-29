import type { SpikeChannel } from '../sim/spikes';

export interface SpikeTrace {
  draw(now: number): void;
  destroy(): void;
}

export function createSpikeTrace(
  canvas: HTMLCanvasElement,
  channel: SpikeChannel,
  color: string,
): SpikeTrace {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to acquire 2d context');

  let dpr = window.devicePixelRatio || 1;
  let w = 0;
  let h = 0;

  const resize = (): void => {
    dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    w = rect.width;
    h = rect.height;
    canvas.width = Math.max(1, Math.floor(w * dpr));
    canvas.height = Math.max(1, Math.floor(h * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  resize();

  const draw = (now: number): void => {
    if (w === 0 || h === 0) return;

    ctx.clearRect(0, 0, w, h);

    // Faint vertical gridlines every 0.5s, helps the eye gauge frequency
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;
    const tickSec = 0.5;
    const ticks = Math.ceil(channel.windowSec / tickSec);
    for (let i = 1; i <= ticks; i++) {
      const x = w - ((i * tickSec) / channel.windowSec) * w;
      ctx.beginPath();
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, h);
      ctx.stroke();
    }

    // Centerline
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.stroke();

    // Spikes
    const padY = h * 0.18;
    const top = padY;
    const bot = h - padY;

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.shadowColor = color;
    ctx.shadowBlur = 5;

    for (const t of channel.spikes) {
      const age = now - t;
      if (age < 0 || age > channel.windowSec) continue;
      const x = w - (age / channel.windowSec) * w;
      ctx.beginPath();
      ctx.moveTo(x + 0.5, top);
      ctx.lineTo(x + 0.5, bot);
      ctx.stroke();
    }

    ctx.shadowBlur = 0;
  };

  return {
    draw,
    destroy: () => ro.disconnect(),
  };
}
