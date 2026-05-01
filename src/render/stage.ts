import {
  Container,
  Graphics,
  WebGLRenderer,
  Ticker,
  type Renderer,
} from 'pixi.js';

export interface Stage {
  app: {
    renderer: Renderer;
    stage: Container;
    screen: { width: number; height: number };
    canvas: HTMLCanvasElement;
    ticker: Ticker;
  };
  worm: Graphics;
  getDishRadius(): number;
  destroy(): void;
}

const COLOR_DISH_FILL = 0xfcfaf5;
const COLOR_DISH_STROKE = 0x2a2a2a;
const COLOR_WORM_FILL = 0x22c55e;
const COLOR_WORM_STROKE = 0x1a1a1a;
const MIN_SIZE = 400;

export async function createStage(host: HTMLElement): Promise<Stage> {
  const w = Math.max(MIN_SIZE, host.clientWidth || 0);
  const h = Math.max(MIN_SIZE, host.clientHeight || 0);
  const dpr = window.devicePixelRatio || 1;

  console.log('[Stage] creating canvas manually, size:', w, '×', h, 'dpr:', dpr);

  // Create canvas and get WebGL context BEFORE any PixiJS init.
  // This isolates whether the hang is in PixiJS internals or WebGL itself.
  const canvas = document.createElement('canvas');
  canvas.style.display = 'block';

  console.log('[Stage] calling getContext("webgl2")...');
  const gl = canvas.getContext('webgl2', {
    alpha: true,
    premultipliedAlpha: true,
    preserveDrawingBuffer: false,
    powerPreference: 'default',
  });

  if (!gl) {
    // Try WebGL 1 as fallback
    console.warn('[Stage] WebGL2 not available, trying WebGL1...');
    const gl1 = canvas.getContext('webgl', {
      alpha: true,
      premultipliedAlpha: true,
    });
    if (!gl1) {
      throw new Error('WebGL not available in this browser');
    }
    console.log('[Stage] WebGL1 context obtained:', gl1);
  } else {
    console.log('[Stage] WebGL2 context obtained:', gl);
  }

  console.log('[Stage] creating WebGLRenderer with pre-built canvas...');
  const renderer = new WebGLRenderer();

  console.log('[Stage] calling renderer.init()...');
  try {
    await renderer.init({
      canvas,
      context: gl as any,
      backgroundAlpha: 0,
      antialias: true,
      width: w,
      height: h,
      resolution: dpr,
      autoDensity: true,
      manageImports: false,
    });
    console.log('[Stage] renderer.init() DONE, type:', (renderer as any).name ?? 'webgl');
  } catch (e) {
    console.error('[Stage] renderer.init() FAILED:', e);
    throw e;
  }

  host.appendChild(canvas);
  console.log('[Stage] canvas appended to host');

  const ro = new ResizeObserver((entries) => {
    const r = entries[0];
    if (!r) return;
    const cw = r.contentBoxSize[0]?.inlineSize;
    const ch = r.contentBoxSize[0]?.blockSize;
    if (typeof cw === 'number' && typeof ch === 'number' && cw > 0 && ch > 0) {
      renderer.resize(cw, ch);
    }
  });
  ro.observe(host);

  const stage = new Container();
  const ticker = new Ticker();
  ticker.start();

  const world = new Container();
  stage.addChild(world);

  const dish = new Graphics();
  world.addChild(dish);

  const worm = new Graphics();
  drawWormBody(worm);
  world.addChild(worm);

  const getDishRadius = (): number =>
    Math.min(renderer.width, renderer.height) / 2 - 12;

  const updateLayout = (): void => {
    world.position.set(renderer.width / 2, renderer.height / 2);
    redrawDish(dish, getDishRadius());
  };

  renderer.on('resize', updateLayout);
  updateLayout();

  console.log(
    '[Stage] all done, screen:',
    renderer.width,
    '×',
    renderer.height,
    '| dish radius:',
    getDishRadius(),
  );

  const app = {
    renderer,
    stage,
    get screen() {
      return { width: renderer.width, height: renderer.height };
    },
    canvas,
    ticker,
  };

  ticker.add(() => {
    renderer.render(stage);
  });

  return {
    app,
    worm,
    getDishRadius,
    destroy: () => {
      ro.disconnect();
      ticker.destroy();
      renderer.destroy();
    },
  };
}

function redrawDish(g: Graphics, radius: number): void {
  g.clear()
    .circle(0, 0, radius)
    .fill({ color: COLOR_DISH_FILL })
    .stroke({ color: COLOR_DISH_STROKE, width: 5 });
}

function drawWormBody(g: Graphics): void {
  const len = 70;
  const halfLen = len / 2;
  const halfW = 13;
  const stroke = 3.5;

  g.clear();

  g.roundRect(-halfLen, -halfW, len, halfW * 2, halfW)
    .fill({ color: COLOR_WORM_FILL })
    .stroke({ color: COLOR_WORM_STROKE, width: stroke });

  const seg1X = -halfLen + len / 3;
  const seg2X = -halfLen + (2 * len) / 3;
  g.moveTo(seg1X, -halfW + 2)
    .lineTo(seg1X, halfW - 2)
    .stroke({ color: COLOR_WORM_STROKE, width: stroke });
  g.moveTo(seg2X, -halfW + 2)
    .lineTo(seg2X, halfW - 2)
    .stroke({ color: COLOR_WORM_STROKE, width: stroke });

  g.moveTo(halfLen - 4, -halfW + 4)
    .lineTo(halfLen + 2, -halfW - 8)
    .stroke({ color: COLOR_WORM_STROKE, width: stroke });
  g.moveTo(halfLen + 1, -halfW + 4)
    .lineTo(halfLen + 9, -halfW - 5)
    .stroke({ color: COLOR_WORM_STROKE, width: stroke });
}
