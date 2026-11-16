// STARSHATTER — render. One job: paint state onto the canvas.
// Layers (shot-composition): background = Ambient (slow parallax nebula +
// starfield), midground = Secondary (enemies, bullets, power-ups), foreground =
// Primary (the player ship + its fire). One focal point per frame: the player
// ship on the lower thirds line; the boss, when present, on the upper third.

import { VIEW_W, VIEW_H, COLORS, PLAYER, POWERUPS } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';
export const SCREEN_VICTORY = 'victory';

const FONT = '"Segoe UI", system-ui, -apple-system, sans-serif';

function makeStars(random, count, layer) {
  const stars = [];
  for (let i = 0; i < count; i++) {
    stars.push({
      x: random.next() * VIEW_W,
      y: random.next() * VIEW_H,
      size: 0.6 + random.next() * (layer === 0 ? 1.0 : layer === 1 ? 1.6 : 2.4),
      tw: random.next() * Math.PI * 2,
      speed: 0.4 + random.next() * 1.2,
    });
  }
  return stars;
}

export function createRenderer(canvas, random) {
  const ctx = canvas.getContext('2d');

  // Pre-rendered background: gradient + nebula blobs (drawn once, blitted per frame).
  const bg = document.createElement('canvas');
  bg.width = VIEW_W;
  bg.height = VIEW_H;
  {
    const b = bg.getContext('2d');
    const grad = b.createLinearGradient(0, 0, 0, VIEW_H);
    grad.addColorStop(0, COLORS.bgTop);
    grad.addColorStop(1, COLORS.bgBottom);
    b.fillStyle = grad;
    b.fillRect(0, 0, VIEW_W, VIEW_H);
    const blobs = [
      { x: 220, y: 150, r: 320, c: COLORS.nebulaA },
      { x: 1080, y: 220, r: 300, c: COLORS.nebulaB },
      { x: 640, y: 620, r: 340, c: COLORS.nebulaC },
      { x: 980, y: 560, r: 220, c: COLORS.nebulaA },
    ];
    for (const bl of blobs) {
      const g = b.createRadialGradient(bl.x, bl.y, 0, bl.x, bl.y, bl.r);
      g.addColorStop(0, bl.c + '55');
      g.addColorStop(1, bl.c + '00');
      b.fillStyle = g;
      b.fillRect(bl.x - bl.r, bl.y - bl.r, bl.r * 2, bl.r * 2);
    }
  }

  const starLayers = [
    makeStars(random, 90, 0),
    makeStars(random, 60, 1),
    makeStars(random, 34, 2),
  ];
  const speeds = [6, 16, 34]; // parallax: far stars drift slowest

  function text(str, x, y, size, color, weight = 700, align = 'center', alpha = 1) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = `${weight} ${size}px ${FONT}`;
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    ctx.fillStyle = color;
    ctx.fillText(str, x, y);
    ctx.restore();
  }

  function glowText(str, x, y, size, color, weight = 800, blur = 22) {
    ctx.save();
    ctx.font = `${weight} ${size}px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = color;
    ctx.shadowBlur = blur;
    ctx.fillStyle = color;
    ctx.fillText(str, x, y);
    ctx.restore();
  }

  function drawBackground(state) {
    ctx.drawImage(bg, 0, 0);
    const t = state.time;
    for (let l = 0; l < 3; l++) {
      const layer = starLayers[l];
      const drift = (t * speeds[l]) % VIEW_H;
      ctx.fillStyle = COLORS.star;
      for (const s of layer) {
        const y = (s.y + drift) % VIEW_H;
        const a = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * s.speed + s.tw));
        ctx.globalAlpha = a * (l === 2 ? 0.95 : l === 1 ? 0.7 : 0.45);
        ctx.fillRect(s.x, y, s.size, s.size);
      }
    }
    ctx.globalAlpha = 1;
  }

  function drawShip(x, y, angle, scale, color, invuln, time) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle + Math.PI / 2);
    ctx.scale(scale, scale);
    if (invuln > 0 && Math.floor(time * 14) % 2 === 0) ctx.globalAlpha = 0.35;
    // Engine flame (flickers with time).
    const flame = 14 + Math.sin(time * 31) * 5;
    ctx.fillStyle = '#ff9d5c';
    ctx.beginPath();
    ctx.moveTo(-6, 12);
    ctx.lineTo(0, 12 + flame);
    ctx.lineTo(6, 12);
    ctx.closePath();
    ctx.fill();
    // Hull: sleek dart.
    ctx.shadowColor = color;
    ctx.shadowBlur = 16;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, -20);
    ctx.lineTo(13, 12);
    ctx.lineTo(5, 7);
    ctx.lineTo(0, 11);
    ctx.lineTo(-5, 7);
    ctx.lineTo(-13, 12);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = COLORS.playerCore;
    ctx.beginPath();
    ctx.moveTo(0, -12);
    ctx.lineTo(5, 8);
    ctx.lineTo(-5, 8);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawEnemy(e, time) {
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.shadowColor = e.color;
    ctx.shadowBlur = 14;
    ctx.fillStyle = e.color;
    ctx.strokeStyle = e.color;
    if (e.type === 'dart') {
      const a = Math.atan2(e.vy, e.vx);
      ctx.rotate(a + Math.PI / 2);
      ctx.beginPath();
      ctx.moveTo(0, -15);
      ctx.lineTo(11, 11);
      ctx.lineTo(0, 5);
      ctx.lineTo(-11, 11);
      ctx.closePath();
      ctx.fill();
    } else if (e.type === 'weaver') {
      ctx.rotate(Math.sin(e.t * 3) * 0.35);
      ctx.beginPath();
      ctx.moveTo(0, -17);
      ctx.lineTo(15, 0);
      ctx.lineTo(0, 17);
      ctx.lineTo(-15, 0);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#2a1503';
      ctx.beginPath();
      ctx.arc(0, 0, 6, 0, Math.PI * 2);
      ctx.fill();
    } else if (e.type === 'bulwark') {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + e.t * 0.4;
        const px = Math.cos(a) * 30;
        const py = Math.sin(a) * 30;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#1d0b33';
      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, Math.PI * 2);
      ctx.fill();
      // HP arc.
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, 19, -Math.PI / 2, -Math.PI / 2 + (e.hp / e.maxHp) * Math.PI * 2);
      ctx.stroke();
    } else if (e.type === 'mite') {
      ctx.rotate(e.t * 4);
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const r = i % 2 === 0 ? 11 : 5;
        const px = Math.cos(a) * r;
        const py = Math.sin(a) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
    } else if (e.type === 'splitter') {
      ctx.rotate(Math.PI / 4 + Math.sin(e.t * 1.6) * 0.2);
      const s = 17;
      ctx.fillRect(-s, -s, s * 2, s * 2);
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#062b12';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-10, 0);
      ctx.lineTo(10, 0);
      ctx.moveTo(0, -10);
      ctx.lineTo(0, 10);
      ctx.stroke();
    } else if (e.type === 'boss') {
      // Rotating outer ring + spiked core.
      ctx.rotate(e.t * 0.25);
      ctx.lineWidth = 5;
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(0, 0, 74, a, a + Math.PI / 5);
        ctx.stroke();
      }
      ctx.rotate(-e.t * 0.25);
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2 + e.t * 0.5;
        const r = i % 2 === 0 ? 62 : 44;
        const px = Math.cos(a) * r;
        const py = Math.sin(a) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#2b0210';
      ctx.beginPath();
      ctx.arc(0, 0, 30 + Math.sin(e.t * 3) * 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, 10, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawPowerup(u, time) {
    const def = POWERUPS[u.kind];
    const bob = Math.sin(u.t * 4) * 4;
    ctx.save();
    ctx.translate(u.x, u.y + bob);
    ctx.shadowColor = def.color;
    ctx.shadowBlur = 12;
    ctx.fillStyle = '#060a18';
    ctx.strokeStyle = def.color;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = def.color;
    ctx.font = `800 15px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const glyph = u.kind === 'shield' ? 'S' : u.kind === 'rapid' ? 'R' : u.kind === 'spread' ? 'T' : '+';
    ctx.fillText(glyph, 0, 1);
    ctx.restore();
  }

  function drawHud(state, screen) {
    const p = state.player;
    // Score block, top-left.
    text('SCORE', 28, 26, 13, COLORS.textDim, 700, 'left');
    text(String(state.score).padStart(6, '0'), 28, 52, 30, COLORS.text, 800, 'left');
    text(`BEST ${Math.max(state.best, state.score)}`, 28, 80, 13, COLORS.textDim, 700, 'left');
    if (state.combo > 1) {
      const frac = state.comboTimer / 4;
      text(`COMBO x${state.combo}`, 28, 106, 17, COLORS.gold, 800, 'left');
      ctx.fillStyle = '#3a2f00';
      ctx.fillRect(28, 118, 110, 5);
      ctx.fillStyle = COLORS.gold;
      ctx.fillRect(28, 118, 110 * frac, 5);
    }
    // Wave, top-center.
    text(`WAVE ${Math.max(1, state.wave)} / 10`, VIEW_W / 2, 26, 15, COLORS.textDim, 700);
    if (state.boss) {
      const b = state.boss;
      text('THE HOLLOW STAR', VIEW_W / 2, 48, 14, COLORS.boss, 800);
      ctx.fillStyle = '#2b0a12';
      ctx.fillRect(VIEW_W / 2 - 260, 60, 520, 10);
      ctx.fillStyle = COLORS.boss;
      ctx.fillRect(VIEW_W / 2 - 260, 60, 520 * Math.max(0, b.hp / b.maxHp), 10);
      ctx.strokeStyle = '#ff8ba0';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(VIEW_W / 2 - 260, 60, 520, 10);
    }
    // Hulls + shield, top-right.
    for (let i = 0; i < state.hulls; i++) {
      const x = VIEW_W - 40 - i * 30;
      ctx.save();
      ctx.translate(x, 34);
      ctx.rotate(Math.PI);
      ctx.fillStyle = COLORS.player;
      ctx.beginPath();
      ctx.moveTo(0, -11);
      ctx.lineTo(8, 8);
      ctx.lineTo(0, 4);
      ctx.lineTo(-8, 8);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    if (p && p.shield) {
      text('AEGIS', VIEW_W - 40, 62, 13, '#4dc9ff', 800, 'right');
    }
    if (p && p.rapidT > 0) {
      text(`OVERDRIVE ${Math.ceil(p.rapidT)}s`, VIEW_W - 40, 82, 13, '#ffe14d', 800, 'right');
    }
    if (p && p.spreadT > 0) {
      text(`TRIDENT ${Math.ceil(p.spreadT)}s`, VIEW_W - 40, 102, 13, '#ff7ad9', 800, 'right');
    }
    // Controls hint, bottom-left (fades once the fight is underway).
    if (screen === SCREEN_PLAY && state.wave <= 1 && state.time < 14) {
      text('WASD / ARROWS MOVE  ·  MOUSE AIM  ·  HOLD CLICK OR SPACE TO FIRE  ·  P PAUSE  ·  M MUTE',
        28, VIEW_H - 22, 12, COLORS.textDim, 600, 'left', Math.max(0, 1 - Math.max(0, state.time - 10) / 4));
    }
  }

  function drawBanner(state) {
    if (state.phase !== 'banner') return;
    const total = 2.2;
    const t = 1 - state.phaseT / total; // 0..1
    const scale = t < 0.15 ? 0.7 + (t / 0.15) * 0.3 : 1;
    const alpha = t < 0.1 ? t / 0.1 : t > 0.85 ? Math.max(0, (1 - t) / 0.15) : 1;
    ctx.save();
    ctx.translate(VIEW_W / 2, VIEW_H / 2 - 60);
    ctx.scale(scale, scale);
    ctx.globalAlpha = alpha;
    glowText(state.bannerText, 0, 0, state.wave === 10 ? 44 : 56, state.wave === 10 ? COLORS.boss : COLORS.text, 800, 26);
    ctx.restore();
    if (state.wave === 10) {
      text('DESTROY IT TO WIN', VIEW_W / 2, VIEW_H / 2 + 4, 16, COLORS.textDim, 700, 'center', alpha);
    }
  }

  function drawBreather(state) {
    if (state.phase !== 'breather') return;
    text('WAVE CLEAR', VIEW_W / 2, VIEW_H / 2 - 80, 40, COLORS.gold, 800, 'center', 0.95);
    text(`NEXT WAVE IN ${Math.ceil(state.phaseT)}`, VIEW_W / 2, VIEW_H / 2 - 36, 16, COLORS.textDim, 700);
  }

  function panel(x, y, w, h) {
    ctx.save();
    ctx.fillStyle = 'rgba(3, 5, 16, 0.82)';
    ctx.strokeStyle = 'rgba(77, 243, 255, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 14);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function drawTitle(state, best) {
    const pulse = 0.75 + 0.25 * Math.sin(state.time * 2.4);
    glowText('STARSHATTER', VIEW_W / 2, 218, 88, COLORS.player, 800, 34);
    text('A NEON VOID-DEFENSE ARCADE', VIEW_W / 2, 282, 18, COLORS.textDim, 600);
    // Controls panel.
    panel(VIEW_W / 2 - 330, 330, 660, 150);
    text('HOW TO PLAY', VIEW_W / 2, 356, 15, COLORS.gold, 800);
    text('MOVE — WASD / ARROW KEYS', VIEW_W / 2, 388, 16, COLORS.text, 600);
    text('AIM — MOUSE · FIRE — HOLD CLICK OR SPACE', VIEW_W / 2, 414, 16, COLORS.text, 600);
    text('SURVIVE 10 WAVES · SHATTER THE HOLLOW STAR · PAUSE P · MUTE M', VIEW_W / 2, 440, 15, COLORS.textDim, 600);
    text(`BEST SCORE  ${best}`, VIEW_W / 2, 512, 17, COLORS.gold, 800);
    text('CLICK OR PRESS ENTER TO LAUNCH', VIEW_W / 2, 566, 20, COLORS.text, 800, 'center', pulse);
  }

  function drawStats(state, rows, y0) {
    let y = y0;
    for (const [label, value] of rows) {
      text(label, VIEW_W / 2 - 150, y, 17, COLORS.textDim, 700, 'left');
      text(value, VIEW_W / 2 + 150, y, 17, COLORS.text, 800, 'right');
      y += 34;
    }
    return y;
  }

  function drawVictory(state) {
    ctx.fillStyle = 'rgba(2, 4, 12, 0.72)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    glowText('THE HOLLOW STAR IS SHATTERED', VIEW_W / 2, 150, 40, COLORS.gold, 800, 24);
    text('YOU SURVIVED ALL 10 WAVES', VIEW_W / 2, 196, 17, COLORS.textDim, 700);
    const acc = state.shotsFired > 0 ? Math.round((state.shotsHit / state.shotsFired) * 100) : 0;
    const y = drawStats(state, [
      ['FINAL SCORE', String(state.score)],
      ['BEST SCORE', String(Math.max(state.best, state.score))],
      ['ENEMIES SHATTERED', String(state.kills)],
      ['ACCURACY', `${acc}%`],
    ], 258);
    text('PRESS R OR CLICK TO PLAY AGAIN', VIEW_W / 2, y + 36, 19, COLORS.text, 800, 'center', 0.75 + 0.25 * Math.sin(state.time * 2.4));
  }

  function drawGameOver(state) {
    ctx.fillStyle = 'rgba(12, 2, 6, 0.72)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    glowText('SIGNAL LOST', VIEW_W / 2, 150, 56, COLORS.danger, 800, 28);
    text(`THE VOID TOOK YOUR SHIP ON WAVE ${Math.max(1, state.wave)}`, VIEW_W / 2, 202, 17, COLORS.textDim, 700);
    const y = drawStats(state, [
      ['FINAL SCORE', String(state.score)],
      ['BEST SCORE', String(Math.max(state.best, state.score))],
      ['ENEMIES SHATTERED', String(state.kills)],
      ['WAVES CLEARED', String(Math.max(0, state.wave - 1))],
    ], 262);
    text('PRESS R OR CLICK TO RETRY', VIEW_W / 2, y + 36, 19, COLORS.text, 800, 'center', 0.75 + 0.25 * Math.sin(state.time * 2.4));
  }

  function drawPaused() {
    ctx.fillStyle = 'rgba(2, 4, 12, 0.66)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    glowText('PAUSED', VIEW_W / 2, VIEW_H / 2 - 30, 54, COLORS.text, 800, 22);
    text('P OR CLICK TO RESUME  ·  R TO RESTART', VIEW_W / 2, VIEW_H / 2 + 30, 16, COLORS.textDim, 700);
  }

  /** Draw one frame. screen: title | play | paused | over | victory. */
  function draw(state, screen, best, particles) {
    const scale = Math.min(canvas.width / VIEW_W, canvas.height / VIEW_H);
    const ox = (canvas.width - VIEW_W * scale) / 2;
    const oy = (canvas.height - VIEW_H * scale) / 2;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(scale, 0, 0, scale, ox, oy);

    // World layer (shaken); HUD stays steady. On the title screen the world
    // layer is just the ambient background + drifting enemies; the panel draws below.
    const sh = state.shake * state.shake;
    const shx = 14 * sh * Math.sin(state.time * 47);
    const shy = 10 * sh * Math.sin(state.time * 39 + 1.7);
    ctx.save();
    ctx.translate(shx, shy);
    drawBackground(state);
    if (screen === SCREEN_TITLE) {
      for (const e of state.enemies) drawEnemy(e, state.time);
      ctx.restore();
      drawTitle(state, best);
      return;
    }
    for (const u of state.powerups) drawPowerup(u, state.time);
    for (const e of state.enemies) drawEnemy(e, state.time);
    // Player bullets: glowing capsules.
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const b of state.bullets) {
      ctx.strokeStyle = COLORS.bullet;
      ctx.shadowColor = COLORS.bullet;
      ctx.shadowBlur = 10;
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(b.x - b.vx * 0.014, b.y - b.vy * 0.014);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      ctx.fillStyle = COLORS.bulletCore;
      ctx.beginPath();
      ctx.arc(b.x, b.y, 2.4, 0, Math.PI * 2);
      ctx.fill();
    }
    // Enemy orbs.
    for (const b of state.ebullets) {
      ctx.fillStyle = COLORS.orb;
      ctx.shadowColor = COLORS.orb;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff2df';
      ctx.beginPath();
      ctx.arc(b.x, b.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    // Player ship (not during over/victory — it is gone).
    if (state.player && screen !== SCREEN_OVER && screen !== SCREEN_VICTORY) {
      const p = state.player;
      drawShip(p.x, p.y, p.angle, 1, COLORS.player, p.invuln, state.time);
      if (p.shield) {
        ctx.save();
        ctx.strokeStyle = 'rgba(77, 201, 255, 0.8)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 30 + Math.sin(state.time * 5) * 2, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }
    particles.draw(ctx);
    ctx.restore();

    // Damage flash vignette.
    if (state.flash > 0) {
      ctx.fillStyle = `rgba(255, 40, 70, ${state.flash * 0.28})`;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }

    if (screen === SCREEN_PLAY) {
      drawHud(state, screen);
      drawBanner(state);
      drawBreather(state);
    } else if (screen === SCREEN_PAUSED) {
      drawHud(state, screen);
      drawPaused();
    } else if (screen === SCREEN_VICTORY) {
      drawHud(state, screen);
      drawVictory(state);
    } else if (screen === SCREEN_OVER) {
      drawHud(state, screen);
      drawGameOver(state);
    }
  }

  return { draw };
}
