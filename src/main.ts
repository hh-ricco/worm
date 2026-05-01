import { createStage, type Stage } from './render/stage';
import { createWorm, tickWorm, SPEED_MIN, SPEED_MAX } from './sim/worm';
import {
  createSpikeChannel,
  setSpikeRate,
  tickSpikeChannel,
  type SpikeChannel,
} from './sim/spikes';
import { createSpikeTrace, type SpikeTrace } from './render/spike-trace';
import { createClickAudio } from './audio/click';
import { createNarrative } from './ui/narrative';
import { createToolController, TOOL_IDS, type ToolId } from './ui/tools';
import { chapter1Beats } from './content/chapter1';
import { $ } from './helpers';
import './style.css';

type NeuronId = 'AVB' | 'AWC' | 'ASH' | 'AFD' | 'ASJ';
const NEURON_IDS: readonly NeuronId[] = [
  'AVB',
  'AWC',
  'ASH',
  'AFD',
  'ASJ',
] as const;

const TOOL_TO_NEURON: Record<ToolId, NeuronId> = {
  food: 'AWC',
  danger: 'ASH',
  temperature: 'AFD',
  light: 'ASJ',
};

const NEURON_BASELINE: Record<NeuronId, number> = {
  AVB: 1, // overridden each frame by worm speed
  AWC: 1,
  ASH: 0.8,
  AFD: 1.2,
  ASJ: 0.6,
};

const NEURON_COLOR_VAR: Record<NeuronId, string> = {
  AVB: '--accent-avb',
  AWC: '--accent-awc',
  ASH: '--accent-ash',
  AFD: '--accent-afd',
  ASJ: '--accent-asj',
};

const audio = createClickAudio();

function readVar(name: string, fallback: string): string {
  return (
    getComputedStyle(document.documentElement).getPropertyValue(name).trim() ||
    fallback
  );
}

const host = $('#petri-stage');
if (!host) throw new Error('petri host not found');

console.log(
  '[Worm] host dims at init:',
  host.clientWidth,
  '×',
  host.clientHeight,
  '| dpr:',
  window.devicePixelRatio,
);

let stage: Stage;
try {
  stage = await createStage(host);
} catch (err) {
  console.error('PixiJS initialization failed:', err);
  host.innerHTML =
    '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#888;font-size:18px">无法初始化渲染器，请检查浏览器是否支持 WebGL。</div>';
  throw err;
}

console.log(
  '[Worm] renderer ready:',
  stage.app.screen.width,
  '×',
  stage.app.screen.height,
  '| dish radius:',
  stage.getDishRadius(),
);

const worm = createWorm();

// Instantiate every neuron channel + trace renderer up front. Locked ones run at rate 0 (silent + no spikes).
const channels = new Map<NeuronId, SpikeChannel>();
const traces = new Map<NeuronId, SpikeTrace>();

for (const id of NEURON_IDS) {
  const initialRate = id === 'AVB' ? 1 : 0;
  const audioKey = id.toLowerCase();
  const ch = createSpikeChannel(initialRate, 3, () => audio.click(audioKey));

  const canvas = $<HTMLCanvasElement>(`canvas[data-channel="${id}"]`);
  if (!canvas) throw new Error(`canvas not found for ${id}`);
  const color = readVar(NEURON_COLOR_VAR[id], '#888');
  const trace = createSpikeTrace(canvas, ch, color);

  channels.set(id, ch);
  traces.set(id, trace);
}

const avb = channels.get('AVB')!;

const audioToggle = $<HTMLButtonElement>('#audio-toggle');
if (audioToggle) {
  audioToggle.addEventListener('click', async () => {
    if (audio.isEnabled()) {
      audio.disable();
      audioToggle.textContent = '🔇';
      audioToggle.title = '音效已关闭（点击启用）';
    } else {
      const ok = await audio.enable();
      if (ok) {
        audioToggle.textContent = '🔊';
        audioToggle.title = '音效已开启（点击关闭）';
      }
    }
  });
}

const toolButtons = new Map<ToolId, HTMLButtonElement>();
for (const id of TOOL_IDS) {
  const btn = $<HTMLButtonElement>(`button.tool[data-tool="${id}"]`);
  if (btn) toolButtons.set(id, btn);
}
const tools = createToolController(toolButtons);

function unlockNeuron(neuronId: NeuronId): void {
  const ch = channels.get(neuronId);
  if (!ch) return;

  const channelEl = $(`.channel[data-neuron="${neuronId}"]`);
  if (channelEl) {
    channelEl.classList.remove('locked');
    channelEl.classList.add('unlocking');
    window.setTimeout(() => channelEl.classList.remove('unlocking'), 1200);
  }

  setSpikeRate(ch, NEURON_BASELINE[neuronId]);
  audio.unlockTone(neuronId.toLowerCase());
}

tools.onUnlock((toolId) => {
  unlockNeuron(TOOL_TO_NEURON[toolId]);
});

// Dev shortcuts — will be superseded by chapter-driven unlock
window.addEventListener('keydown', (e) => {
  if (e.target instanceof HTMLElement && e.target.closest('input, textarea')) return;
  if (e.key === '1') tools.unlock('food');
  else if (e.key === '2') tools.unlock('danger');
  else if (e.key === '3') tools.unlock('temperature');
  else if (e.key === '4') tools.unlock('light');
  else if (e.key === '0') tools.unlockAll();
  else if (e.key === 'Escape') tools.deselect();
});

const narrativeEl = $('#narrative-text');
if (!narrativeEl) throw new Error('narrative element not found');
const narrative = createNarrative(narrativeEl, chapter1Beats);

const narrativeBar = $('#narrative-bar');
if (narrativeBar) {
  const advance = () => {
    narrative.advance();
    if (narrative.isAtLast()) narrativeBar.classList.add('complete');
  };
  narrativeBar.addEventListener('click', advance);
  narrativeBar.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      advance();
    }
  });
}

const SIM_DT = 1 / 30;
let acc = 0;
const chapterStartMs = performance.now();
let last = chapterStartMs;
let frameCount = 0;

stage.app.ticker.add(() => {
  frameCount++;
  if (frameCount === 1) {
    console.log(
      '[Worm] ticker started, canvas in DOM:',
      document.querySelector('#petri-stage canvas') !== null,
      '| canvas size:',
      (stage.app.canvas as HTMLCanvasElement).width,
      '×',
      (stage.app.canvas as HTMLCanvasElement).height,
    );
    console.log('[Worm] channels:', channels.size, '| traces:', traces.size);
  }
  if (frameCount % 120 === 0) {
    console.log(
      '[Worm] frame',
      frameCount,
      '| worm pos:',
      worm.position.x.toFixed(0),
      worm.position.y.toFixed(0),
      '| avb rate:',
      avb.rate.toFixed(1),
    );
  }
  const nowMs = performance.now();
  const dt = Math.min((nowMs - last) / 1000, 0.1);
  last = nowMs;
  acc += dt;

  while (acc >= SIM_DT) {
    tickWorm(worm, { dishRadius: stage.getDishRadius() }, SIM_DT);
    acc -= SIM_DT;
  }

  const nowS = nowMs / 1000;

  // AVB rate is a direct function of worm speed — strong coupling, ~10× contrast
  const speedNorm = (worm.speed - SPEED_MIN) / (SPEED_MAX - SPEED_MIN);
  const speedClamped = Math.max(0, Math.min(1, speedNorm));
  setSpikeRate(avb, 1 + speedClamped * 9);

  // Tick + render every channel. Locked channels stay silent (rate 0 → no spikes).
  for (const ch of channels.values()) {
    tickSpikeChannel(ch, nowS, dt);
  }
  for (const trace of traces.values()) {
    trace.draw(nowS);
  }

  // Subtle whole-body sway, ~0.5 Hz, amplitude scales gently with speed
  const sway = Math.sin(nowS * 3) * (0.04 + speedClamped * 0.08);
  stage.worm.position.set(worm.position.x, worm.position.y);
  stage.worm.rotation = worm.heading + sway;

  narrative.update((nowMs - chapterStartMs) / 1000);
});
