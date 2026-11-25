// The background ripple animation is rendered separately from the sculpture.
export function createWater(canvas, motionPreference) {
  const rippleContext = canvas.getContext("2d");
  const rippleDuration = 1460;
  const ripples = [];
  let lastRipple = null;
  let layout = { width: 0, height: 0 };

  function resize(width, height) {
    layout = { width, height };
    const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.ceil(width * ratio);
    canvas.height = Math.ceil(height * ratio);
    rippleContext.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  function releaseRipple(x, y, time) {
    if (lastRipple && (time - lastRipple.time < 74 || Math.hypot(x - lastRipple.x, y - lastRipple.y) < 31)) return;
    lastRipple = { x, y, time, phase: Math.random() * Math.PI * 2 };
    ripples.push(lastRipple);
  }

  function waterContour(radius, phase, progress) {
    const path = new Path2D();
    const points = [];
    const segments = 48;
    for (let step = 0; step < segments; step++) {
      const angle = step * Math.PI * 2 / segments;
      const swell = radius * (1
        + .031 * Math.sin(5 * angle + phase - progress * 5)
        + .018 * Math.sin(9 * angle - phase + progress * 3));
      points.push({ x: Math.cos(angle) * swell, y: Math.sin(angle) * swell * .82 });
    }
    const first = points[0];
    const last = points[segments - 1];
    path.moveTo((first.x + last.x) / 2, (first.y + last.y) / 2);
    points.forEach((point, index) => {
      const next = points[(index + 1) % segments];
      path.quadraticCurveTo(point.x, point.y, (point.x + next.x) / 2, (point.y + next.y) / 2);
    });
    path.closePath();
    return path;
  }

  function drawWaterCrest(radius, phase, progress, strength) {
    const context = rippleContext;
    const contour = waterContour(radius, phase, progress);
    const width = 3 + radius * .03;
    const trough = context.createLinearGradient(-radius, -radius * .65, radius, radius * .65);
    trough.addColorStop(0, "rgba(113,150,164,.31)");
    trough.addColorStop(.42, "rgba(122,155,168,.11)");
    trough.addColorStop(1, "rgba(76,112,128,.40)");
    context.strokeStyle = trough;
    context.globalAlpha = strength * .40;
    context.lineWidth = width * 2.15;
    context.stroke(contour);
    context.globalAlpha = strength;
    context.lineWidth = width * .95;
    context.stroke(contour);

    // A shifted reflection and the shaded trough read together as raised water.
    const glint = context.createLinearGradient(-radius, radius * .7, radius, -radius * .7);
    glint.addColorStop(0, "rgba(255,255,255,.15)");
    glint.addColorStop(.38, "rgba(255,255,255,.88)");
    glint.addColorStop(.7, "rgba(255,255,255,.23)");
    glint.addColorStop(1, "rgba(255,255,255,.96)");
    context.translate(-width * .16, -width * .22);
    context.strokeStyle = glint;
    context.globalAlpha = strength * .87;
    context.lineWidth = width * .48;
    context.stroke(contour);
    context.translate(width * .16, width * .22);
  }

  function drawRipples(now) {
    if (!ripples.length) return;
    rippleContext.clearRect(0, 0, layout.width, layout.height);
    const reach = Math.min(246, Math.max(166, layout.width * .19));
    for (let index = ripples.length - 1; index >= 0; index--) {
      const wave = ripples[index];
      const age = (now - wave.time) / rippleDuration;
      if (age >= 1 || motionPreference.matches) {
        ripples.splice(index, 1);
        continue;
      }
      rippleContext.save();
      rippleContext.translate(wave.x, wave.y);
      for (let ring = 0; ring < 4; ring++) {
        const progress = age - ring * .077;
        if (progress <= 0) continue;
        const radius = 10 + reach * (1 - Math.pow(1 - progress, 1.17));
        const strength = Math.min(progress * 8, 1) * Math.pow(1 - progress, 1.36) * (1 - ring * .19);
        drawWaterCrest(radius, wave.phase + ring * .62, progress, strength);
      }
      rippleContext.restore();
    }
  }

  return {
    resize,
    release: releaseRipple,
    draw: drawRipples,
    get active() { return ripples.length > 0; }
  };
}
