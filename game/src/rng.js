// A seeded random source (mulberry32) plus the small picks a city builder needs.
// The same seed always builds the same Solmarina, which is what makes the staged
// screenshots repeatable and the missions fair.
export function makeRng(seed) {
  let state = seed >>> 0;
  function next() {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  return {
    next,
    /** A float in [min, max). */
    range(min, max) {
      return min + next() * (max - min);
    },
    /** An integer in [min, max] inclusive. */
    int(min, max) {
      return min + Math.floor(next() * (max - min + 1));
    },
    /** One element of an array. */
    pick(list) {
      return list[Math.floor(next() * list.length)];
    },
    /** True with probability p. */
    chance(p) {
      return next() < p;
    },
  };
}
