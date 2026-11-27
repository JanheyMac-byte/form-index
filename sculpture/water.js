// A shared crest texture keeps pointer motion independent of the WebGL scene.
function crestTexture() {
  const tile = document.createElement("canvas");
  tile.width = 320;
  tile.height = 240;
  const ctx = tile.getContext("2d");
  ctx.translate(160, 120);
  ctx.scale(1, .72);
  const path = new Path2D();
  for (let n = 0; n <= 128; n++) {
    const angle = n * Math.PI / 64;
    const radius = 148 + 2.4 * Math.sin(5 * angle) + 1.3 * Math.sin(9 * angle);
    const x = radius * Math.cos(angle), y = radius * Math.sin(angle);
    if (n) path.lineTo(x, y);
    else path.moveTo(x, y);
  }
  path.closePath();
  const shade = ctx.createLinearGradient(-130, -90, 120, 80);
  shade.addColorStop(0, "rgba(85,89,94,.45)");
  shade.addColorStop(.52, "rgba(123,125,128,.16)");
  shade.addColorStop(1, "rgba(76,80,85,.49)");
  ctx.strokeStyle = shade;
  ctx.lineWidth = 4;
  ctx.stroke(path);
  ctx.translate(-1.2, -1.6);
  ctx.strokeStyle = "rgba(255,255,255,.82)";
  ctx.lineWidth = 2;
  ctx.stroke(path);
  return tile;
}

function mountWater(canvas, motionPreference) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const texture = crestTexture();
  const waves = [];
  const duration = 1480;
  let frame = 0;
  let last;
  let width, height;
  function resize() {
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    const ratio = Math.min(devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  }
  function draw(now) {
    frame = 0;
    ctx.clearRect(0, 0, width, height);
    while (waves.length && now - waves[0].time >= duration) waves.shift();
    for (const wave of waves) {
      const age = (now - wave.time) / duration;
      for (let n = 0; n < 3; n++) {
        const phase = age - n * .085;
        if (phase <= 0) continue;
        const radius = 9 + Math.min(width * .3, 178) * (1 - (1 - phase) ** 1.6);
        ctx.globalAlpha = Math.min(phase * 13, 1) * (1 - phase) ** 1.45 * (1 - n * .24);
        ctx.drawImage(texture, wave.x - radius, wave.y - radius * .75, radius * 2, radius * 1.5);
      }
    }
    if (waves.length) frame = requestAnimationFrame(draw);
  }
  function release(event) {
    if (motionPreference.matches || document.hidden) return;
    const { clientX: x, clientY: y } = event;
    const time = performance.now();
    if (last && time - last.time < duration &&
      (time - last.time < 110 || Math.hypot(x - last.x, y - last.y) < 32)) return;
    last = { x, y, time };
    if (waves.length >= 6) waves.shift();
    waves.push(last);
    if (!frame) frame = requestAnimationFrame(draw);
  }
  function clear() {
    cancelAnimationFrame(frame);
    frame = 0;
    last = null;
    waves.length = 0;
    ctx.clearRect(0, 0, width, height);
  }
  resize();
  new ResizeObserver(resize).observe(canvas);
  for (const type of ["pointermove", "pointerdown"]) {
    document.addEventListener(type, release, { passive: true, capture: true });
  }
  motionPreference.addEventListener("change", clear);
  document.addEventListener("visibilitychange", clear);
}

mountWater(document.querySelector(".site-water"), matchMedia("(prefers-reduced-motion: reduce)"));
