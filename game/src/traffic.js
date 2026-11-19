// Cars: their physics, the traffic that fills Solmarina's streets, and the parked
// cars waiting to be borrowed. Traffic drives the grid; the player and the police
// steer freely and bounce off the buildings.
import { CAR_TYPES, CROWD, STREETS_X, STREETS_Y, WORLD } from './config.js';
import { hitsBuilding, onRoad, randomRoadPoint } from './world.js';

export function createCar(rng, type, x, y, angle) {
  const def = CAR_TYPES[type];
  return {
    type,
    x, y, angle,
    speed: 0,
    color: rng.pick(def.colors),
    driver: true,
    police: type === 'police',
    wrecked: false,
    health: 100,
    axis: null, // traffic only: 'x' drives along a vertical street, 'y' along a horizontal one
    street: 0,
    dir: 1,
    smoke: 0,
  };
}

// A traffic car starts on a street, in a lane, heading down it.
export function makeTrafficCar(rng, spot) {
  const types = ['sedan', 'sedan', 'sedan', 'taxi', 'van', 'sedan', 'truck', 'sports'];
  const type = rng.pick(types);
  const car = createCar(rng, type, spot.x, spot.y, spot.angle);
  const vertical = Math.abs(Math.cos(spot.angle)) < 0.5;
  car.axis = vertical ? 'x' : 'y';
  car.dir = spot.angle > 0 ? 1 : -1;
  car.street = vertical ? spot.x - 18 * car.dir : spot.y - 18 * car.dir;
  car.speed = rng.range(120, 190);
  return car;
}

// A parked car by the kerb, no driver inside, free for the taking.
export function makeParkedCar(rng, spot) {
  const car = createCar(rng, rng.pick(['sedan', 'sedan', 'van', 'sports']), spot.x, spot.y, spot.angle);
  car.driver = false;
  return car;
}

// Where the car's nose is, for collision and for ramming checks.
export function carNose(car) {
  const def = CAR_TYPES[car.type];
  return { x: car.x + Math.cos(car.angle) * (def.length / 2), y: car.y + Math.sin(car.angle) * (def.length / 2) };
}

function carBlocked(city, car, nx, ny) {
  const def = CAR_TYPES[car.type];
  const half = def.length / 2 - 4;
  const fx = nx + Math.cos(car.angle) * half;
  const fy = ny + Math.sin(car.angle) * half;
  const bx = nx - Math.cos(car.angle) * half;
  const by = ny - Math.sin(car.angle) * half;
  return hitsBuilding(city, fx, fy, 10) || hitsBuilding(city, bx, by, 10) || hitsBuilding(city, nx, ny, 10);
}

// Drive with throttle and steering, bouncing off walls and other cars.
// Returns true on a hard hit.
export function driveCar(car, city, throttle, steer, dt, cars) {
  const def = CAR_TYPES[car.type];
  const maxReverse = 130;
  car.speed += throttle * def.accel * dt;
  car.speed -= car.speed * 0.55 * dt; // rolling drag
  if (car.speed > def.maxSpeed) car.speed = def.maxSpeed;
  if (car.speed < -maxReverse) car.speed = -maxReverse;
  const turnRate = def.grip * Math.min(1, Math.abs(car.speed) / 140);
  car.angle += steer * turnRate * dt * (car.speed >= 0 ? 1 : -1);
  const nx = car.x + Math.cos(car.angle) * car.speed * dt;
  const ny = car.y + Math.sin(car.angle) * car.speed * dt;
  if (carBlocked(city, car, nx, ny) || (cars && carHitsCar(car, nx, ny, cars))) {
    const hard = Math.abs(car.speed) > 240;
    car.speed *= -0.25;
    return hard;
  }
  car.x = Math.max(24, Math.min(WORLD.width - 24, nx));
  car.y = Math.max(24, Math.min(WORLD.height - 24, ny));
  return false;
}

// Two cars overlap when their centres come within a car length of each other,
// measured along and across this car's heading, so cars can pass in the next lane.
function carHitsCar(car, nx, ny, cars) {
  const def = CAR_TYPES[car.type];
  const cos = Math.cos(car.angle);
  const sin = Math.sin(car.angle);
  for (const other of cars) {
    if (other === car || other.wrecked) continue;
    const dx = other.x - nx;
    const dy = other.y - ny;
    const along = dx * cos + dy * sin;
    const across = -dx * sin + dy * cos;
    const otherDef = CAR_TYPES[other.type];
    if (Math.abs(along) < (def.length + otherDef.length) / 2 - 8 && Math.abs(across) < (def.width + otherDef.width) / 2 - 2) return true;
  }
  return false;
}

// Traffic: follow the grid, turn at crossings now and then, stop for the car ahead.
export function updateTrafficCar(car, cars, city, dt, rng) {
  const ahead = carAhead(car, cars, 95);
  const targetSpeed = ahead ? Math.max(0, ahead.speed - 20) : 170;
  car.speed += (targetSpeed - car.speed) * Math.min(1, 2 * dt);
  if (car.speed < 5 && ahead) car.speed = 0;
  // At a crossing, sometimes turn onto the other street.
  const crossing = nearestCrossing(car);
  if (crossing !== null && Math.abs(crossing - along(car)) < 26 && rng.chance(0.02)) {
    turnOnto(car, crossing, rng);
  }
  const nx = car.x + Math.cos(car.angle) * car.speed * dt;
  const ny = car.y + Math.sin(car.angle) * car.speed * dt;
  if (!carBlocked(city, car, nx, ny) && onRoad(nx, ny)) {
    car.x = nx;
    car.y = ny;
  } else {
    // Shoved off the road (a shove, a nudge): steer back toward the street centre.
    car.angle += 1.2 * dt;
  }
}

// Distance along the car's street from the world origin.
function along(car) {
  return car.axis === 'x' ? car.y : car.x;
}

// The nearest crossing street ahead of the car, or null when none is close.
function nearestCrossing(car) {
  const streets = car.axis === 'x' ? STREETS_Y : STREETS_X;
  const pos = along(car);
  let best = null;
  let bestDist = 130;
  for (const s of streets) {
    const d = (s - pos) * car.dir;
    if (d > 0 && d < bestDist) {
      bestDist = d;
      best = s;
    }
  }
  return best;
}

function turnOnto(car, crossing, rng) {
  const left = rng.chance(0.5);
  if (car.axis === 'x') {
    car.axis = 'y';
    car.street = crossing;
    car.dir = left ? -1 : 1;
    car.angle = left ? Math.PI : 0;
    car.y = crossing + (car.dir > 0 ? 18 : -18);
  } else {
    car.axis = 'x';
    car.street = crossing;
    car.dir = left ? -1 : 1;
    car.angle = left ? -Math.PI / 2 : Math.PI / 2;
    car.x = crossing + (car.dir > 0 ? 18 : -18);
  }
}

// The car directly ahead of this one, if any. Parked cars do not count: traffic
// drives past a car at the kerb instead of queueing behind it forever.
function carAhead(car, cars, range) {
  let best = null;
  let bestDist = range;
  for (const other of cars) {
    if (other === car || other.wrecked || !other.driver) continue;
    const dx = other.x - car.x;
    const dy = other.y - car.y;
    const dist = Math.hypot(dx, dy);
    if (dist > range) continue;
    const dot = (dx * Math.cos(car.angle) + dy * Math.sin(car.angle)) / dist;
    if (dot > 0.86 && dist < bestDist) {
      bestDist = dist;
      best = other;
    }
  }
  return best;
}

// Keep traffic near the player: drop the far cars, add one a frame until the target.
export function maintainTraffic(cars, rng, px, py, playerCar) {
  for (let i = cars.length - 1; i >= 0; i -= 1) {
    const car = cars[i];
    if (car.police || car === playerCar) continue;
    if (Math.hypot(car.x - px, car.y - py) > CROWD.despawnRadius) cars.splice(i, 1);
  }
  let count = 0;
  for (const car of cars) if (!car.police && car.driver) count += 1;
  if (count >= CROWD.trafficCars) return;
  const spot = randomRoadPoint(rng);
  if (Math.hypot(spot.x - px, spot.y - py) > CROWD.spawnRadius) return;
  cars.push(makeTrafficCar(rng, spot));
}

// Damage a car; at zero health it is a smoking wreck nobody drives.
export function damageCar(car, amount) {
  car.health -= amount;
  if (car.health <= 0 && !car.wrecked) {
    car.wrecked = true;
    car.smoke = 1;
  }
}
