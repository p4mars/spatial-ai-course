const canvas = document.getElementById("scene");
const ctx = canvas.getContext("2d");
const rawFrameCanvas = document.getElementById("rawFrame");
const rawFrameCtx = rawFrameCanvas.getContext("2d");
const compFrameCanvas = document.getElementById("compFrame");
const compFrameCtx = compFrameCanvas.getContext("2d");

const controls = {
  linearVelocity: document.getElementById("linearVelocity"),
  angularVelocity: document.getElementById("angularVelocity"),
  scanDuration: document.getElementById("scanDuration"),
  rayCount: document.getElementById("rayCount"),
  poseError: document.getElementById("poseError"),
  showRays: document.getElementById("showRays"),
  showGhosts: document.getElementById("showGhosts"),
  playPause: document.getElementById("playPause"),
  reset: document.getElementById("reset"),
  step: document.getElementById("step"),
  compensate: document.getElementById("compensate"),
};

const readouts = {
  linearValue: document.getElementById("linearValue"),
  angularValue: document.getElementById("angularValue"),
  durationValue: document.getElementById("durationValue"),
  rayValue: document.getElementById("rayValue"),
  errorValue: document.getElementById("errorValue"),
  scanProgress: document.getElementById("scanProgress"),
  scanTime: document.getElementById("scanTime"),
  rawStatus: document.getElementById("rawStatus"),
  compStatus: document.getElementById("compStatus"),
};

const world = {
  xMin: -7,
  xMax: 9,
  yMin: -5.5,
  yMax: 5.5,
};

const startPose = { x: -3.8, y: -2.0, theta: degToRad(18) };
const maxRange = 30;

const segments = [
  seg(-6.2, -4.5, 8.0, -4.5),
  seg(8.0, -4.5, 8.0, 4.4),
  seg(8.0, 4.4, -6.2, 4.4),
  seg(-6.2, 4.4, -6.2, -4.5),
  seg(-1.2, -3.5, 0.4, -3.5),
  seg(0.4, -3.5, 0.4, -1.9),
  seg(0.4, -1.9, -1.2, -1.9),
  seg(-1.2, -1.9, -1.2, -3.5),
  seg(2.0, 1.2, 4.7, 1.2),
  seg(4.7, 1.2, 4.7, 2.8),
  seg(4.7, 2.8, 2.0, 2.8),
  seg(2.0, 2.8, 2.0, 1.2),
  seg(-4.9, 1.0, -2.1, 2.9),
  seg(-2.1, 2.9, -1.5, 2.0),
  seg(-1.5, 2.0, -4.3, 0.1),
  seg(-4.3, 0.1, -4.9, 1.0),
  seg(1.1, -0.8, 6.1, -1.5),
];

const circles = [
  { x: 5.6, y: -2.8, r: 0.55 },
  { x: -3.4, y: 3.35, r: 0.42 },
];

let state = {
  playing: false,
  currentRay: 0,
  rays: [],
  compensated: false,
  lastFrameTime: performance.now(),
};

let stepHoldTimer = null;

function seg(x1, y1, x2, y2) {
  return { a: { x: x1, y: y1 }, b: { x: x2, y: y2 } };
}

function degToRad(deg) {
  return (deg * Math.PI) / 180;
}

function radToDeg(rad) {
  return (rad * 180) / Math.PI;
}

function seededRandom(seed) {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function centeredRandom(seed) {
  return seededRandom(seed) * 2 - 1;
}

function estimatedPoseAt(pose, rayIndex, errorScale) {
  return {
    x: pose.x + centeredRandom(rayIndex * 3 + 1) * errorScale,
    y: pose.y + centeredRandom(rayIndex * 3 + 2) * errorScale,
    theta: pose.theta + centeredRandom(rayIndex * 3 + 3) * degToRad(12) * errorScale,
  };
}

function compensatedPointFromEstimate(localHit, estimatedPose) {
  return toLocal(toWorld(localHit, estimatedPose), startPose);
}

function poseAt(t, v, omega) {
  if (Math.abs(omega) < 1e-6) {
    return {
      x: startPose.x + v * t * Math.cos(startPose.theta),
      y: startPose.y + v * t * Math.sin(startPose.theta),
      theta: startPose.theta,
    };
  }

  const theta = startPose.theta + omega * t;
  return {
    x: startPose.x + (v / omega) * (Math.sin(theta) - Math.sin(startPose.theta)),
    y: startPose.y - (v / omega) * (Math.cos(theta) - Math.cos(startPose.theta)),
    theta,
  };
}

function toWorld(local, pose) {
  const c = Math.cos(pose.theta);
  const s = Math.sin(pose.theta);
  return {
    x: pose.x + c * local.x - s * local.y,
    y: pose.y + s * local.x + c * local.y,
  };
}

function toLocal(worldPoint, pose) {
  const dx = worldPoint.x - pose.x;
  const dy = worldPoint.y - pose.y;
  const c = Math.cos(pose.theta);
  const s = Math.sin(pose.theta);
  return {
    x: c * dx + s * dy,
    y: -s * dx + c * dy,
  };
}

function raySegmentDistance(origin, dir, segment) {
  const vx = segment.b.x - segment.a.x;
  const vy = segment.b.y - segment.a.y;
  const wx = segment.a.x - origin.x;
  const wy = segment.a.y - origin.y;
  const cross = dir.x * vy - dir.y * vx;
  if (Math.abs(cross) < 1e-8) return Infinity;

  const t = (wx * vy - wy * vx) / cross;
  const u = (wx * dir.y - wy * dir.x) / cross;
  if (t >= 0 && u >= 0 && u <= 1) return t;
  return Infinity;
}

function rayCircleDistance(origin, dir, circle) {
  const ox = origin.x - circle.x;
  const oy = origin.y - circle.y;
  const b = 2 * (ox * dir.x + oy * dir.y);
  const c = ox * ox + oy * oy - circle.r * circle.r;
  const disc = b * b - 4 * c;
  if (disc < 0) return Infinity;
  const root = Math.sqrt(disc);
  const t1 = (-b - root) / 2;
  const t2 = (-b + root) / 2;
  if (t1 >= 0) return t1;
  if (t2 >= 0) return t2;
  return Infinity;
}

function castRay(pose, bearing) {
  const angle = pose.theta + bearing;
  const dir = { x: Math.cos(angle), y: Math.sin(angle) };
  let best = maxRange;

  for (const s of segments) {
    best = Math.min(best, raySegmentDistance(pose, dir, s));
  }
  for (const c of circles) {
    best = Math.min(best, rayCircleDistance(pose, dir, c));
  }

  const range = Math.min(best, maxRange);
  const localHit = { x: range * Math.cos(bearing), y: range * Math.sin(bearing) };
  const worldHit = toWorld(localHit, pose);

  return { range, localHit, worldHit };
}

function buildScan() {
  const v = Number(controls.linearVelocity.value);
  const omega = degToRad(Number(controls.angularVelocity.value));
  const duration = Number(controls.scanDuration.value);
  const rayCount = Number(controls.rayCount.value);
  const errorPercent = Number(controls.poseError.value);
  const errorScale = errorPercent / 100;
  const rays = [];

  for (let i = 0; i < rayCount; i += 1) {
    const alpha = i / rayCount;
    const t = alpha * duration;
    const bearing = alpha * Math.PI * 2;
    const pose = poseAt(t, v, omega);
    const hit = castRay(pose, bearing);
    const estimatedPose = estimatedPoseAt(pose, i, errorScale);

    rays.push({
      index: i,
      t,
      bearing,
      pose,
      range: hit.range,
      trueWorld: hit.worldHit,
      rawWorld: toWorld(hit.localHit, startPose),
      deskewedWorld: hit.worldHit,
      rawFrame: hit.localHit,
      estimatedPose,
      compensatedFrame: compensatedPointFromEstimate(hit.localHit, estimatedPose),
    });
  }

  state.rays = rays;
  state.currentRay = Math.min(state.currentRay, rays.length);
  state.compensated = false;
  updateReadouts();
  drawOutputFrames();
}

function worldToCanvas(p) {
  const pad = 44;
  const w = canvas.width - pad * 2;
  const h = canvas.height - pad * 2;
  const sx = w / (world.xMax - world.xMin);
  const sy = h / (world.yMax - world.yMin);
  const scale = Math.min(sx, sy);
  const usedW = (world.xMax - world.xMin) * scale;
  const usedH = (world.yMax - world.yMin) * scale;
  const ox = (canvas.width - usedW) / 2;
  const oy = (canvas.height - usedH) / 2;
  return {
    x: ox + (p.x - world.xMin) * scale,
    y: oy + (world.yMax - p.y) * scale,
  };
}

function drawLine(a, b, color, width = 2, alpha = 1) {
  const ca = worldToCanvas(a);
  const cb = worldToCanvas(b);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(ca.x, ca.y);
  ctx.lineTo(cb.x, cb.y);
  ctx.stroke();
  ctx.restore();
}

function drawPoint(p, color, radius = 2.4, alpha = 1) {
  const c = worldToCanvas(p);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(c.x, c.y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function frameToCanvas(p, targetCanvas) {
  const pad = 32;
  const bounds = { xMin: -6, xMax: 12, yMin: -7, yMax: 7 };
  const w = targetCanvas.width - pad * 2;
  const h = targetCanvas.height - pad * 2;
  const scale = Math.min(w / (bounds.xMax - bounds.xMin), h / (bounds.yMax - bounds.yMin));
  const usedW = (bounds.xMax - bounds.xMin) * scale;
  const usedH = (bounds.yMax - bounds.yMin) * scale;
  const ox = (targetCanvas.width - usedW) / 2;
  const oy = (targetCanvas.height - usedH) / 2;
  return {
    x: ox + (p.x - bounds.xMin) * scale,
    y: oy + (bounds.yMax - p.y) * scale,
  };
}

function drawFramePoint(targetCtx, targetCanvas, p, color, radius = 2.1, alpha = 0.82) {
  const c = frameToCanvas(p, targetCanvas);
  targetCtx.save();
  targetCtx.globalAlpha = alpha;
  targetCtx.fillStyle = color;
  targetCtx.beginPath();
  targetCtx.arc(c.x, c.y, radius, 0, Math.PI * 2);
  targetCtx.fill();
  targetCtx.restore();
}

function drawFrameLine(targetCtx, targetCanvas, a, b, color, width = 1, alpha = 1) {
  const ca = frameToCanvas(a, targetCanvas);
  const cb = frameToCanvas(b, targetCanvas);
  targetCtx.save();
  targetCtx.globalAlpha = alpha;
  targetCtx.strokeStyle = color;
  targetCtx.lineWidth = width;
  targetCtx.beginPath();
  targetCtx.moveTo(ca.x, ca.y);
  targetCtx.lineTo(cb.x, cb.y);
  targetCtx.stroke();
  targetCtx.restore();
}

function drawFrameBase(targetCtx, targetCanvas, label) {
  targetCtx.fillStyle = "#fbfcfb";
  targetCtx.fillRect(0, 0, targetCanvas.width, targetCanvas.height);

  for (let x = -6; x <= 12; x += 1) {
    drawFrameLine(targetCtx, targetCanvas, { x, y: -7 }, { x, y: 7 }, "#e7ece8", 1);
  }
  for (let y = -7; y <= 7; y += 1) {
    drawFrameLine(targetCtx, targetCanvas, { x: -6, y }, { x: 12, y }, "#e7ece8", 1);
  }

  drawFrameLine(targetCtx, targetCanvas, { x: -6, y: 0 }, { x: 12, y: 0 }, "#93a19a", 1.5);
  drawFrameLine(targetCtx, targetCanvas, { x: 0, y: -7 }, { x: 0, y: 7 }, "#93a19a", 1.5);
  drawFrameLine(targetCtx, targetCanvas, { x: 0, y: 0 }, { x: 0.8, y: 0 }, "#17201b", 3);
  drawFramePoint(targetCtx, targetCanvas, { x: 0, y: 0 }, "#17201b", 4, 1);

  for (const s of segments) {
    drawFrameLine(targetCtx, targetCanvas, toLocal(s.a, startPose), toLocal(s.b, startPose), "#202824", 2, 0.18);
  }
  for (const c of circles) {
    const samples = 40;
    let previous = null;
    for (let i = 0; i <= samples; i += 1) {
      const a = (i / samples) * Math.PI * 2;
      const worldPoint = { x: c.x + c.r * Math.cos(a), y: c.y + c.r * Math.sin(a) };
      const localPoint = toLocal(worldPoint, startPose);
      if (previous) drawFrameLine(targetCtx, targetCanvas, previous, localPoint, "#202824", 2, 0.18);
      previous = localPoint;
    }
  }

  targetCtx.save();
  targetCtx.fillStyle = "#69756e";
  targetCtx.font = "12px Inter, system-ui, sans-serif";
  targetCtx.fillText(label, 12, 22);
  targetCtx.fillText("origin = start pose, +x = start heading", 12, targetCanvas.height - 12);
  targetCtx.restore();
}

function drawOutputFrames() {
  drawFrameBase(rawFrameCtx, rawFrameCanvas, "raw scan frame");
  drawFrameBase(
    compFrameCtx,
    compFrameCanvas,
    `motion compensated frame, odom error ${Number(controls.poseError.value).toFixed(0)}%`,
  );

  const visible = state.rays.slice(0, state.currentRay);
  for (const ray of visible) {
    drawFramePoint(rawFrameCtx, rawFrameCanvas, ray.rawFrame, "#d55440", 2.2, 0.76);
  }

  if (state.compensated) {
    for (const ray of visible) {
      drawFramePoint(compFrameCtx, compFrameCanvas, ray.compensatedFrame, "#1976a3", 2.1, 0.84);
    }
  }
}

function drawRobot(pose, color, alpha = 1, size = 0.28) {
  const nose = toWorld({ x: size * 1.55, y: 0 }, pose);
  const left = toWorld({ x: -size, y: size * 0.78 }, pose);
  const right = toWorld({ x: -size, y: -size * 0.78 }, pose);
  const cn = worldToCanvas(nose);
  const cl = worldToCanvas(left);
  const cr = worldToCanvas(right);

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cn.x, cn.y);
  ctx.lineTo(cl.x, cl.y);
  ctx.lineTo(cr.x, cr.y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawGrid() {
  ctx.fillStyle = "#fbfcfb";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.strokeStyle = "#e7ece8";
  ctx.lineWidth = 1;
  for (let x = Math.ceil(world.xMin); x <= world.xMax; x += 1) {
    drawLine({ x, y: world.yMin }, { x, y: world.yMax }, "#e7ece8", 1);
  }
  for (let y = Math.ceil(world.yMin); y <= world.yMax; y += 1) {
    drawLine({ x: world.xMin, y }, { x: world.xMax, y }, "#e7ece8", 1);
  }
  ctx.restore();
}

function drawMap() {
  for (const s of segments) {
    drawLine(s.a, s.b, "#202824", 3);
  }
  for (const c of circles) {
    const cc = worldToCanvas(c);
    const edge = worldToCanvas({ x: c.x + c.r, y: c.y });
    ctx.save();
    ctx.strokeStyle = "#202824";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cc.x, cc.y, Math.abs(edge.x - cc.x), 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

function drawPath() {
  const duration = Number(controls.scanDuration.value);
  const v = Number(controls.linearVelocity.value);
  const omega = degToRad(Number(controls.angularVelocity.value));
  const samples = 80;

  ctx.save();
  ctx.strokeStyle = "#2d8d59";
  ctx.lineWidth = 2.5;
  ctx.setLineDash([7, 5]);
  ctx.beginPath();
  for (let i = 0; i <= samples; i += 1) {
    const pose = poseAt((duration * i) / samples, v, omega);
    const p = worldToCanvas(pose);
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  }
  ctx.stroke();
  ctx.restore();
}

function drawLabels() {
  ctx.save();
  ctx.fillStyle = "#17201b";
  ctx.font = "600 14px Inter, system-ui, sans-serif";
  ctx.fillText("Robot motion while one LiDAR scan is acquired", 28, 30);
  ctx.font = "12px Inter, system-ui, sans-serif";
  ctx.fillStyle = "#69756e";
  ctx.fillText("Each ray is added to the raw frame immediately. Motion compensation can be enabled at any time.", 28, 50);
  ctx.restore();
}

function draw() {
  drawGrid();
  drawMap();
  drawPath();

  const visible = state.rays.slice(0, state.currentRay);
  if (controls.showGhosts.checked) {
    for (let i = 0; i < visible.length; i += Math.max(1, Math.floor(state.rays.length / 18))) {
      drawRobot(visible[i].pose, "#2d8d59", 0.22, 0.2);
    }
  }

  if (controls.showRays.checked && visible.length > 0) {
    const latest = visible[visible.length - 1];
    const start = latest.pose;
    const end = latest.trueWorld;
    drawLine(start, end, "#caa63a", 1.4, 0.75);
  }

  for (const ray of visible) drawPoint(ray.trueWorld, "#caa63a", 1.8, 0.5);

  drawRobot(startPose, "#17201b", 1, 0.3);
  if (visible.length > 0) drawRobot(visible[visible.length - 1].pose, "#2d8d59", 1, 0.28);
  drawLabels();
}

function updateReadouts() {
  const v = Number(controls.linearVelocity.value);
  const omegaDeg = Number(controls.angularVelocity.value);
  const duration = Number(controls.scanDuration.value);
  const rayCount = Number(controls.rayCount.value);
  const errorPercent = Number(controls.poseError.value);
  const current = Math.min(state.currentRay, rayCount);

  readouts.linearValue.textContent = `${v.toFixed(2)} m/s`;
  readouts.angularValue.textContent = `${omegaDeg.toFixed(0)} deg/s`;
  readouts.durationValue.textContent = `${duration.toFixed(2)} s`;
  readouts.rayValue.textContent = `${rayCount}`;
  readouts.errorValue.textContent = `${errorPercent.toFixed(0)}%`;
  readouts.scanProgress.textContent = `${current} / ${rayCount}`;
  readouts.scanTime.textContent = `${((current / rayCount) * duration).toFixed(2)} s`;
  controls.playPause.textContent = state.playing ? "Pause" : current >= rayCount ? "Rescan" : "Start scan";
  readouts.rawStatus.textContent = current > 0 ? "recording" : "waiting for scan";
  if (current >= rayCount) readouts.rawStatus.textContent = "complete";
  readouts.compStatus.textContent = state.compensated ? "recording" : "not generated";
  if (state.compensated && current >= rayCount) readouts.compStatus.textContent = "complete";
  controls.compensate.disabled = current === 0 || state.compensated;
}

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.max(900, Math.floor(rect.width * ratio));
  canvas.height = Math.max(560, Math.floor(rect.height * ratio));
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  resizeFrameCanvas(rawFrameCanvas);
  resizeFrameCanvas(compFrameCanvas);
  drawOutputFrames();
  draw();
}

function resizeFrameCanvas(targetCanvas) {
  const rect = targetCanvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  targetCanvas.width = Math.max(420, Math.floor(rect.width * ratio));
  targetCanvas.height = Math.max(260, Math.floor(rect.height * ratio));
}

function resetScan() {
  state.currentRay = 0;
  state.playing = false;
  state.compensated = false;
  updateReadouts();
  drawOutputFrames();
  draw();
}

function stepOnce() {
  state.playing = false;
  state.currentRay = Math.min(state.rays.length, state.currentRay + 1);
  updateReadouts();
  drawOutputFrames();
  draw();
}

function startStepHold(event) {
  event.preventDefault();
  try {
    controls.step.setPointerCapture?.(event.pointerId);
  } catch {
    // Synthetic pointer events in tests do not always have an active pointer.
  }
  stepOnce();
  if (stepHoldTimer) clearInterval(stepHoldTimer);
  stepHoldTimer = setInterval(stepOnce, 42);
}

function stopStepHold() {
  if (!stepHoldTimer) return;
  clearInterval(stepHoldTimer);
  stepHoldTimer = null;
}

function animationLoop(now) {
  const dt = Math.min(0.05, (now - state.lastFrameTime) / 1000);
  state.lastFrameTime = now;

  if (state.playing) {
    const raysPerSecond = Number(controls.rayCount.value) / Number(controls.scanDuration.value);
    state.currentRay += Math.max(1, Math.round(raysPerSecond * dt));
    if (state.currentRay >= state.rays.length) {
      state.currentRay = state.rays.length;
      state.playing = false;
    }
    updateReadouts();
    drawOutputFrames();
  }

  draw();
  requestAnimationFrame(animationLoop);
}

for (const input of [
  controls.linearVelocity,
  controls.angularVelocity,
  controls.scanDuration,
  controls.rayCount,
]) {
  input.addEventListener("input", () => {
    buildScan();
    state.currentRay = 0;
    state.playing = false;
    state.compensated = false;
    updateReadouts();
    drawOutputFrames();
    draw();
  });
}

controls.poseError.addEventListener("input", () => {
  const currentRay = state.currentRay;
  const compensated = state.compensated;
  const playing = state.playing;
  buildScan();
  state.currentRay = Math.min(currentRay, state.rays.length);
  state.compensated = compensated;
  state.playing = playing;
  updateReadouts();
  drawOutputFrames();
  draw();
});

for (const input of [controls.showRays, controls.showGhosts]) {
  input.addEventListener("input", draw);
}

controls.playPause.addEventListener("click", () => {
  if (state.currentRay >= state.rays.length) {
    state.currentRay = 0;
    state.compensated = false;
    drawOutputFrames();
  }
  state.playing = !state.playing;
  state.lastFrameTime = performance.now();
  updateReadouts();
});

controls.reset.addEventListener("click", resetScan);
controls.step.addEventListener("pointerdown", startStepHold);
controls.step.addEventListener("pointerup", stopStepHold);
controls.step.addEventListener("pointerleave", stopStepHold);
controls.step.addEventListener("pointercancel", stopStepHold);
controls.step.addEventListener("lostpointercapture", stopStepHold);

controls.compensate.addEventListener("click", () => {
  if (state.currentRay === 0) return;
  state.compensated = true;
  updateReadouts();
  drawOutputFrames();
});

window.addEventListener("resize", resizeCanvas);

buildScan();
resizeCanvas();
requestAnimationFrame(animationLoop);
