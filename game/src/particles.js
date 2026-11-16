// STARSHATTER — particles. One job: juice that is only visual.
// Sparks, debris, engine trails, muzzle flashes, shockwave rings and floating
// score text. Additive blending ('lighter') so it glows against the dark field.
// The world hands it plain fx descriptors; it never touches game rules.

export function createParticles() {
  const parts = []; // {x,y,vx,vy,life,maxLife,size,color,drag,kind}
  const texts = []; // {x,y,vy,life,maxLife,text,color,size}
  const rings = []; // {x,y,r,vr,life,maxLife,color,width}

  function spawnExplosion(x, y, color, n = 26, power = 260) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = power * (0.3 + Math.random() * 0.7);
      parts.push({
        x, y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: 0.45 + Math.random() * 0.5,
        maxLife: 0.95,
        size: 1.5 + Math.random() * 3.5,
        color,
        drag: 2.2,
        kind: 'spark',
      });
    }
    rings.push({ x, y, r: 6, vr: 340, life: 0.4, maxLife: 0.4, color, width: 3 });
  }

  function spawnDebris(x, y, color, n = 8) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 60 + Math.random() * 160;
      parts.push({
        x, y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: 0.7 + Math.random() * 0.6,
        maxLife: 1.3,
        size: 2 + Math.random() * 4,
        color,
        drag: 1.2,
        kind: 'debris',
      });
    }
  }

  return {
    /** Drain one frame of fx descriptors from the world. */
    apply(fxList) {
      for (const fx of fxList) {
        if (fx.type === 'explosion') spawnExplosion(fx.x, fx.y, fx.color, fx.n, fx.power);
        else if (fx.type === 'debris') spawnDebris(fx.x, fx.y, fx.color, fx.n);
        else if (fx.type === 'trail') {
          parts.push({
            x: fx.x, y: fx.y, vx: fx.vx ?? 0, vy: fx.vy ?? 0,
            life: 0.28, maxLife: 0.28, size: 2.5, color: fx.color, drag: 0, kind: 'trail',
          });
        } else if (fx.type === 'muzzle') {
          parts.push({
            x: fx.x, y: fx.y, vx: 0, vy: 0,
            life: 0.06, maxLife: 0.06, size: 7, color: '#ffffff', drag: 0, kind: 'flash',
          });
        } else if (fx.type === 'ring') {
          rings.push({ x: fx.x, y: fx.y, r: 8, vr: fx.vr ?? 420, life: 0.5, maxLife: 0.5, color: fx.color, width: 3 });
        } else if (fx.type === 'text') {
          texts.push({
            x: fx.x, y: fx.y, vy: -46,
            life: 0.9, maxLife: 0.9, text: fx.text, color: fx.color, size: fx.size ?? 17,
          });
        }
      }
    },
    update(dt) {
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.life -= dt;
        if (p.life <= 0) {
          parts.splice(i, 1);
          continue;
        }
        const d = 1 - Math.min(1, p.drag * dt);
        p.vx *= d;
        p.vy *= d;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
      }
      for (let i = texts.length - 1; i >= 0; i--) {
        const t = texts[i];
        t.life -= dt;
        t.y += t.vy * dt;
        if (t.life <= 0) texts.splice(i, 1);
      }
      for (let i = rings.length - 1; i >= 0; i--) {
        const r = rings[i];
        r.life -= dt;
        r.r += r.vr * dt;
        if (r.life <= 0) rings.splice(i, 1);
      }
    },
    draw(ctx) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (const p of parts) {
        const a = Math.max(0, p.life / p.maxLife);
        ctx.globalAlpha = p.kind === 'flash' ? a : a * 0.9;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (0.5 + a * 0.5), 0, Math.PI * 2);
        ctx.fill();
      }
      for (const r of rings) {
        const a = Math.max(0, r.life / r.maxLife);
        ctx.globalAlpha = a * 0.8;
        ctx.strokeStyle = r.color;
        ctx.lineWidth = r.width * a;
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
      // Floating texts: normal blending, crisp.
      ctx.save();
      ctx.textAlign = 'center';
      for (const t of texts) {
        const a = Math.max(0, t.life / t.maxLife);
        ctx.globalAlpha = a;
        ctx.font = `700 ${t.size}px "Segoe UI", system-ui, sans-serif`;
        ctx.fillStyle = t.color;
        ctx.fillText(t.text, t.x, t.y);
      }
      ctx.restore();
    },
    clear() {
      parts.length = 0;
      texts.length = 0;
      rings.length = 0;
    },
    get count() {
      return parts.length;
    },
  };
}
