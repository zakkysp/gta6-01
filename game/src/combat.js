// Combat: bullets with a tracer and a short life, muzzle flashes, and the armed
// guards the story missions post. Enemies walk at the player and fire when close.
import { COMBAT } from './config.js';
import { hitsBuilding } from './world.js';

export function createEnemy(x, y, label) {
  return {
    x, y,
    angle: 0,
    health: COMBAT.enemyHealth,
    fireCooldown: 0.6,
    speed: 105,
    label: label || 'Guard',
    dead: false,
    flash: 0,
  };
}

export function createBullet(x, y, angle, fromPlayer) {
  return {
    x, y,
    vx: Math.cos(angle) * COMBAT.bulletSpeed,
    vy: Math.sin(angle) * COMBAT.bulletSpeed,
    travelled: 0,
    fromPlayer,
    dead: false,
  };
}

// Advance bullets; a wall stops them, a body takes the damage. Returns hit events.
export function updateBullets(bullets, city, player, enemies, cops, dt, onPlayerHit, onEnemyHit, onCopHit) {
  for (const bullet of bullets) {
    if (bullet.dead) continue;
    bullet.x += bullet.vx * dt;
    bullet.y += bullet.vy * dt;
    bullet.travelled += COMBAT.bulletSpeed * dt;
    if (bullet.travelled > COMBAT.bulletRange || hitsBuilding(city, bullet.x, bullet.y, 2)) {
      bullet.dead = true;
      continue;
    }
    if (bullet.fromPlayer) {
      for (const enemy of enemies) {
        if (!enemy.dead && Math.hypot(enemy.x - bullet.x, enemy.y - bullet.y) < 16) {
          enemy.health -= COMBAT.bulletDamage;
          bullet.dead = true;
          onEnemyHit(enemy);
          break;
        }
      }
      if (bullet.dead) continue;
      for (const cop of cops) {
        if (!cop.dead && Math.hypot(cop.x - bullet.x, cop.y - bullet.y) < 16) {
          cop.health -= COMBAT.bulletDamage;
          bullet.dead = true;
          onCopHit(cop);
          break;
        }
      }
    } else if (Math.hypot(player.x - bullet.x, player.y - bullet.y) < 15) {
      bullet.dead = true;
      onPlayerHit();
    }
  }
  for (let i = bullets.length - 1; i >= 0; i -= 1) {
    if (bullets[i].dead) bullets.splice(i, 1);
  }
}

// An enemy closes in and fires at the player when he is in range.
export function updateEnemy(enemy, player, bullets, dt, rng) {
  if (enemy.dead) return;
  const dx = player.x - enemy.x;
  const dy = player.y - enemy.y;
  const dist = Math.hypot(dx, dy);
  enemy.angle = Math.atan2(dy, dx);
  if (dist > 200) {
    enemy.x += Math.cos(enemy.angle) * enemy.speed * dt;
    enemy.y += Math.sin(enemy.angle) * enemy.speed * dt;
  }
  if (enemy.flash > 0) enemy.flash -= dt;
  if (enemy.fireCooldown > 0) {
    enemy.fireCooldown -= dt;
    return;
  }
  if (dist < COMBAT.enemyRange) {
    enemy.fireCooldown = COMBAT.enemyFireCooldown + rng.range(-0.15, 0.3);
    enemy.flash = 0.09;
    const spread = rng.range(-0.09, 0.09);
    bullets.push(createBullet(enemy.x, enemy.y, enemy.angle + spread, false));
    return true;
  }
  return false;
}

// A small burst of sparks where a bullet lands, for the renderer to draw.
export function makeSparks(x, y, count, rng) {
  const sparks = [];
  for (let i = 0; i < count; i += 1) {
    const angle = rng.range(0, Math.PI * 2);
    const speed = rng.range(60, 220);
    sparks.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: rng.range(0.15, 0.4) });
  }
  return sparks;
}

export function updateSparks(sparks, dt) {
  for (const spark of sparks) {
    spark.x += spark.vx * dt;
    spark.y += spark.vy * dt;
    spark.vx *= 0.92;
    spark.vy *= 0.92;
    spark.life -= dt;
  }
  for (let i = sparks.length - 1; i >= 0; i -= 1) {
    if (sparks[i].life <= 0) sparks.splice(i, 1);
  }
}
