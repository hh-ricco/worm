import { rand, TAU, type Vec2 } from '../helpers';

export type WormPhase = 'roaming' | 'dwelling';

export interface WormState {
  position: Vec2;
  heading: number;
  angVel: number;
  speed: number;
  targetSpeed: number;
  phase: WormPhase;
  phaseTime: number;
  phaseDuration: number;
}

export interface WormEnv {
  dishRadius: number;
}

export const SPEED_MIN = 15;
export const SPEED_MAX = 120;

const ANG_VEL_RANGE = 2.5; // peak target angular velocity (rad/s)
const ANG_VEL_TAU = 0.35; // low-pass time constant — hides per-tick jitter, lets long-period turns through

function pickPhaseSpeed(phase: WormPhase): number {
  return phase === 'roaming' ? rand(80, 120) : rand(15, 30);
}

function pickPhaseDuration(phase: WormPhase): number {
  return phase === 'roaming' ? rand(3, 7) : rand(2, 5);
}

export function createWorm(): WormState {
  const phase: WormPhase = Math.random() < 0.5 ? 'roaming' : 'dwelling';
  const target = pickPhaseSpeed(phase);
  return {
    position: { x: 0, y: 0 },
    heading: rand(0, TAU),
    angVel: 0,
    speed: target,
    targetSpeed: target,
    phase,
    phaseTime: 0,
    phaseDuration: pickPhaseDuration(phase),
  };
}

export function tickWorm(worm: WormState, env: WormEnv, dt: number): void {
  worm.phaseTime += dt;

  if (worm.phaseTime >= worm.phaseDuration) {
    worm.phase = worm.phase === 'roaming' ? 'dwelling' : 'roaming';
    worm.phaseDuration = pickPhaseDuration(worm.phase);
    worm.targetSpeed = pickPhaseSpeed(worm.phase);
    worm.phaseTime = 0;
  }

  // Speed follows phase target with 300ms smoothing
  worm.speed += (worm.targetSpeed - worm.speed) * (1 - Math.exp(-dt / 0.3));

  // Smoothed angular velocity — heading curves gracefully instead of trembling per-tick
  const targetAngVel = rand(-ANG_VEL_RANGE, ANG_VEL_RANGE);
  worm.angVel +=
    (targetAngVel - worm.angVel) * (1 - Math.exp(-dt / ANG_VEL_TAU));
  worm.heading += worm.angVel * dt;

  worm.position.x += Math.cos(worm.heading) * worm.speed * dt;
  worm.position.y += Math.sin(worm.heading) * worm.speed * dt;

  // Reflect off the dish edge — direction snap, but reset angVel so smoothed motion restarts cleanly
  const dist = Math.hypot(worm.position.x, worm.position.y);
  const margin = 60;
  const limit = env.dishRadius - margin;
  if (dist > limit) {
    const angleToCenter = Math.atan2(-worm.position.y, -worm.position.x);
    worm.heading = angleToCenter + rand(-0.3, 0.3);
    worm.angVel = 0;
    const ratio = limit / dist;
    worm.position.x *= ratio;
    worm.position.y *= ratio;
  }
}
