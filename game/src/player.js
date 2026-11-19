// The player: Dario Vega on foot, his health, his cash, and getting in and out of cars.
// Movement is axis-separated so he slides along walls instead of sticking to them.
import { PLAYER } from './config.js';
import { hitsBuilding, insideWorld } from './world.js';

export function createPlayer(x, y) {
  return {
    x, y,
    angle: -Math.PI / 2, // facing the street at spawn
    aimAngle: -Math.PI / 2,
    health: PLAYER.maxHealth,
    money: PLAYER.startMoney,
    ammo: PLAYER.startAmmo,
    car: null, // the car he is driving, or null when on foot
    sprinting: false,
    moving: false,
    fireCooldown: 0,
    hurtFlash: 0,
    invulnerable: 0,
  };
}

function tryMove(player, city, dx, dy) {
  const r = PLAYER.radius;
  if (!hitsBuilding(city, player.x + dx, player.y, r) && insideWorld(player.x + dx, player.y)) player.x += dx;
  if (!hitsBuilding(city, player.x, player.y + dy, r) && insideWorld(player.x, player.y + dy)) player.y += dy;
}

export function updatePlayerOnFoot(player, city, input, dt) {
  const mx = input.moveX;
  const my = input.moveY;
  const sprint = input.sprint;
  player.sprinting = sprint;
  player.moving = mx !== 0 || my !== 0;
  if (player.moving) {
    const len = Math.hypot(mx, my);
    const speed = (sprint ? PLAYER.sprintSpeed : PLAYER.walkSpeed) * dt;
    tryMove(player, city, (mx / len) * speed, (my / len) * speed);
    player.angle = Math.atan2(my, mx);
  }
  if (player.fireCooldown > 0) player.fireCooldown -= dt;
  if (player.hurtFlash > 0) player.hurtFlash -= dt;
  if (player.invulnerable > 0) player.invulnerable -= dt;
  // Slow health recovery when out of trouble.
  if (player.health < PLAYER.maxHealth && player.hurtFlash <= 0) {
    player.health = Math.min(PLAYER.maxHealth, player.health + 1.2 * dt);
  }
}

export function hurtPlayer(player, amount) {
  if (player.invulnerable > 0) return;
  player.health -= amount;
  player.hurtFlash = 0.35;
  player.invulnerable = 0.25;
}

/** The nearest car the player could get into, within reach. */
export function nearestCar(player, cars, maxDist = 70) {
  let best = null;
  let bestDist = maxDist;
  for (const car of cars) {
    if (car.wrecked) continue;
    const d = Math.hypot(car.x - player.x, car.y - player.y);
    if (d < bestDist) {
      bestDist = d;
      best = car;
    }
  }
  return best;
}

/** Step out of the car onto the road beside it. */
export function exitCar(player, car) {
  player.car = null;
  const side = car.angle + Math.PI / 2;
  player.x = car.x + Math.cos(side) * 34;
  player.y = car.y + Math.sin(side) * 34;
  player.angle = car.angle;
}
