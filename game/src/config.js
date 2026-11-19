// Solmarina — tuning, palette, car models and district names.
// One place for every number the rest of the game balances on.
export const GAME_NAME = 'SOLMARINA';
export const GAME_TAGLINE = 'Streets of the Sun';
export const SAVE_KEY = 'solmarina-save-v1';

// World: a 3200 x 2400 coastal city. Streets form a grid; the south edge is the beach.
export const WORLD = { width: 3200, height: 2400, roadHalf: 36, beachTop: 2200 };
export const STREETS_X = [240, 640, 1040, 1440, 1840, 2240, 2640, 3040];
export const STREETS_Y = [240, 640, 1040, 1440, 1840, 2160];

// Camera and canvas.
export const VIEW = { width: 1280, height: 720, zoomFoot: 1.0, zoomCar: 0.82 };

// The player on foot.
export const PLAYER = {
  radius: 13,
  walkSpeed: 178,
  sprintSpeed: 268,
  maxHealth: 100,
  startMoney: 250,
  startAmmo: 48,
  maxAmmo: 240,
};

// Cars. maxSpeed and accel are world units per second; grip steadies the steering.
export const CAR_TYPES = {
  sedan: { label: 'Sedan', length: 46, width: 22, maxSpeed: 390, accel: 230, grip: 3.4, colors: ['#c23b2e', '#3e6fb0', '#d8d3c8', '#4d8a5a', '#7a5a9e'] },
  taxi: { label: 'Taxi', length: 46, width: 22, maxSpeed: 400, accel: 240, grip: 3.4, colors: ['#e8b820'] },
  sports: { label: 'Comet GT', length: 48, width: 22, maxSpeed: 540, accel: 330, grip: 4.4, colors: ['#d21f3c', '#f2f2f2', '#1c1c22', '#e86a1c'] },
  truck: { label: 'Truck', length: 62, width: 26, maxSpeed: 300, accel: 160, grip: 2.6, colors: ['#8a7a5a', '#5a6b7a', '#a03a2a'] },
  van: { label: 'Van', length: 54, width: 24, maxSpeed: 340, accel: 190, grip: 2.9, colors: ['#c8c8c8', '#3a5a8a', '#b08030'] },
  police: { label: 'Cruiser', length: 48, width: 22, maxSpeed: 500, accel: 320, grip: 4.2, colors: ['#1c2f4a'] },
};

// Wanted level: heat points drive the stars; crimes add heat, hiding sheds it.
export const WANTED = {
  starAt: [0, 10, 30, 60, 100, 150], // heat needed for 0..5 stars
  heatStealCar: 25,
  heatHitPed: 15,
  heatShoot: 8,
  heatKillPed: 30,
  heatKillCop: 45,
  decayPerSec: 1.4,
  quietSeconds: 8,
  maxPoliceCars: 4,
  resprayCost: 150,
};

// Combat.
export const COMBAT = {
  bulletSpeed: 760,
  bulletRange: 520,
  bulletDamage: 34,
  fireCooldown: 0.22,
  enemyHealth: 100,
  enemyDamage: 7,
  enemyRange: 420,
  enemyFireCooldown: 0.9,
};

// Traffic and pedestrians kept alive near the player.
export const CROWD = { trafficCars: 14, pedestrians: 34, spawnRadius: 950, despawnRadius: 1250 };

// Sun-soaked palette: warm asphalt, pale sidewalks, terracotta roofs, turquoise water.
export const PALETTE = {
  grass: '#7fae62',
  sand: '#e8d5a0',
  water: '#2fa8b8',
  waterDeep: '#1d7f96',
  asphalt: '#4a4a52',
  asphaltLine: '#c8b96a',
  sidewalk: '#b9b3a4',
  building: ['#c96f4a', '#d9a05b', '#8a6f9e', '#5b8a7a', '#b05a5a', '#7a8aa0', '#c8b06a'],
  roof: ['#a34a32', '#8a6a3a', '#5a4a6a', '#3a6a5a', '#8a3a3a', '#4a5a6a', '#9a8030'],
  park: '#6a9e52',
  roofEdge: '#00000033',
};

// District names, used for the location line on the HUD.
export function districtAt(x, y) {
  if (y >= 2050) return 'Marina Bay';
  if (x < 800) return y < 1200 ? 'Old Port' : 'Barrio Verde';
  if (x >= 2000 && y < 1200) return 'The Palms';
  if (y >= 1200 && x >= 1600) return 'Marina Bay';
  if (y < 480 && x >= 1600) return 'The Docks';
  return 'Downtown';
}
