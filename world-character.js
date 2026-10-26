import * as THREE from 'three';

/** A real articulated character. The rig and original clips are CC0 (see assets/world/character). */
export async function createCharacter(loader) {
  const gltf = await loader.loadAsync('./assets/world/character/guide.glb');
  const root = new THREE.Group();
  root.name = 'Research guide';
  const model = gltf.scene;
  // The exported bind pose is taller than the neutral pose. Measure the posed rig.
  const mixer = new THREE.AnimationMixer(model);
  const clips = Object.fromEntries(gltf.animations.map(clip => [clip.name, clip]));
  mixer.clipAction(clips.Idle).play(); mixer.update(0); model.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(model, true);
  const scale = 3.45 / bounds.getSize(new THREE.Vector3()).y;
  model.scale.setScalar(scale);
  model.position.y = -bounds.min.y * scale;
  root.add(model);
  const meshes = [];
  model.traverse(object => {
    if (!object.isMesh) return;
    meshes.push(object);
    object.castShadow = object.receiveShadow = true;
    object.userData.character = true;
    object.material = object.material.clone();
    const material = object.material;
    if (material.name === 'Main') {
      material.color.set('#659acb');
      material.roughness = .38;
      material.metalness = .24;
    } else if (material.name === 'Grey') {
      material.color.set('#eeeae0');
      material.roughness = .47;
      material.metalness = .12;
    } else {
      material.color.set('#15314d');
      material.roughness = .32;
      material.metalness = .15;
    }
  });

  mixer.stopAllAction();
  const names = {idle:'Idle', walk:'Walking', run:'Running', wave:'Wave', jump:'Jump', dance:'Dance', celebrate:'ThumbsUp', thinking:'Yes'};
  const looping = new Set(['Idle','Walking','Running','Dance']);
  let current = null, semantic = '', yaw = 0, sampledTime = 0;

  function play(action, {immediate = false, speed = 1, restart = false} = {}) {
    const name = names[action] || 'Idle';
    if (semantic === action && current && !restart) {
      current.setEffectiveTimeScale(speed);
      return;
    }
    semantic = action;
    const next = mixer.clipAction(clips[name]);
    next.reset().setEffectiveTimeScale(speed).setEffectiveWeight(1);
    next.setLoop(looping.has(name) ? THREE.LoopRepeat : THREE.LoopOnce, Infinity);
    next.clampWhenFinished = !looping.has(name);
    next.play();
    if (current && current !== next) {
      if (immediate) current.stop();
      else current.crossFadeTo(next, .22, false);
    }
    current = next;
    mixer.update(0);
  }

  function update(delta, targetYaw, immediate = false) {
    const difference = Math.atan2(Math.sin(targetYaw-yaw), Math.cos(targetYaw-yaw));
    yaw += difference * (immediate ? 1 : Math.min(1, delta * 10));
    root.rotation.y = yaw;
    mixer.update(delta);
    sampledTime = current?.time || 0;
  }

  function status() {
    return {action: semantic, clip: current?.getClip().name, clipTime: sampledTime, yaw, bones: gltf.scene.getObjectByProperty('type','Bone') !== undefined};
  }

  play('idle', {immediate:true});
  return {root, meshes, mixer, play, update, status, duration: action => clips[names[action] || 'Idle'].duration};
}
