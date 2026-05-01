import { type Vec2, vec, vecSub, vecLen } from '../helpers';

export interface Food {
  position: Vec2;
  radius: number;
  active: boolean;
}

export const FOOD_RADIUS = 18;
const SENSE_RANGE = 200; // max distance worm can smell food
const FEED_RANGE = 40; // distance at which worm is "on" food

export function createFood(x: number, y: number): Food {
  return {
    position: vec(x, y),
    radius: FOOD_RADIUS,
    active: true,
  };
}

/** Returns normalised proximity [0, 1] — 1 = on food, 0 = beyond sense range */
export function foodProximity(food: Food, wormPos: Vec2): number {
  if (!food.active) return 0;
  const dist = vecLen(vecSub(food.position, wormPos));
  if (dist <= FEED_RANGE) return 1;
  if (dist >= SENSE_RANGE) return 0;
  return 1 - (dist - FEED_RANGE) / (SENSE_RANGE - FEED_RANGE);
}

/** Returns the attraction direction (unit vector) from worm to food, or null if out of range */
export function foodAttraction(food: Food, wormPos: Vec2): Vec2 | null {
  if (!food.active) return null;
  const dist = vecLen(vecSub(food.position, wormPos));
  if (dist > SENSE_RANGE) return null;
  const dx = food.position.x - wormPos.x;
  const dy = food.position.y - wormPos.y;
  if (dist < 0.001) return null;
  return vec(dx / dist, dy / dist);
}

export function isNearFood(food: Food, wormPos: Vec2): boolean {
  if (!food.active) return false;
  return vecLen(vecSub(food.position, wormPos)) <= FEED_RANGE;
}
