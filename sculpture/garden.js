// Smaller plants and pollinators are built in the sculpture's local coordinates.
import {
  BufferAttribute, BufferGeometry, CanvasTexture, CatmullRomCurve3, Color, CylinderGeometry, DoubleSide, Group,
  InstancedMesh, MathUtils, Mesh, MeshStandardMaterial, Object3D, Quaternion, Ray, Shape,
  ShapeGeometry, SphereGeometry, SRGBColorSpace, TubeGeometry, Vector3
} from "three";
import { getTriangleHitPointInfo } from "three-mesh-bvh";

const right = new Vector3(1, 0, 0);
const up = new Vector3(0, 1, 0);
const pose = new Object3D();
const segments = 60, sides = 5;
const stalkShape = new CylinderGeometry(.0025, .0035, 1, 5).translate(0, .5, 0);
const frontRay = new Ray(new Vector3(), new Vector3(0, 0, -1));
const stalkMaterial = new MeshStandardMaterial({ color: 0x526c3c, roughness: .78 });
const bloomMaterial = new MeshStandardMaterial({ vertexColors: true, side: DoubleSide, roughness: .76 });

function flowerGeometry(base, rim) {
  const xyz = [], rgb = [], faces = [];
  const heart = new Color(base), edge = new Color(rim), gold = new Color(0xe2a041);
  function vertex(x, y, z, color) {
    xyz.push(x, y, z);
    rgb.push(color.r, color.g, color.b);
  }
  for (let petal = 0; petal < 5; petal++) {
    const a = petal * Math.PI * .4;
    const start = xyz.length / 3;
    for (let row = 0; row <= 7; row++) {
      const t = row / 7;
      for (let col = 0; col <= 4; col++) {
        const u = (col - 2) / 2;
        const length = .12 + .88 * t - .1 * u * u * t;
        const width = .395 * Math.sin(Math.PI * t ** 1.35) ** .48 * u;
        vertex(length * Math.cos(a) - width * Math.sin(a), length * Math.sin(a) + width * Math.cos(a),
          .30 * t * t + .12 * u * u * t, heart.clone().lerp(edge, .14 + .78 * t + .08 * Math.abs(u)));
        if (row && col) {
          const i = start + row * 5 + col;
          faces.push(i - 6, i - 1, i, i - 6, i, i - 5);
        }
      }
    }
  }
  const center = xyz.length / 3;
  vertex(0, 0, .23, gold);
  for (let i = 0; i < 12; i++) {
    const a = i * Math.PI / 6;
    vertex(.225 * Math.cos(a), .225 * Math.sin(a), .055, gold);
    faces.push(center, center + 1 + i, center + 1 + (i + 1) % 12);
  }
  const shape = new BufferGeometry();
  shape.setAttribute("position", new BufferAttribute(new Float32Array(xyz), 3));
  shape.setAttribute("color", new BufferAttribute(new Float32Array(rgb), 3));
  shape.setIndex(faces);
  shape.computeVertexNormals();
  return shape;
}

const flowerShapes = [flowerGeometry(0xa13d67, 0xf5adc4), flowerGeometry(0xb47637, 0xffde97)];

// Step in the local tangent plane, project back onto the mesh and transport the
// heading over the fold. Both runners stay attached as the porcelain tilts.
function traceRunner(root, normal, geometry, side, seed) {
  const n = normal.clone();
  const heading = (Math.abs(n.x) > .88 ? up : right).clone().projectOnPlane(n).normalize().multiplyScalar(side);
  heading.applyAxisAngle(n, side * .27 + seed * .22);
  const point = root.clone(), guess = new Vector3(), turn = new Quaternion();
  const closest = { point: new Vector3() }, tri = {};
  const knots = [root.clone().addScaledVector(n, .008)];
  for (let i = 1; i <= 34; i++) {
    const t = i / 34;
    const bend = side * (.054 * Math.sin(7 * t + seed * 2) + .11 * MathUtils.smoothstep(t, .65, .92));
    heading.applyAxisAngle(n, bend);
    guess.copy(point).addScaledVector(heading, side > 0 ? .021 : .018);
    geometry.boundsTree.closestPointToPoint(guess, closest);
    getTriangleHitPointInfo(closest.point, geometry, closest.faceIndex, tri);
    const next = tri.face.normal;
    if (next.dot(n) < 0) next.negate();
    turn.setFromUnitVectors(n, next);
    heading.applyQuaternion(turn);
    n.copy(next);
    point.copy(closest.point);
    knots.push(point.clone().addScaledVector(n, .012 + .004 * Math.sin(t * Math.PI)));
  }
  return new CatmullRomCurve3(knots, false, "centripetal");
}

function wingGeometry() {
  const outline = new Shape();
  outline.moveTo(0, .06);
  outline.bezierCurveTo(.09, .24, .35, .44, .49, .40);
  outline.bezierCurveTo(.54, .18, .40, -.01, .26, -.055);
  outline.bezierCurveTo(.46, -.15, .34, -.33, .20, -.34);
  outline.bezierCurveTo(.09, -.34, .025, -.16, 0, -.035);
  outline.closePath();
  const geom = new ShapeGeometry(outline, 10);
  const uv = geom.attributes.uv, pos = geom.attributes.position;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i) / .55, (pos.getY(i) + .36) / .82);
  return geom;
}

function wingPaint(color) {
  const tile = document.createElement("canvas");
  tile.width = tile.height = 96;
  const ctx = tile.getContext("2d");
  const wash = ctx.createRadialGradient(16, 48, 3, 18, 48, 76);
  wash.addColorStop(0, "#6a5d4f");
  wash.addColorStop(.35, color);
  wash.addColorStop(.74, color);
  wash.addColorStop(.9, "#605b58");
  wash.addColorStop(1, "#3e403b");
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, 96, 96);
  ctx.lineWidth = 1.1;
  ctx.strokeStyle = "#4a433a88";
  for (const [x, y] of [[79,9],[88,22],[78,35],[55,51],[65,72],[46,84]]) {
    ctx.beginPath(); ctx.moveTo(3,46); ctx.quadraticCurveTo(x * .5, 44, x, y); ctx.stroke();
    ctx.fillStyle = "#f6ecdc"; ctx.beginPath(); ctx.ellipse(x,y,2.5,1.6,-.6,0,2*Math.PI); ctx.fill();
  }
  const texture = new CanvasTexture(tile);
  texture.colorSpace = SRGBColorSpace;
  return new MeshStandardMaterial({ map: texture, side: DoubleSide, roughness:.88 });
}

const wingShape = wingGeometry();
const wingMaterials = [wingPaint("#e2af64"), wingPaint("#9dbfd2")];
const bodyShape = new SphereGeometry(1, 8, 5);
const bodyMaterial = new MeshStandardMaterial({ color:0x443e36, roughness:.8 });

function butterfly(index, anchor, seed) {
  const node = new Group();
  const body = new Mesh(bodyShape, bodyMaterial);
  body.scale.set(.033, .24, .042);
  const left = new Mesh(wingShape, wingMaterials[index]);
  const rightWing = new Mesh(wingShape, wingMaterials[index]);
  left.scale.x = -1;
  node.add(body, left, rightWing);
  node.visible = false;
  return { node, left, rightWing, anchor, phase: seed * 6 + index * 2.5, index };
}

function instanced(shape, material, count) {
  const batch = new InstancedMesh(shape, material, count);
  // Matrices change as buds open, so a bound computed at their initial zero scale is stale.
  batch.frustumCulled = false;
  return batch;
}

function plantFlowers(moss, seed, geometry) {
  const patches = [], insects = [];
  // Flower roots coincide with fronds. Their stems emerge only after the moss has reached them.
  const group = new Group();
  moss.group.add(group);
  for (let index = 0; index < flowerShapes.length; index++) {
    const sites = moss.flowerSites.filter((_, i) => i % 2 === index);
    if (!sites.length) continue;
    const stalks = instanced(stalkShape, stalkMaterial, sites.length);
    const flowers = instanced(flowerShapes[index], bloomMaterial, sites.length);
    const blooms = sites.map(({ position: base, normal, start }, i) => {
      const angle = seed * Math.PI + i * 2.4 + index;
      const axis = normal.clone().multiplyScalar(.62).addScaledVector(up, .43);
      axis.z += .32;
      axis.x += .18 * Math.cos(angle);
      axis.normalize();
      const length = .030 + (i % 3) * .009;
      const point = base.clone().addScaledVector(axis, length);
      return { base, point, length, rotation: new Quaternion().setFromUnitVectors(up, axis),
        angle, at: start + .027, size: .021 + (i % 3) * .004 };
    });
    const first = blooms.reduce((a, b) => a.at < b.at ? a : b);
    const anchor = first.point.clone();
    for (const [dx, dy] of [[0, 0], [-.08, .04], [.08, .04], [0, .11]]) {
      frontRay.origin.set(anchor.x + dx, anchor.y + dy, 3);
      const surface = geometry.boundsTree.raycastFirst(frontRay, DoubleSide);
      if (surface) anchor.z = Math.max(anchor.z, surface.point.z + .025);
    }
    const insect = butterfly(index, anchor, seed);
    insect.arrival = Math.max(first.at + .022, .105 + index * .040);
    insects.push(insect);
    group.add(stalks, flowers, insect.node);
    patches.push({ stalks, flowers, blooms });
  }
  return { group, patches, insects };
}

export function plantGarden(group, root, normal, geometry, moss, seed, leafShape, leafMaterial) {
  const garden = plantFlowers(moss, seed, geometry);
  const runners = [];
  for (const [index, side] of [-1, 1].entries()) {
    const curve = traceRunner(root, normal, geometry, side, seed);
    const stem = new Mesh(new TubeGeometry(curve, segments, .0048, sides, false), stalkMaterial);
    stem.geometry.setDrawRange(0, 0);
    const foliage = instanced(leafShape, leafMaterial, 7);
    const leaves = [];
    for (let i = 0; i < foliage.count; i++) {
      const t = .12 + i * .13;
      const tangent = curve.getTangentAt(t);
      const angle = Math.atan2(tangent.y, tangent.x) - Math.PI / 2 + (i % 2 ? 1 : -1) * .87;
      leaves.push({ point: curve.getPointAt(t), angle, t });
    }
    group.add(stem, foliage);
    runners.push({ stem, foliage, leaves, delay: .06 + .09 * index });
  }
  return { ...garden, runners };
}

export function growGarden(garden, progress, mossReach) {
  for (const { stem, foliage, leaves, delay } of garden.runners) {
    const extension = MathUtils.smoothstep(progress, delay, .88 + delay * .7);
    stem.geometry.setDrawRange(0, Math.floor(extension * segments) * sides * 6);
    leaves.forEach(({ point, angle, t }, i) => {
      const size = .079 * MathUtils.smoothstep(extension, t, t + .095);
      pose.position.copy(point);
      pose.rotation.set(.46, -.22 * Math.sin(i), angle);
      pose.scale.set(size * .74, size, size);
      pose.updateMatrix();
      foliage.setMatrixAt(i, pose.matrix);
    });
    foliage.instanceMatrix.needsUpdate = true;
  }
  for (const { flowers, stalks, blooms } of garden.patches) {
    blooms.forEach(({ base, point, rotation, length, size, angle, at }, i) => {
      const reach = MathUtils.smoothstep(mossReach, at, at + .023);
      pose.position.copy(base);
      pose.quaternion.copy(rotation);
      pose.scale.set(1, length * reach, 1);
      pose.updateMatrix();
      stalks.setMatrixAt(i, pose.matrix);
      const opening = MathUtils.smoothstep(mossReach, at + .012, at + .047);
      pose.position.lerp(point, reach);
      pose.rotation.set(.28 * Math.sin(angle), .38 * Math.cos(angle), angle + .35 * opening);
      pose.scale.setScalar(size * opening);
      pose.updateMatrix();
      flowers.setMatrixAt(i, pose.matrix);
    });
    stalks.instanceMatrix.needsUpdate = true;
    flowers.instanceMatrix.needsUpdate = true;
  }
}

export function flyButterflies(vine, time) {
  const seconds = (time - vine.start) / 1000;
  const departure = vine.pause === null ? 0 : MathUtils.smoothstep(time - vine.pause, 0, 850);
  let changed = false;
  for (const { node, left, rightWing, anchor, phase, index, arrival } of vine.garden.insects) {
    const amount = MathUtils.smoothstep(vine.moss.reach.value, arrival, arrival + .035) * (1 - departure);
    changed ||= node.visible || amount > 0;
    node.visible = amount > 0;
    if (!node.visible) continue;
    const a = seconds * (1.48 + .15 * index) + phase;
    const hover = .5 + .5 * Math.sin(a * .63);
    const radius = .022 + hover * .085;
    node.position.copy(anchor);
    node.position.x += radius * Math.cos(a) + departure * (index ? .08 : -.08);
    node.position.y += .045 + radius * .65 * Math.sin(a * 1.7) + departure * .12;
    node.position.z += .066 + hover * .05 + .02 * Math.sin(a * 1.3);
    node.scale.setScalar((index ? .044 : .052) * amount);
    node.rotation.set(.30 + .18 * Math.sin(a), .22 * Math.cos(a * 1.3), -.74 * Math.sin(a));
    const flap = .16 + .98 * (.5 + .5 * Math.sin(seconds * (29 + 2 * index) + phase));
    left.rotation.y = flap;
    rightWing.rotation.y = -flap;
  }
  return changed;
}

export function removeGarden(garden) {
  garden.group.removeFromParent();
  for (const { stem, foliage } of garden.runners) {
    stem.geometry.dispose();
    foliage.dispose();
  }
  for (const { stalks, flowers } of garden.patches) {
    stalks.dispose();
    flowers.dispose();
  }
}
