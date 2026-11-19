// Pedestrians: Solmarina's residents strolling the sidewalks, and running when
// trouble starts. They walk from corner to corner and pick a new one when they arrive.
import { WORLD } from './config.js';
import { randomSidewalkPoint } from './world.js';

const SHIRT_COLORS = ['#e86a6a', '#6aa8e8', '#e8d06a', '#7ac98a', '#c98ad9', '#e8e8e8', '#5a6a7a', '#e89a4a'];
const SKIN_COLORS = ['#e8b88a', '#c98a5a', '#8a5a3a', '#f0c8a0'];

export function createPedestrian(rng, x, y) {
  const target = randomSidewalkPoint(rng);
  return {
    x, y,
    angle: Math.atan2(target.y - y, target.x - x),
    targetX: target.x,
    targetY: target.y,
    speed: rng.range(38, 62),
    shirt: rng.pick(SHIRT_COLORS),
    skin: rng.pick(SKIN_COLORS),
    walkPhase: rng.range(0, Math.PI * 2),
    fleeing: false,
    down: false,
    downTimer: 0,
  };
}

// Keep the crowd near the player: top it up to the target, drop the far ones.
export function maintainCrowd(peds, rng, px, py, target, spawnRadius, despawnRadius) {
  for (let i = peds.length - 1; i >= 0; i -= 1) {
    const ped = peds[i];
    if (Math.hypot(ped.x - px, ped.y - py) > despawnRadius) peds.splice(i, 1);
  }
  while (peds.length < target) {
    const angle = rng.range(0, Math.PI * 2);
    const dist = rng.range(spawnRadius * 0.4, spawnRadius);
    const spot = randomSidewalkPoint(rng);
    const x = Math.max(40, Math.min(3160, px + Math.cos(angle) * dist));
    const y = Math.max(40, Math.min(2360, py + Math.sin(angle) * dist));
    // Prefer the sidewalk spot when it is near the player, else the ring point.
    const useSpot = Math.hypot(spot.x - px, spot.y - py) < spawnRadius;
    peds.push(createPedestrian(rng, useSpot ? spot.x : x, useSpot ? spot.y : y));
  }
}

export function updatePedestrians(peds, rng, dt, danger) {
  for (const ped of peds) {
    if (ped.down) {
      ped.downTimer -= dt;
      if (ped.downTimer <= 0) ped.down = false;
      continue;
    }
    const dx = danger.x - ped.x;
    const dy = danger.y - ped.y;
    const dist = Math.hypot(dx, dy);
    const scared = danger.active && dist < 260;
    ped.fleeing = scared;
    if (scared) {
      // Run away from the danger, down the sidewalk.
      const away = Math.atan2(-dy, -dx);
      ped.angle = away;
      ped.x += Math.cos(away) * 150 * dt;
      ped.y += Math.sin(away) * 150 * dt;
    } else {
      const tx = ped.targetX - ped.x;
      const ty = ped.targetY - ped.y;
      const td = Math.hypot(tx, ty);
      if (td < 24) {
        const next = randomSidewalkPoint(rng);
        ped.targetX = next.x;
        ped.targetY = next.y;
      } else {
        ped.angle = Math.atan2(ty, tx);
        ped.x += Math.cos(ped.angle) * ped.speed * dt;
        ped.y += Math.sin(ped.angle) * ped.speed * dt;
      }
    }
    ped.x = Math.max(20, Math.min(WORLD.width - 20, ped.x));
    ped.y = Math.max(20, Math.min(WORLD.height - 20, ped.y));
    ped.walkPhase += dt * (ped.fleeing ? 14 : 7);
  }
}

// A pedestrian hit by a car is knocked down (and counts as a crime elsewhere).
export function knockDown(ped) {
  ped.down = true;
  ped.downTimer = 6;
}
