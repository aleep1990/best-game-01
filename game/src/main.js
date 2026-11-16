// STARSHATTER — boot and the one loop.
// Fixed 1/60 s steps (several in a slow frame, none in a fast one). Screens:
// title, play, paused, victory, game over. ?shot=menu|action|boss|victory|
// gameover (&seed=N) stages that scene instead of running the loop, paints it
// twice and sets window.__shotReady for a screenshot.

import { BEST_KEY, STEP, VIEW_W, VIEW_H } from './config.js';
import { createRandom } from './random.js';
import { createWorld, EVENT_HIT, EVENT_OVER, EVENT_VICTORY, EVENT_WAVE, EVENT_BOSS } from './world.js';
import { ACTION_CONFIRM, ACTION_PAUSE, ACTION_MUTE, ACTION_RESTART, createInput } from './input.js';
import { createAudio } from './audio.js';
import { createParticles } from './particles.js';
import {
  createRenderer, SCREEN_TITLE, SCREEN_PLAY, SCREEN_PAUSED, SCREEN_OVER, SCREEN_VICTORY,
} from './render.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const random = createRandom(seed);
const world = createWorld(random);
const renderer = createRenderer(canvas, random);
const particles = createParticles();
const audio = createAudio();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function resize() {
  // Device pixels, 1:1 — screenshots come out exactly the window size.
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

window.addEventListener('resize', resize);
resize();

const input = createInput(canvas);
function syncView() {
  const scale = Math.min(canvas.width / VIEW_W, canvas.height / VIEW_H);
  input.view.scale = scale;
  input.view.ox = (canvas.width - VIEW_W * scale) / 2;
  input.view.oy = (canvas.height - VIEW_H * scale) / 2;
}
syncView();
window.addEventListener('resize', syncView);

function runShot(name) {
  const staged = stageShot(name, world, particles);
  world.state.best = staged.best;
  // Let staged particles bloom: without stepping, every spark sits on its
  // origin and rings stay pinpoints. 10 fixed steps ≈ 0.17 s of spread.
  for (let i = 0; i < 10; i++) particles.update(STEP);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, staged.screen, staged.best, particles);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();
  let freeze = 0; // hit-stop: real seconds the world stays frozen
  let muted = false;

  const liveInput = {
    direction: () => input.direction(),
    aim: () => ({ x: input.mouse.x, y: input.mouse.y }),
    firing: () => input.firing(),
  };
  const idleInput = {
    direction: () => ({ x: 0, y: 0 }),
    aim: () => ({ x: world.state.player.x, y: world.state.player.y - 100 }),
    firing: () => false,
  };

  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    audio.ensure();
    audio.startMusic();
    world.reset();
    world.state.best = best;
    world.startWave(1);
    accumulator = 0;
    freeze = 0;
    screen = SCREEN_PLAY;
    announce('Playing. 3 hulls. Survive 10 waves.');
  }

  function endGame(victory) {
    if (world.state.score > best) {
      best = world.state.score;
      saveBest(best);
    }
    world.state.best = best;
    screen = victory ? SCREEN_VICTORY : SCREEN_OVER;
    if (victory) announce(`Victory. Score ${world.state.score}. Best ${best}.`);
    else announce(`Game over. Score ${world.state.score}. Best ${best}.`);
  }

  function routeSfx(sfx) {
    for (const name of sfx) {
      if (name === 'shoot') audio.shoot();
      else if (name === 'enemyShoot') audio.enemyShoot();
      else if (name === 'explosion') audio.explosion(false);
      else if (name === 'bossDie') audio.explosion(true);
      else if (name === 'hit') audio.hit();
      else if (name === 'powerup') audio.powerup();
      else if (name === 'wave') audio.wave();
      else if (name === 'bossAlarm') audio.bossAlarm();
      else if (name === 'victory') audio.victory();
    }
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_MUTE) {
      muted = !muted;
      audio.setMuted(muted);
      announce(muted ? 'Muted.' : 'Sound on.');
    }
    if (actions & ACTION_RESTART && screen !== SCREEN_TITLE) {
      audio.click();
      startGame();
      return;
    }
    if (actions & ACTION_CONFIRM) {
      audio.ensure();
      if (screen === SCREEN_TITLE) {
        audio.click();
        startGame();
      } else if (screen === SCREEN_OVER || screen === SCREEN_VICTORY) {
        audio.click();
        startGame();
      } else if (screen === SCREEN_PAUSED) {
        screen = SCREEN_PLAY;
        announce('Playing.');
      }
    } else if (actions & ACTION_PAUSE) {
      if (screen === SCREEN_PLAY) {
        screen = SCREEN_PAUSED;
        announce('Paused.');
      } else if (screen === SCREEN_PAUSED) {
        screen = SCREEN_PLAY;
        announce('Playing.');
      }
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    const realDt = Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (freeze > 0) {
      freeze -= realDt;
    } else if (screen === SCREEN_TITLE) {
      world.stepTitle(STEP);
      particles.update(STEP);
    } else if (screen === SCREEN_PLAY) {
      accumulator += realDt;
      let guard = 0;
      while (accumulator >= STEP && guard < 8) {
        const { events, fx, sfx } = world.step(STEP, liveInput);
        particles.apply(fx);
        routeSfx(sfx);
        if (world.state.hitStop > 0) {
          freeze = world.state.hitStop;
          world.state.hitStop = 0;
        }
        if (events & EVENT_OVER) endGame(false);
        else if (events & EVENT_VICTORY) endGame(true);
        else if (events & EVENT_HIT) {
          announce(world.state.hulls === 1 ? 'Hit. 1 hull left.' : `Hit. ${world.state.hulls} hulls left.`);
        } else if (events & EVENT_WAVE) {
          announce(`Wave ${world.state.wave} clear.`);
        } else if (events & EVENT_BOSS) {
          announce('The Hollow Star has arrived.');
        }
        accumulator -= STEP;
        guard += 1;
        if (screen !== SCREEN_PLAY) break;
      }
      if (guard >= 8) accumulator = 0;
      particles.update(realDt);
    } else {
      particles.update(realDt);
    }
    renderer.draw(world.state, screen, best, particles);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Starshatter. Press Space or click to start.');
  requestAnimationFrame(frame);
}

// QA hooks (game-creator-game-qa): state inspection without reading pixels.
window.__GAME__ = { world, state: world.state };
window.render_game_to_text = () => {
  const s = world.state;
  const p = s.player;
  return JSON.stringify({
    coords: 'origin:top-left x:right y:down',
    mode: s.phase,
    score: s.score,
    best: s.best,
    wave: s.wave,
    hulls: s.hulls,
    combo: s.combo,
    player: p ? { x: Math.round(p.x), y: Math.round(p.y), angle: +p.angle.toFixed(2) } : null,
    enemies: s.enemies.length,
    bullets: s.bullets.length,
    ebullets: s.ebullets.length,
    bossHp: s.boss ? s.boss.hp : null,
  });
};
window.advanceTime = (ms) => new Promise((resolve) => {
  const start = performance.now();
  function step() {
    if (performance.now() - start >= ms) return resolve();
    requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
});

if (shot) runShot(shot);
else runGame();
