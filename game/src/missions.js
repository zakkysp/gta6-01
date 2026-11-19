// The story: Dario Vega is back in Solmarina, and Mama Luz's garage is in debt to
// Viktor Kroll, the developer buying up the Old Port. Five jobs pay the debt off.
// Each mission is a list of steps; a step is done by reaching a place, taking a car,
// or clearing the guards it spawns.
import { LANDMARKS } from './world.js';
import { createEnemy } from './combat.js';

export const MISSIONS = [
  {
    id: 'welcome-home',
    title: 'Welcome Home',
    intro: 'Five years away, and Solmarina smells the same: salt, gasoline and trouble. Mama Luz is waiting at Café del Sol.',
    reward: 300,
    steps: [
      { kind: 'goto', x: LANDMARKS.diner.x, y: LANDMARKS.diner.y, radius: 70, text: 'Meet Mama Luz at Café del Sol' },
      { kind: 'driveTo', x: LANDMARKS.luzHouse.x, y: LANDMARKS.luzHouse.y, radius: 70, text: "Drive Mama Luz home to Barrio Verde" },
      { kind: 'goto', x: LANDMARKS.garage.x, y: LANDMARKS.garage.y, radius: 70, text: "Head back to Vega's Garage" },
    ],
  },
  {
    id: 'hot-wheels',
    title: 'Hot Wheels',
    intro: 'Kroll wants a Comet GT for his collection. Mama Luz wants the money. The showroom on Palm Row has one with the keys in it.',
    reward: 600,
    steps: [
      { kind: 'goto', x: LANDMARKS.showroom.x, y: LANDMARKS.showroom.y, radius: 80, text: 'Get to Comet Motors' },
      { kind: 'stealCar', x: LANDMARKS.showroom.x + 18, y: LANDMARKS.showroom.y, text: 'Steal the Comet GT' },
      { kind: 'deliver', x: LANDMARKS.garage.x, y: LANDMARKS.garage.y, radius: 80, text: 'Deliver the Comet GT to the garage' },
    ],
  },
  {
    id: 'the-drop',
    title: 'The Drop',
    intro: 'A sealed crate at the Docks, a buyer at Marina Bay, and a clock that does not wait. The cops know the route too.',
    reward: 800,
    steps: [
      { kind: 'goto', x: LANDMARKS.docks.x, y: LANDMARKS.docks.y, radius: 80, text: 'Pick up the package at the Docks' },
      { kind: 'timed', x: LANDMARKS.marina.x, y: LANDMARKS.marina.y, radius: 90, seconds: 150, text: 'Deliver the package to Marina Bay' },
    ],
  },
  {
    id: 'the-vault',
    title: 'The Vault',
    intro: 'Kroll keeps his money in Solmarina First Bank, and his guards are paid to be brave. Take the cash. Take the heat. Bring it home.',
    reward: 2500,
    steps: [
      { kind: 'goto', x: LANDMARKS.bank.x, y: LANDMARKS.bank.y, radius: 80, text: 'Get to Solmarina First Bank' },
      { kind: 'kill', count: 4, text: 'Take out the bank guards (4)' },
      { kind: 'goto', x: LANDMARKS.bank.x, y: LANDMARKS.bank.y, radius: 60, text: 'Grab the cash from the vault' },
      { kind: 'deliver', x: LANDMARKS.garage.x, y: LANDMARKS.garage.y, radius: 80, text: 'Lose the heat — get the cash to the garage' },
    ],
  },
  {
    id: 'king-of-the-coast',
    title: 'King of the Coast',
    intro: "Kroll is leaving on his yacht tonight, and the debt papers go with him. End it on the sand at Marina Bay.",
    reward: 5000,
    steps: [
      { kind: 'goto', x: LANDMARKS.marina.x, y: LANDMARKS.marina.y, radius: 90, text: 'Get to Marina Bay' },
      { kind: 'kill', count: 5, text: "Clear Kroll's henchmen (5)" },
      { kind: 'goto', x: LANDMARKS.yacht.x, y: LANDMARKS.yacht.y, radius: 70, text: 'Board the yacht' },
    ],
  },
];

export function missionByIndex(index) {
  return MISSIONS[Math.min(index, MISSIONS.length - 1)];
}

// Begin a mission: reset the step, clear its enemies, stage what it needs.
export function startMission(S, index) {
  const mission = missionByIndex(index);
  S.mission = { index, step: 0, timer: 0, targetCar: null, hasPackage: false };
  S.enemies = [];
  if (mission.id === 'hot-wheels') {
    // The Comet GT waits in the showroom lot, on the street by the door.
    const car = {
      type: 'sports', x: LANDMARKS.showroom.x + 18, y: LANDMARKS.showroom.y,
      angle: Math.PI / 2, speed: 0, color: '#d21f3c', driver: false, police: false,
      wrecked: false, health: 100, axis: null, street: 0, dir: 1, smoke: 0, missionCar: true,
    };
    S.cars.push(car);
    S.mission.targetCar = car;
  }
  return mission;
}

// Where the current step points, for the HUD marker and the minimap blip.
export function missionTarget(S) {
  const mission = missionByIndex(S.mission.index);
  const step = mission.steps[S.mission.step];
  if (!step) return null;
  if (step.kind === 'stealCar' && S.mission.targetCar) {
    return { x: S.mission.targetCar.x, y: S.mission.targetCar.y };
  }
  return { x: step.x, y: step.y };
}

export function missionObjectiveText(S) {
  const mission = missionByIndex(S.mission.index);
  const step = mission.steps[S.mission.step];
  if (!step) return '';
  return `${mission.title} — ${step.text}`;
}

// Spawn the guards for a kill step, in a ring around the player.
export function spawnKillStep(S, count, rng) {
  S.enemies = [];
  for (let i = 0; i < count; i += 1) {
    const angle = (i / count) * Math.PI * 2 + rng.range(-0.4, 0.4);
    const dist = rng.range(180, 300);
    const enemy = createEnemy(S.player.x + Math.cos(angle) * dist, S.player.y + Math.sin(angle) * dist, 'Guard');
    S.enemies.push(enemy);
  }
}

// Advance the mission one step. Returns 'step', 'done', 'failed' or null.
export function updateMission(S, dt) {
  const mission = missionByIndex(S.mission.index);
  const step = mission.steps[S.mission.step];
  if (!step) return null;
  const px = S.player.x;
  const py = S.player.y;
  const dist = step.x !== undefined ? Math.hypot(step.x - px, step.y - py) : Infinity;

  if (step.kind === 'timed') {
    S.mission.timer += dt;
    if (S.mission.timer > step.seconds) return 'failed';
    if (dist < step.radius) return advanceMission(S);
    return null;
  }
  if (step.kind === 'goto' || step.kind === 'driveTo' || step.kind === 'deliver') {
    const inCar = step.kind === 'driveTo' || step.kind === 'deliver' ? S.player.car !== null : true;
    if (inCar && dist < step.radius) return advanceMission(S);
    return null;
  }
  if (step.kind === 'stealCar') {
    return null; // completed by entering the target car (main loop calls completeStealStep)
  }
  if (step.kind === 'kill') {
    const alive = S.enemies.filter((e) => !e.dead).length;
    if (alive === 0 && S.enemies.length > 0) return advanceMission(S);
    return null;
  }
  return null;
}

function advanceMission(S) {
  const mission = missionByIndex(S.mission.index);
  S.mission.step += 1;
  S.mission.timer = 0;
  if (S.mission.step >= mission.steps.length) return 'done';
  const next = mission.steps[S.mission.step];
  if (next.kind === 'kill') {
    spawnKillStep(S, next.count, S.rng);
  }
  return 'step';
}

// The player just got into the mission's target car.
export function completeStealStep(S) {
  const mission = missionByIndex(S.mission.index);
  const step = mission.steps[S.mission.step];
  if (step && step.kind === 'stealCar') {
    S.mission.step += 1;
    S.mission.timer = 0;
    return 'step';
  }
  return null;
}

// How many enemies are left in a kill step, for the HUD.
export function enemiesLeft(S) {
  return S.enemies.filter((e) => !e.dead).length;
}
