// STARSHATTER — sound. One job: every sound is synthesized with WebAudio.
// No audio files, no network. All methods are safe to call before the audio
// context exists (headless / pre-gesture): they no-op until ensure() runs on
// the first user gesture. M toggles mute.

export function createAudio() {
  let ctx = null;
  let master = null;
  let musicGain = null;
  let noiseBuf = null;
  let muted = false;
  let musicOn = false;
  let musicTimer = null;
  let step = 0;
  let nextStepTime = 0;

  function ensure() {
    if (ctx) {
      if (ctx.state === 'suspended') void ctx.resume();
      return true;
    }
    try {
      const AC = window.AudioContext ?? window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.5;
      master.connect(ctx.destination);
      musicGain = ctx.createGain();
      musicGain.gain.value = 0.16;
      musicGain.connect(master);
      // 1s of white noise, reused by every explosion / hit.
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const data = noiseBuf.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      return true;
    } catch {
      return false;
    }
  }

  /** Short oscillator blip with pitch slide. */
  function blip({ type = 'square', from = 880, to = 220, dur = 0.09, vol = 0.25, when = 0 }) {
    if (!ctx || muted) return;
    const t = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(g);
    g.connect(master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  /** Filtered noise burst (explosions, hits). */
  function noise({ dur = 0.3, vol = 0.4, freq = 1200, when = 0 }) {
    if (!ctx || muted) return;
    const t = ctx.currentTime + when;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    src.loop = true;
    const filt = ctx.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.setValueAtTime(freq, t);
    filt.frequency.exponentialRampToValueAtTime(80, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(filt);
    filt.connect(g);
    g.connect(master);
    src.start(t);
    src.stop(t + dur + 0.02);
  }

  /** Music: dark pulse. 8-step loop, 132 BPM: sub-bass on 0/3/4/6, a sparse
   *  minor arp on top, noise hat on odd steps. Scheduled from update(). */
  const BASS_LINE = [55, 0, 55, 65.41, 55, 0, 49, 58.27]; // A1 C2 G1 Bb1
  const ARP = [220, 261.63, 329.63, 261.63, 220, 329.63, 392, 261.63];
  const STEP_DUR = 60 / 132 / 2; // 8th notes at 132 BPM

  function musicStep() {
    if (!ctx || muted || !musicOn) return;
    const t = Math.max(ctx.currentTime, nextStepTime);
    const bass = BASS_LINE[step % 8];
    if (bass) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = bass;
      g.gain.setValueAtTime(0.5, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + STEP_DUR * 0.9);
      osc.connect(g);
      g.connect(musicGain);
      osc.start(t);
      osc.stop(t + STEP_DUR);
    }
    if (step % 2 === 0) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = ARP[step % 8] * 2;
      g.gain.setValueAtTime(0.07, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + STEP_DUR * 1.8);
      osc.connect(g);
      g.connect(musicGain);
      osc.start(t);
      osc.stop(t + STEP_DUR * 2);
    }
    nextStepTime = t + STEP_DUR;
    step += 1;
  }

  return {
    ensure,
    setMuted(m) {
      muted = m;
      if (master) master.gain.value = muted ? 0 : 0.5;
    },
    isMuted() {
      return muted;
    },
    shoot() {
      blip({ type: 'square', from: 920, to: 240, dur: 0.07, vol: 0.12 });
    },
    enemyShoot() {
      blip({ type: 'sawtooth', from: 320, to: 140, dur: 0.12, vol: 0.08 });
    },
    explosion(big = false) {
      noise({ dur: big ? 0.7 : 0.35, vol: big ? 0.55 : 0.35, freq: big ? 900 : 1600 });
      blip({ type: 'sine', from: 160, to: 40, dur: big ? 0.5 : 0.3, vol: 0.4 });
    },
    hit() {
      noise({ dur: 0.18, vol: 0.4, freq: 2400 });
      blip({ type: 'sawtooth', from: 220, to: 60, dur: 0.22, vol: 0.3 });
    },
    powerup() {
      blip({ type: 'sine', from: 523, to: 523, dur: 0.1, vol: 0.2 });
      blip({ type: 'sine', from: 659, to: 659, dur: 0.1, vol: 0.2, when: 0.09 });
      blip({ type: 'sine', from: 784, to: 784, dur: 0.16, vol: 0.22, when: 0.18 });
    },
    wave() {
      blip({ type: 'triangle', from: 392, to: 392, dur: 0.14, vol: 0.22 });
      blip({ type: 'triangle', from: 523, to: 523, dur: 0.2, vol: 0.22, when: 0.13 });
    },
    bossAlarm() {
      blip({ type: 'sawtooth', from: 110, to: 110, dur: 0.35, vol: 0.25 });
      blip({ type: 'sawtooth', from: 110, to: 110, dur: 0.35, vol: 0.25, when: 0.4 });
    },
    gameover() {
      blip({ type: 'triangle', from: 392, to: 392, dur: 0.3, vol: 0.25 });
      blip({ type: 'triangle', from: 311, to: 311, dur: 0.3, vol: 0.25, when: 0.28 });
      blip({ type: 'triangle', from: 233, to: 220, dur: 0.7, vol: 0.25, when: 0.56 });
    },
    victory() {
      [523, 659, 784, 1047].forEach((f, i) =>
        blip({ type: 'triangle', from: f, to: f, dur: 0.25, vol: 0.22, when: i * 0.14 }));
    },
    click() {
      blip({ type: 'sine', from: 660, to: 660, dur: 0.06, vol: 0.15 });
    },
    startMusic() {
      if (!ensure() || musicOn) return;
      musicOn = true;
      step = 0;
      nextStepTime = ctx.currentTime + 0.05;
      musicTimer = window.setInterval(() => {
        if (!musicOn) return;
        while (nextStepTime < ctx.currentTime + 0.25) musicStep();
      }, 90);
    },
    stopMusic() {
      musicOn = false;
      if (musicTimer !== null) {
        window.clearInterval(musicTimer);
        musicTimer = null;
      }
    },
  };
}
