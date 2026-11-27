import {
  BufferAttribute, BufferGeometry, CanvasTexture, CatmullRomCurve3, DoubleSide, Group, Mesh,
  MeshPhysicalMaterial, Ray, SRGBColorSpace, TubeGeometry, Vector3
} from "three";
import { growGarden, plantGarden, removeGarden } from "./garden.js";
import { createMoss, removeMoss, updateMoss } from "./moss.js";

export const lingerTime = 3000;
const timeToGrow = 5350;
const timeToRetract = 1720;
const segments = 128;
const sides = 8;
const up = new Vector3(0, 1, 0);
const down = new Vector3(0, -1, 0);
const front = new Vector3(0, 0, -1);
const stemMaterial = new MeshPhysicalMaterial({ color: 0x51642e, roughness: .71, clearcoat: .13 });
const petioleMaterial = new MeshPhysicalMaterial({ color: 0x687841, roughness: .67 });
const leafMap = paintLeaf();
const leafMaterials = [0xe2ebce, 0xc3d4ae, 0xf0f0ca, 0xa7c6a2].map(color => new MeshPhysicalMaterial({
  color, map: leafMap, side: DoubleSide, roughness: .57, clearcoat: .18, clearcoatRoughness: .52
}));
const tipMaterial = new MeshPhysicalMaterial({
  color: 0xe0eeaa, map: leafMap, side: DoubleSide, roughness: .52
});
const leafShape = buildLeaf();
const petioleShape = new TubeGeometry(new CatmullRomCurve3([
  new Vector3(), new Vector3(-.022, .095, .09), new Vector3(-.034, .22, .11), new Vector3(0, .32, .075)
]), 9, .022, 6, false);

function paintLeaf() {
  const canvas = document.createElement("canvas");
  const size = 224;
  canvas.width = canvas.height = size;
  const context = canvas.getContext("2d");
  const base = context.createLinearGradient(.15 * size, .04 * size, .88 * size, .89 * size);
  base.addColorStop(0, "#49652d");
  base.addColorStop(.39, "#7a8e48");
  base.addColorStop(.71, "#586c36");
  base.addColorStop(1, "#394e29");
  context.fillStyle = base;
  context.fillRect(0, 0, size, size);

  for (let i = 0; i < 12500; i++) {
    const x = (i * 37.618 + Math.sin(i) * 47 + size) % size;
    const y = (i * 83.534 + Math.cos(i) * 23 + size) % size;
    context.fillStyle = i % 3 ? "rgba(222,233,159,.048)" : "rgba(25,47,22,.105)";
    context.fillRect(x, y, .7 + i % 5 * .19, .7 + i % 3 * .2);
  }

  const center = size / 2;
  context.lineCap = "round";
  for (const side of [-1, 1]) {
    for (let index = 0; index < 6; index++) {
      const y = size * (.86 - index * .116 + side * .012);
      const reach = size * (.40 - index * .014);
      context.beginPath();
      context.moveTo(center, y);
      context.bezierCurveTo(center + side * reach * .53, y - size * .015,
        center + side * reach * .79, y - size * .087, center + side * reach, y - size * .164);
      context.strokeStyle = "rgba(207,219,147,.62)";
      context.lineWidth = 1.9 - index * .16;
      context.stroke();
      for (let fork = 1; fork <= 3; fork++) {
        const x = center + side * reach * fork / 4;
        const mid = y - size * .146 * (fork / 4) ** 1.6;
        context.beginPath();
        context.moveTo(x, mid);
        context.quadraticCurveTo(x + side * size * .075, mid - size * .033,
          x + side * size * .108, mid - size * .074);
        context.strokeStyle = "rgba(204,219,158,.27)";
        context.lineWidth = .78;
        context.stroke();
      }
    }
  }
  context.beginPath();
  context.moveTo(center, size);
  context.lineTo(center, 0);
  context.strokeStyle = "rgba(207,222,149,.78)";
  context.lineWidth = 2.8;
  context.stroke();
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function buildLeaf() {
  const points = [];
  const uv = [];
  const faces = [];
  const rows = 26;
  const columns = 18;

  for (let row = 0; row <= rows; row++) {
    const length = row / rows;
    const width = Math.max(.004, Math.sin(Math.PI * length ** .68) ** .9 * (1.12 - .53 * length));
    for (let column = 0; column <= columns; column++) {
      const across = column / columns * 2 - 1;
      const lobe = .135 * Math.sin(Math.PI * length ** .6) * across ** 2 * (1 - length) ** 3;
      const margin = 1 + .05 * Math.sin(length * 47 + across * 4) * across ** 2;
      const ridge = Math.exp(-63 * across ** 2) * .028 * Math.sin(Math.PI * length);
      const fold = .17 * Math.sin(length * Math.PI) * (1 - across ** 2) + .14 * length ** 2;
      const ripple = .077 * width * across ** 2 * Math.sin(12 * length + across * 2);
      points.push(across * width * .58 * margin + .104 * length ** 2, length - lobe,
        fold + ridge + ripple + .095 * across * length);
      uv.push(.5 + across * .5, length);

      if (row && column) {
        const i = row * (columns + 1) + column;
        faces.push(i-columns-2, i-columns-1, i, i-columns-2, i, i-1);
      }
    }
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(new Float32Array(points), 3));
  geometry.setAttribute("uv", new BufferAttribute(new Float32Array(uv), 2));
  geometry.setIndex(faces);
  geometry.computeVertexNormals();
  return geometry;
}

function hangingCurve(root, normal, tree, gravity, seed) {
  const length = Math.min(1.28, Math.max(.34, .71 + root.y * .61));
  const direction = seed > .5 ? 1 : -1;
  const points = [root.clone().addScaledVector(normal, .004)];
  const ray = new Ray(new Vector3(), front);
  for (let index = 1; index <= 45; index++) {
    const t = index / 45;
    const surfaceWeight = 1 - Math.exp(-t * 20);
    const reach = (.033 + Math.sin(t * Math.PI) * .061) * surfaceWeight;
    const curl = (Math.sin(t * 10.7 + seed * 3.4) + Math.sin(t * 4.6) * .46) * (.018 + .034 * t) * surfaceWeight;
    const fall = length * t ** 1.23 - Math.sin(Math.PI * Math.min(t * 4.3, 1)) * .026;
    const point = root.clone().addScaledVector(normal, reach).addScaledVector(gravity, fall);
    point.x += direction * (.071 * surfaceWeight + curl);
    ray.origin.set(point.x, point.y, 3);
    const surface = tree.raycastFirst(ray, DoubleSide);
    const clearance = .026 + Math.sin(t * Math.PI) * .036;
    if (surface) point.z = Math.max(point.z, surface.point.z + clearance);
    const previous = points[points.length - 1];
    point.z = Math.max(point.z, previous.z - .062);
    points.push(point);
  }

  return new CatmullRomCurve3(points, false, "centripetal");
}

export function sproutVine(root, normal, geometry, faceIndex, pivot, time) {
  const seed = Math.random();
  const gravity = down.clone().applyQuaternion(pivot.quaternion.clone().invert());
  const curve = hangingCurve(root, normal, geometry.boundsTree, gravity, seed);
  const group = new Group();
  const moss = createMoss(geometry, root, faceIndex, seed);
  group.add(moss.group);
  const stemGeometry = new TubeGeometry(curve, segments, .007, sides, false);
  const vertices = stemGeometry.getAttribute("position");
  const point = new Vector3();
  for (let row = 0; row <= segments; row++) {
    const t = row / segments;
    const center = curve.getPointAt(t);
    for (let side = 0; side <= sides; side++) {
      const index = row * (sides + 1) + side;
      point.fromBufferAttribute(vertices, index).lerp(center, .72 * t ** 1.55);
      vertices.setXYZ(index, point.x, point.y, point.z);
    }
  }
  stemGeometry.computeVertexNormals();
  const stem = new Mesh(stemGeometry, stemMaterial);
  stem.castShadow = true;
  stemGeometry.setDrawRange(0, 0);
  group.add(stem);

  const bud = new Group();
  for (const side of [-1, 1]) {
    const blade = new Mesh(leafShape, tipMaterial);
    blade.rotation.set(.37 * side, .87 * side, .28 * side);
    blade.scale.set(.32, side === 1 ? .88 : .62, .5);
    bud.add(blade);
  }
  group.add(bud);
  bud.visible = false;

  const leaves = [];
  const leafCount = Math.max(5, Math.round(curve.getLength() * 11));
  for (let index = 0; index < leafCount; index++) {
    const variation = Math.sin(seed * 9 + index * 4.3);
    const t = .06 + (index + variation * .24) / leafCount * .88;
    const side = index % 2 === 0 ? -1 : 1;
    const orient = Math.sin(seed * 7 + index * 2.4);
    const branch = new Group();
    const petiole = new Mesh(petioleShape, petioleMaterial);
    const leaf = new Mesh(leafShape, leafMaterials[(index + Math.floor(seed * 4)) % leafMaterials.length]);
    branch.position.copy(curve.getPointAt(t));
    branch.rotation.set(.22 + .32 * orient, side * (.29 + .46 * variation), side * (1.7 + .39 * orient));
    leaf.position.set(0, .32, .075);
    leaf.rotation.set(-.34 + .37 * variation, .33 * orient, side * (.34 + .26 * orient));
    leaf.scale.set(.91 + .23 * variation, .83 + .21 * Math.abs(orient), 1);
    leaf.castShadow = true;
    leaf.receiveShadow = true;
    petiole.castShadow = true;
    branch.add(petiole, leaf);
    branch.visible = false;
    group.add(branch);
    leaves.push({ node: branch, t, size: (.098 + .046 * Math.abs(orient)) * (1 - t * .4) });
  }

  const garden = plantGarden(group, root, normal, geometry, moss, seed, leafShape, leafMaterials[1]);
  pivot.add(group);
  return { group, stem, bud, leaves, curve, moss, garden, start: time, pause: null, progress: 0 };
}

export function updateVine(vine, time) {
  let progress;
  if (vine.pause === null) {
    const age = Math.max(0, time - vine.start);
    progress = 1 - (1 - Math.min(1, age / timeToGrow)) ** 1.32;
    vine.progress = progress;
  } else {
    const retract = Math.max(0, Math.min(1, (time - vine.pause - lingerTime) / timeToRetract));
    const smooth = retract * retract * (3 - 2 * retract);
    progress = vine.progress * (1 - smooth);
    if (retract >= 1) return false;
  }
  const revealedSegments = Math.floor(progress * segments);
  updateMoss(vine.moss, progress);
  growGarden(vine.garden, progress, vine.moss.reach.value);
  vine.stem.geometry.setDrawRange(0, revealedSegments * sides * 6);
  vine.bud.visible = progress > .005;
  if (vine.bud.visible) {
    vine.bud.position.copy(vine.curve.getPointAt(progress));
    vine.bud.quaternion.setFromUnitVectors(up, vine.curve.getTangentAt(progress));
    vine.bud.scale.setScalar(.04 * Math.min(1, progress * 10) * (1 - .37 * progress));
  }
  for (const { node, t, size } of vine.leaves) {
    const growth = Math.max(0, Math.min(1, (progress - t) / .10));
    node.visible = growth > 0;
    node.scale.setScalar(size * growth * growth * (3 - 2 * growth));
  }
  return true;
}

export function removeVine(vine) {
  vine.group.removeFromParent();
  vine.stem.geometry.dispose();
  removeGarden(vine.garden);
  removeMoss(vine.moss);
}
