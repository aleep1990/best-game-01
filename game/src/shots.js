// STARSHATTER — shots. One job: stage deterministic screenshot states.
// ?shot=menu|action|boss|victory|gameover (&seed=N) composes a real game state
// from the game's own entities and the real renderer, then main.js paints it
// twice and sets window.__shotReady. Nothing here is edited or composited:
// every pixel comes from the game's own code.

import { VIEW_W, VIEW_H, ENEMIES } from './config.js';

function placeEnemy(world, type, x, y, extra = {}) {
  const e = world.spawnEnemy(type, x, y);
  Object.assign(e, extra);
  if (type === 'weaver' || type === 'bulwark') e.baseX = x;
  return e;
}

export function stageShot(name, world, particles) {
  const s = world.state;
  world.reset();
  particles.clear();
  s.time = 6.5;

  if (name === 'menu') {
    // Title screen: ambient drift behind the panel.
    placeEnemy(world, 'dart', 180, 120);
    placeEnemy(world, 'weaver', 420, 90);
    placeEnemy(world, 'mite', 980, 150);
    placeEnemy(world, 'dart', 1120, 90);
    placeEnemy(world, 'weaver', 760, 70);
    s.best = 24100;
    return { screen: 'title', best: 24100 };
  }

  if (name === 'action') {
    // Dense mid-fight, wave 4: the cover shot. Player lower-thirds, firing up
    // into a mixed pack, orbs incoming, two explosions blooming.
    s.wave = 4;
    s.phase = 'fight';
    s.score = 12450;
    s.best = 24100;
    s.combo = 6;
    s.comboTimer = 3.0;
    s.hulls = 3;
    const p = s.player;
    p.x = 560;
    p.y = 500;
    p.angle = -Math.PI / 2 - 0.25;
    p.shield = true;
    p.rapidT = 6;
    placeEnemy(world, 'dart', 300, 210, { vx: 60, vy: 90 });
    placeEnemy(world, 'dart', 560, 160, { vx: -70, vy: 110 });
    placeEnemy(world, 'dart', 760, 260, { vx: -40, vy: 80 });
    placeEnemy(world, 'dart', 1080, 380, { vx: -90, vy: 60 });
    placeEnemy(world, 'weaver', 880, 180);
    placeEnemy(world, 'weaver', 180, 300);
    placeEnemy(world, 'bulwark', 1020, 150);
    placeEnemy(world, 'splitter', 660, 120);
    placeEnemy(world, 'mite', 480, 330, { vx: 120, vy: 60 });
    placeEnemy(world, 'mite', 920, 330, { vx: -110, vy: 70 });
    placeEnemy(world, 'mite', 220, 440, { vx: 130, vy: -40 });
    // Player bullet stream, slightly fanned.
    for (let i = 0; i < 12; i++) {
      const a = -Math.PI / 2 - 0.25 + (i % 3 - 1) * 0.05;
      s.bullets.push({
        x: p.x + Math.cos(a) * (40 + i * 26) + (i % 2 ? 14 : -14),
        y: p.y + Math.sin(a) * (40 + i * 26),
        vx: Math.cos(a) * 780,
        vy: Math.sin(a) * 780,
        r: 5, damage: 1,
      });
    }
    // Incoming enemy orbs.
    const orbAngles = [0.5, 0.9, 1.3, 1.8, 2.2, 2.6];
    orbAngles.forEach((a, i) => {
      s.ebullets.push({
        x: 640 + Math.cos(a) * (260 - i * 18),
        y: 180 + Math.sin(a) * (200 - i * 12),
        vx: Math.cos(a + 1.2) * 210,
        vy: Math.sin(a + 1.2) * 210,
        r: 7,
      });
    });
    // Two explosions mid-bloom + a power-up drifting in.
    particles.apply([
      { type: 'explosion', x: 700, y: 230, color: ENEMIES.dart.color, n: 26, power: 280 },
      { type: 'explosion', x: 300, y: 380, color: ENEMIES.weaver.color, n: 20, power: 240 },
      { type: 'text', x: 700, y: 200, text: '+300', color: '#ffffff', size: 17 },
      { type: 'text', x: 700, y: 224, text: 'COMBO x6', color: '#ffd94d', size: 14 },
    ]);
    s.powerups.push({ kind: 'rapid', x: 980, y: 430, vy: 46, t: 0.6 });
    return { screen: 'play', best: 24100 };
  }

  if (name === 'boss') {
    // Wave 10: the Hollow Star at 60% hull, radial bullet ring, mites in.
    s.wave = 10;
    s.phase = 'fight';
    s.score = 48200;
    s.best = 52340;
    s.combo = 4;
    s.comboTimer = 2.5;
    s.hulls = 2;
    const p = s.player;
    p.x = 640;
    p.y = 560;
    p.angle = -Math.PI / 2;
    const boss = world.spawnEnemy('boss', VIEW_W / 2, 150);
    boss.entered = true;
    boss.y = 150;
    boss.targetY = 150;
    boss.hp = 144;
    boss.t = 2.2;
    // Radial ring of orbs around the boss.
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2 + 0.3;
      s.ebullets.push({
        x: boss.x + Math.cos(a) * 170,
        y: boss.y + Math.sin(a) * 170,
        vx: Math.cos(a) * 180,
        vy: Math.sin(a) * 180,
        r: 7,
      });
    }
    placeEnemy(world, 'mite', 420, 300, { vx: 100, vy: 80 });
    placeEnemy(world, 'mite', 860, 300, { vx: -100, vy: 80 });
    placeEnemy(world, 'mite', 640, 340, { vx: 0, vy: 120 });
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i - 2) * 0.07;
      s.bullets.push({
        x: p.x + Math.cos(a) * (50 + i * 30),
        y: p.y + Math.sin(a) * (50 + i * 30),
        vx: Math.cos(a) * 780,
        vy: Math.sin(a) * 780,
        r: 5, damage: 1,
      });
    }
    particles.apply([
      { type: 'explosion', x: 500, y: 260, color: ENEMIES.boss.color, n: 24, power: 260 },
    ]);
    return { screen: 'play', best: 52340 };
  }

  if (name === 'victory') {
    s.wave = 10;
    s.phase = 'victory';
    s.score = 52340;
    s.best = 52340;
    s.kills = 187;
    s.shotsFired = 640;
    s.shotsHit = 512;
    // Celebration bursts around the headline.
    particles.apply([
      { type: 'explosion', x: 300, y: 150, color: '#ffd94d', n: 20, power: 200 },
      { type: 'explosion', x: 980, y: 150, color: '#4df3ff', n: 20, power: 200 },
      { type: 'explosion', x: 640, y: 90, color: '#ff7ad9', n: 16, power: 180 },
    ]);
    return { screen: 'victory', best: 52340 };
  }

  if (name === 'gameover') {
    s.wave = 6;
    s.phase = 'over';
    s.score = 18930;
    s.best = 24100;
    s.kills = 96;
    return { screen: 'over', best: 24100 };
  }

  // Unknown shot name: fall back to the menu.
  s.best = 24100;
  return { screen: 'title', best: 24100 };
}
