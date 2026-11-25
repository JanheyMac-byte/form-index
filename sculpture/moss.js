import {
  BufferAttribute, BufferGeometry, Color, DoubleSide, Group, InstancedBufferAttribute,
  InstancedMesh, MathUtils, Mesh, MeshStandardMaterial, Object3D, Vector3
} from "three";

const radius = .26;
const rootLift = .0016;
const up = new Vector3(0, 1, 0);
const greenPores = new Color("#344227");
const greenTips = new Color("#818a48");

function surfaceWithin(geometry, root, faceIndex) {
  const points = new Map();
  const faces = [];
  const positions = geometry.getAttribute("position");
  const normals = geometry.getAttribute("normal");
  let start;

  function vertex(index) {
    const x = positions.getX(index), y = positions.getY(index), z = positions.getZ(index);
    const key = [x, y, z].map(value => Math.round(value * 32767)).join(",");
    if (!points.has(key)) {
      points.set(key, {
        position: new Vector3(x, y, z),
        normal: new Vector3().fromBufferAttribute(normals, index).normalize(),
        links: new Map(),
        distance: Infinity
      });
    }
    return points.get(key);
  }

  geometry.boundsTree.shapecast({
    intersectsBounds: bounds => bounds.distanceToPoint(root) <= radius + .034,
    intersectsTriangle(triangle, index) {
      const offset = index * 3;
      const face = [vertex(geometry.index.getX(offset)), vertex(geometry.index.getX(offset + 1)),
        vertex(geometry.index.getX(offset + 2))];
      for (let i = 0; i < 3; i++) {
        const a = face[i];
        const b = face[(i + 1) % 3];
        if (a === b || a.links.has(b)) continue;
        const length = a.position.distanceTo(b.position);
        a.links.set(b, length);
        b.links.set(a, length);
      }
      faces.push(face);
      if (index === faceIndex) start = face;
      return false;
    }
  });
  if (!start) return [];

  // Measure distance along connected mesh edges so the growth cannot jump over a fold.
  const interval = .006;
  const limit = radius + .018;
  const bands = Array.from({ length: Math.floor(limit / interval) + 1 }, () => []);
  function reach(vertex, distance) {
    if (distance >= vertex.distance || distance > limit) return;
    vertex.distance = distance;
    bands[Math.floor(distance / interval)].push(vertex);
  }
  for (const vertex of start) reach(vertex, vertex.position.distanceTo(root));
  for (let index = 0; index < bands.length; index++) {
    for (const vertex of bands[index]) {
      if (Math.floor(vertex.distance / interval) !== index) continue;
      for (const [neighbor, length] of vertex.links) reach(neighbor, vertex.distance + length);
    }
  }
  return faces.filter(face => face.some(vertex => vertex.distance <= limit));
}

function mossGround(faces, reach) {
  const positions = [];
  const normals = [];
  const distances = [];
  for (const face of faces) {
    for (const vertex of face) {
      const { position, normal, distance } = vertex;
      positions.push(position.x + normal.x * rootLift, position.y + normal.y * rootLift, position.z + normal.z * rootLift);
      normals.push(normal.x, normal.y, normal.z);
      distances.push(Math.min(distance, radius + .04));
    }
  }
  const surface = new BufferGeometry();
  surface.setAttribute("position", new BufferAttribute(new Float32Array(positions), 3));
  surface.setAttribute("normal", new BufferAttribute(new Float32Array(normals), 3));
  surface.setAttribute("mossDistance", new BufferAttribute(new Float32Array(distances), 1));
  const material = new MeshStandardMaterial({ roughness: .97, envMapIntensity: .48, polygonOffset: true, polygonOffsetFactor: -1 });
  material.onBeforeCompile = shader => {
    shader.uniforms.mossReach = reach;
    shader.uniforms.mossDark = { value: greenPores };
    shader.uniforms.mossLight = { value: greenTips };
    shader.vertexShader = `
      attribute float mossDistance;
      varying float vMossDistance;
      varying vec3 vMossPosition;
    ` + shader.vertexShader.replace("#include <begin_vertex>", `
      #include <begin_vertex>
      vMossDistance = mossDistance;
      vMossPosition = position;
    `);
    shader.fragmentShader = `
      uniform float mossReach;
      uniform vec3 mossDark;
      uniform vec3 mossLight;
      varying float vMossDistance;
      varying vec3 vMossPosition;
      float mossHash(vec3 p) {
        p = fract(p * vec3(.1031, .1030, .0973));
        p += dot(p, p.yxz + 33.33);
        return fract((p.x + p.y) * p.z);
      }
      float mossNoise(vec3 p) {
        vec3 i = floor(p);
        vec3 t = fract(p);
        t = t * t * (3.0 - 2.0 * t);
        return mix(
          mix(mix(mossHash(i), mossHash(i + vec3(1,0,0)), t.x),
              mix(mossHash(i + vec3(0,1,0)), mossHash(i + vec3(1,1,0)), t.x), t.y),
          mix(mix(mossHash(i + vec3(0,0,1)), mossHash(i + vec3(1,0,1)), t.x),
              mix(mossHash(i + vec3(0,1,1)), mossHash(i + vec3(1,1,1)), t.x), t.y), t.z);
      }
    ` + shader.fragmentShader.replace("#include <color_fragment>", `
      #include <color_fragment>
      float pockets = mossNoise(vMossPosition * 44.0);
      float fuzz = mossNoise(vMossPosition * 175.0);
      float rim = (pockets - .52) * .063 + (fuzz - .5) * .018;
      float age = mossReach - vMossDistance + rim;
      if (age < .001 || pockets * .78 + fuzz * .22 < mix(.57, .25, smoothstep(0., .085, age))) discard;
      diffuseColor.rgb = mix(mossDark, mossLight, clamp(pockets * .68 + fuzz * .58 - .12, 0., 1.));
    `);
  };
  const mesh = new Mesh(surface, material);
  mesh.receiveShadow = true;
  return mesh;
}

function frondShape() {
  const positions = [];
  const colors = [];
  for (let i = 0; i < 6; i++) {
    const angle = i * 2.399963;
    const x = Math.cos(angle), z = Math.sin(angle);
    const length = .43 + (i % 3) * .24;
    const bend = .19 + (i % 4) * .14;
    positions.push(0, 0, 0,
      x * bend * .5 + z * .15, length * .55, z * bend * .5 - x * .15,
      x * bend, length, z * bend,
      0, 0, 0,
      x * bend, length, z * bend,
      x * bend * .5 - z * .12, length * .58, z * bend * .5 + x * .12);
    for (const brightness of [.46, .75, 1, .49, 1, .83]) colors.push(brightness, brightness, brightness * .92);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(new Float32Array(positions), 3));
  geometry.setAttribute("color", new BufferAttribute(new Float32Array(colors), 3));
  geometry.computeVertexNormals();
  return geometry;
}

function mossFronds(faces, reach, seed) {
  let randomState = Math.floor(seed * 0xffffffff);
  const random = () => ((randomState = (Math.imul(1664525, randomState) + 1013904223) >>> 0) / 0x100000000);
  const tufts = [];
  const edge = new Vector3(), cross = new Vector3();
  for (const [a, b, c] of faces) {
    const area = cross.subVectors(b.position, a.position).cross(edge.subVectors(c.position, a.position)).length() * .5;
    const samples = Math.floor(area * 8400 + random());
    for (let index = 0; index < samples; index++) {
      const ring = Math.sqrt(random()), split = random();
      const wa = 1 - ring, wb = ring * (1 - split), wc = ring * split;
      const distance = wa * Math.min(a.distance, radius + .04)
        + wb * Math.min(b.distance, radius + .04) + wc * Math.min(c.distance, radius + .04);
      const start = Math.max(0, distance + .062 * (random() - .4));
      if (start + .01 >= radius) continue;
      const normal = a.normal.clone().multiplyScalar(wa).addScaledVector(b.normal, wb).addScaledVector(c.normal, wc).normalize();
      const position = a.position.clone().multiplyScalar(wa).addScaledVector(b.position, wb)
        .addScaledVector(c.position, wc).addScaledVector(normal, rootLift);
      tufts.push({ position, normal, start, size: .008 + random() ** 2 * .018 });
    }
  }
  if (!tufts.length) return null;

  const geometry = frondShape();
  geometry.setAttribute("mossStart", new InstancedBufferAttribute(Float32Array.from(tufts, tuft => tuft.start), 1));
  const material = new MeshStandardMaterial({ side: DoubleSide, roughness: .93, vertexColors: true, envMapIntensity: .43 });
  material.onBeforeCompile = shader => {
    shader.uniforms.mossReach = reach;
    shader.vertexShader = "attribute float mossStart; uniform float mossReach;\n" +
      shader.vertexShader.replace("#include <begin_vertex>", `
        #include <begin_vertex>
        transformed *= smoothstep(0., .042, mossReach - mossStart);
      `);
  };
  const plants = new InstancedMesh(geometry, material, tufts.length);
  const pose = new Object3D();
  const color = new Color();
  tufts.forEach((tuft, index) => {
    pose.position.copy(tuft.position);
    pose.quaternion.setFromUnitVectors(up, tuft.normal);
    pose.rotateY(random() * Math.PI * 2);
    pose.scale.set(tuft.size * 1.14, tuft.size, tuft.size * 1.14);
    pose.updateMatrix();
    plants.setMatrixAt(index, pose.matrix);
    plants.setColorAt(index, color.copy(greenPores).lerp(greenTips, .43 + random() * .56));
  });
  plants.instanceMatrix.needsUpdate = true;
  plants.instanceColor.needsUpdate = true;
  return plants;
}

export function createMoss(geometry, root, faceIndex, seed) {
  const faces = surfaceWithin(geometry, root, faceIndex);
  const group = new Group();
  const reach = { value: 0 };
  if (faces.length) {
    group.add(mossGround(faces, reach));
    const fronds = mossFronds(faces, reach, seed);
    if (fronds) group.add(fronds);
  }
  group.visible = false;
  return { group, reach };
}

export function updateMoss(moss, progress) {
  const growth = MathUtils.clamp((progress - .035) / .965, 0, 1);
  moss.group.visible = growth > 0;
  moss.reach.value = growth ** 1.16 * radius;
}

export function removeMoss(moss) {
  for (const mesh of moss.group.children) {
    mesh.geometry.dispose();
    mesh.material.dispose();
    if (mesh.isInstancedMesh) mesh.dispose();
  }
}
