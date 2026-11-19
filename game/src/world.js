// Solmarina itself: the street grid, the blocks between them, the buildings, parks,
// palms and the landmarks the story hangs on. Pure data and geometry — no drawing here.
import { PALETTE, STREETS_X, STREETS_Y, WORLD } from './config.js';
import { makeRng } from './rng.js';

// Landmarks the missions and the HUD name. All sit on roads or the sand, never
// inside a building, so a car can always reach them.
export const LANDMARKS = {
  garage: { x: 640, y: 880, label: "Vega's Garage" },
  diner: { x: 1040, y: 300, label: 'Café del Sol' },
  bank: { x: 1440, y: 700, label: 'Solmarina First Bank' },
  showroom: { x: 2240, y: 300, label: 'Comet Motors' },
  docks: { x: 2640, y: 320, label: 'The Docks' },
  marina: { x: 2640, y: 2160, label: 'Marina Bay' },
  yacht: { x: 2920, y: 2290, label: "Kroll's Yacht" },
  resprayA: { x: 640, y: 1500, label: "Lucky's Respray" },
  resprayB: { x: 2240, y: 1700, label: "Lucky's Respray" },
  hospital: { x: 1040, y: 1900, label: 'Solmarina General' },
  policeStation: { x: 1840, y: 500, label: 'Solmarina PD' },
  luzHouse: { x: 1040, y: 1300, label: "Mama Luz's House" },
};

export function buildCity(seed) {
  const rng = makeRng(seed);
  const buildings = [];
  const parks = [];
  const palms = [];
  const pickups = [];

  // One block between each pair of neighbouring streets.
  for (let ix = 0; ix < STREETS_X.length - 1; ix += 1) {
    for (let iy = 0; iy < STREETS_Y.length - 1; iy += 1) {
      const x0 = STREETS_X[ix] + WORLD.roadHalf + 26;
      const x1 = STREETS_X[ix + 1] - WORLD.roadHalf - 26;
      const y0 = STREETS_Y[iy] + WORLD.roadHalf + 26;
      const y1 = STREETS_Y[iy + 1] - WORLD.roadHalf - 26;
      if (x1 - x0 < 90 || y1 - y0 < 90) continue;
      const roll = rng.next();
      if (roll < 0.12) {
        parks.push({ x: x0, y: y0, w: x1 - x0, h: y1 - y0 });
        for (let p = 0; p < 4; p += 1) {
          palms.push({ x: rng.range(x0 + 20, x1 - 20), y: rng.range(y0 + 20, y1 - 20) });
        }
        continue;
      }
      const count = rng.int(1, 3);
      for (let b = 0; b < count; b += 1) {
        const w = rng.range(90, Math.max(100, (x1 - x0) / count - 30));
        const h = rng.range(80, Math.max(90, y1 - y0 - 40));
        const x = rng.range(x0, Math.max(x0 + 1, x1 - w));
        const y = rng.range(y0, Math.max(y0 + 1, y1 - h));
        const color = rng.pick(PALETTE.building);
        const roof = rng.pick(PALETTE.roof);
        buildings.push({ x, y, w, h, color, roof, tall: rng.chance(0.25) });
      }
    }
  }

  // Palms along the beach road and the marina.
  for (let x = 200; x < WORLD.width; x += 170) {
    palms.push({ x: x + rng.range(-20, 20), y: 2245 + rng.range(-8, 8) });
  }

  // Cash bundles on sidewalks and gold bars tucked into parks and alleys.
  for (let i = 0; i < 10; i += 1) {
    const spot = randomSidewalkPoint(rng);
    pickups.push({ x: spot.x, y: spot.y, kind: 'cash', amount: 100, taken: false });
  }
  for (let i = 0; i < 6; i += 1) {
    const park = parks.length > 0 ? rng.pick(parks) : null;
    const spot = park
      ? { x: rng.range(park.x + 20, park.x + park.w - 20), y: rng.range(park.y + 20, park.y + park.h - 20) }
      : randomSidewalkPoint(rng);
    pickups.push({ x: spot.x, y: spot.y, kind: 'gold', amount: 500, taken: false });
  }

  return { buildings, parks, palms, pickups, seed };
}

// True when the point is on asphalt (within a street's band).
export function onRoad(x, y) {
  for (const sx of STREETS_X) if (Math.abs(x - sx) <= WORLD.roadHalf) return true;
  for (const sy of STREETS_Y) if (Math.abs(y - sy) <= WORLD.roadHalf) return true;
  return false;
}

// True when a circle of radius r at (x, y) touches any building.
export function hitsBuilding(city, x, y, r) {
  for (const b of city.buildings) {
    if (x + r > b.x && x - r < b.x + b.w && y + r > b.y && y - r < b.y + b.h) return true;
  }
  return false;
}

// True when the point is inside the city bounds (the beach is walkable, the sea is not).
export function insideWorld(x, y) {
  return x >= 20 && x <= WORLD.width - 20 && y >= 20 && y <= WORLD.height - 20;
}

// A point on a sidewalk: just off a street, beside the road.
export function randomSidewalkPoint(rng) {
  if (rng.chance(0.5)) {
    const sx = rng.pick(STREETS_X);
    return { x: sx + (rng.chance(0.5) ? 1 : -1) * (WORLD.roadHalf + 16), y: rng.range(120, WORLD.height - 120) };
  }
  const sy = rng.pick(STREETS_Y);
  return { x: rng.range(120, WORLD.width - 120), y: sy + (rng.chance(0.5) ? 1 : -1) * (WORLD.roadHalf + 16) };
}

// A point on a road, with a lane offset so cars sit on the right side.
export function randomRoadPoint(rng) {
  if (rng.chance(0.5)) {
    const sx = rng.pick(STREETS_X);
    return { x: sx + 18, y: rng.range(120, WORLD.height - 120), angle: rng.chance(0.5) ? Math.PI / 2 : -Math.PI / 2 };
  }
  const sy = rng.pick(STREETS_Y);
  return { x: rng.range(120, WORLD.width - 120), y: sy + 18, angle: rng.chance(0.5) ? 0 : Math.PI };
}

// The nearest street centre to a point, used to snap spawned cars onto roads.
export function nearestStreet(x, y) {
  let best = { axis: 'x', at: STREETS_X[0], dist: Math.abs(x - STREETS_X[0]) };
  for (const sx of STREETS_X) {
    const d = Math.abs(x - sx);
    if (d < best.dist) best = { axis: 'x', at: sx, dist: d };
  }
  for (const sy of STREETS_Y) {
    const d = Math.abs(y - sy);
    if (d < best.dist) best = { axis: 'y', at: sy, dist: d };
  }
  return best;
}
