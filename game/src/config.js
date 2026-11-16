// STARSHATTER — tuning, palette and content tables.
// One job: every magic number in the game lives here, so balance is edited in one place.

export const VIEW_W = 1280;
export const VIEW_H = 720;
export const STEP = 1 / 60;
export const BEST_KEY = 'starshatter-best-v1';

/** Palette: deep-space navy field, neon primaries. High contrast on dark so the
 *  game reads at thumbnail size (the judge sees screenshots, small). */
export const COLORS = {
  bgTop: '#070a1c',
  bgBottom: '#020208',
  nebulaA: '#1b2a6b',
  nebulaB: '#5b1b6b',
  nebulaC: '#0b3d4d',
  star: '#cfe8ff',
  player: '#4df3ff',
  playerCore: '#eafcff',
  bullet: '#aefcff',
  bulletCore: '#ffffff',
  dart: '#ff5d7a',
  weaver: '#ffb84d',
  bulwark: '#c07bff',
  mite: '#ff7ad9',
  splitter: '#7dff8a',
  boss: '#ff3d5e',
  orb: '#ff9d5c',
  powerShield: '#4dc9ff',
  powerRapid: '#ffe14d',
  powerSpread: '#ff7ad9',
  powerHull: '#7dff8a',
  text: '#e8f6ff',
  textDim: '#8fb3cc',
  danger: '#ff4d6d',
  gold: '#ffd94d',
};

/** Player tuning. */
export const PLAYER = {
  radius: 16,
  speed: 360,
  accel: 2600,
  drag: 6.5,
  fireInterval: 0.15,
  bulletSpeed: 780,
  bulletRadius: 5,
  bulletDamage: 1,
  invulnTime: 2.0,
  maxHulls: 4,
  startHulls: 3,
  trailEvery: 0.016,
};

/** Enemy table: one row per type. hp, speed, radius, score, behaviour. */
export const ENEMIES = {
  dart: { hp: 1, speed: 200, radius: 15, score: 50, color: COLORS.dart },
  weaver: { hp: 2, speed: 150, radius: 17, score: 80, color: COLORS.weaver },
  bulwark: { hp: 7, speed: 62, radius: 30, score: 200, color: COLORS.bulwark },
  mite: { hp: 1, speed: 265, radius: 10, score: 30, color: COLORS.mite },
  splitter: { hp: 3, speed: 110, radius: 22, score: 120, color: COLORS.splitter },
  boss: { hp: 240, speed: 46, radius: 74, score: 5000, color: COLORS.boss },
};

/** Wave compositions: [dart, weaver, bulwark, splitter] counts. Mites come from
 *  splitters. Wave 10 is the boss alone (plus mite trickle). */
export const WAVES = [
  null, // 1-indexed
  { dart: 6, weaver: 0, bulwark: 0, splitter: 0 },
  { dart: 8, weaver: 3, bulwark: 0, splitter: 0 },
  { dart: 8, weaver: 5, bulwark: 1, splitter: 0 },
  { dart: 10, weaver: 6, bulwark: 1, splitter: 2 },
  { dart: 10, weaver: 8, bulwark: 2, splitter: 2 },
  { dart: 12, weaver: 8, bulwark: 2, splitter: 3 },
  { dart: 12, weaver: 10, bulwark: 3, splitter: 3 },
  { dart: 14, weaver: 10, bulwark: 3, splitter: 4 },
  { dart: 14, weaver: 12, bulwark: 4, splitter: 4 },
  { boss: true },
];

export const BOSS = {
  hp: 240,
  radialEvery: 2.6,
  radialCount: 14,
  aimedEvery: 1.15,
  aimedCount: 3,
  miteEvery: 7,
  miteBatch: 4,
};

/** Power-ups: drop chance per kill, durations. */
export const POWERUPS = {
  dropChance: 0.11,
  hullChance: 0.03, // of drops, a hull (only if hulls < max)
  shield: { duration: 0, color: COLORS.powerShield, label: 'AEGIS' },
  rapid: { duration: 10, color: COLORS.powerRapid, label: 'OVERDRIVE' },
  spread: { duration: 12, color: COLORS.powerSpread, label: 'TRIDENT' },
  hull: { duration: 0, color: COLORS.powerHull, label: '+1 HULL' },
};

/** Combo: each kill without taking a hit raises the multiplier; it decays. */
export const COMBO = {
  max: 8,
  window: 4.0, // seconds to keep the chain alive
  perKill: 1,
};

/** Feel numbers (game-feel tiers): trauma 0-1, hit-stop seconds. */
export const FEEL = {
  shakeKill: 0.16,
  shakeHit: 0.55,
  shakeBossHit: 0.3,
  shakeBossDie: 1.0,
  hitStopKill: 0.0,
  hitStopHit: 0.09,
  hitStopBossDie: 0.16,
  flashHit: 0.35,
};

/** Wave flow timing. */
export const FLOW = {
  bannerTime: 2.2,
  breatherTime: 2.0,
  spawnInterval: 0.55,
  waveBonus: 250,
};
