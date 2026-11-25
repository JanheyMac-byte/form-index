import {
  ACESFilmicToneMapping, AmbientLight, BufferAttribute, BufferGeometry, Color, DirectionalLight, Group,
  HemisphereLight, MathUtils, Mesh, MeshPhysicalMaterial, PCFSoftShadowMap,
  PerspectiveCamera, PMREMGenerator, Raycaster, Scene, SRGBColorSpace,
  Vector2, Vector3, WebGLRenderer
} from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { acceleratedRaycast, MeshBVH } from "three-mesh-bvh";
import { createWater } from "./water.js";
import { lingerTime, removeVine, sproutVine, updateVine } from "./vines.js";

const perspective = 800;
const tiltLimit = MathUtils.degToRad(12);
const returnTime = 400;
const sproutDelay = 145;
const dwellRadius = 9;

async function readGeometry(url) {
  const response = await fetch(url);
  if (!response.ok || !response.body) throw new Error("The sculpture could not load");
  const stream = response.body.pipeThrough(new DecompressionStream("gzip"));
  const data = await new Response(stream).arrayBuffer();
  const header = new DataView(data);
  const vertexCount = header.getUint32(0, true);
  const indexCount = header.getUint32(4, true);
  const vectorBytes = vertexCount * 6;
  const colorOffset = 8 + vectorBytes * 2;
  const indexOffset = Math.ceil((colorOffset + vertexCount) / 4) * 4;
  if (data.byteLength !== indexOffset + indexCount * 4) throw new Error("Invalid sculpture mesh");
  const geometry = new BufferGeometry();
  const expand = offset => Float32Array.from(
    new Int16Array(data, offset, vertexCount * 3),
    value => value / 32767
  );
  geometry.setAttribute("position", new BufferAttribute(expand(8), 3));
  geometry.setAttribute("normal", new BufferAttribute(expand(8 + vectorBytes), 3));
  const ambient = new Uint8Array(data, colorOffset, vertexCount);
  const colors = new Uint8Array(vertexCount * 3);
  ambient.forEach((value, index) => colors.fill(value, index * 3, index * 3 + 3));
  geometry.setAttribute("color", new BufferAttribute(colors, 3, true));
  geometry.setIndex(new BufferAttribute(new Uint32Array(data, indexOffset, indexCount), 1));
  geometry.computeBoundingSphere();
  geometry.boundsTree = new MeshBVH(geometry);
  return geometry;
}

function porcelainLighting(scene, renderer) {
  const room = new RoomEnvironment();
  const pmrem = new PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(room, .055).texture;
  scene.environmentIntensity = .74;
  room.dispose();
  pmrem.dispose();

  const key = new DirectionalLight(0xfff8ee, 1.46);
  key.position.set(-380, 540, 560);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, { left: -490, right: 490, top: 490, bottom: -490, near: 40, far: 1450 });
  key.shadow.camera.updateProjectionMatrix();
  key.shadow.bias = -.00054;
  key.shadow.normalBias = 1.65;
  key.shadow.radius = 3;
  const fill = new DirectionalLight(0xeaf0fb, .44);
  fill.position.set(530, 190, 350);
  scene.add(key, fill, new HemisphereLight(0xffffff, 0x908984, .49), new AmbientLight(0xf7f2ec, .09));
}

function connectScrollScale(element, motionPreference) {
  const track = element.closest(".sculpture-scroll");
  const orbitAnchor = track.querySelector(".orbit-anchor");
  const intro = element.querySelector(".hero-content");
  const orbit = element.querySelector(".orbit-scene");
  const header = document.querySelector(".top");
  const zoom = { factor: .5, reveal: 0, onChange: null };
  let frame = 0;
  let entryPhase = -1;

  function update() {
    frame = 0;
    const distance = orbitAnchor.offsetTop;
    const moved = header.offsetHeight - track.getBoundingClientRect().top;
    const progress = distance > 0 ? MathUtils.clamp(moved / distance, 0, 1) : 0;
    const reduced = motionPreference.matches;
    const introReveal = orbit.hidden ? 1 : reduced ? Number(progress < .72) : 1 - MathUtils.smoothstep(progress, .29, .62);
    const orbitReveal = orbit.hidden ? 0 : reduced ? Number(progress >= .72) : MathUtils.smoothstep(progress, .50, .92);
    intro.inert = introReveal < .25;
    const phase = orbit.hidden ? 0 : reduced ? orbitReveal : MathUtils.clamp((progress - .32) / .66, 0, 1);
    orbit.inert = phase < 1;
    element.style.setProperty("--intro-reveal", String(introReveal));
    element.style.setProperty("--orbit-reveal", String(orbitReveal));
    if (phase !== entryPhase) {
      entryPhase = phase;
      orbit.dispatchEvent(new CustomEvent("orbit-scroll", { detail: phase }));
    }
    const factor = .5 + .5 * (reduced ? Number(progress >= .72) : progress);
    if (factor === zoom.factor && orbitReveal === zoom.reveal) return;
    zoom.factor = factor;
    zoom.reveal = orbitReveal;
    element.style.setProperty("--sculpture-zoom", String(factor));
    zoom.onChange?.();
  }

  function requestUpdate() {
    if (!frame) frame = requestAnimationFrame(update);
  }

  window.addEventListener("scroll", requestUpdate, { passive: true });
  motionPreference.addEventListener("change", requestUpdate);
  const observer = new ResizeObserver(requestUpdate);
  observer.observe(track);
  observer.observe(header);
  update();
  return zoom;
}

async function mountSculpture(element) {
  const canvas = element.querySelector(".sculpture-render");
  const motionPreference = matchMedia("(prefers-reduced-motion: reduce)");
  const zoom = connectScrollScale(element, motionPreference);
  const water = createWater(element.querySelector(".hero-water"), motionPreference);
  const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "high-performance" });
  renderer.setClearColor(0xffffff, 0);
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.21;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFSoftShadowMap;

  const geometry = await readGeometry(element.dataset.model);
  const scene = new Scene();
  porcelainLighting(scene, renderer);
  const camera = new PerspectiveCamera(55, 1, 12, 2500);
  camera.position.z = perspective;
  const pivot = new Group();
  const sculpture = new Mesh(geometry, new MeshPhysicalMaterial({
    color: new Color(0xf6f3ef), vertexColors: true, roughness: .24,
    clearcoat: .77, clearcoatRoughness: .19, specularIntensity: .88, envMapIntensity: .74
  }));
  sculpture.raycast = acceleratedRaycast;
  sculpture.castShadow = true;
  sculpture.receiveShadow = true;
  pivot.add(sculpture);
  scene.add(pivot);

  const raycaster = new Raycaster();
  raycaster.firstHitOnly = true;
  const ndc = new Vector2();
  const vines = [];
  let layout;
  let frame = 0;
  let wakeTimer = 0;
  let sceneDirty = true;
  let lastTime = 0;
  let inView = false;
  let lost = false;
  let pointer = null;
  let lastHit = -Infinity;
  let activeVine = null;
  let returning = null;
  let wasHovering = false;

  function schedule() {
    clearTimeout(wakeTimer);
    if (inView && !lost && !frame) frame = requestAnimationFrame(draw);
  }

  function resize() {
    const width = element.clientWidth;
    const height = element.clientHeight;
    if (!width || !height || (width === layout?.width && height === layout.height)) return;
    const compact = width <= 640;
    const fullScale = Math.min(width * (compact ? .407 : .31), height * (compact ? .29 : .375), 375);
    const center = height * (compact ? .598 - .06 * zoom.reveal : .516);
    const scale = fullScale * zoom.factor;
    layout = { width, height, center, fullScale, scale };
    pivot.position.y = height / 2 - center;
    pivot.scale.setScalar(scale);
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.55));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.fov = MathUtils.radToDeg(2 * Math.atan(height / (2 * perspective)));
    camera.updateProjectionMatrix();
    scene.updateMatrixWorld(true);
    water.resize(width, height);
    sceneDirty = true;
    schedule();
  }

  zoom.onChange = () => {
    if (!layout) return;
    layout.scale = layout.fullScale * zoom.factor;
    layout.center = layout.height * (layout.width <= 640 ? .598 - .06 * zoom.reveal : .516);
    pivot.position.y = layout.height / 2 - layout.center;
    pivot.scale.setScalar(layout.scale);
    scene.updateMatrixWorld(true);
    sceneDirty = true;
    schedule();
  };

  function surfaceAt(x, y) {
    ndc.set(2 * x / layout.width - 1, 1 - 2 * y / layout.height);
    raycaster.setFromCamera(ndc, camera);
    return raycaster.intersectObject(sculpture, false)[0];
  }

  function surfaceAtClient(clientX, clientY) {
    const bounds = element.getBoundingClientRect();
    return surfaceAt(clientX - bounds.left, clientY - bounds.top);
  }

  canvas.addEventListener("sculpture-hit-test", event => {
    const { x, y } = event.detail;
    if (layout && !lost && surfaceAtClient(x, y)) event.preventDefault();
  });

  function stopGrowing(time) {
    if (!activeVine) return;
    updateVine(activeVine, time);
    activeVine.pause = time;
    activeVine = null;
    sceneDirty = true;
  }

  function move(event) {
    if (!layout || lost) return;
    const rearCard = event.target.closest(".preview-slide[data-rear]");
    if (event.target.closest("a, .preview-slide, .preview-controls")
      && !(rearCard && surfaceAtClient(event.clientX, event.clientY))) {
      leave();
      return;
    }
    const bounds = element.getBoundingClientRect();
    const x = event.clientX - bounds.left;
    const y = event.clientY - bounds.top;
    const now = performance.now();
    if (!pointer || Math.hypot(pointer.anchorX - x, pointer.anchorY - y) > dwellRadius) {
      stopGrowing(now);
      pointer = { x, y, anchorX: x, anchorY: y, from: now };
    } else {
      pointer.x = x;
      pointer.y = y;
    }
    if (!motionPreference.matches && !surfaceAt(x, y)) water.release(x, y, now);
    schedule();
  }

  function leave() {
    const now = performance.now();
    stopGrowing(now);
    pointer = null;
    lastHit = -Infinity;
    schedule();
  }

  function moveSculpture(time, elapsed, hovered) {
    const rotation = pivot.rotation;
    if (motionPreference.matches) {
      rotation.set(0, 0, 0);
      returning = null;
      wasHovering = false;
      return false;
    }
    if (hovered) {
      const x = (pointer.x - layout.width / 2) / (layout.scale * 1.02);
      const y = (pointer.y - layout.center) / (layout.scale * .85);
      const limit = tiltLimit / Math.max(1, Math.hypot(x, y));
      const smoothing = 1 - Math.exp(-elapsed / 72);
      rotation.x += (-y * limit - rotation.x) * smoothing;
      rotation.y += (x * limit - rotation.y) * smoothing;
      returning = null;
      wasHovering = true;
      return Math.abs(rotation.x + y * limit) + Math.abs(rotation.y - x * limit) > .00035;
    }
    if (wasHovering) {
      returning = { start: time, x: rotation.x, y: rotation.y };
      wasHovering = false;
    }
    if (!returning) return false;
    const progress = Math.min(1, (time - returning.start) / returnTime);
    const amount = 1 - progress * progress * (3 - 2 * progress);
    rotation.x = returning.x * amount;
    rotation.y = returning.y * amount;
    if (progress === 1) returning = null;
    return Boolean(returning);
  }

  function draw(time) {
    frame = 0;
    if (!inView || !layout || lost) return;
    const elapsed = lastTime ? Math.min(48, time - lastTime) : 16;
    lastTime = time;
    const hit = pointer ? surfaceAt(pointer.x, pointer.y) : null;
    if (hit) lastHit = time;
    const hovered = Boolean(pointer && time - lastHit < 70);
    const beforeX = pivot.rotation.x, beforeY = pivot.rotation.y;
    const tilting = moveSculpture(time, elapsed, hovered);
    scene.updateMatrixWorld(true);

    if (pointer && !hovered && activeVine) stopGrowing(time);
    if (pointer && !activeVine && hit && time - pointer.from >= sproutDelay) {
      const preciseHit = surfaceAt(pointer.x, pointer.y);
      if (preciseHit) {
        const root = pivot.worldToLocal(preciseHit.point.clone());
        const normal = new Vector3().copy(preciseHit.normal ?? preciseHit.face.normal).normalize();
        if (normal.z < -.12) normal.negate();
        activeVine = sproutVine(root, normal, geometry, preciseHit.faceIndex, pivot, time);
        vines.push(activeVine);
      }
    }

    let plantsMoving = false;
    let wakeAt = Infinity;
    for (let index = vines.length - 1; index >= 0; index--) {
      const vine = vines[index];
      if (vine.pause !== null && time < vine.pause + lingerTime) {
        wakeAt = Math.min(wakeAt, vine.pause + lingerTime);
        continue;
      }
      if (vine.pause === null && vine.progress === 1) continue;
      sceneDirty = true;
      if (!updateVine(vine, time)) {
        removeVine(vine);
        vines.splice(index, 1);
      } else if (vine.pause !== null || vine.progress < 1) {
        plantsMoving = true;
      }
    }
    water.draw(time);
    if (sceneDirty || beforeX !== pivot.rotation.x || beforeY !== pivot.rotation.y) {
      renderer.render(scene, camera);
      element.dataset.sculpture = "ready";
      sceneDirty = false;
    }
    if (tilting || plantsMoving || water.active || (hovered && !activeVine) || (wasHovering && !hit)) {
      schedule();
    } else if (Number.isFinite(wakeAt)) {
      wakeTimer = setTimeout(schedule, Math.max(0, wakeAt - performance.now()));
    }
  }

  element.addEventListener("pointermove", event => {
    if (event.pointerType !== "touch" || pointer) move(event);
  }, { passive: true });
  element.addEventListener("pointerdown", event => {
    if (event.pointerType === "touch") move(event);
  }, { passive: true });
  element.addEventListener("pointerup", event => {
    if (event.pointerType === "touch") leave();
  });
  element.addEventListener("pointerleave", leave);
  element.addEventListener("pointercancel", leave);
  window.addEventListener("scroll", leave, { passive: true });
  motionPreference.addEventListener("change", schedule);
  canvas.addEventListener("webglcontextlost", event => {
    event.preventDefault();
    lost = true;
    delete element.dataset.sculpture;
  });
  canvas.addEventListener("webglcontextrestored", () => {
    lost = false;
    sceneDirty = true;
    schedule();
  });

  new ResizeObserver(resize).observe(element);
  new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    if (inView) schedule();
    else {
      leave();
      lastTime = 0;
    }
  }).observe(element);
  resize();
}

const showcase = document.querySelector("#sculpture-scene");
if (showcase) mountSculpture(showcase).catch(error => console.warn("Showing the sculpture render.", error));
