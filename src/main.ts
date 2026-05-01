import {
  createStage,
  drawFood,
  drawDangerLine,
  clearDangerLine,
  type Stage,
} from './render/stage';
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
import {
  createFood,
  foodProximity,
  foodAttraction,
  isNearFood,
  FOOD_RADIUS,
  type Food,
} from './sim/food';
import { $, rand, TAU } from './helpers';
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

let food: Food | null = null;

function placeFood(): void {
  const r = stage.getDishRadius();
  const margin = 60;
  const maxDist = r - margin - 20;
  const angle = rand(0, TAU);
  const dist = rand(20, maxDist);
  food = createFood(Math.cos(angle) * dist, Math.sin(angle) * dist);
}

function clearFood(): void {
  food = null;
  stage.food.clear();
}

let dangerActive = false;
let lastEatTime = -90; // worm starts hungry
const HUNGER_THRESHOLD = 15; // seconds before worm will brave the danger line
const WORM_HALF_LEN = 35;
const WORM_HALF_W = 13;
const DANGER_MARGIN = 4; // extra px beyond body extent

function wormXExtent(): number {
  return Math.abs(Math.cos(worm.heading)) * WORM_HALF_LEN +
         Math.abs(Math.sin(worm.heading)) * WORM_HALF_W;
}

function hunger(nowS: number): number {
  return nowS - lastEatTime;
}

function isFoodAcrossLine(): boolean {
  if (!food || !food.active) return false;
  const wx = worm.position.x;
  // When worm is near the midline, use heading to infer which side it's coming from
  const wormSide = Math.abs(wx) < 8
    ? (Math.cos(worm.heading) > 0 ? -1 : 1)
    : Math.sign(wx);
  const foodSide = Math.sign(food.position.x);
  return wormSide !== 0 && foodSide !== 0 && wormSide !== foodSide;
}

function isBrave(nowS: number): boolean {
  return hunger(nowS) > HUNGER_THRESHOLD && isFoodAcrossLine();
}

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
const awc = channels.get('AWC')!;
const ash = channels.get('ASH')!;

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

tools.onChange((toolId, state) => {
  if (toolId === 'food') {
    if (state === 'active') {
      placeFood();
    } else if (state === 'idle' && food && !food.active) {
      clearFood();
    }
  }
  if (toolId === 'danger') {
    if (state === 'active') {
      dangerActive = true;
      drawDangerLine(stage.dangerLine, stage.getDishRadius());
    } else {
      // Defer — if another tool stole focus, keep the line; if user explicitly
      // deselected danger (no other tool active), turn it off.
      setTimeout(() => {
        if (tools.getActive() === null) {
          dangerActive = false;
          clearDangerLine(stage.dangerLine);
        }
      }, 0);
    }
  }
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

narrative.onAction((action) => {
  if (action === 'unlock-food') {
    tools.unlock('food');
  }
});

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
  const nowS = nowMs / 1000;
  const dt = Math.min((nowMs - last) / 1000, 0.1);
  last = nowMs;
  acc += dt;

  const brave = isBrave(nowS);

  while (acc >= SIM_DT) {
    tickWorm(worm, { dishRadius: stage.getDishRadius() }, SIM_DT);

    // Food chemotaxis: gradual heading bias toward food
    if (food && food.active) {
      const attr = foodAttraction(food, worm.position);
      if (attr) {
        const foodAngle = Math.atan2(attr.y, attr.x);
        let diff = foodAngle - worm.heading;
        while (diff > Math.PI) diff -= TAU;
        while (diff < -Math.PI) diff += TAU;
        worm.heading += diff * Math.min(SIM_DT / 0.5, 1) * 0.6;
      }
    }

    // Danger line collision — worm avoids the red midline unless brave
    if (dangerActive && !brave) {
      const extent = wormXExtent();
      const safeDist = extent + DANGER_MARGIN;
      const wx = worm.position.x;
      if (Math.abs(wx) < safeDist) {
        const side = wx >= 0 ? 1 : -1;
        worm.position.x = side * safeDist;
        worm.heading = Math.PI - worm.heading;
        worm.angVel = 0;
      }
    }

    acc -= SIM_DT;
  }

  // AVB rate is a direct function of worm speed — strong coupling, ~10× contrast
  const speedNorm = (worm.speed - SPEED_MIN) / (SPEED_MAX - SPEED_MIN);
  const speedClamped = Math.max(0, Math.min(1, speedNorm));
  setSpikeRate(avb, 1 + speedClamped * 9);

  // AWC + food: three-phase coupling — search → feed → satiety
  const FOOD_CONSUME_RATE = 6; // radius pixels per second
  const FOOD_RADIUS_MIN = 4;

  if (food && food.active) {
    const near = isNearFood(food, worm.position);
    const proximity = foodProximity(food, worm.position);

    if (near) {
      // Phase 2: Feeding — AWC fires intensely, fading as food shrinks
      const consumeDt = Math.min(dt, 0.1);
      food.radius -= FOOD_CONSUME_RATE * consumeDt;
      if (food.radius <= FOOD_RADIUS_MIN) {
        food.active = false;
        clearFood();
        tools.deselect();
        lastEatTime = nowS;
      } else {
        const eatIntensity = food.radius / FOOD_RADIUS;
        setSpikeRate(awc, NEURON_BASELINE['AWC'] + 4 + eatIntensity * 6);
        // Worm slows to dwell on food
        worm.speed += (SPEED_MIN * 0.3 - worm.speed) * (1 - Math.exp(-dt / 0.2));
      }
    } else {
      // Phase 1: Searching — AWC ramps with proximity (smell)
      setSpikeRate(awc, NEURON_BASELINE['AWC'] + proximity * 4);
    }
  } else {
    // No active food — AWC returns to baseline
    setSpikeRate(awc, NEURON_BASELINE['AWC']);
  }

  // ASH: danger-sensing neuron — fires near the red line, spikes intensely when repelled
  if (dangerActive) {
    const distToLine = Math.abs(worm.position.x);
    const extent = wormXExtent();
    const senseRange = extent * 3;
    if (distToLine < senseRange) {
      const dangerProx = 1 - Math.min(distToLine / senseRange, 1);
      const wasRepelled = brave ? 0 : (distToLine < extent + DANGER_MARGIN ? 3 : 0);
      setSpikeRate(ash, NEURON_BASELINE['ASH'] + dangerProx * 3 + wasRepelled);
    } else {
      setSpikeRate(ash, NEURON_BASELINE['ASH']);
    }
  } else {
    setSpikeRate(ash, NEURON_BASELINE['ASH']);
  }

  // Food rendering
  if (food && food.active) {
    drawFood(stage.food, food.position.x, food.position.y, food.radius);
  }

  // Danger line rendering
  if (dangerActive) {
    drawDangerLine(stage.dangerLine, stage.getDishRadius());
  }

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
