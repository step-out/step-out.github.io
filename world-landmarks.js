import * as THREE from 'three';
import {mergeGeometries} from './vendor/three/utils/BufferGeometryUtils.js';

// Garden furniture is modelled at a shared, human scale. The landmarks use
// the same ceramic, anodised aluminium and ash timber as one architectural set.
export function createLandmarks(stops) {
  const group = new THREE.Group();
  group.name = 'Research garden architecture';
  const interactive = [], exhibits = [], decorations = [];
  const spinning = [], floating = [];
  const highlights = new Map();
  let hovered = null, selected = null;
  const material = (color, roughness = .65, metalness = 0) => new THREE.MeshStandardMaterial({color, roughness, metalness});
  const m = {
    ceramic: material(0xf6f4ea, .58),
    trim: material(0xdce3e4, .48),
    blue: material(0x5788b2, .45, .22),
    dark: material(0x3c576b, .52, .3),
    wood: material(0xc9ab85, .79),
    paper: material(0xf7f8ed, .89),
    stone: material(0xd3d9c9, .97),
    gold: material(0xdab577, .3, .72),
    leaf: material(0x71977e, .9),
    glow: new THREE.MeshStandardMaterial({color: 0xd5ebf3, emissive: 0x9ed8f0, emissiveIntensity: .32, roughness: .4}),
    glass: new THREE.MeshPhysicalMaterial({color: 0xb6dbeb, transparent: true, opacity: .3, roughness: .12, metalness: .06, depthWrite: false, side: THREE.DoubleSide}),
  };
  const geos = new Map();
  function rounded(w, h, d, r = .07) {
    r = Math.min(r, w / 2.01, h / 2.01, d / 2.01);
    const key = [w, h, d, r].join(',');
    if (geos.has(key)) return geos.get(key);
    const shape = new THREE.Shape(), x = -w / 2 + r, y = -h / 2 + r;
    const cw = w - 2 * r, ch = h - 2 * r;
    // A bevelled inner rectangle yields a rounded box without hard black edges.
    shape.moveTo(x, y); shape.lineTo(x + cw, y); shape.lineTo(x + cw, y + ch); shape.lineTo(x, y + ch); shape.closePath();
    const g = new THREE.ExtrudeGeometry(shape, {depth: d - 2 * r, bevelEnabled: true, bevelSegments: 3, steps: 1, bevelSize: r, bevelThickness: r, curveSegments: 6});
    g.translate(0, 0, -d / 2 + r);
    g.computeVertexNormals(); geos.set(key, g); return g;
  }
  function add(g, geometry, mat, x = 0, y = 0, z = 0) {
    const mesh = new THREE.Mesh(geometry, mat); mesh.position.set(x, y, z); mesh.castShadow = mat !== m.glass; mesh.receiveShadow = true; g.add(mesh); return mesh;
  }
  function slab(g, w, h, d, mat, x, y, z, r = .045) {return add(g, rounded(w, h, d, r), mat, x, y, z);}
  function cylinder(g, rt, rb, h, mat, x, y, z) {return add(g, new THREE.CylinderGeometry(rt, rb, h, 32), mat, x, y, z);}
  function tube(g, points, radius, mat, closed = false) {
    const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)), closed, 'centripetal');
    return add(g, new THREE.TubeGeometry(curve, 32, radius, 8, closed), mat);
  }
  function arc(g, width, height, depth = .11, mat = m.ceramic) {
    // A single curved rib, rather than a box lintel on top of two boxes.
    return tube(g, [[-width / 2, .06, 0], [-width / 2, height * .72, 0], [-width * .4, height * .94, 0], [0, height, 0], [width * .4, height * .94, 0], [width / 2, height * .72, 0], [width / 2, .06, 0]], depth, mat);
  }
  function paving(g, w, d, x = 0, z = 0) {return slab(g, w, .095, d, m.stone, x, -.022, z, .045);}
  function bench(g, x = 0, z = 0, width = 2.4) {
    const b = new THREE.Group(); b.position.set(x, 0, z); g.add(b);
    for (const side of [-1, 1]) {
      const leg = tube(b, [[side * (width / 2 - .23), .04, .32], [side * (width / 2 - .23), .46, .25], [side * (width / 2 - .23), .5, -.29], [side * (width / 2 - .23), .04, -.32]], .042, m.dark);
      leg.name = 'Bent steel bench leg';
    }
    for (let i = 0; i < 4; i++) slab(b, width, .075, .14, m.wood, 0, .53, -.24 + i * .17, .028);
    for (let i = 0; i < 3; i++) {const slat = slab(b, width, .125, .065, m.wood, 0, .76 + i * .15, -.335 - i * .025, .026); slat.rotation.x = -.15;}
    for (const x of [-width / 2 + .2, width / 2 - .2]) tube(b, [[x, .45, .24], [x, .74, .24], [x, .77, -.34], [x, 1.05, -.40]], .033, m.dark);
    return b;
  }
  function planter(g, x, z, scale = 1) {
    const p = new THREE.Group(); p.position.set(x, 0, z); p.scale.setScalar(scale); g.add(p);
    cylinder(p, .29, .21, .42, m.ceramic, 0, .25, 0);
    cylinder(p, .258, .258, .015, m.dark, 0, .466, 0);
    for (let i = 0; i < 5; i++) {
      const a = i * Math.PI * 2 / 5;
      const leaf = add(p, new THREE.SphereGeometry(.17, 8, 6), m.leaf, Math.cos(a) * .12, .69 + (i % 2) * .08, Math.sin(a) * .12);
      leaf.scale.set(.65, 1.4, .65); leaf.rotation.z = -Math.cos(a) * .5; leaf.rotation.x = Math.sin(a) * .5;
    }
    return p;
  }
  function book(g, x, y, z, color = m.blue, rotation = 0) {
    const b = new THREE.Group(); g.add(b); b.position.set(x, y, z); b.rotation.y = rotation;
    slab(b, .49, .09, .36, m.paper, 0, 0, 0, .013);
    slab(b, .52, .018, .38, color, 0, -.049, 0, .008); slab(b, .52, .018, .38, color, 0, .049, 0, .008);
    return b;
  }
  stops.forEach(stop => {
    const g = stop.group || new THREE.Group(); stop.group = g;
    g.name = `${stop.title} garden landmark`;
    g.position.copy(stop.point).multiplyScalar(.78); g.position.y = .28;
    g.rotation.y = -stop.angle + Math.PI / 2;
    group.add(g); stop.labelPoint = new THREE.Vector3(0, 3.0, 0);
    if (stop.index === 0) {
      // The arrival place is deliberately open: a chair-height bench and shade.
      paving(g, 3.2, 1.65, 0, -.04); bench(g, 0, 0, 2.6);
      planter(g, -1.72, -.08, 1.08);
      stop.labelPoint.y = 1.8;
    } else if (stop.index === 1) {
      // A kinetic model reads as the research landmark from every camera angle.
      paving(g, 2.9, 2.25);
      cylinder(g, .65, .81, .22, m.ceramic, 0, .13, 0);
      cylinder(g, .44, .5, .74, m.ceramic, 0, .59, 0);
      const sculpture = new THREE.Group(); sculpture.position.y = 1.87; g.add(sculpture);
      for (let i = 0; i < 3; i++) {
        const ring = add(sculpture, new THREE.TorusGeometry(.82 - i * .09, .027, 8, 64), i === 1 ? m.gold : m.blue);
        ring.rotation.set(.38 + i * .62, i * .83, .28); spinning.push({mesh: ring, axis: i === 1 ? 'x' : 'y', rate: .10 + i * .045, initial: ring.rotation.clone()});
      }
      const core = add(sculpture, new THREE.IcosahedronGeometry(.3, 2), m.glass); floating.push({mesh: core, y: 0, rate: 1.1});
      add(sculpture, new THREE.IcosahedronGeometry(.12, 1), m.glow);
    } else if (stop.index === 2) {
      // An open-air reading desk, under one lightweight curved frame.
      paving(g, 3.3, 2.45);
      const rib = arc(g, 2.96, 2.95, .075); rib.position.z = -.72;
      const awning = slab(g, 3.05, .055, .78, m.blue, 0, 2.83, -.48, .025); awning.rotation.x = -.1;
      slab(g, 2.7, .12, 1.15, m.wood, 0, .79, .18, .05);
      for (const x of [-1.05, 1.05]) slab(g, .14, .72, .8, m.ceramic, x, .39, .15);
      slab(g, 2.0, 1.14, .085, m.dark, 0, 1.66, -.30, .035);
      const screen = add(g, new THREE.PlaneGeometry(1.87, 1.01), new THREE.MeshBasicMaterial({color: 0xffffff}), 0, 1.66, -.251); exhibits.push(screen);
      book(g, -.88, .93, .39, m.blue, -.13); book(g, -.84, 1.04, .39, m.ceramic, .04);
      cylinder(g, .095, .075, .17, m.ceramic, 1.0, .94, .41);
      stop.labelPoint.y = 3.35;
    } else if (stop.index === 3) {
      // A small colonnade: a tangible path through successive institutions.
      paving(g, 3.12, 2.6);
      for (const z of [-.82, 0, .82]) {const rib = arc(g, 2.5, 2.6, .085, z === 0 ? m.blue : m.ceramic); rib.position.z = z;}
      for (const x of [-.94, .94]) tube(g, [[x, 2.35, -.95], [x, 2.35, .95]], .035, m.wood);
      bench(g, 0, -.78, 1.74);
      stop.labelPoint.y = 3.15;
    } else if (stop.index === 4) {
      // A compact outdoor maker desk: monitor, angled keyboard and work light.
      paving(g, 3.3, 2.2);
      slab(g, 2.7, .14, 1.18, m.wood, 0, .81, .05, .055);
      for (const x of [-1.03, 1.03]) {
        tube(g, [[x, .07, -.44], [x, .73, -.29], [x, .73, .42], [x, .07, .53]], .055, m.ceramic);
      }
      slab(g, .66, .05, .42, m.dark, .02, .91, -.22, .02); slab(g, .07, .36, .075, m.dark, .02, 1.11, -.27, .03);
      slab(g, 1.65, 1.0, .09, m.dark, .02, 1.58, -.26, .04);
      slab(g, 1.51, .86, .015, m.blue, .02, 1.58, -.206, .006);
      // A small waveform echoes the site's multimodal research without text.
      for (let i = 0; i < 11; i++) {
        const h = .13 + .28 * Math.pow(Math.sin(i * .72 + .3), 2);
        slab(g, .045, h, .018, m.glow, -.54 + i * .112, 1.58, -.19, .016);
      }
      const keys = slab(g, .92, .045, .32, m.trim, .01, .93, .31, .02); keys.rotation.x = .075;
      tube(g, [[1.05, .89, -.21], [1.05, 1.54, -.21], [.73, 1.81, -.21]], .025, m.dark);
      const shade = cylinder(g, .09, .22, .15, m.ceramic, .72, 1.80, -.21); shade.rotation.z = -.5;
      planter(g, -1.63, -.32, .88);
      stop.labelPoint.y = 2.75;
    } else if (stop.index === 5) {
      // An award in a quiet glazed vitrine rather than an oversized toy cup.
      paving(g, 2.55, 2.1);
      cylinder(g, .7, .76, .15, m.ceramic, 0, .105, 0);
      cylinder(g, .52, .6, .7, m.ceramic, 0, .515, 0);
      cylinder(g, .17, .21, .065, m.dark, 0, .89, 0);
      cylinder(g, .052, .063, .34, m.gold, 0, 1.095, 0);
      const bowl = add(g, new THREE.LatheGeometry([new THREE.Vector2(.05, 0), new THREE.Vector2(.16, .04), new THREE.Vector2(.25, .17), new THREE.Vector2(.31, .36), new THREE.Vector2(.28, .37), new THREE.Vector2(.22, .17), new THREE.Vector2(.13, .06)], 36), m.gold, 0, 1.24, 0);
      bowl.material = bowl.material.clone(); bowl.material.side = THREE.DoubleSide;
      for (const side of [-1, 1]) tube(g, [[side * .27, 1.55, 0], [side * .46, 1.57, 0], [side * .45, 1.34, 0], [side * .18, 1.29, 0]], .026, m.gold);
      add(g, new THREE.CylinderGeometry(.63, .63, 1.13, 40, 1, true), m.glass, 0, 1.46, 0);
      const rim = add(g, new THREE.TorusGeometry(.63, .015, 8, 48), m.trim, 0, 2.035, 0); rim.rotation.x = Math.PI / 2;
      stop.labelPoint.y = 2.55;
    } else {
      // A freestanding garden notice case: pinned cards remain recognisable.
      paving(g, 2.55, 1.55);
      for (const x of [-.74, .74]) cylinder(g, .046, .046, 1.58, m.dark, x, .8, -.1);
      slab(g, 2.04, 1.2, .17, m.blue, 0, 1.86, -.1, .065);
      slab(g, 1.84, 1.0, .018, m.wood, 0, 1.86, -.003, .008);
      const card = slab(g, .75, .75, .025, m.paper, -.41, 1.88, .027, .012); card.rotation.z = .07;
      const second = slab(g, .71, .54, .025, m.paper, .44, 1.80, .028, .012); second.rotation.z = -.075;
      for (const [x, y] of [[-.41, 2.20], [.43, 2.02]]) add(g, new THREE.SphereGeometry(.033, 10, 6), m.blue, x, y, .071);
      slab(g, 2.24, .075, .45, m.ceramic, 0, 2.50, -.08, .027);
      stop.labelPoint.y = 2.95;
    }
    // Each landmark owns its material instances. Hovering a gold trophy must
    // not also light up the gold ring at the research stop.
    const ownMaterials = new Map();
    g.traverse(child => {
      if (!child.isMesh) return;
      const clone = source => {
        if (!ownMaterials.has(source)) ownMaterials.set(source, source.clone());
        return ownMaterials.get(source);
      };
      child.material = Array.isArray(child.material) ? child.material.map(clone) : clone(child.material);
    });
    // Furniture does not need a draw call for every slat and screw. Bake static
    // pieces per material; preserve the few animated/exhibit meshes separately.
    g.updateMatrixWorld(true);
    const animated = new Set([...spinning.map(x => x.mesh), ...floating.map(x => x.mesh), ...exhibits]);
    const batches = new Map();
    const inverse = new THREE.Matrix4().copy(g.matrixWorld).invert();
    g.traverse(child => {
      if (!child.isMesh || animated.has(child) || child.material.transparent) return;
      const geometry=(child.geometry.index ? child.geometry.toNonIndexed() : child.geometry.clone()).applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse,child.matrixWorld));
      const batch=batches.get(child.material)||{geometries:[],meshes:[]};
      batch.geometries.push(geometry);batch.meshes.push(child);batches.set(child.material,batch);
    });
    for (const [material,batch] of batches) {
      const geometry=mergeGeometries(batch.geometries,false);
      if (!geometry) continue;
      batch.meshes.forEach(mesh=>mesh.removeFromParent());
      const merged=new THREE.Mesh(geometry,material);merged.castShadow=merged.receiveShadow=true;g.add(merged);
      batch.geometries.forEach(geometry=>geometry.dispose());
    }
    g.traverse(child => {if (child.isMesh) {child.userData.stop = stop; interactive.push(child);}});
    // The contour stays on the paving, so its feedback reads as a clickable
    // place instead of an object levitating above the garden.
    const [w, d] = [[3.2, 1.65], [2.9, 2.25], [3.3, 2.45], [3.12, 2.6], [3.3, 2.2], [2.55, 2.1], [2.55, 1.55]][stop.index];
    const contour = (width, depth, radius) => {
      const s = new THREE.Shape(), x = -width / 2, y = -depth / 2;
      s.moveTo(x + radius, y); s.lineTo(x + width - radius, y);
      s.quadraticCurveTo(x + width, y, x + width, y + radius);
      s.lineTo(x + width, y + depth - radius); s.quadraticCurveTo(x + width, y + depth, x + width - radius, y + depth);
      s.lineTo(x + radius, y + depth); s.quadraticCurveTo(x, y + depth, x, y + depth - radius);
      s.lineTo(x, y + radius); s.quadraticCurveTo(x, y, x + radius, y);
      return s;
    };
    const shape = contour(w + .28, d + .28, .25);
    shape.holes.push(new THREE.Path(contour(w + .20, d + .20, .21).getPoints(6).reverse()));
    const outline = new THREE.Mesh(new THREE.ShapeGeometry(shape, 10), new THREE.MeshBasicMaterial({color: 0x4f90c9, transparent: true, opacity: 0, depthWrite: false, toneMapped: false}));
    outline.name = `${stop.title} interaction outline`;
    outline.rotation.x = -Math.PI / 2; outline.position.set(0, .015, stop.index === 0 ? -.04 : 0); outline.visible = false;
    g.add(outline);
    highlights.set(stop.id, {
      group: g, scale: g.scale.clone(), outline, weight: 0,
      materials: [...ownMaterials.values()].filter(mat => mat.emissive).map(mat => ({
        mat, color: mat.color.clone(), emissive: mat.emissive.clone(), intensity: mat.emissiveIntensity,
        gold: mat.color.equals(m.gold.color), glass: mat.transparent,
      })),
    });
  });
  const dayAccent = new THREE.Color(0x377dc4), nightAccent = new THREE.Color(0x96d7ff);
  const goldAccent = new THREE.Color(0xeabd64), nightGoldAccent = new THREE.Color(0xffd987);
  const hoverLight = new THREE.Color(0xa3d4ff), goldLight = new THREE.Color(0xffcc75);
  const white = new THREE.Color(0xffffff), emissive = new THREE.Color();
  function setHovered(id) {hovered = highlights.has(id) ? id : null;}
  function setSelected(id) {selected = highlights.has(id) ? id : null;}
  function update(time, {delta = .016, reduced = false, night = 0} = {}) {
    const dark = THREE.MathUtils.clamp(night, 0, 1);
    const blend = reduced ? 1 : 1 - Math.exp(-Math.max(0, delta) * 14);
    spinning.forEach(({mesh, axis, rate, initial}) => {mesh.rotation[axis] = initial[axis] + time * rate;});
    floating.forEach(({mesh, y, rate}) => {mesh.position.y = y + Math.sin(time * rate) * .055; mesh.rotation.y = time * .12;});
    highlights.forEach((entry, id) => {
      entry.weight += ((hovered === id ? 1 : 0) - entry.weight) * blend;
      if (entry.weight < .001) entry.weight = 0;
      if (entry.weight > .999) entry.weight = 1;
      const active = selected === id, h = entry.weight;
      entry.group.scale.copy(entry.scale).multiplyScalar(1 + h * .025);
      entry.outline.visible = h > 0 || active;
      const award = id === 'recognition';
      entry.outline.material.color.copy(award ? goldAccent : dayAccent).lerp(award ? nightGoldAccent : nightAccent, dark);
      entry.outline.material.opacity = (active ? .20 + dark * .08 : 0) * (1 - h) + h * (.90 + dark * .10);
      for (const {mat, color, emissive: base, intensity, gold, glass} of entry.materials) {
        mat.color.copy(color).lerp(white, h * (gold ? .07 : .035));
        // Keep the material's own illumination (e.g. the waveform screen), then
        // add a low, colour-aware hover light. Transparent display cases stay clear.
        emissive.copy(base).multiplyScalar(intensity);
        mat.emissive.copy(gold ? goldLight : hoverLight).multiplyScalar(h * (glass ? .018 : gold ? .30 : .085) * (1 + dark * .35)).add(emissive);
        mat.emissiveIntensity = 1;
      }
    });
  }
  return {group, interactive, exhibits, decorations, update, setHovered, setSelected};
}
