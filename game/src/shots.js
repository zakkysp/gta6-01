// The screenshot scenes behind ?shot=start|drive|chase|mission. Each one sets the
// real game state to a fixed, seeded moment — the player driving the beach road, a
// three-star chase downtown, the bank shootout — then lets traffic and pedestrians
// run a couple of seconds so the frame is a living game, not a diorama.
import { LANDMARKS } from './world.js';
import { createCar } from './traffic.js';
import { createCop } from './police.js';
import { createEnemy } from './combat.js';
import { createPedestrian } from './people.js';
import { SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const SIM_SECONDS = 2.5;
const STEP = 1 / 60;

function placeTraffic(S, spots) {
  for (const spot of spots) {
    const car = createCar(S.rng, spot.type, spot.x, spot.y, spot.angle);
    car.speed = spot.speed || 150;
    S.cars.push(car);
  }
}

function placePeds(S, count, cx, cy) {
  for (let i = 0; i < count; i += 1) {
    const x = cx + S.rng.range(-320, 320);
    const y = cy + S.rng.range(-220, 220);
    S.peds.push(createPedestrian(S.rng, x, y));
  }
}

// Let traffic and pedestrians move a little so the scene breathes.
function settle(S) {
  for (let i = 0; i < SIM_SECONDS / STEP; i += 1) {
    for (const car of S.cars) {
      if (!car.police && car.driver) {
        car.x += Math.cos(car.angle) * car.speed * STEP;
        car.y += Math.sin(car.angle) * car.speed * STEP;
      }
    }
    for (const ped of S.peds) {
      ped.x += Math.cos(ped.angle) * ped.speed * STEP;
      ped.y += Math.sin(ped.angle) * ped.speed * STEP;
      ped.walkPhase += STEP * 7;
    }
  }
}

function baseScene(S, objectiveText, missionTarget) {
  S.time = 1.7;
  S.objectiveText = objectiveText;
  S.missionTarget = missionTarget;
  S.prompt = null;
  S.banner = null;
  S.missionTimer = 0;
  S.camera.zoom = 0.82;
}

export function stageShot(name, S) {
  S.resetWorld();
  if (name === 'drive') {
    // The Comet GT run down the beach road, mission 2 on the HUD.
    const car = createCar(S.rng, 'sports', 1420, 2142, 0);
    car.color = '#d21f3c';
    car.driver = false;
    S.cars.push(car);
    S.player.car = car;
    S.player.x = car.x;
    S.player.y = car.y;
    car.speed = 330;
    baseScene(S, 'Hot Wheels — Deliver the Comet GT to the garage', { x: LANDMARKS.garage.x, y: LANDMARKS.garage.y });
    placeTraffic(S, [
      { type: 'sedan', x: 1150, y: 2178, angle: Math.PI, speed: 150 },
      { type: 'taxi', x: 1750, y: 2178, angle: Math.PI, speed: 140 },
      { type: 'van', x: 2050, y: 2142, angle: 0, speed: 120 },
      { type: 'sedan', x: 900, y: 2142, angle: 0, speed: 160 },
      { type: 'sports', x: 1620, y: 2178, angle: Math.PI, speed: 190 },
      { type: 'sedan', x: 1250, y: 2142, angle: 0, speed: 145 },
    ]);
    placePeds(S, 8, 1420, 2140);
    S.player.money = 1250;
    S.wanted.stars = 0;
    S.wanted.heat = 0;
    settle(S);
    S.camera.x = S.player.x;
    S.camera.y = S.player.y;
    return { screen: SCREEN_PLAY };
  }
  if (name === 'chase') {
    // Three stars downtown, two cruisers on the bumper.
    const car = createCar(S.rng, 'sports', 1500, 1022, 0);
    car.color = '#1c1c22';
    car.driver = false;
    S.cars.push(car);
    S.player.car = car;
    S.player.x = car.x;
    S.player.y = car.y;
    car.speed = 380;
    baseScene(S, 'The Drop — Deliver the package to Marina Bay', { x: LANDMARKS.marina.x, y: LANDMARKS.marina.y });
    S.wanted.heat = 65;
    S.wanted.stars = 3;
    const cruiserA = createCar(S.rng, 'police', 1380, 1022, 0);
    cruiserA.police = true;
    cruiserA.speed = 380;
    const cruiserB = createCar(S.rng, 'police', 1330, 1058, 0);
    cruiserB.police = true;
    cruiserB.speed = 360;
    S.cars.push(cruiserA, cruiserB);
    placeTraffic(S, [
      { type: 'sedan', x: 1750, y: 1058, angle: Math.PI, speed: 150 },
      { type: 'truck', x: 2050, y: 1022, angle: 0, speed: 110 },
    ]);
    placePeds(S, 10, 1500, 1040);
    S.player.money = 2400;
    S.player.health = 78;
    settle(S);
    S.camera.x = S.player.x;
    S.camera.y = S.player.y;
    return { screen: SCREEN_PLAY };
  }
  if (name === 'mission') {
    // The Vault: on foot outside the bank, guards closing in, cash on the ground.
    S.player.x = LANDMARKS.bank.x - 18;
    S.player.y = LANDMARKS.bank.y + 90;
    S.player.angle = -Math.PI / 2;
    S.player.aimAngle = -Math.PI / 2;
    S.player.ammo = 24;
    S.player.health = 82;
    baseScene(S, 'The Vault — Take out the bank guards (4)', { x: LANDMARKS.bank.x, y: LANDMARKS.bank.y });
    const spots = [
      { x: LANDMARKS.bank.x - 18, y: LANDMARKS.bank.y - 140 },
      { x: LANDMARKS.bank.x + 140, y: 658 },
      { x: LANDMARKS.bank.x - 140, y: 658 },
      { x: LANDMARKS.bank.x - 18, y: LANDMARKS.bank.y + 160 },
    ];
    for (const spot of spots) S.enemies.push(createEnemy(spot.x, spot.y, 'Guard'));
    S.enemies[0].flash = 0.09;
    S.bullets.push({ x: S.player.x + 30, y: S.player.y - 40, vx: 0, vy: -760, travelled: 60, fromPlayer: true, dead: false });
    S.sparks.push(
      { x: LANDMARKS.bank.x - 18, y: LANDMARKS.bank.y - 140, vx: 80, vy: -60, life: 0.3 },
      { x: LANDMARKS.bank.x - 18, y: LANDMARKS.bank.y - 140, vx: -70, vy: 90, life: 0.25 },
      { x: LANDMARKS.bank.x + 140, y: 658, vx: 60, vy: 40, life: 0.3 },
    );
    placeTraffic(S, [
      { type: 'sedan', x: 1250, y: 658, angle: 0, speed: 140 },
      { type: 'taxi', x: 1750, y: 658, angle: Math.PI, speed: 130 },
    ]);
    placePeds(S, 6, 1500, 700);
    S.player.money = 3150;
    S.wanted.heat = 100;
    S.wanted.stars = 4;
    S.cops.push(createCop(S.rng, LANDMARKS.bank.x - 18, LANDMARKS.bank.y + 300));
    settle(S);
    S.camera.x = S.player.x;
    S.camera.y = S.player.y;
    S.camera.zoom = 1.0;
    return { screen: SCREEN_PLAY };
  }
  // Default: the title screen over Downtown, Dario beside his Comet GT.
  const car = createCar(S.rng, 'sports', 1560, 1000, -Math.PI / 2);
  car.color = '#d21f3c';
  car.driver = false;
  S.cars.push(car);
  S.player.x = 1500;
  S.player.y = 1060;
  S.player.angle = -Math.PI / 3;
  baseScene(S, '', null);
  placeTraffic(S, [
    { type: 'sedan', x: 1200, y: 1022, angle: 0, speed: 150 },
    { type: 'taxi', x: 1850, y: 1058, angle: Math.PI, speed: 140 },
    { type: 'van', x: 2100, y: 1022, angle: 0, speed: 120 },
  ]);
  placePeds(S, 12, 1500, 1040);
  S.player.money = 250;
  S.wanted.stars = 0;
  settle(S);
  S.camera.x = 1500;
  S.camera.y = 1040;
  S.camera.zoom = 0.9;
  S.hasSave = false;
  return { screen: SCREEN_TITLE };
}
