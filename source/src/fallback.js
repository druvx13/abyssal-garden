// Lightweight renderer for browsers without WebGPU.
// It intentionally uses Canvas 2D so older integrated graphics and browsers can run the experience.
const legacyFallback = async () => {
  const canvas = document.getElementById('c');
  const info = document.getElementById('i');
  const body = document.body;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('This browser cannot create a canvas.');

  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = matchMedia('(pointer:coarse)').matches;
  const stars = Array.from({ length: mobile ? 55 : 100 }, (_, i) => ({
    x: (i * 97.31) % 1, y: (i * 43.17) % 1, r: 0.4 + (i % 5) * 0.25, a: 0.25 + (i % 7) / 12,
  }));
  const bubbles = Array.from({ length: mobile ? 18 : 32 }, (_, i) => ({
    x: (i * 61.7) % 1, y: (i * 37.9) % 1, s: 2 + i % 5, speed: 0.008 + (i % 4) * 0.003,
  }));
  let running = true, started = false, menu = true, muted = false, last = 0, t = 0, frames = 0, fps = 0;
  let yaw = 0, pitch = 0, forward = 0, strafe = 0, vertical = 0;

  const resize = () => {
    const dpr = Math.min(devicePixelRatio || 1, 1.25);
    canvas.width = Math.max(2, Math.round(canvas.clientWidth * dpr));
    canvas.height = Math.max(2, Math.round(canvas.clientHeight * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  addEventListener('resize', resize);
  resize();
  await new Promise((resolve) => setTimeout(resolve, 40));
  document.getElementById('s').textContent = 'Compatibility mode · WebGPU unavailable';
  document.getElementById('b').style.transform = 'scaleX(1)';
  body.className = 'm';

  const key = (e, value) => {
    if (e.code === 'KeyW') forward = value;
    else if (e.code === 'KeyS') forward = -value;
    else if (e.code === 'KeyA') strafe = -value;
    else if (e.code === 'KeyD') strafe = value;
    else if (e.code === 'KeyQ') vertical = -value;
    else if (e.code === 'KeyE') vertical = value;
    else if (value && !e.repeat && e.code === 'KeyH') { info.hidden = !info.hidden; }
    else if (value && !e.repeat && e.code === 'KeyM') { muted = !muted; }
    else if (value && !e.repeat && e.code === 'Escape') { menu = true; body.className = 'm'; }
  };
  addEventListener('keydown', (e) => key(e, 1));
  addEventListener('keyup', (e) => key(e, 0));
  canvas.addEventListener('mousemove', (e) => {
    if (!menu && document.pointerLockElement === canvas) {
      yaw += e.movementX * 0.003;
      pitch = Math.max(-1, Math.min(1, pitch + e.movementY * 0.002));
    }
  });
  const touchStart = (e) => { if (!menu) { e.preventDefault(); forward = 1; } };
  const touchEnd = () => { forward = 0; strafe = 0; vertical = 0; };
  canvas.addEventListener('touchstart', touchStart, { passive: false });
  canvas.addEventListener('touchend', touchEnd);
  canvas.addEventListener('touchcancel', touchEnd);

  const dive = () => {
    started = true; menu = false; body.className = 'g'; document.getElementById('d').textContent = 'Resume';
    if (!mobile) canvas.requestPointerLock?.();
  };
  document.getElementById('d').onclick = dive;
  document.getElementById('o').onclick = () => { menu = true; body.className = 'm'; };
  document.querySelectorAll('#q button').forEach((button) => {
    button.onclick = () => {
      document.querySelectorAll('#q button').forEach((b) => b.classList.remove('on'));
      button.classList.add('on');
    };
  });
  document.addEventListener('pointerlockchange', () => {
    if (started && !document.pointerLockElement) { menu = true; body.className = 'm'; }
  });

  const draw = (now) => {
    if (!running) return;
    const dt = Math.min((now - last) / 1000 || 0, 0.05);
    last = now;
    if (!menu) {
      yaw += (strafe * 0.12) * dt;
      pitch += (vertical * 0.08) * dt;
      t += dt * (1 + forward * 0.3);
    }
    const w = canvas.clientWidth, h = canvas.clientHeight;
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#082f43'); g.addColorStop(0.55, '#063047'); g.addColorStop(1, '#020d19');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    const light = ctx.createRadialGradient(w * (.5 + yaw * .04), h * (.02 + pitch * .03), 0, w * .5, h * .1, h * .75);
    light.addColorStop(0, 'rgba(144,240,255,.25)'); light.addColorStop(1, 'rgba(20,120,160,0)');
    ctx.fillStyle = light; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(113,225,230,.16)'; ctx.lineWidth = 1;
    for (let i = 0; i < 9; i++) {
      const x = w * (0.18 + i * 0.09) + Math.sin(t * .22 + i) * 24;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + Math.sin(i) * 80, h * .72); ctx.stroke();
    }
    for (const p of stars) {
      ctx.globalAlpha = p.a * (.7 + .3 * Math.sin(t * 1.3 + p.x * 9));
      ctx.fillStyle = '#9defff'; ctx.beginPath(); ctx.arc(p.x * w, p.y * h, p.r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#071923';
    ctx.beginPath(); ctx.moveTo(0, h);
    for (let x = 0; x <= w; x += 16) ctx.lineTo(x, h * (.78 + .06 * Math.sin(x * .018 + t * .1) + .025 * Math.sin(x * .057)));
    ctx.lineTo(w, h); ctx.fill();
    ctx.strokeStyle = '#174a4d'; ctx.lineWidth = 3;
    for (let i = 0; i < 14; i++) {
      const x = (i / 14) * w + Math.sin(t * .2 + i) * 18;
      ctx.beginPath(); ctx.moveTo(x, h * .92); ctx.quadraticCurveTo(x - 20, h * .66, x + Math.sin(t + i) * 25, h * .55); ctx.stroke();
    }
    for (const p of bubbles) {
      p.y -= p.speed * dt * 60; if (p.y < -0.05) p.y = 1.05;
      ctx.strokeStyle = 'rgba(157,237,245,.35)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(p.x * w + Math.sin(t + p.x * 10) * 8, p.y * h, p.s, 0, Math.PI * 2); ctx.stroke();
    }
    frames++;
    if (now - (draw.statsAt || now) > 500) { fps = frames * 1000 / (now - (draw.statsAt || now)); frames = 0; draw.statsAt = now; }
    if (!info.hidden) info.textContent = `${fps.toFixed(0)} fps  ·  compatibility renderer  ·  ${Math.round(w)}x${Math.round(h)}${muted ? '  ·  muted' : ''}`;
    requestAnimationFrame(draw);
  };
  requestAnimationFrame(draw);
};
