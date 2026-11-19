// Boot and the one loop: input every frame, the world in fixed 1/60 s steps, the
// renderer painting what is there. Screens: title, play, paused, wasted/busted,
// and the ending. ?shot=start|drive|chase|mission (with &seed=N) stages that scene
// instead of running the loop, paints it twice and sets window.__shotReady.
import { GAME_NAME, PLAYER, VIEW, WANTED } from './config.js';
import { makeRng } from './rng.js';
import { buildCity, LANDMARKS, onRoad } from './world.js';
import { createPlayer, exitCar, hurtPlayer, nearestCar, updatePlayerOnFoot } from './player.js';
import { createPedestrian, knockDown, maintainCrowd, updatePedestrians } from './people.js';
import { carNose, createCar, damageCar, driveCar, maintainTraffic, makeParkedCar, makeTrafficCar, updateTrafficCar } from './traffic.js';
import { addHeat, createCop, createWanted, nearestCopDistance, spawnPoliceCars, updateCop, updatePoliceCar, updateWanted } from './police.js';
import { createBullet, makeSparks, updateBullets, updateEnemy, updateSparks } from './combat.js';
import { completeStealStep, enemiesLeft, MISSIONS, missionByIndex, missionObjectiveText, missionTarget, startMission, updateMission } from './missions.js';
import { createAudio } from './audio.js';
import { createInput, ACTION_CONFIRM, ACTION_ENTER, ACTION_MUTE, ACTION_PAUSE } from './input.js';
import { createRenderer, SCREEN_ENDING, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { stageShot } from './shots.js';
import { clearSave, hasSave, loadSave, saveGame } from './save.js';

const STEP = 1 / 60;
const MAX_FRAME = 0.25;
const AUTOSAVE_SECONDS = 30;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : 20261119;

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const audio = createAudio();
const renderer = createRenderer(canvas);

function createState() {
  const S = {
    seed,
    rng: makeRng(seed),
    city: null,
    player: createPlayer(LANDMARKS.garage.x, LANDMARKS.garage.y + 60),
    cars: [],
    peds: [],
    cops: [],
    enemies: [],
    bullets: [],
    sparks: [],
    wanted: createWanted(),
    mission: { index: 0, step: 0, timer: 0, targetCar: null, hasPackage: false },
    camera: { x: LANDMARKS.garage.x, y: LANDMARKS.garage.y, zoom: 1 },
    time: 0,
    screen: SCREEN_TITLE,
    overReason: 'wasted',
    finished: false,
    hasSave: hasSave(),
    objectiveText: '',
    missionTarget: null,
    missionTimer: 0,
    prompt: null,
    banner: null,
    autosaveTimer: 0,
    titleAngle: 0,
  };
  S.resetWorld = () => resetWorld(S);
  return S;
}

function populateStreets(S) {
  // Five cars parked at the kerb around the garage, on the sidewalk just off the
  // asphalt, so they never block a lane. A few more already rolling in traffic.
  const parkedSpots = [
    { x: LANDMARKS.garage.x + 46, y: LANDMARKS.garage.y - 140, angle: Math.PI / 2 },
    { x: LANDMARKS.garage.x - 46, y: LANDMARKS.garage.y + 320, angle: -Math.PI / 2 },
    { x: 1086, y: 900, angle: Math.PI / 2 },
    { x: 994, y: 1500, angle: -Math.PI / 2 },
    { x: 1400, y: 686, angle: 0 },
  ];
  for (const spot of parkedSpots) S.cars.push(makeParkedCar(S.rng, spot));
  for (let i = 0; i < 8; i += 1) {
    const spot = { x: LANDMARKS.garage.x + S.rng.range(-500, 500), y: LANDMARKS.garage.y + S.rng.range(-400, 400), angle: S.rng.pick([0, Math.PI / 2, Math.PI, -Math.PI / 2]) };
    if (onRoad(spot.x, spot.y)) S.cars.push(makeTrafficCar(S.rng, spot));
  }
  for (let i = 0; i < 12; i += 1) {
    S.peds.push(createPedestrian(S.rng, LANDMARKS.garage.x + S.rng.range(-400, 400), LANDMARKS.garage.y + S.rng.range(-300, 300)));
  }
}

function resetWorld(S) {
  S.rng = makeRng(S.seed);
  S.city = buildCity(S.seed);
  S.cars = [];
  S.peds = [];
  S.cops = [];
  S.enemies = [];
  S.bullets = [];
  S.sparks = [];
  S.wanted = createWanted();
  S.player = createPlayer(LANDMARKS.garage.x, LANDMARKS.garage.y + 60);
  S.mission = { index: 0, step: 0, timer: 0, targetCar: null, hasPackage: false };
  S.banner = null;
  S.prompt = null;
  S.missionTimer = 0;
  S.finished = false;
  populateStreets(S);
  S.camera.x = S.player.x;
  S.camera.y = S.player.y;
  S.camera.zoom = 1;
}

// A mission retry keeps the player's money and ammo: only the streets reset,
// and Dario wakes up at the given spot with full health.
function softReset(S, spawnX, spawnY) {
  S.rng = makeRng(S.seed + S.mission.index * 7919 + Math.floor(S.time));
  S.cars = [];
  S.peds = [];
  S.cops = [];
  S.enemies = [];
  S.bullets = [];
  S.sparks = [];
  S.wanted = createWanted();
  S.player.car = null;
  S.player.x = spawnX;
  S.player.y = spawnY;
  S.player.health = PLAYER.maxHealth;
  S.player.fireCooldown = 0;
  S.banner = null;
  S.prompt = null;
  S.missionTimer = 0;
  populateStreets(S);
  S.camera.x = S.player.x;
  S.camera.y = S.player.y;
  S.camera.zoom = 1;
}

function showBanner(S, text, sub, seconds) {
  S.banner = { text, sub: sub || '', until: S.time + (seconds || 3) };
}

function applySave(S, data) {
  S.player.money = data.money;
  S.player.health = data.health;
  S.player.ammo = data.ammo;
  S.player.x = data.playerX;
  S.player.y = data.playerY;
  S.finished = !!data.finished;
  for (const pickup of S.city.pickups) {
    if (data.collected && data.collected.includes(`${pickup.x},${pickup.y}`)) pickup.taken = true;
  }
  startMission(S, data.missionIndex);
}

function startNewGame(S) {
  resetWorld(S);
  startMission(S, 0);
  S.screen = SCREEN_PLAY;
  showBanner(S, 'Welcome Home', "Mama Luz is waiting at Café del Sol", 4);
  audio.unlock();
  audio.startMusic();
  announce(`${GAME_NAME}. Mission 1: Welcome Home.`);
}

function continueGame(S) {
  const data = loadSave();
  resetWorld(S);
  if (data) applySave(S, data);
  S.screen = SCREEN_PLAY;
  showBanner(S, 'Welcome back', 'Solmarina missed you', 3);
  audio.unlock();
  audio.startMusic();
  announce(`${GAME_NAME}. Continued.`);
}

function restartMission(S, spawnX, spawnY) {
  const index = S.mission.index;
  softReset(S, spawnX ?? LANDMARKS.garage.x, spawnY ?? LANDMARKS.garage.y + 60);
  startMission(S, index);
  S.screen = SCREEN_PLAY;
  showBanner(S, missionByIndex(index).title, 'Try it again', 3);
}

function endPlayer(S, reason) {
  S.overReason = reason;
  S.screen = SCREEN_OVER;
  S.player.money = Math.max(0, S.player.money - 200);
  audio.busted();
  audio.engineOff();
  saveGame(S);
  announce(reason === 'busted' ? 'Busted. The police have you.' : 'Wasted. Dario is down.');
}

function respawn(S) {
  const station = S.overReason === 'busted' ? LANDMARKS.policeStation : LANDMARKS.hospital;
  restartMission(S, station.x, station.y + 60);
}

function completeMission(S) {
  const mission = missionByIndex(S.mission.index);
  S.player.money += mission.reward;
  audio.cash();
  audio.missionDone();
  if (S.mission.index >= MISSIONS.length - 1) {
    S.finished = true;
    S.objectiveText = 'Free roam — Solmarina is yours';
    S.missionTarget = null;
    S.screen = SCREEN_ENDING;
    saveGame(S);
    announce('King of the Coast. Dario owns Solmarina.');
    return;
  }
  showBanner(S, 'MISSION COMPLETE', `${mission.title} — +$${mission.reward}`, 3.5);
  startMission(S, S.mission.index + 1);
  saveGame(S);
  announce(`Mission complete: ${mission.title}.`);
}

function announce(message) {
  status.textContent = message;
}

function runShot(name) {
  const S = createState();
  resetWorld(S);
  const scene = stageShot(name, S);
  let painted = 0;
  function paint() {
    renderer.draw(S, scene.screen);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const S = createState();
  resetWorld(S);
  window.__solmarina = S; // debug handle: the play-test reads the live state through it
  const input = createInput(canvas);
  let accumulator = 0;
  let last = performance.now();

  // Mouse position in world units: CSS pixels -> device pixels -> logical view -> world.
  function mouseWorld() {
    const rect = canvas.getBoundingClientRect();
    const dpr = canvas.width / rect.width;
    const viewScale = Math.min(canvas.width / VIEW.width, canvas.height / VIEW.height);
    const viewX = (canvas.width - VIEW.width * viewScale) / 2;
    const viewY = (canvas.height - VIEW.height * viewScale) / 2;
    const lx = (input.mouseX * dpr - viewX) / viewScale;
    const ly = (input.mouseY * dpr - viewY) / viewScale;
    return {
      x: S.camera.x + (lx - VIEW.width / 2) / S.camera.zoom,
      y: S.camera.y + (ly - VIEW.height / 2) / S.camera.zoom,
    };
  }

  function handleTitleActions(actions) {
    if (actions & ACTION_CONFIRM) {
      startNewGame(S);
      return;
    }
    if (actions & ACTION_ENTER) {
      if (S.hasSave) continueGame(S);
      else startNewGame(S);
    }
  }

  function handlePlayActions(actions) {
    if (actions & ACTION_PAUSE) {
      S.screen = SCREEN_PAUSED;
      audio.engineOff();
      announce('Paused.');
      return;
    }
    if (actions & ACTION_MUTE) {
      const muted = audio.toggleMute();
      showBanner(S, muted ? 'Sound off' : 'Sound on', '', 1.2);
      return;
    }
    if (actions & ACTION_ENTER) {
      if (S.player.car) {
        exitCar(S.player, S.player.car);
        audio.engineOff();
      } else {
        enterNearestCar(S);
      }
    }
  }

  function enterNearestCar(S) {
    const car = nearestCar(S.player, S.cars);
    if (!car) return;
    if (car.missionCar && S.mission.targetCar === car) {
      const result = completeStealStep(S);
      if (result === 'step') {
        showBanner(S, 'The Comet GT is yours', 'Lose the cops — deliver it to the garage', 3);
      }
    }
    if (car.driver) {
      // The driver bails out and runs. Stealing in front of the law is a crime.
      car.driver = false;
      const ped = createPedestrian(S.rng, car.x + 30, car.y + 30);
      S.peds.push(ped);
      const copNear = nearestCopDistance(S.cars.filter((c) => c.police), S.cops, S.player.x, S.player.y) < 300;
      if (copNear || S.wanted.stars > 0) addHeat(S.wanted, WANTED.heatStealCar, S.time);
    }
    S.player.car = car;
    S.player.x = car.x;
    S.player.y = car.y;
    audio.unlock();
  }

  function shoot(S) {
    const player = S.player;
    if (player.car || player.ammo <= 0 || player.fireCooldown > 0) return;
    player.ammo -= 1;
    player.fireCooldown = 0.22;
    const aim = player.aimAngle;
    S.bullets.push(createBullet(player.x + Math.cos(aim) * 18, player.y + Math.sin(aim) * 18, aim, true));
    audio.gunshot();
    const copNear = nearestCopDistance(S.cars.filter((c) => c.police), S.cops, player.x, player.y) < 450;
    if (copNear || S.wanted.stars > 0) addHeat(S.wanted, WANTED.heatShoot, S.time);
  }

  function collectPickups(S) {
    for (const pickup of S.city.pickups) {
      if (pickup.taken) continue;
      if (Math.hypot(pickup.x - S.player.x, pickup.y - S.player.y) < 30) {
        pickup.taken = true;
        S.player.money += pickup.amount;
        audio.pickup();
        showBanner(S, pickup.kind === 'gold' ? 'Gold bar!' : 'Cash!', `+$${pickup.amount}`, 1.5);
      }
    }
  }

  function checkRespray(S) {
    if (S.wanted.stars === 0 || !S.player.car) return;
    for (const key of ['resprayA', 'resprayB']) {
      const shop = LANDMARKS[key];
      if (Math.hypot(shop.x - S.player.x, shop.y - S.player.y) < 80) {
        if (S.player.money >= WANTED.resprayCost) {
          S.player.money -= WANTED.resprayCost;
          S.wanted = createWanted();
          showBanner(S, "Lucky's Respray", 'Clean plates, clean record — $150', 2.5);
          audio.cash();
        } else {
          S.prompt = "Lucky's Respray — $150 (not enough cash)";
        }
        return;
      }
    }
  }

  function updatePlaying(dt) {
    const player = S.player;
    S.time += dt;
    // Aim follows the mouse.
    const mouse = mouseWorld();
    player.aimAngle = Math.atan2(mouse.y - player.y, mouse.x - player.x);

    if (player.car) {
      const car = player.car;
      const throttle = (input.moveY < 0 ? 1 : 0) - (input.moveY > 0 ? 0.6 : 0);
      const steer = input.moveX;
      const hardHit = driveCar(car, S.city, throttle, steer, dt, S.cars);
      if (input.handbrake) car.speed *= Math.max(0, 1 - 3 * dt);
      if (hardHit) {
        audio.crash();
        damageCar(car, 8);
        if (car.wrecked) {
          exitCar(player, car);
          showBanner(S, 'Wrecked!', 'The car is done for', 2);
        }
      }
      player.x = car.x;
      player.y = car.y;
      player.angle = car.angle;
      audio.engine(car.speed, 540);
      // Run over pedestrians.
      for (const ped of S.peds) {
        if (!ped.down && Math.hypot(ped.x - car.x, ped.y - car.y) < 24 && Math.abs(car.speed) > 120) {
          knockDown(ped);
          addHeat(S.wanted, WANTED.heatHitPed, S.time);
          audio.crash();
        }
      }
      // Police rams hurt the car.
      for (const copCar of S.cars) {
        if (!copCar.police || copCar.wrecked) continue;
        if (Math.hypot(copCar.x - car.x, copCar.y - car.y) < 42 && Math.abs(copCar.speed) > 150) {
          damageCar(car, 4);
          if (car.wrecked) {
            exitCar(player, car);
            showBanner(S, 'Wrecked!', 'The cops smashed your ride', 2);
          }
        }
      }
    } else {
      updatePlayerOnFoot(player, S.city, input, dt);
      audio.engineOff();
      if (input.mouseDown) shoot(S);
    }

    // Prompt when a car is in reach.
    if (!player.car) {
      const car = nearestCar(player, S.cars);
      S.prompt = car ? `E — Get in the ${car.type === 'sports' ? 'Comet GT' : car.type}` : null;
    } else {
      S.prompt = 'E — Get out · Space — Handbrake';
    }

    // Traffic, crowd, police.
    for (const car of S.cars) {
      if (car.police || car === player.car || car.wrecked) continue;
      if (car.driver) updateTrafficCar(car, S.cars, S.city, dt, S.rng);
    }
    maintainTraffic(S.cars, S.rng, player.x, player.y, player.car);
    maintainCrowd(S.peds, S.rng, player.x, player.y, 34, 950, 1250);
    updatePedestrians(S.peds, S.rng, dt, {
      x: player.car ? player.car.x : player.x,
      y: player.car ? player.car.y : player.y,
      active: S.wanted.stars > 0 || input.mouseDown,
    });

    // Wanted: spawn police, chase, decay.
    const policeCars = S.cars.filter((c) => c.police && !c.wrecked);
    if (S.wanted.stars > 0) {
      spawnPoliceCars(S.rng, S.cars, player.x, player.y, S.wanted.stars);
      for (const copCar of policeCars) {
        updatePoliceCar(copCar, S.city, player, dt, S.cars);
        if (Math.hypot(copCar.x - player.x, copCar.y - player.y) < 40 && !player.car && Math.abs(copCar.speed) > 100) {
          hurtPlayer(player, 12);
        }
      }
      if (S.wanted.stars >= 2 && S.cops.filter((c) => !c.dead).length < S.wanted.stars - 1) {
        const angle = S.rng.range(0, Math.PI * 2);
        S.cops.push(createCop(S.rng, player.x + Math.cos(angle) * 320, player.y + Math.sin(angle) * 320));
      }
    } else {
      for (const copCar of policeCars) {
        // Give up the chase and drive off.
        driveCar(copCar, S.city, 0.5, 0, dt, S.cars);
        if (Math.hypot(copCar.x - player.x, copCar.y - player.y) > 1100) copCar.wrecked = true;
      }
      S.cars = S.cars.filter((c) => !c.wrecked || c === player.car);
    }
    const copDist = nearestCopDistance(policeCars, S.cops, player.x, player.y);
    updateWanted(S.wanted, dt, S.time, copDist);
    audio.siren(S.wanted.stars, dt);

    // Foot cops shoot.
    for (const cop of S.cops) {
      if (cop.dead) continue;
      updateCop(cop, player, S.city, dt, S.rng);
      if (cop.fireCooldown <= 0 && Math.hypot(cop.x - player.x, cop.y - player.y) < 420 && !player.car) {
        cop.fireCooldown = 0.9 + S.rng.range(0, 0.4);
        const spread = S.rng.range(-0.12, 0.12);
        S.bullets.push(createBullet(cop.x, cop.y, Math.atan2(player.y - cop.y, player.x - cop.x) + spread, false));
        audio.enemyShot();
      }
    }

    // Enemies.
    for (const enemy of S.enemies) {
      if (enemy.dead) continue;
      const fired = updateEnemy(enemy, player, S.bullets, dt, S.rng);
      if (fired) audio.enemyShot();
      if (enemy.health <= 0) {
        enemy.dead = true;
        S.sparks.push(...makeSparks(enemy.x, enemy.y, 10, S.rng));
      }
    }
    for (const cop of S.cops) {
      if (cop.health <= 0 && !cop.dead) {
        cop.dead = true;
        addHeat(S.wanted, WANTED.heatKillCop, S.time);
      }
    }

    // Bullets.
    updateBullets(
      S.bullets, S.city, player, S.enemies, S.cops, dt,
      () => {
        hurtPlayer(player, 7);
        if (player.health <= 0) endPlayer(S, S.wanted.stars > 0 ? 'busted' : 'wasted');
      },
      (enemy) => {
        S.sparks.push(...makeSparks(enemy.x, enemy.y, 6, S.rng));
        if (enemy.health <= 0) enemy.dead = true;
      },
      (cop) => {
        S.sparks.push(...makeSparks(cop.x, cop.y, 6, S.rng));
        if (cop.health <= 0) cop.dead = true;
      },
    );
    updateSparks(S.sparks, dt);

    collectPickups(S);
    checkRespray(S);

    // Missions.
    if (!S.finished) {
      const result = updateMission(S, dt);
      if (result === 'step') {
        audio.pickup();
      } else if (result === 'done') {
        completeMission(S);
      } else if (result === 'failed') {
        showBanner(S, 'MISSION FAILED', 'Too slow — try it again', 3);
        restartMission(S);
        return;
      }
      const mission = missionByIndex(S.mission.index);
      const step = mission.steps[S.mission.step];
      S.missionTimer = step && step.kind === 'timed' ? step.seconds - S.mission.timer : 0;
      S.objectiveText = missionObjectiveText(S);
      S.missionTarget = missionTarget(S);
    }

    // Camera follows, zooming out in a car.
    const targetZoom = player.car ? 0.82 : 1.0;
    S.camera.zoom += (targetZoom - S.camera.zoom) * Math.min(1, 2 * dt);
    S.camera.x += (player.x - S.camera.x) * Math.min(1, 6 * dt);
    S.camera.y += (player.y - S.camera.y) * Math.min(1, 6 * dt);

    // Health: wasted when it runs out on foot.
    if (player.health <= 0 && S.screen === SCREEN_PLAY) {
      endPlayer(S, S.wanted.stars > 0 && copDist < 350 ? 'busted' : 'wasted');
      return;
    }

    S.autosaveTimer += dt;
    if (S.autosaveTimer > AUTOSAVE_SECONDS) {
      S.autosaveTimer = 0;
      saveGame(S);
    }
  }

  function updateTitle(dt) {
    S.time += dt;
    S.titleAngle += dt * 0.05;
    S.camera.x = 1440 + Math.cos(S.titleAngle) * 320;
    S.camera.y = 1040 + Math.sin(S.titleAngle) * 200;
    S.camera.zoom = 0.85;
    for (const car of S.cars) {
      if (car.driver && !car.police) updateTrafficCar(car, S.cars, S.city, dt, S.rng);
    }
    updatePedestrians(S.peds, S.rng, dt, { x: -9999, y: -9999, active: false });
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    const actions = input.takeActions();
    if (actions & ACTION_MUTE) audio.toggleMute();
    if (S.screen === SCREEN_TITLE) {
      handleTitleActions(actions);
      while (accumulator >= STEP && S.screen === SCREEN_TITLE) {
        updateTitle(STEP);
        accumulator -= STEP;
      }
    } else if (S.screen === SCREEN_PLAY) {
      handlePlayActions(actions);
      while (accumulator >= STEP && S.screen === SCREEN_PLAY) {
        updatePlaying(STEP);
        accumulator -= STEP;
      }
    } else if (S.screen === SCREEN_PAUSED) {
      if (actions & ACTION_PAUSE) {
        S.screen = SCREEN_PLAY;
        announce('Playing.');
      } else if (actions & ACTION_CONFIRM) {
        S.screen = SCREEN_PLAY;
      }
      accumulator = 0;
    } else if (S.screen === SCREEN_OVER) {
      if (actions & ACTION_CONFIRM) respawn(S);
      accumulator = 0;
    } else if (S.screen === SCREEN_ENDING) {
      if (actions & ACTION_CONFIRM) {
        S.screen = SCREEN_PLAY;
        S.finished = true;
      }
      accumulator = 0;
    }
    renderer.draw(S, S.screen);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && S.screen === SCREEN_PLAY) {
      S.screen = SCREEN_PAUSED;
      audio.engineOff();
      announce('Paused.');
    }
  });

  announce(`${GAME_NAME}. Press Enter or click to start.`);
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
