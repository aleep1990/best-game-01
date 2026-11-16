// STARSHATTER — world. One job: the game rules, no drawing, no DOM.
// Pure state + step: spawn waves, move everything, collide, score, win/lose.
// The renderer draws state; main.js drains the fx/sfx lists this step returns.

import {
  VIEW_W, VIEW_H, PLAYER, ENEMIES, WAVES, BOSS, POWERUPS, COMBO, FEEL, FLOW, COLORS,
} from './config.js';

export const EVENT_HIT = 1;
export const EVENT_OVER = 2;
export const EVENT_VICTORY = 4;
export const EVENT_WAVE = 8;
export const EVENT_BOSS = 16;

const TAU = Math.PI * 2;

function dist2(ax, ay, bx, by) {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

export function createWorld(random) {
  const state = {
    score: 0,
    best: 0,
    combo: 1,
    comboTimer: 0,
    hulls: PLAYER.startHulls,
    wave: 0,
    phase: 'banner', // banner | fight | breather | victory | over
    phaseT: FLOW.bannerTime,
    bannerText: 'WAVE 1',
    spawnQueue: [],
    spawnT: 0,
    player: null,
    enemies: [],
    bullets: [],
    ebullets: [],
    powerups: [],
    kills: 0,
    shotsFired: 0,
    shotsHit: 0,
    endingT: 0,
    endingX: 0,
    endingY: 0,
    shake: 0,
    hitStop: 0,
    flash: 0,
    time: 0,
    boss: null,
  };

  function resetPlayer() {
    state.player = {
      x: VIEW_W / 2, y: VIEW_H - 120,
      vx: 0, vy: 0, angle: -Math.PI / 2,
      fireCd: 0, invuln: 0, shield: false,
      rapidT: 0, spreadT: 0, trailT: 0,
    };
  }

  function reset() {
    state.score = 0;
    state.combo = 1;
    state.comboTimer = 0;
    state.hulls = PLAYER.startHulls;
    state.wave = 0;
    state.phase = 'banner';
    state.phaseT = FLOW.bannerTime;
    state.bannerText = 'WAVE 1';
    state.spawnQueue = [];
    state.spawnT = 0;
    state.enemies = [];
    state.bullets = [];
    state.ebullets = [];
    state.powerups = [];
    state.kills = 0;
    state.shotsFired = 0;
    state.shotsHit = 0;
    state.endingT = 0;
    state.shake = 0;
    state.hitStop = 0;
    state.flash = 0;
    state.time = 0;
    state.boss = null;
    resetPlayer();
  }

  function buildQueue(wave) {
    const comp = WAVES[wave];
    const q = [];
    if (comp.boss) return q;
    for (const [type, n] of Object.entries(comp)) {
      for (let i = 0; i < n; i++) q.push(type);
    }
    // Shuffle so the wave mixes instead of arriving in blocks.
    for (let i = q.length - 1; i > 0; i--) {
      const j = Math.floor(random.next() * (i + 1));
      [q[i], q[j]] = [q[j], q[i]];
    }
    return q;
  }

  function startWave(n) {
    state.wave = n;
    state.spawnQueue = buildQueue(n);
    state.spawnT = 0.4;
    if (WAVES[n].boss) {
      state.bannerText = 'FINAL WAVE — THE HOLLOW STAR';
    } else {
      state.bannerText = `WAVE ${n}`;
    }
    state.phase = 'banner';
    state.phaseT = FLOW.bannerTime;
  }

  function spawnEnemy(type, x, y) {
    const def = ENEMIES[type];
    const e = {
      type, x, y, vx: 0, vy: 0,
      hp: def.hp, maxHp: def.hp, r: def.radius,
      score: def.score, color: def.color,
      t: random.range(0, TAU),
      shootT: random.range(1.2, 2.6),
      baseX: x,
      entered: false,
    };
    if (type === 'boss') {
      e.y = -90;
      e.targetY = 150;
      e.radialT = 2.0;
      e.aimedT = 1.0;
      e.miteT = 5;
      state.boss = e;
    }
    state.enemies.push(e);
    return e;
  }

  function spawnFromQueue() {
    const type = state.spawnQueue.shift();
    const x = random.range(60, VIEW_W - 60);
    // Darts sometimes flank from the sides.
    if (type === 'dart' && random.chance(0.3)) {
      const side = random.chance(0.5) ? -30 : VIEW_W + 30;
      spawnEnemy(type, side, random.range(60, 300));
    } else {
      spawnEnemy(type, x, -30);
    }
  }

  function fireBullet(angle, speedMul = 1) {
    const p = state.player;
    const nx = p.x + Math.cos(angle) * (PLAYER.radius + 10);
    const ny = p.y + Math.sin(angle) * (PLAYER.radius + 10);
    state.bullets.push({
      x: nx, y: ny,
      vx: Math.cos(angle) * PLAYER.bulletSpeed * speedMul,
      vy: Math.sin(angle) * PLAYER.bulletSpeed * speedMul,
      r: PLAYER.bulletRadius, damage: PLAYER.bulletDamage,
    });
  }

  function fireEnemyOrb(x, y, angle, speed = 230) {
    state.ebullets.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      r: 7,
    });
  }

  function dropPowerup(x, y) {
    if (!random.chance(POWERUPS.dropChance)) return;
    let kind;
    const roll = random.next();
    if (roll < POWERUPS.hullChance && state.hulls < PLAYER.maxHulls) kind = 'hull';
    else if (roll < 0.4) kind = 'shield';
    else if (roll < 0.7) kind = 'rapid';
    else kind = 'spread';
    state.powerups.push({ kind, x, y, vy: 46, t: 0 });
  }

  function awardKill(e, fx, sfx) {
    const pts = e.score * state.combo;
    state.score += pts;
    state.kills += 1;
    state.combo = Math.min(COMBO.max, state.combo + COMBO.perKill);
    state.comboTimer = COMBO.window;
    fx.push({ type: 'explosion', x: e.x, y: e.y, color: e.color, n: e.type === 'bulwark' ? 40 : 26, power: 280 });
    fx.push({ type: 'debris', x: e.x, y: e.y, color: e.color, n: 8 });
    fx.push({ type: 'text', x: e.x, y: e.y - 14, text: `+${pts}`, color: '#ffffff', size: 17 });
    if (state.combo >= 3) {
      fx.push({ type: 'text', x: e.x, y: e.y + 12, text: `COMBO x${state.combo}`, color: COLORS.gold, size: 14 });
    }
    sfx.push('explosion');
    state.shake = Math.max(state.shake, FEEL.shakeKill);
    dropPowerup(e.x, e.y);
  }

  function killEnemy(e, fx, sfx) {
    awardKill(e, fx, sfx);
    if (e.type === 'splitter') {
      for (let i = 0; i < 3; i++) {
        const m = spawnEnemy('mite', e.x + random.range(-24, 24), e.y + random.range(-16, 16));
        m.vx = random.range(-140, 140);
        m.vy = random.range(-60, 60);
      }
    }
    if (e.type === 'boss') {
      state.endingT = 1.5;
      state.endingX = e.x;
      state.endingY = e.y;
      state.boss = null;
      state.shake = FEEL.shakeBossDie;
      state.hitStop = FEEL.hitStopBossDie;
      fx.push({ type: 'ring', x: e.x, y: e.y, color: '#ffffff', vr: 700 });
      fx.push({ type: 'explosion', x: e.x, y: e.y, color: e.color, n: 80, power: 420 });
      sfx.push('bossDie');
    }
  }

  function hitPlayer(fx, sfx) {
    const p = state.player;
    if (p.invuln > 0) return 0;
    state.combo = 1;
    state.comboTimer = 0;
    if (p.shield) {
      p.shield = false;
      p.invuln = 1.5;
      fx.push({ type: 'ring', x: p.x, y: p.y, color: '#4dc9ff', vr: 520 });
      fx.push({ type: 'text', x: p.x, y: p.y - 30, text: 'AEGIS DOWN', color: '#4dc9ff', size: 16 });
      sfx.push('hit');
      state.shake = Math.max(state.shake, FEEL.shakeHit * 0.6);
      return EVENT_HIT;
    }
    state.hulls -= 1;
    p.invuln = PLAYER.invulnTime;
    state.shake = FEEL.shakeHit;
    state.hitStop = FEEL.hitStopHit;
    state.flash = FEEL.flashHit;
    fx.push({ type: 'explosion', x: p.x, y: p.y, color: COLORS.player, n: 34, power: 320 });
    sfx.push('hit');
    if (state.hulls <= 0) {
      state.phase = 'over';
      fx.push({ type: 'ring', x: p.x, y: p.y, color: '#ffffff', vr: 800 });
      return EVENT_HIT | EVENT_OVER;
    }
    return EVENT_HIT;
  }

  function stepPlayer(dt, input, fx, sfx) {
    const p = state.player;
    const dir = input.direction();
    p.vx += dir.x * PLAYER.accel * dt;
    p.vy += dir.y * PLAYER.accel * dt;
    const drag = Math.max(0, 1 - PLAYER.drag * dt);
    p.vx *= drag;
    p.vy *= drag;
    const sp = Math.hypot(p.vx, p.vy);
    if (sp > PLAYER.speed) {
      p.vx = (p.vx / sp) * PLAYER.speed;
      p.vy = (p.vy / sp) * PLAYER.speed;
    }
    p.x = Math.max(24, Math.min(VIEW_W - 24, p.x + p.vx * dt));
    p.y = Math.max(24, Math.min(VIEW_H - 24, p.y + p.vy * dt));
    // Aim at the mouse; if the mouse never moved, aim up.
    const aim = input.aim ? input.aim() : { x: p.x, y: p.y - 100 };
    p.angle = Math.atan2(aim.y - p.y, aim.x - p.x);
    if (p.invuln > 0) p.invuln -= dt;
    if (p.rapidT > 0) p.rapidT -= dt;
    if (p.spreadT > 0) p.spreadT -= dt;
    p.fireCd -= dt;
    if (input.firing() && p.fireCd <= 0) {
      const interval = p.rapidT > 0 ? PLAYER.fireInterval / 2 : PLAYER.fireInterval;
      p.fireCd = interval;
      state.shotsFired += 1;
      if (p.spreadT > 0) {
        fireBullet(p.angle - 0.16);
        fireBullet(p.angle);
        fireBullet(p.angle + 0.16);
      } else {
        fireBullet(p.angle);
      }
      fx.push({ type: 'muzzle', x: p.x + Math.cos(p.angle) * (PLAYER.radius + 12), y: p.y + Math.sin(p.angle) * (PLAYER.radius + 12) });
      sfx.push('shoot');
    }
    // Engine trail.
    p.trailT -= dt;
    if (p.trailT <= 0 && sp > 60) {
      p.trailT = PLAYER.trailEvery;
      fx.push({
        type: 'trail',
        x: p.x - Math.cos(p.angle) * PLAYER.radius,
        y: p.y - Math.sin(p.angle) * PLAYER.radius,
        vx: -p.vx * 0.15, vy: -p.vy * 0.15,
        color: '#2fb9d8',
      });
    }
  }

  function stepEnemies(dt, fx, sfx) {
    const p = state.player;
    for (const e of state.enemies) {
      e.t += dt;
      if (e.type === 'dart') {
        const a = Math.atan2(p.y - e.y, p.x - e.x);
        e.vx += Math.cos(a) * 420 * dt;
        e.vy += Math.sin(a) * 420 * dt;
        const sp = Math.hypot(e.vx, e.vy);
        const max = ENEMIES.dart.speed;
        if (sp > max) {
          e.vx = (e.vx / sp) * max;
          e.vy = (e.vy / sp) * max;
        }
        e.x += e.vx * dt;
        e.y += e.vy * dt;
      } else if (e.type === 'weaver') {
        e.y += ENEMIES.weaver.speed * dt;
        e.x = e.baseX + Math.sin(e.t * 2.2) * 90;
        e.shootT -= dt;
        if (e.shootT <= 0 && state.wave >= 3 && e.y > 0 && e.y < VIEW_H * 0.7) {
          e.shootT = 2.4;
          const a = Math.atan2(p.y - e.y, p.x - e.x);
          fireEnemyOrb(e.x, e.y + e.r, a, 210);
          sfx.push('enemyShoot');
        }
      } else if (e.type === 'bulwark') {
        e.y += ENEMIES.bulwark.speed * dt;
        e.x = e.baseX + Math.sin(e.t * 0.7) * 60;
        e.shootT -= dt;
        if (e.shootT <= 0 && e.y > 0 && e.y < VIEW_H * 0.6) {
          e.shootT = 2.8;
          const a = Math.atan2(p.y - e.y, p.x - e.x);
          fireEnemyOrb(e.x, e.y + e.r, a, 200);
          sfx.push('enemyShoot');
        }
      } else if (e.type === 'splitter') {
        const a = Math.atan2(p.y - e.y, p.x - e.x);
        e.x += Math.cos(a) * ENEMIES.splitter.speed * dt;
        e.y += Math.sin(a) * ENEMIES.splitter.speed * dt * 0.6 + 30 * dt;
      } else if (e.type === 'mite') {
        const a = Math.atan2(p.y - e.y, p.x - e.x);
        e.vx += Math.cos(a) * 500 * dt;
        e.vy += Math.sin(a) * 500 * dt;
        const sp = Math.hypot(e.vx, e.vy);
        const max = ENEMIES.mite.speed;
        if (sp > max) {
          e.vx = (e.vx / sp) * max;
          e.vy = (e.vy / sp) * max;
        }
        e.x += e.vx * dt;
        e.y += e.vy * dt;
      } else if (e.type === 'boss') {
        if (!e.entered) {
          e.y += 90 * dt;
          if (e.y >= e.targetY) {
            e.y = e.targetY;
            e.entered = true;
          }
        } else {
          e.x = VIEW_W / 2 + Math.sin(e.t * 0.5) * 320;
          e.y = e.targetY + Math.sin(e.t * 0.9) * 36;
          e.radialT -= dt;
          if (e.radialT <= 0) {
            e.radialT = BOSS.radialEvery;
            for (let i = 0; i < BOSS.radialCount; i++) {
              fireEnemyOrb(e.x, e.y + 40, (i / BOSS.radialCount) * TAU + e.t, 180);
            }
            sfx.push('enemyShoot');
          }
          e.aimedT -= dt;
          if (e.aimedT <= 0) {
            e.aimedT = BOSS.aimedEvery;
            const base = Math.atan2(p.y - e.y, p.x - e.x);
            for (let i = -1; i <= 1; i++) fireEnemyOrb(e.x, e.y + 40, base + i * 0.18, 260);
            sfx.push('enemyShoot');
          }
          e.miteT -= dt;
          if (e.miteT <= 0) {
            e.miteT = BOSS.miteEvery;
            for (let i = 0; i < BOSS.miteBatch; i++) {
              spawnEnemy('mite', e.x + random.range(-80, 80), e.y + 60);
            }
          }
        }
      }
    }
    // Gentle separation so enemies never stack into one blob.
    const list = state.enemies;
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i];
        const b = list[j];
        if (a.type === 'boss' || b.type === 'boss') continue;
        const min = a.r + b.r;
        const d2 = dist2(a.x, a.y, b.x, b.y);
        if (d2 > 0.01 && d2 < min * min) {
          const d = Math.sqrt(d2);
          const push = (min - d) / 2;
          const nx = (b.x - a.x) / d;
          const ny = (b.y - a.y) / d;
          a.x -= nx * push;
          a.y -= ny * push;
          b.x += nx * push;
          b.y += ny * push;
        }
      }
    }
    // Cull enemies that drifted far off-screen (except the entering boss).
    state.enemies = state.enemies.filter((e) => {
      if (e.type === 'boss') return true;
      return e.y < VIEW_H + 80 && e.x > -120 && e.x < VIEW_W + 120;
    });
    if (state.boss && !state.enemies.includes(state.boss)) state.boss = null;
  }

  function stepBullets(dt) {
    for (const b of state.bullets) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
    }
    state.bullets = state.bullets.filter((b) => b.x > -40 && b.x < VIEW_W + 40 && b.y > -40 && b.y < VIEW_H + 40);
    for (const b of state.ebullets) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
    }
    state.ebullets = state.ebullets.filter((b) => b.x > -40 && b.x < VIEW_W + 40 && b.y > -40 && b.y < VIEW_H + 40);
  }

  function stepCollisions(fx, sfx) {
    let events = 0;
    // Player bullets vs enemies.
    for (let bi = state.bullets.length - 1; bi >= 0; bi--) {
      const b = state.bullets[bi];
      let consumed = false;
      for (let ei = state.enemies.length - 1; ei >= 0; ei--) {
        const e = state.enemies[ei];
        const rr = b.r + e.r;
        if (dist2(b.x, b.y, e.x, e.y) < rr * rr) {
          consumed = true;
          state.shotsHit += 1;
          e.hp -= b.damage;
          fx.push({ type: 'explosion', x: b.x, y: b.y, color: '#aefcff', n: 4, power: 90 });
          if (e.hp <= 0) {
            state.enemies.splice(ei, 1);
            killEnemy(e, fx, sfx);
            if (e.type === 'boss') state.boss = null;
          }
          break;
        }
      }
      if (consumed) state.bullets.splice(bi, 1);
    }
    if (state.phase === 'over') return events;
    const p = state.player;
    // Enemy orbs vs player.
    for (let i = state.ebullets.length - 1; i >= 0; i--) {
      const b = state.ebullets[i];
      const rr = b.r + PLAYER.radius - 4;
      if (dist2(b.x, b.y, p.x, p.y) < rr * rr) {
        state.ebullets.splice(i, 1);
        events |= hitPlayer(fx, sfx);
        if (state.phase === 'over') return events;
      }
    }
    // Enemies vs player (kamikaze for small ones; big ones survive the bump).
    for (let i = state.enemies.length - 1; i >= 0; i--) {
      const e = state.enemies[i];
      const rr = e.r + PLAYER.radius - 4;
      if (dist2(e.x, e.y, p.x, p.y) < rr * rr) {
        if (e.type !== 'bulwark' && e.type !== 'boss') {
          state.enemies.splice(i, 1);
          killEnemy(e, fx, sfx);
        } else {
          // Shove the player away from the big body.
          const a = Math.atan2(p.y - e.y, p.x - e.x);
          p.x += Math.cos(a) * 26;
          p.y += Math.sin(a) * 26;
        }
        events |= hitPlayer(fx, sfx);
        if (state.phase === 'over') return events;
      }
    }
    // Power-ups vs player.
    for (let i = state.powerups.length - 1; i >= 0; i--) {
      const u = state.powerups[i];
      const rr = 22 + PLAYER.radius;
      if (dist2(u.x, u.y, p.x, p.y) < rr * rr) {
        state.powerups.splice(i, 1);
        if (u.kind === 'shield') {
          p.shield = true;
          fx.push({ type: 'text', x: p.x, y: p.y - 30, text: 'AEGIS SHIELD', color: '#4dc9ff', size: 16 });
        } else if (u.kind === 'rapid') {
          p.rapidT = POWERUPS.rapid.duration;
          fx.push({ type: 'text', x: p.x, y: p.y - 30, text: 'OVERDRIVE', color: '#ffe14d', size: 16 });
        } else if (u.kind === 'spread') {
          p.spreadT = POWERUPS.spread.duration;
          fx.push({ type: 'text', x: p.x, y: p.y - 30, text: 'TRIDENT SHOT', color: '#ff7ad9', size: 16 });
        } else if (u.kind === 'hull') {
          state.hulls = Math.min(PLAYER.maxHulls, state.hulls + 1);
          fx.push({ type: 'text', x: p.x, y: p.y - 30, text: '+1 HULL', color: '#7dff8a', size: 16 });
        }
        fx.push({ type: 'ring', x: u.x, y: u.y, color: '#ffffff', vr: 300 });
        sfx.push('powerup');
      }
    }
    return events;
  }

  function stepPowerups(dt) {
    for (const u of state.powerups) {
      u.t += dt;
      u.y += u.vy * dt;
      u.x += Math.sin(u.t * 3) * 12 * dt;
    }
    state.powerups = state.powerups.filter((u) => u.y < VIEW_H + 30);
  }

  /** One fixed step. input: { direction(), aim(), firing() }. */
  function step(dt, input) {
    const fx = [];
    const sfx = [];
    let events = 0;
    state.time += dt;
    if (state.shake > 0) state.shake = Math.max(0, state.shake - dt * 1.4);
    if (state.hitStop > 0) state.hitStop -= dt;
    if (state.flash > 0) state.flash = Math.max(0, state.flash - dt * 1.8);
    if (state.comboTimer > 0) {
      state.comboTimer -= dt;
      if (state.comboTimer <= 0) state.combo = 1;
    }

    if (state.phase === 'banner') {
      stepPlayer(dt, input, fx, sfx);
      state.phaseT -= dt;
      if (state.phaseT <= 0) {
        state.phase = 'fight';
        if (state.wave === 10) {
          spawnEnemy('boss', VIEW_W / 2, -90);
          sfx.push('bossAlarm');
          events |= EVENT_BOSS;
        }
      }
      return { events, fx, sfx };
    }

    if (state.phase === 'breather') {
      stepPlayer(dt, input, fx, sfx);
      stepPowerups(dt);
      state.phaseT -= dt;
      if (state.phaseT <= 0) startWave(state.wave + 1);
      return { events, fx, sfx };
    }

    if (state.phase === 'victory' || state.phase === 'over') {
      stepPowerups(dt);
      return { events, fx, sfx };
    }

    // Fight phase.
    stepPlayer(dt, input, fx, sfx);
    if (state.endingT > 0) {
      // Boss death sequence: chain explosions, then victory.
      state.endingT -= dt;
      if (random.chance(0.5)) {
        fx.push({
          type: 'explosion',
          x: state.endingX + random.range(-90, 90),
          y: state.endingY + random.range(-70, 70),
          color: random.pick(['#ff3d5e', '#ffb84d', '#ffffff']),
          n: 22, power: 260,
        });
        sfx.push('explosion');
      }
      if (state.endingT <= 0) {
        state.phase = 'victory';
        if (state.score > state.best) state.best = state.score;
        events |= EVENT_VICTORY;
        sfx.push('victory');
      }
      stepBullets(dt);
      stepPowerups(dt);
      return { events, fx, sfx };
    }

    if (state.spawnQueue.length > 0) {
      state.spawnT -= dt;
      if (state.spawnT <= 0) {
        state.spawnT = Math.max(0.22, FLOW.spawnInterval - state.wave * 0.03);
        spawnFromQueue();
      }
    }
    stepEnemies(dt, fx, sfx);
    stepBullets(dt);
    stepPowerups(dt);
    events |= stepCollisions(fx, sfx);
    if (state.phase === 'over') {
      if (state.score > state.best) state.best = state.score;
      return { events, fx, sfx };
    }
    // Wave cleared?
    if (state.spawnQueue.length === 0 && state.enemies.length === 0 && state.wave < 10) {
      const bonus = FLOW.waveBonus * state.wave;
      state.score += bonus;
      fx.push({ type: 'text', x: VIEW_W / 2, y: VIEW_H / 2 - 40, text: `WAVE CLEAR  +${bonus}`, color: '#ffd94d', size: 26 });
      sfx.push('wave');
      state.phase = 'breather';
      state.phaseT = FLOW.breatherTime;
      events |= EVENT_WAVE;
    }
    return { events, fx, sfx };
  }

  /** Ambient drift behind the title screen: no player, no scoring. */
  function stepTitle(dt) {
    state.time += dt;
    if (state.enemies.length < 7 && random.chance(dt * 0.9)) {
      const type = random.pick(['dart', 'weaver', 'mite']);
      const e = spawnEnemy(type, random.range(60, VIEW_W - 60), -40);
      e.vy = 0;
    }
    for (const e of state.enemies) {
      e.t += dt;
      e.y += 42 * dt;
      if (e.type === 'weaver') e.x = e.baseX + Math.sin(e.t * 1.4) * 70;
    }
    state.enemies = state.enemies.filter((e) => e.y < VIEW_H + 60);
  }

  reset();
  return {
    state,
    reset,
    startWave,
    step,
    stepTitle,
    spawnEnemy,
    /** Test/shot hook: put the world in a state directly. */
    setPhase(phase) {
      state.phase = phase;
    },
  };
}
