export const $ = <T extends HTMLElement = HTMLElement>(
  sel: string,
  root: ParentNode = document,
): T | null => root.querySelector<T>(sel);

export const $$ = <T extends HTMLElement = HTMLElement>(
  sel: string,
  root: ParentNode = document,
): T[] => Array.from(root.querySelectorAll<T>(sel));

export const lerp = (a: number, b: number, t: number): number =>
  a + (b - a) * t;

export const clamp = (v: number, lo: number, hi: number): number =>
  v < lo ? lo : v > hi ? hi : v;

export const rand = (lo: number, hi: number): number =>
  lo + Math.random() * (hi - lo);

export const randInt = (lo: number, hi: number): number =>
  Math.floor(rand(lo, hi + 1));

export const easeInOutSine = (t: number): number =>
  -(Math.cos(Math.PI * t) - 1) / 2;

export const easeOutCubic = (t: number): number => 1 - (1 - t) ** 3;

export const TAU = Math.PI * 2;

export interface Vec2 {
  x: number;
  y: number;
}

export const vec = (x: number, y: number): Vec2 => ({ x, y });
export const vecAdd = (a: Vec2, b: Vec2): Vec2 => ({
  x: a.x + b.x,
  y: a.y + b.y,
});
export const vecSub = (a: Vec2, b: Vec2): Vec2 => ({
  x: a.x - b.x,
  y: a.y - b.y,
});
export const vecLen = (v: Vec2): number => Math.hypot(v.x, v.y);
export const vecScale = (v: Vec2, s: number): Vec2 => ({
  x: v.x * s,
  y: v.y * s,
});
