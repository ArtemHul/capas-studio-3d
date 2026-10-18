/* Декоративний фон першого екрана: горизонтальні «нитки філаменту», що вигинаються від курсора й швидкості прокрутки.
   Canvas 2D, без бібліотек. Працює лише поки hero видно; при reduced-motion малює один статичний кадр. */
(function () {
  const canvas = document.querySelector(".filament");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine = matchMedia("(pointer: fine)").matches;
  let w = 0, h = 0, dpr = 1, lines = [], running = false, raf = 0, t = 0;
  const mouse = { x: -9999, y: -9999, tx: -9999, ty: -9999 };
  let boost = 0;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    w = canvas.clientWidth; h = canvas.clientHeight;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = w < 700 ? 16 : 30;
    lines = Array.from({ length: n }, (_, i) => ({
      y: h * (0.12 + 0.8 * (i / (n - 1))),
      amp: 6 + Math.random() * 16,
      freq: 0.0016 + Math.random() * 0.0022,
      speed: 0.25 + Math.random() * 0.5,
      phase: Math.random() * Math.PI * 2,
      hot: Math.random() < 0.14
    }));
    if (!running) draw();
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);
    mouse.x += (mouse.tx - mouse.x) * 0.08;
    mouse.y += (mouse.ty - mouse.y) * 0.08;
    boost *= 0.94;
    const step = w < 700 ? 14 : 10;
    for (const L of lines) {
      ctx.beginPath();
      for (let x = -step; x <= w + step; x += step) {
        let y = L.y + Math.sin(x * L.freq + t * L.speed + L.phase) * (L.amp + boost * 0.6);
        const dx = x - mouse.x, dy = L.y - mouse.y;
        const d2 = dx * dx + dy * dy;
        y += Math.exp(-d2 / 22000) * 38 * Math.sign(dy || 1);
        x === -step ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.strokeStyle = L.hot ? "rgba(255,106,43,.55)" : "rgba(238,232,221,.11)";
      ctx.lineWidth = L.hot ? 1.4 : 1;
      ctx.stroke();
    }
  }

  function loop() {
    t += 0.016;
    draw();
    raf = requestAnimationFrame(loop);
  }
  function start() { if (running || reduce) return; running = true; raf = requestAnimationFrame(loop); }
  function stop() { running = false; cancelAnimationFrame(raf); }

  window.addEventListener("resize", resize, { passive: true });
  if (fine) {
    window.addEventListener("pointermove", e => {
      const r = canvas.getBoundingClientRect();
      mouse.tx = e.clientX - r.left; mouse.ty = e.clientY - r.top;
    }, { passive: true });
  }
  let lastY = window.scrollY;
  window.addEventListener("scroll", () => {
    const y = window.scrollY; boost = Math.min(60, boost + Math.abs(y - lastY) * 0.4); lastY = y;
  }, { passive: true });

  new IntersectionObserver(([e]) => (e.isIntersecting && !document.hidden ? start() : stop())).observe(canvas);
  document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()));
  resize();
})();
