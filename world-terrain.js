import * as THREE from 'three';

// A quiet piece of landscape, with a level clearing for the existing path.
// The shoreline is shared by the meadow and rock so there are no open seams.
export function createTerrain() {
  const terrain = new THREE.Group();
  terrain.name = 'Meadow and weathered shore';
  const count = 112;
  const rings = 20;
  const floor = .21;
  const tau = Math.PI * 2;
  const color = new THREE.Color();
  const meadowColor = new THREE.Color(0xa2bba6);
  const rockColor = new THREE.Color(0xabb6b3);

  function shoreRadius(a) {
    return 11.7 + .52 * Math.sin(a + .6) + .39 * Math.cos(a * 3 - .5) + .19 * Math.sin(a * 5 + 1.2);
  }

  function rise(x, z) {
    const r = Math.hypot(x, z);
    const margin = THREE.MathUtils.smoothstep(r, 9.85, 11.9);
    // Broad, low rises frame the clearing without turning it into a mountain.
    const north = .58 * Math.exp(-((x + 2) ** 2 / 32 + (z + 10.7) ** 2 / 11));
    const east = .34 * Math.exp(-((x - 10.9) ** 2 / 9 + (z - 1.7) ** 2 / 28));
    return floor + margin * (north + east + .05 * Math.sin(x * .55 + z * .2));
  }

  function geometry(positions, colors, indices) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    g.setIndex(indices);
    g.computeVertexNormals();
    return g;
  }

  function add(g, roughness) {
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({vertexColors: true, roughness}));
    m.receiveShadow = true;
    m.castShadow = true;
    terrain.add(m);
    return m;
  }

  const positions = [0, floor, 0];
  const colors = [...meadowColor.toArray()];
  const indices = [];
  for (let j = 1; j <= rings; j++) {
    const f = j / rings;
    for (let i = 0; i < count; i++) {
      const a = i / count * tau;
      const radius = shoreRadius(a) * f;
      const x = Math.cos(a) * radius;
      const z = Math.sin(a) * radius;
      positions.push(x, rise(x, z), z);
      // Smooth broad patches retain natural material variation at every zoom.
      const variation = .018 * Math.sin(x * .43 + z * .23) + .012 * Math.cos(z * .7 - x * .14);
      color.copy(meadowColor).offsetHSL(variation * .2, variation * .3, variation);
      colors.push(...color.toArray());
    }
  }
  for (let i = 0; i < count; i++) {
    const next = (i + 1) % count;
    indices.push(0, next + 1, i + 1);
  }
  for (let j = 1; j < rings; j++) {
    for (let i = 0; i < count; i++) {
      const next = (i + 1) % count;
      const inner = 1 + (j - 1) * count;
      const outer = inner + count;
      indices.push(inner + i, inner + next, outer + i, inner + next, outer + next, outer + i);
    }
  }
  const meadow = add(geometry(positions, colors, indices), .98);
  meadow.name = 'Continuous soft meadow';

  // Curved stone sides taper unevenly; no identical circular bands or pedestal.
  const rockPositions = [], rockColors = [], rockIndices = [];
  const layers = [0, .12, .48, .80, 1];
  for (let j = 0; j < layers.length; j++) {
    const t = layers[j];
    for (let i = 0; i < count; i++) {
      const a = i / count * tau;
      const radius = shoreRadius(a);
      const scallop = Math.sin(a * 9 + .8) * .065 + Math.cos(a * 13 - .4) * .04;
      const taper = t * (.6 + .22 * Math.sin(a * 3 + .5)) + Math.sin(t * Math.PI) * scallop;
      const x = Math.cos(a) * (radius - taper);
      const z = Math.sin(a) * (radius - taper);
      const edgeY = rise(Math.cos(a) * radius, Math.sin(a) * radius);
      const bottom = -.88 + .1 * Math.sin(a * 3 + 1.8) + .05 * Math.sin(a * 7);
      const y = THREE.MathUtils.lerp(edgeY, bottom, t) + Math.sin(t * Math.PI) * .12 * Math.sin(a * 4);
      rockPositions.push(x, y, z);
      if (j === 0) color.copy(meadowColor);
      else {
        const weather = .018 * Math.sin(a * 7 + t * 2) + .013 * Math.sin(a * 3 - t * 4);
        color.copy(rockColor).offsetHSL(weather * .2, -.015, weather - t * .035);
      }
      rockColors.push(...color.toArray());
    }
  }
  for (let j = 0; j < layers.length - 1; j++) {
    for (let i = 0; i < count; i++) {
      const next = (i + 1) % count;
      const top = j * count;
      const bottom = top + count;
      rockIndices.push(top + i, top + next, bottom + i, top + next, bottom + next, bottom + i);
    }
  }
  const shore = add(geometry(rockPositions, rockColors, rockIndices), .94);
  shore.name = 'Eroded stone shore';
  return terrain;
}
