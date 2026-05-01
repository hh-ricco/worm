import { Application, Container, Graphics } from 'pixi.js';

export interface Stage {
  app: Application;
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
  console.log('[Stage] 1/6 new Application...');
  const app = new Application();

  const w = Math.max(MIN_SIZE, host.clientWidth || 0);
  const h = Math.max(MIN_SIZE, host.clientHeight || 0);

  console.log('[Stage] 2/6 app.init() start, size:', w, '×', h, 'dpr:', window.devicePixelRatio);
  try {
    await app.init({
      backgroundAlpha: 0,
      antialias: true,
      autoDensity: true,
      resolution: window.devicePixelRatio || 1,
      width: w,
      height: h,
      preference: 'webgl',
    });
  } catch (e) {
    console.error('[Stage] app.init() FAILED:', e);
    throw e;
  }
  console.log('[Stage] 3/6 init done, renderer:', app.renderer.type ?? app.renderer.name);

  host.appendChild(app.canvas);
  console.log('[Stage] 4/6 canvas appended, setting up ResizeObserver...');

  // After init, hand control over to the resize observer so the renderer
  // tracks the host element from here on.
  const ro = new ResizeObserver((entries) => {
    const r = entries[0];
    if (!r) return;
    const cw = r.contentBoxSize[0]?.inlineSize;
    const ch = r.contentBoxSize[0]?.blockSize;
    if (typeof cw === 'number' && typeof ch === 'number' && cw > 0 && ch > 0) {
      app.renderer.resize(cw, ch);
    }
  });
  ro.observe(host);
  console.log('[Stage] 5/6 ResizeObserver active, building scene graph...');

  const world = new Container();
  app.stage.addChild(world);

  const dish = new Graphics();
  world.addChild(dish);

  const worm = new Graphics();
  drawWormBody(worm);
  world.addChild(worm);

  const getDishRadius = (): number =>
    Math.min(app.screen.width, app.screen.height) / 2 - 12;

  const updateLayout = (): void => {
    world.position.set(app.screen.width / 2, app.screen.height / 2);
    redrawDish(dish, getDishRadius());
  };

  app.renderer.on('resize', updateLayout);
  updateLayout();

  console.log('[Stage] 6/6 done, dish radius:', getDishRadius(), 'screen:', app.screen.width, '×', app.screen.height);

  return {
    app,
    worm,
    getDishRadius,
    destroy: () => {
      ro.disconnect();
      app.destroy(true, { children: true });
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

  // Body capsule (head is at +x)
  g.roundRect(-halfLen, -halfW, len, halfW * 2, halfW)
    .fill({ color: COLOR_WORM_FILL })
    .stroke({ color: COLOR_WORM_STROKE, width: stroke });

  // Two cross-body dividers — 3 visible segments
  const seg1X = -halfLen + len / 3;
  const seg2X = -halfLen + (2 * len) / 3;
  g.moveTo(seg1X, -halfW + 2)
    .lineTo(seg1X, halfW - 2)
    .stroke({ color: COLOR_WORM_STROKE, width: stroke });
  g.moveTo(seg2X, -halfW + 2)
    .lineTo(seg2X, halfW - 2)
    .stroke({ color: COLOR_WORM_STROKE, width: stroke });

  // Two short bristles at the head, fanning forward and slightly up
  g.moveTo(halfLen - 4, -halfW + 4)
    .lineTo(halfLen + 2, -halfW - 8)
    .stroke({ color: COLOR_WORM_STROKE, width: stroke });
  g.moveTo(halfLen + 1, -halfW + 4)
    .lineTo(halfLen + 9, -halfW - 5)
    .stroke({ color: COLOR_WORM_STROKE, width: stroke });
}
