// Drawing only: the city, the people and cars in it, the HUD with its minimap,
// and the title, pause, wasted and ending screens. World pixels in, screen pixels out.
import { CAR_TYPES, GAME_NAME, GAME_TAGLINE, PALETTE, STREETS_X, STREETS_Y, VIEW, WORLD, districtAt } from './config.js';
import { LANDMARKS } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';
export const SCREEN_ENDING = 'ending';

const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';
const MINIMAP = { x: 24, y: 0, w: 208, h: 156 };

function starPath(ctx, x, y, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const angle = -Math.PI / 2 + (i * Math.PI) / 5;
    const radius = i % 2 === 0 ? r : r * 0.45;
    const px = x + Math.cos(angle) * radius;
    const py = y + Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  const fonts = new Map();

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(window.innerWidth * ratio);
    canvas.height = Math.round(window.innerHeight * ratio);
    view.scale = Math.min(canvas.width / VIEW.width, canvas.height / VIEW.height);
    view.x = (canvas.width - VIEW.width * view.scale) / 2;
    view.y = (canvas.height - VIEW.height * view.scale) / 2;
  }

  function text(value, x, y, size, color, align, weight) {
    const key = `${weight || ''}${size}`;
    if (!fonts.has(key)) fonts.set(key, `${weight ? weight + ' ' : ''}${size}px ${FONT}`);
    ctx.font = fonts.get(key);
    ctx.fillStyle = color;
    ctx.textAlign = align || 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(value, x, y);
  }

  function money(value) {
    return `$${Math.floor(value).toLocaleString('en-US')}`;
  }

  // --- City ---

  function drawCity(S) {
    const city = S.city;
    // Ground: grass, then the beach band and the sea beyond the city's edge.
    // The fills run past the world bounds so the camera never shows a void.
    ctx.fillStyle = PALETTE.water;
    ctx.fillRect(-2000, WORLD.height - 6, WORLD.width + 4000, 2000);
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 2;
    for (let wy = WORLD.height + 60; wy < WORLD.height + 700; wy += 90) {
      for (let wx = 0; wx < WORLD.width; wx += 260) {
        ctx.beginPath();
        ctx.moveTo(wx, wy);
        ctx.lineTo(wx + 90, wy);
        ctx.stroke();
      }
    }
    ctx.fillStyle = PALETTE.grass;
    ctx.fillRect(-2000, -2000, WORLD.width + 4000, WORLD.height + 2000 - 6);
    ctx.fillStyle = PALETTE.sand;
    ctx.fillRect(-2000, WORLD.beachTop, WORLD.width + 4000, WORLD.height - WORLD.beachTop);
    // Parks.
    for (const park of city.parks) {
      ctx.fillStyle = PALETTE.park;
      ctx.fillRect(park.x, park.y, park.w, park.h);
    }
    // Sidewalks: pale bands along every street.
    ctx.fillStyle = PALETTE.sidewalk;
    for (const sx of STREETS_X) ctx.fillRect(sx - WORLD.roadHalf - 14, 0, (WORLD.roadHalf + 14) * 2, WORLD.height);
    for (const sy of STREETS_Y) ctx.fillRect(0, sy - WORLD.roadHalf - 14, WORLD.width, (WORLD.roadHalf + 14) * 2);
    // Asphalt.
    ctx.fillStyle = PALETTE.asphalt;
    for (const sx of STREETS_X) ctx.fillRect(sx - WORLD.roadHalf, 0, WORLD.roadHalf * 2, WORLD.height);
    for (const sy of STREETS_Y) ctx.fillRect(0, sy - WORLD.roadHalf, WORLD.width, WORLD.roadHalf * 2);
    // Centre dashes.
    ctx.fillStyle = PALETTE.asphaltLine;
    for (const sx of STREETS_X) {
      for (let y = 0; y < WORLD.height; y += 64) ctx.fillRect(sx - 2, y, 4, 30);
    }
    for (const sy of STREETS_Y) {
      for (let x = 0; x < WORLD.width; x += 64) ctx.fillRect(x, sy - 2, 30, 4);
    }
    // Buildings, with a long afternoon shadow and a roof.
    for (const b of city.buildings) {
      if (!inView(S, b.x - 60, b.y - 60, b.w + 120, b.h + 120)) continue;
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(b.x + 14, b.y + 18, b.w, b.h);
      ctx.fillStyle = b.color;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = b.roof;
      ctx.fillRect(b.x + 8, b.y + 8, b.w - 16, b.h - 16);
      ctx.fillStyle = PALETTE.roofEdge;
      ctx.fillRect(b.x + 8, b.y + 8, b.w - 16, 4);
      if (b.tall) {
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.fillRect(b.x + b.w / 2 - 10, b.y + b.h / 2 - 10, 20, 20);
      }
    }
    // Palms.
    for (const palm of city.palms) {
      if (!inView(S, palm.x - 20, palm.y - 20, 40, 40)) continue;
      ctx.fillStyle = '#7a5230';
      ctx.fillRect(palm.x - 2, palm.y - 2, 4, 8);
      ctx.fillStyle = '#3f8f4f';
      ctx.beginPath();
      ctx.arc(palm.x, palm.y - 4, 11, 0, Math.PI * 2);
      ctx.fill();
    }
    // Landmark signs: the garage, the bank, the resprays.
    drawSign(S, LANDMARKS.garage.x, LANDMARKS.garage.y, "VEGA'S GARAGE", '#e8b820');
    drawSign(S, LANDMARKS.bank.x, LANDMARKS.bank.y, 'FIRST BANK', '#c8c8c8');
    drawSign(S, LANDMARKS.resprayA.x, LANDMARKS.resprayA.y, 'RESPRAY', '#7ac98a');
    drawSign(S, LANDMARKS.resprayB.x, LANDMARKS.resprayB.y, 'RESPRAY', '#7ac98a');
  }

  function drawSign(S, x, y, label, color) {
    if (!inView(S, x - 90, y - 30, 180, 60)) return;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(x - 62, y - 44, 124, 22);
    ctx.fillStyle = color;
    ctx.font = `bold 13px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText(label, x, y - 29);
  }

  function inView(S, x, y, w, h) {
    const cam = S.camera;
    const halfW = (VIEW.width / 2 / cam.zoom) + 80;
    const halfH = (VIEW.height / 2 / cam.zoom) + 80;
    return x + w > cam.x - halfW && x < cam.x + halfW && y + h > cam.y - halfH && y < cam.y + halfH;
  }

  // --- Entities ---

  function drawCarShape(car) {
    const def = CAR_TYPES[car.type];
    const halfL = def.length / 2;
    const halfW = def.width / 2;
    ctx.save();
    ctx.translate(car.x, car.y);
    ctx.rotate(car.angle);
    // Shadow.
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(-halfL + 3, -halfW + 4, def.length, def.width);
    // Wheels.
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(-halfL + 6, -halfW - 3, 12, 5);
    ctx.fillRect(-halfL + 6, halfW - 2, 12, 5);
    ctx.fillRect(halfL - 18, -halfW - 3, 12, 5);
    ctx.fillRect(halfL - 18, halfW - 2, 12, 5);
    // Body.
    ctx.fillStyle = car.wrecked ? '#3a3a3a' : car.color;
    ctx.beginPath();
    ctx.roundRect(-halfL, -halfW, def.length, def.width, 7);
    ctx.fill();
    if (car.type === 'police') {
      ctx.fillStyle = '#f2f2f2';
      ctx.fillRect(-6, -halfW, 14, def.width);
      // Light bar, flashing red and blue.
      const blink = Math.floor(performance.now() / 180) % 2 === 0;
      ctx.fillStyle = blink ? '#ff2a2a' : '#2a6aff';
      ctx.fillRect(-4, -halfW + 2, 8, 6);
      ctx.fillStyle = blink ? '#2a6aff' : '#ff2a2a';
      ctx.fillRect(-4, halfW - 8, 8, 6);
    } else if (car.type === 'taxi') {
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(-4, -6, 10, 12);
      ctx.fillStyle = '#e8b820';
      ctx.font = `bold 8px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText('TAXI', 1, -halfW - 4);
    }
    // Windshield and roof.
    ctx.fillStyle = 'rgba(20,30,44,0.85)';
    ctx.fillRect(halfL - 16, -halfW + 4, 8, def.width - 8);
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(-8, -halfW + 4, 16, def.width - 8);
    // Headlights.
    ctx.fillStyle = '#ffe9a8';
    ctx.fillRect(halfL - 2, -halfW + 4, 3, 5);
    ctx.fillRect(halfL - 2, halfW - 9, 3, 5);
    if (car.wrecked) {
      ctx.fillStyle = 'rgba(120,120,120,0.5)';
      ctx.beginPath();
      ctx.arc(0, 0, 16, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    if (car.smoke > 0) {
      ctx.fillStyle = 'rgba(90,90,90,0.5)';
      ctx.beginPath();
      ctx.arc(car.x, car.y - 10, 8 + Math.random() * 6, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawPersonShape(x, y, angle, shirt, skin, gunAngle) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(2, 4, 11, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.rotate(angle);
    ctx.fillStyle = shirt;
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.arc(5, 0, 6, 0, Math.PI * 2);
    ctx.fill();
    if (gunAngle !== null && gunAngle !== undefined) {
      ctx.rotate(gunAngle - angle);
      ctx.fillStyle = '#222';
      ctx.fillRect(6, -2, 14, 4);
    }
    ctx.restore();
  }

  function drawPickups(S) {
    for (const pickup of S.city.pickups) {
      if (pickup.taken || !inView(S, pickup.x - 30, pickup.y - 30, 60, 60)) continue;
      const pulse = 1 + Math.sin(S.time * 4) * 0.15;
      ctx.save();
      ctx.translate(pickup.x, pickup.y);
      ctx.scale(pulse, pulse);
      ctx.strokeStyle = pickup.kind === 'gold' ? '#ffd94a' : '#7ac98a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 14, 0, Math.PI * 2);
      ctx.stroke();
      if (pickup.kind === 'gold') {
        ctx.fillStyle = '#ffd94a';
        ctx.fillRect(-8, -5, 16, 10);
        ctx.fillStyle = '#fff2a8';
        ctx.fillRect(-8, -5, 16, 3);
      } else {
        ctx.fillStyle = '#4a9e5a';
        ctx.fillRect(-9, -6, 18, 12);
        ctx.fillStyle = '#e8f2e8';
        ctx.font = `bold 11px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.fillText('$', 0, 4);
      }
      ctx.restore();
    }
  }

  function drawMissionMarker(S) {
    const target = S.missionTarget;
    if (!target) return;
    const pulse = 1 + Math.sin(S.time * 5) * 0.2;
    ctx.save();
    ctx.translate(target.x, target.y);
    ctx.strokeStyle = '#ffd94a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 26 * pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#ffd94a';
    ctx.beginPath();
    ctx.moveTo(0, -34 * pulse);
    ctx.lineTo(10, -20 * pulse);
    ctx.lineTo(-10, -20 * pulse);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    // Edge arrow when the target is off screen.
    const cam = S.camera;
    const halfW = VIEW.width / 2 / cam.zoom;
    const halfH = VIEW.height / 2 / cam.zoom;
    if (Math.abs(target.x - cam.x) > halfW || Math.abs(target.y - cam.y) > halfH) {
      const dx = target.x - cam.x;
      const dy = target.y - cam.y;
      const angle = Math.atan2(dy, dx);
      const ax = cam.x + Math.cos(angle) * (halfW - 60);
      const ay = cam.y + Math.sin(angle) * (halfH - 60);
      ctx.save();
      ctx.translate(ax, ay);
      ctx.rotate(angle);
      ctx.fillStyle = '#ffd94a';
      ctx.beginPath();
      ctx.moveTo(18, 0);
      ctx.lineTo(-10, -12);
      ctx.lineTo(-10, 12);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  // --- HUD ---

  function drawHud(S) {
    const player = S.player;
    // Money, top right.
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(VIEW.width - 240, 16, 224, 66);
    text(money(player.money), VIEW.width - 32, 48, 26, '#7ac98a', 'right', 'bold');
    text(districtAt(player.x, player.y), VIEW.width - 32, 72, 14, '#e8e8e8', 'right');
    // Wanted stars, under the money.
    for (let i = 0; i < 5; i += 1) {
      starPath(ctx, VIEW.width - 216 + i * 30, 108, 11);
      ctx.fillStyle = i < S.wanted.stars ? '#ffd94a' : 'rgba(255,255,255,0.25)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.6)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    // Mission objective, top centre.
    if (S.objectiveText) {
      const w = Math.min(760, 40 + S.objectiveText.length * 8.5);
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect((VIEW.width - w) / 2, 16, w, 44);
      ctx.fillStyle = '#ffd94a';
      ctx.fillRect((VIEW.width - w) / 2, 16, 4, 44);
      text(S.objectiveText, VIEW.width / 2, 45, 18, '#ffffff', 'center', 'bold');
    }
    // Mission timer.
    if (S.missionTimer > 0) {
      text(`TIME ${Math.ceil(S.missionTimer)}s`, VIEW.width / 2, 88, 22, '#ff8a5a', 'center', 'bold');
    }
    // Health and ammo, bottom right.
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(VIEW.width - 240, VIEW.height - 76, 224, 60);
    text('HEALTH', VIEW.width - 216, VIEW.height - 58, 12, '#e8e8e8', 'left', 'bold');
    ctx.fillStyle = '#333';
    ctx.fillRect(VIEW.width - 216, VIEW.height - 50, 176, 12);
    ctx.fillStyle = player.health > 35 ? '#7ac98a' : '#e5534b';
    ctx.fillRect(VIEW.width - 216, VIEW.height - 50, 176 * Math.max(0, player.health / 100), 12);
    text(`AMMO ${player.ammo}`, VIEW.width - 32, VIEW.height - 24, 14, '#e8e8e8', 'right', 'bold');
    // Context prompt, bottom centre.
    if (S.prompt) {
      text(S.prompt, VIEW.width / 2, VIEW.height - 24, 18, '#ffffff', 'center', 'bold');
    }
    // Damage flash.
    if (player.hurtFlash > 0) {
      ctx.fillStyle = `rgba(229,83,75,${Math.min(0.4, player.hurtFlash)})`;
      ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    }
    drawMinimap(S);
    drawBanner(S);
  }

  function drawMinimap(S) {
    const mm = { x: MINIMAP.x, y: VIEW.height - MINIMAP.h - 24, w: MINIMAP.w, h: MINIMAP.h };
    const sx = mm.w / WORLD.width;
    const sy = mm.h / WORLD.height;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(mm.x - 4, mm.y - 4, mm.w + 8, mm.h + 8);
    ctx.fillStyle = '#2f6a3a';
    ctx.fillRect(mm.x, mm.y, mm.w, mm.h);
    ctx.fillStyle = PALETTE.sand;
    ctx.fillRect(mm.x, mm.y + (WORLD.beachTop * sy), mm.w, mm.h - WORLD.beachTop * sy);
    ctx.fillStyle = PALETTE.water;
    ctx.fillRect(mm.x, mm.y + mm.h - 4, mm.w, 4);
    ctx.strokeStyle = '#8a8a92';
    ctx.lineWidth = 2;
    for (const street of STREETS_X) {
      ctx.beginPath();
      ctx.moveTo(mm.x + street * sx, mm.y);
      ctx.lineTo(mm.x + street * sx, mm.y + mm.h);
      ctx.stroke();
    }
    for (const street of STREETS_Y) {
      ctx.beginPath();
      ctx.moveTo(mm.x, mm.y + street * sy);
      ctx.lineTo(mm.x + mm.w, mm.y + street * sy);
      ctx.stroke();
    }
    // Cars as white dots, police blue, enemies red.
    for (const car of S.cars) {
      if (car.police) ctx.fillStyle = '#5a9eff';
      else ctx.fillStyle = '#f2f2f2';
      ctx.fillRect(mm.x + car.x * sx - 1, mm.y + car.y * sy - 1, 3, 3);
    }
    for (const enemy of S.enemies) {
      if (enemy.dead) continue;
      ctx.fillStyle = '#ff5a4a';
      ctx.fillRect(mm.x + enemy.x * sx - 2, mm.y + enemy.y * sy - 2, 4, 4);
    }
    // Mission blip, pulsing.
    if (S.missionTarget) {
      const r = 4 + Math.sin(S.time * 5) * 1.5;
      ctx.fillStyle = '#ffd94a';
      ctx.beginPath();
      ctx.arc(mm.x + S.missionTarget.x * sx, mm.y + S.missionTarget.y * sy, r, 0, Math.PI * 2);
      ctx.fill();
    }
    // The player, a white arrow.
    const px = mm.x + S.player.x * sx;
    const py = mm.y + S.player.y * sy;
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(S.player.angle);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(7, 0);
    ctx.lineTo(-5, -5);
    ctx.lineTo(-5, 5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    text('SOLMARINA', mm.x, mm.y - 8, 11, '#e8e8e8', 'left', 'bold');
  }

  function drawBanner(S) {
    if (!S.banner || S.time > S.banner.until) return;
    const alpha = Math.min(1, (S.banner.until - S.time) * 2);
    ctx.globalAlpha = alpha;
    text(S.banner.text, VIEW.width / 2, 150, 44, '#ffd94a', 'center', 'bold');
    if (S.banner.sub) text(S.banner.sub, VIEW.width / 2, 186, 20, '#ffffff', 'center');
    ctx.globalAlpha = 1;
  }

  // --- Screens ---

  function drawPanel(title, lines, prompt, titleColor, topY) {
    const width = 640;
    const height = 150 + lines.length * 30 + 70;
    const x = (VIEW.width - width) / 2;
    const y = topY !== undefined ? topY : (VIEW.height - height) / 2;
    ctx.fillStyle = 'rgba(10,12,20,0.82)';
    ctx.fillRect(x, y, width, height);
    ctx.strokeStyle = '#ffd94a';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, width, height);
    text(title, VIEW.width / 2, y + 74, 46, titleColor || '#ffffff', 'center', 'bold');
    for (let i = 0; i < lines.length; i += 1) {
      text(lines[i], VIEW.width / 2, y + 118 + i * 30, 19, '#d8d8d8', 'center');
    }
    if (prompt) text(prompt, VIEW.width / 2, y + height - 30, 20, '#ffd94a', 'center', 'bold');
  }

  function drawWorldFrame(S) {
    const cam = S.camera;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#0e1420';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const scale = view.scale * cam.zoom;
    ctx.setTransform(scale, 0, 0, scale, view.x + (VIEW.width / 2) * view.scale - cam.x * scale, view.y + (VIEW.height / 2) * view.scale - cam.y * scale);
    drawCity(S);
    drawPickups(S);
    drawMissionMarker(S);
    for (const car of S.cars) if (inView(S, car.x - 60, car.y - 60, 120, 120)) drawCarShape(car);
    for (const ped of S.peds) if (inView(S, ped.x - 20, ped.y - 20, 40, 40)) drawPersonShape(ped.x, ped.y, ped.angle, ped.shirt, ped.skin, null);
    for (const cop of S.cops) if (!cop.dead && inView(S, cop.x - 20, cop.y - 20, 40, 40)) drawPersonShape(cop.x, cop.y, cop.angle, '#1c2f4a', '#e8b88a', null);
    for (const enemy of S.enemies) if (!enemy.dead && inView(S, enemy.x - 20, enemy.y - 20, 40, 40)) drawPersonShape(enemy.x, enemy.y, enemy.angle, '#8a2a2a', '#c98a5a', null);
    for (const bullet of S.bullets) {
      ctx.strokeStyle = '#ffe9a8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(bullet.x - bullet.vx * 0.02, bullet.y - bullet.vy * 0.02);
      ctx.lineTo(bullet.x, bullet.y);
      ctx.stroke();
    }
    for (const spark of S.sparks) {
      ctx.fillStyle = `rgba(255,220,120,${Math.max(0, spark.life * 2.5)})`;
      ctx.fillRect(spark.x - 2, spark.y - 2, 4, 4);
    }
    const player = S.player;
    if (!player.car) {
      drawPersonShape(player.x, player.y, player.angle, '#2a9e8a', '#e8b88a', player.aimAngle);
    }
    ctx.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
  }

  function draw(S, screen) {
    resize();
    if (screen === SCREEN_TITLE) {
      drawWorldFrame(S);
      ctx.fillStyle = 'rgba(8,10,18,0.45)';
      ctx.fillRect(0, 0, VIEW.width, VIEW.height);
      text(GAME_NAME, VIEW.width / 2, 108, 84, '#ffd94a', 'center', 'bold');
      text(GAME_TAGLINE, VIEW.width / 2, 148, 26, '#ffffff', 'center');
      drawPanel('Dario Vega is home.', [
        'Five years away. One garage in debt. One developer to stop.',
        'Steal cars, lose the cops, run the jobs — and take back Solmarina.',
        '',
        'WASD drive & walk · Mouse aim · Click shoot · E get in a car',
        'Shift sprint · Space handbrake · Esc pause · M mute',
      ], S.hasSave ? 'Enter — New Game · E — Continue' : 'Press Enter or click to start', '#ffd94a', 178);
      return;
    }
    drawWorldFrame(S);
    if (screen === SCREEN_PLAY) {
      drawHud(S);
      return;
    }
    if (screen === SCREEN_PAUSED) {
      drawHud(S);
      ctx.fillStyle = 'rgba(8,10,18,0.5)';
      ctx.fillRect(0, 0, VIEW.width, VIEW.height);
      drawPanel('Paused', [
        'The city waits for no one — except right now.',
        '',
        'Esc resume · R restart mission · M mute · Q save & quit to title',
      ], 'Press Esc to resume', '#ffffff');
      return;
    }
    if (screen === SCREEN_OVER) {
      ctx.fillStyle = 'rgba(8,10,18,0.55)';
      ctx.fillRect(0, 0, VIEW.width, VIEW.height);
      const busted = S.overReason === 'busted';
      drawPanel(busted ? 'BUSTED' : 'WASTED', [
        busted ? 'The Solmarina PD has you. The garage loses $200 in bail.' : 'Dario wakes up at Solmarina General, $200 lighter.',
        '',
        'The job is still open. The city is still yours to take.',
      ], 'Press Enter to try again', busted ? '#5a9eff' : '#e5534b');
      return;
    }
    if (screen === SCREEN_ENDING) {
      ctx.fillStyle = 'rgba(8,10,18,0.6)';
      ctx.fillRect(0, 0, VIEW.width, VIEW.height);
      drawPanel('KING OF THE COAST', [
        "Kroll's yacht burns on the horizon. The debt papers are ash.",
        "Mama Luz keeps the garage. Dario Vega keeps the city.",
        '',
        `Final take: ${money(S.player.money)} · Missions: 5 / 5`,
        'Free roam continues — Solmarina is yours.',
      ], 'Press Enter to keep driving', '#ffd94a');
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw };
}
