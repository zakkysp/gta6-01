// The wanted system: heat from crimes, stars from heat, and the Solmarina PD
// that answers them — cruisers that ram, foot cops that shoot, and the busted
// or wasted endings when Dario runs out of luck.
import { WANTED, WORLD } from './config.js';
import { createCar, driveCar } from './traffic.js';
import { randomRoadPoint } from './world.js';

export function createWanted() {
  return {
    heat: 0,
    stars: 0,
    quietTimer: 0, // seconds since the last crime
    lastCrime: -999,
  };
}

export function starsForHeat(heat) {
  let stars = 0;
  for (let i = 0; i < WANTED.starAt.length; i += 1) {
    if (heat >= WANTED.starAt[i]) stars = i;
  }
  return stars;
}

// A crime adds heat; the stars follow at once.
export function addHeat(wanted, amount, now) {
  wanted.heat = Math.min(220, wanted.heat + amount);
  wanted.stars = starsForHeat(wanted.heat);
  wanted.lastCrime = now;
  wanted.quietTimer = 0;
}
export function updateWanted(wanted, dt, now, nearestCopDist) {
  wanted.quietTimer = now - wanted.lastCrime;
  if (wanted.quietTimer > WANTED.quietSeconds && nearestCopDist > 350) {
    wanted.heat = Math.max(0, wanted.heat - WANTED.decayPerSec * dt);
    wanted.stars = starsForHeat(wanted.heat);
  }
}

// Foot cops: spawned at the kerb, they close in and shoot when they have a line.
export function createCop(rng, x, y) {
  return {
    x, y,
    angle: 0,
    health: 60,
    fireCooldown: rng.range(0.3, 1),
    speed: 150,
    dead: false,
  };
}

export function updateCop(cop, player, city, dt, rng) {
  if (cop.dead) return;
  const dx = player.x - cop.x;
  const dy = player.y - cop.y;
  const dist = Math.hypot(dx, dy);
  cop.angle = Math.atan2(dy, dx);
  if (dist > 240) {
    cop.x += Math.cos(cop.angle) * cop.speed * dt;
    cop.y += Math.sin(cop.angle) * cop.speed * dt;
  }
  cop.x = Math.max(20, Math.min(WORLD.width - 20, cop.x));
  cop.y = Math.max(20, Math.min(WORLD.height - 20, cop.y));
  if (cop.fireCooldown > 0) cop.fireCooldown -= dt;
}

// Cruisers: spawn on a road near the player and ram him. New cars go into `cars`.
export function spawnPoliceCars(rng, cars, px, py, wanted) {
  const want = Math.min(WANTED.maxPoliceCars, 1 + wanted);
  let count = 0;
  for (const car of cars) if (car.police && !car.wrecked) count += 1;
  let made = 0;
  while (count + made < want && made < 2) {
    const spot = randomRoadPoint(rng);
    const d = Math.hypot(spot.x - px, spot.y - py);
    if (d < 420 || d > 950) continue;
    const car = createCar(rng, 'police', spot.x, spot.y, spot.angle);
    car.police = true;
    cars.push(car);
    made += 1;
  }
}

// One police car chasing the player: steer at him, throttle on, ram.
export function updatePoliceCar(car, city, player, dt, cars) {
  const targetAngle = Math.atan2(player.y - car.y, player.x - car.x);
  let diff = targetAngle - car.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  const steer = Math.max(-1, Math.min(1, diff * 1.6));
  const dist = Math.hypot(player.x - car.x, player.y - car.y);
  const throttle = dist > 60 ? 1 : 0.4;
  const hardHit = driveCar(car, city, throttle, steer, dt, cars);
  return hardHit;
}

// The nearest police unit (car or foot cop) to the player, for heat decay.
export function nearestCopDistance(policeCars, cops, px, py) {
  let best = Infinity;
  for (const car of policeCars) best = Math.min(best, Math.hypot(car.x - px, car.y - py));
  for (const cop of cops) if (!cop.dead) best = Math.min(best, Math.hypot(cop.x - px, cop.y - py));
  return best;
}

// The respray clears the heat for a fee, when the player can pay it.
export function resprayCost() {
  return WANTED.resprayCost;
}
