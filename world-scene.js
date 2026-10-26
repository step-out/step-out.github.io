import * as THREE from 'three';
import {GLTFLoader} from './vendor/three/loaders/GLTFLoader.js';
import {createTerrain} from './world-terrain.js';
import {createCharacter} from './world-character.js';
import {createLandmarks} from './world-landmarks.js';
import {RoomEnvironment} from './vendor/three/environments/RoomEnvironment.js';
import {createLighting} from './world-lighting.js';

const host = document.getElementById('guide-scene');
createWorld().catch(error => {
  window.dispatchEvent(new CustomEvent('scene:error',{detail:{message:error.message}}));
  console.warn('The 3D world could not start.',error);
});

async function createWorld() {
  let booted=false;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
  renderer.setClearColor(0xeaf0f8,0);renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.02;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;
  host.appendChild(renderer.domElement);renderer.domElement.style.cssText='display:block;width:100%;height:100%;touch-action:pan-y';
  const scene=new THREE.Scene();scene.fog=new THREE.Fog(0xf5f7fc,19,37);
  const environment=new RoomEnvironment();
  const pmrem=new THREE.PMREMGenerator(renderer);
  scene.environment=pmrem.fromScene(environment,.04).texture;scene.environmentIntensity=.25;
  environment.dispose();pmrem.dispose();
  const camera=new THREE.PerspectiveCamera(34,1,.1,160);
  const light=new THREE.DirectionalLight(0xfff2de,2.4);light.position.set(-9,18,11);light.castShadow=true;
  light.shadow.mapSize.set(1024,1024);Object.assign(light.shadow.camera,{left:-20,right:20,top:20,bottom:-20,near:1,far:65});light.shadow.normalBias=.035;light.shadow.bias=-.0001;
  const hemisphere=new THREE.HemisphereLight(0xd7e6ff,0xa5ad92,.95);scene.add(light,hemisphere);
  const fill=new THREE.DirectionalLight(0xc4d8ff,.4);fill.position.set(12,7,-12);scene.add(fill);
  const world=new THREE.Group();scene.add(world);
  const loader=new GLTFLoader(),models=new Map(),interactive=[],trees=[];
  const material=(color,roughness=.82,metalness=0)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
  const mats={path:material(0xeee2c9),dark:material(0x3a5566)};
  function mesh(geo,mat,parent=world){const m=new THREE.Mesh(geo,mat);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
  function box(w,h,d,mat,x,y,z,parent=world){const m=mesh(new THREE.BoxGeometry(w,h,d),mat,parent);m.position.set(x,y,z);return m;}
  const island=createTerrain();island.scale.set(2.25,1,2.25);world.add(island);
  const ground=mesh(new THREE.PlaneGeometry(250,250),new THREE.ShadowMaterial({opacity:.13}),scene);ground.rotation.x=-Math.PI/2;ground.position.y=-1.02;ground.castShadow=false;
  // A continuous walkable ring ties the seven places together.
  const path=mesh(new THREE.RingGeometry(7.35,9.12,112),mats.path);path.rotation.x=-Math.PI/2;path.position.y=.224;
  const edgeMat=material(0xe0d8c4);
  for(const r of[7.30,9.16]){const curb=mesh(new THREE.TorusGeometry(r,.045,5,112),edgeMat);curb.rotation.x=Math.PI/2;curb.position.y=.255;}
  const waterMaterial=new THREE.MeshPhysicalMaterial({color:0x6abccc,roughness:.27,metalness:.12,transparent:true,opacity:.88,clearcoat:1});
  const pond=mesh(new THREE.CircleGeometry(5.1,72),waterMaterial);pond.rotation.x=-Math.PI/2;pond.position.set(-.8,.245,-.4);pond.scale.y=.76;pond.castShadow=false;
  const ripples=[];for(let i=0;i<4;i++){const m=mesh(new THREE.RingGeometry(.5,.515,56),new THREE.MeshBasicMaterial({color:0xe6ffff,transparent:true,opacity:.35,side:THREE.DoubleSide}));m.rotation.x=-Math.PI/2;m.position.set(-1.1,.255,-.6);ripples.push(m);}
  const stops=[['about','About'],['research-map','Research'],['publications','Papers'],['experience','Experience'],['projects','Projects'],['recognition','Honors'],['news','News']].map(([id,title],index)=>{
    const angle=Math.PI*.5+index*Math.PI*2/7;
    return{id,title,index,angle,point:new THREE.Vector3(Math.cos(angle)*8.2,.28,Math.sin(angle)*8.2),group:new THREE.Group()};
  });
  const labels=document.createElement('div');labels.className='world-labels';host.after(labels);
  const tip=document.createElement('div');tip.className='world-tip';tip.innerHTML='<span class="world-drag-hint"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 8 2 12l3 4M19 8l3 4-3 4M3 12h18" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>Drag to look around</span><button class="world-reset" type="button" hidden aria-label="Reset the camera to this section’s default view">↺ Reset view</button>';host.after(tip);
  const resetView=tip.querySelector('.world-reset'),dragHint=tip.querySelector('.world-drag-hint');
  resetView.addEventListener('click',()=>{orbitTarget=0;pitchTarget=0;if(!motion||reduced.matches){orbit=0;pitch=0;}resetView.hidden=true;dragHint.hidden=false;request();});
  function label(stop){const b=document.createElement('button');b.className='world-marker';b.hidden=true;b.dataset.stop=stop.id;b.innerHTML=`<span>${String(stop.index).padStart(2,'0')}</span>${stop.title}`;b.addEventListener('click',()=>window.dispatchEvent(new CustomEvent('scene:select',{detail:{id:stop.id}})));b.addEventListener('pointerenter',()=>{setHovered(stop.id);request();});b.addEventListener('pointerleave',event=>{if(event.relatedTarget===renderer.domElement){const object=hit(event);setHovered(object?.userData.stop?.id||null);}else setHovered(null);request();});b.addEventListener('focus',()=>{setHovered(stop.id);request();});b.addEventListener('blur',()=>{setHovered(null);request();});labels.appendChild(b);stop.label=b;}
  const landmarks=createLandmarks(stops);
  world.add(landmarks.group);interactive.push(...landmarks.interactive);
  const exhibits=landmarks.exhibits;stops.forEach(label);
  // Small light posts and the warm path provide scale and grounded shadows.
  const lampMaterial=new THREE.MeshStandardMaterial({color:0xffeab9,emissive:0xffc56a,emissiveIntensity:.5});
  const lampPositions=[];
  for(let i=0;i<7;i++){const angle=i*Math.PI*2/7+.3;const x=Math.cos(angle)*7.0,z=Math.sin(angle)*7.0;box(.065,.75,.065,mats.dark,x,.55,z);const bulb=mesh(new THREE.SphereGeometry(.13,12,8),lampMaterial);bulb.position.set(x,.96,z);lampPositions.push(new THREE.Vector3(x,1.07,z));}
  const lighting=createLighting({scene,renderer,sun:light,hemisphere,fill,lampMaterial,lamps:lampPositions,waterMaterial,onChange:request});
  async function loadModel(name){if(models.has(name))return models.get(name);const gltf=await loader.loadAsync(`./assets/world/nature/${name}.glb`);models.set(name,gltf.scene);return gltf.scene;}
  function instance(template,x,z,height,rotation=0){const radius=Math.hypot(x,z);if(radius>10.5){x*=10.5/radius;z*=10.5/radius;}const object=template.clone(true),bounds=new THREE.Box3().setFromObject(object),size=bounds.getSize(new THREE.Vector3());const scale=height/size.y;object.scale.setScalar(scale);object.position.set(x,.23-bounds.min.y*scale,z);object.rotation.y=rotation;object.traverse(m=>{if(m.isMesh){m.castShadow=true;m.receiveShadow=true;}});world.add(object);return object;}
  const modelJobs=[
    ['BirchTree_1',[[-7,-7,5.4,.7],[7,-7,5.7,1.4]]],
    ['BirchTree_3',[[1,-10,5.5,-.4],[9,3,4.5,.4]]],
    ['Bush_Large',[[4,-5,1.05,0],[-4,5,.95,1],[-6,-1,1.2,0],[10,3,1,1]]],
    ['Bush_Flowers',[[5,5,.95,0],[-5,-4,.8,1],[1,-6,.9,0],[11,-1,.85,2]]],
    ['rock_largeA',[[-3,-3,.4,1],[3,1,.3,.4],[11,4,.55,2],[-11,4,.6,1]]],
    ['rock_largeB',[[3,-4,.55,0],[-2,4,.35,1],[-10,-5,.7,0],[9,-8,.6,0]]],
    ['plant_bushSmall',[[-2,-6,.45,0],[6,2,.55,0],[3,6,.4,0],[-6,2,.55,1]]],
  ];
  Promise.allSettled(modelJobs.map(async([name,locations])=>{const model=await loadModel(name);if(name.startsWith('Birch'))model.traverse(m=>{if(m.isMesh&&m.material.map){m.material=m.material.clone();m.material.roughness=.92;}});locations.forEach(a=>{const o=instance(model,...a);if(name.startsWith('Birch'))trees.push(o);});})).then(()=>{modelsLoaded=true;renderer.shadowMap.needsUpdate=true;request();});
  let modelsLoaded=false;
  const character=await createCharacter(loader);
  const guide=character.root;world.add(guide);
  const shadow=mesh(new THREE.CircleGeometry(.54,32),new THREE.MeshBasicMaterial({color:0x2d4358,transparent:true,opacity:.13,depthWrite:false}));shadow.rotation.x=-Math.PI/2;shadow.position.y=.237;shadow.castShadow=false;
  const textures={};for(const[id,file]of Object.entries({'duplex-mpe':'DuplexMPE','motion-omni':'MotionOmni',omnidrive:'omnidrive',c3:'C3'})){new THREE.TextureLoader().load(`./photo/optimized/${file}.webp`,t=>{t.colorSpace=THREE.SRGBColorSpace;textures[id]=t;updateExhibit();});}
  let exhibit='duplex-mpe';function updateExhibit(){if(textures[exhibit])exhibits.forEach(p=>{p.material.map=textures[exhibit];p.material.needsUpdate=true;});}
  let width=1,height=1,time=0,frames=0,last=0,raf=0,index=0,targetIndex=0,progress=0,from=0,travelTime=0,travelling=false,travelGoal=0,travelDuration=2.65,sideStep=.82;
  let motion=!reduced.matches&&!document.body.classList.contains('motion-paused'),visible=!document.hidden,action='wave',actionTime=0,cycle=0,idleUntil=2.5,ready=false;
  let orbit=0,orbitTarget=0,pitch=0,pitchTarget=0,drag=null,lastAction='',hoveredStop=null;
  function setHovered(id){if(hoveredStop===id)return;hoveredStop=id;window.dispatchEvent(new CustomEvent('scene:hover',{detail:{id}}));}
  const look=new THREE.Vector3(0,.5,0),cameraPosition=new THREE.Vector3(),targetLook=new THREE.Vector3(),guidePoint=new THREE.Vector3(),project=new THREE.Vector3();
  const diag=new URLSearchParams(location.search).has('scene-debug')?{}:null;if(diag)window.__guideScene=diag;
  const actions={about:['wave','idle','thinking'],'research-map':['thinking','idle','wave'],publications:['idle','thinking','wave'],experience:['wave','idle','celebrate'],projects:['thinking','idle','dance'],recognition:['celebrate','dance','wave'],news:['wave','idle','thinking']};
  function setAction(a,{restart=false}={}){action=a;actionTime=0;if(a==='idle')idleUntil=time+4;character.play(a,{immediate:!motion||reduced.matches,restart});emitState();}
  function emitState(){const key=`${action}:${targetIndex}:${travelling}`;if(key===lastAction)return;lastAction=key;window.dispatchEvent(new CustomEvent('guide:state',{detail:{action,stopId:stops[targetIndex].id,travelling}}));}
  function arrive(){index=targetIndex;progress=travelGoal;const angle=Math.PI*.5+progress*Math.PI*2/7;guidePoint.set(Math.cos(angle)*8.2,.225,Math.sin(angle)*8.2);travelling=false;cycle=0;setAction(reduced.matches?'idle':actions[stops[index].id][0]);window.dispatchEvent(new CustomEvent('journey:arrive',{detail:{id:stops[index].id,index}}));}
  function travel(d){const next=stops.findIndex(s=>s.id===d.id);from=progress;targetIndex=next>=0?next:Math.max(0,Math.min(6,d.index||0));const delta=((targetIndex-from+3.5)%7+7)%7-3.5;travelGoal=from+delta;travelDuration=2.65+Math.max(0,Math.abs(delta)-1)*.65;travelTime=0;travelling=Math.abs(delta)>.001;orbitTarget=0;pitchTarget=0;resetView.hidden=true;dragHint.hidden=false;setAction(travelling?'walk':'wave');if(d.immediate||!motion||reduced.matches||!travelling)arrive();emitProgress();request();}
  function emitProgress(){const routeProgress=travelling?index+(targetIndex-index)*Math.min(1,travelTime/travelDuration):targetIndex;window.dispatchEvent(new CustomEvent('journey:progress',{detail:{progress:routeProgress,travelling,activeId:stops[index].id,targetId:stops[targetIndex].id}}));}
  function interact(a){if(travelling||!motion||reduced.matches)return;window.dispatchEvent(new CustomEvent('guide:interact',{detail:{action:a}}));setAction(a,{restart:true});request();}
  function positionCamera(dt){const small=width<700,compact=height<260,badge=width<210;let distance=small?27:targetIndex===0?14.5:15.5;if(compact)distance=badge?9:20;
    const focus=guidePoint.clone().multiplyScalar(targetIndex===0?.98:.96);focus.y=1.45;
    if(compact&&!badge){focus.copy(guidePoint).multiplyScalar(.90);focus.y=height>175?1.55:1.35;distance=height>175?10.5:11.5;}
    if(badge){focus.copy(guidePoint);focus.y=1.65;distance=8;}
    // The camera arcs around the island between chapters; the index remains instantly usable.
    const yaw=.48-progress*Math.PI*2/7+orbit+(motion&&!reduced.matches&&!drag?Math.sin(time*.22)*.012:0),tilt=(badge?.17:compact?.30:.25)+pitch;
    const settle=!motion||reduced.matches||!ready;
    targetLook.copy(focus);look.lerp(targetLook,settle?1:Math.min(1,dt*5));
    cameraPosition.set(Math.sin(yaw)*distance,Math.sin(tilt)*distance,Math.cos(yaw)*distance).add(look);
    camera.position.lerp(cameraPosition,settle?1:Math.min(1,dt*6));camera.lookAt(look);
    camera.aspect=width/height;camera.fov=compact?(badge?34:30):36;camera.updateProjectionMatrix();
    // On desktop place the world to the right of the reading surface without flattening it.
    camera.clearViewOffset();if(!small&&!compact)camera.setViewOffset(width,height,-width*(targetIndex===0?.23:.28),0,width,height);
  }
  function render(now){raf=0;if(!visible)return;const dt=last?Math.min((now-last)/1000,.15):.016;last=now;
    const night=lighting.update(dt,!motion||reduced.matches);
    if(motion&&!reduced.matches){time+=dt;actionTime+=dt*1000;orbit+=(orbitTarget-orbit)*Math.min(1,dt*7);pitch+=(pitchTarget-pitch)*Math.min(1,dt*7);
      if(travelling){
        travelTime+=dt;const p=Math.min(1,travelTime/travelDuration),ease=p*p*(3-2*p);
        progress=from+(travelGoal-from)*ease;
        const distance=Math.abs(travelGoal-from)*8.2*Math.PI*2/7;
        character.play(distance>10?'run':'walk',{speed:Math.max(.3,Math.min(1.7,distance/7*6*p*(1-p)))});
        if(p===1)arrive();
      }else if(action==='idle'&&time>idleUntil)setAction(actions[stops[index].id][++cycle%actions[stops[index].id].length]);
      else if(action!=='idle'&&actionTime>character.duration(action)*1000)setAction('idle');
    }
    const angle=Math.PI*.5+progress*Math.PI*2/7;guidePoint.set(Math.cos(angle)*8.2,.225,Math.sin(angle)*8.2);
    const offset=travelling?Math.pow(Math.max(0,travelTime/travelDuration-.72)/.28,2)*.82:.82;
    sideStep+= (offset-sideStep)*(!motion||reduced.matches?1:Math.min(1,dt*8));
    guide.position.copy(guidePoint).add(new THREE.Vector3(-Math.sin(angle)*sideStep,0,Math.cos(angle)*sideStep));
    positionCamera(dt);
    const facing=action==='thinking'?stops[targetIndex].group.position:camera.position;
    const targetYaw=travelling?Math.atan2(-Math.sin(angle)*Math.sign(travelGoal-from),Math.cos(angle)*Math.sign(travelGoal-from)):Math.atan2(facing.x-guide.position.x,facing.z-guide.position.z);
    character.update(motion&&!reduced.matches?dt:0,targetYaw,!motion||reduced.matches);
    shadow.position.x=guide.position.x;shadow.position.z=guide.position.z;
    ripples.forEach((r,i)=>{const s=((time*.18+i*.25)%1)*4+.2;r.scale.setScalar(s);r.material.opacity=(1-(s-.2)/4)*.23;});
    landmarks.setHovered(hoveredStop);landmarks.setSelected(stops[targetIndex].id);
    landmarks.update(time,{delta:dt,reduced:!motion||reduced.matches,night});
    // Keep the selected stop and guide legible when the orbit puts foliage in front.
    const attention=[guide.position.clone().add(new THREE.Vector3(0,1.5,0)),guide.position.clone().add(new THREE.Vector3(0,2.85,0)),stops[targetIndex].group.localToWorld(new THREE.Vector3(0,1.7,0))];
    const sights=attention.map(point=>new THREE.Raycaster(camera.position,point.clone().sub(camera.position).normalize(),0,camera.position.distanceTo(point)));
    trees.forEach(tree=>{tree.visible=true;if(sights.some(ray=>ray.intersectObject(tree,true).length))tree.visible=false;tree.rotation.z=Math.sin(time*.75+tree.position.x)*.009;});
    renderer.shadowMap.needsUpdate=true;renderer.render(scene,camera);frames++;
    stops.forEach(s=>{const v=s.group.localToWorld(project.copy(s.labelPoint)).project(camera);const x=(v.x*.5+.5)*width,y=(-v.y*.5+.5)*height;const reading=document.body.classList.contains('content-open');const show=s.id===hoveredStop&&width>210&&v.z<1&&x>width*(reading?.67:.48)&&x<width-55&&y>25&&y<height-62;s.label.hidden=!show;if(show){s.label.style.left=`${x}px`;s.label.style.top=`${y}px`;}if(s.index===targetIndex)s.label.setAttribute('aria-current','step');else s.label.removeAttribute('aria-current');});
    if(diag)Object.assign(diag,{frames,drawN:frames,elapsed:time,action,rig:character.status(),progress,worldDistance:progress*8.2,stopId:stops[index].id,targetId:stops[targetIndex].id,travelling,loading:false,canvas:[width,height],character:{x:guide.position.x,z:guide.position.z,foot:guidePoint.y,size:3.45},exhibit,modelsLoaded,renderer:'WebGL / Three.js',camera:camera.position.toArray(),orbit,pitch,night,hoveredStop,highlightScale:hoveredStop?stops.find(s=>s.id===hoveredStop)?.group.scale.x:1,renderCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles});
    emitProgress();if(!ready){ready=true;window.dispatchEvent(new CustomEvent('scene:ready',{detail:{view:'world-3d'}}));}
    if((motion&&!reduced.matches)||lighting.moving)request();
  }
  function request(){if(booted&&!raf&&visible)raf=requestAnimationFrame(render);}
  function resize(){width=Math.max(1,host.clientWidth);height=Math.max(1,host.clientHeight);renderer.setSize(width,height,false);request();}
  const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();
  function hit(event){const r=renderer.domElement.getBoundingClientRect();pointer.set((event.clientX-r.left)/r.width*2-1,-(event.clientY-r.top)/r.height*2+1);raycaster.setFromCamera(pointer,camera);return raycaster.intersectObjects([...character.meshes,...interactive],false)[0]?.object;}
  renderer.domElement.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY,orbit:orbitTarget,pitch:pitchTarget,moved:false,touch:e.pointerType==='touch',orbitStart:orbit,pitchStart:pitch,resetHidden:resetView.hidden};renderer.domElement.setPointerCapture(e.pointerId);});
  renderer.domElement.addEventListener('pointermove',e=>{
    if(drag){
      const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
      if(Math.hypot(dx,dy)<=7)return;
      // A vertical touch belongs to page reading. Do not tilt the camera before
      // the browser takes over its pan-y gesture and sends pointercancel.
      if(drag.touch&&!drag.moved&&Math.abs(dy)>Math.abs(dx)){drag=null;return;}
      drag.moved=true;orbitTarget=drag.orbit-dx*.004;
      pitchTarget=drag.touch?drag.pitch:THREE.MathUtils.clamp(drag.pitch+dy*.002,-.14,.18);
      if(!motion||reduced.matches){orbit=orbitTarget;pitch=pitchTarget;}
      resetView.hidden=false;dragHint.hidden=true;window.dispatchEvent(new CustomEvent('guide:interact'));request();
    }else if(e.pointerType!=='touch'){
      const o=hit(e);setHovered(o?.userData.stop?.id||null);renderer.domElement.style.cursor=o?'pointer':'grab';request();
    }
  });
  renderer.domElement.addEventListener('pointerup',e=>{if(drag&&!drag.moved){const o=hit(e);if(o?.userData.character)interact('wave');else if(o?.userData.stop)window.dispatchEvent(new CustomEvent('scene:select',{detail:{id:o.userData.stop.id}}));}drag=null;});
  renderer.domElement.addEventListener('pointercancel',()=>{if(drag?.touch){orbitTarget=drag.orbit;pitchTarget=drag.pitch;orbit=drag.orbitStart;pitch=drag.pitchStart;resetView.hidden=drag.resetHidden;dragHint.hidden=!drag.resetHidden;request();}drag=null;});
  renderer.domElement.addEventListener('pointerleave',event=>{if(drag)return;const marker=event.relatedTarget?.closest?.('.world-marker');setHovered(marker?.dataset.stop||null);renderer.domElement.style.cursor='grab';request();});
  renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();visible=false;if(raf)cancelAnimationFrame(raf);raf=0;window.dispatchEvent(new CustomEvent('scene:error',{detail:{message:'Graphics context interrupted'}}));});
  renderer.domElement.addEventListener('webglcontextrestored',()=>{visible=!document.hidden;last=0;renderer.shadowMap.needsUpdate=true;window.dispatchEvent(new CustomEvent('scene:ready',{detail:{view:'world-3d'}}));request();});
  window.addEventListener('journey:travel',e=>travel(e.detail||{}));
  window.addEventListener('guide:activity',e=>interact(e.detail?.action||'wave'));
  window.addEventListener('scene:exhibit',e=>{exhibit=e.detail.id;updateExhibit();request();});
  window.addEventListener('scene:motion',e=>{motion=!!e.detail?.enabled;last=0;request();});
  reduced.addEventListener('change',()=>{if(reduced.matches&&travelling)arrive();request();});
  document.addEventListener('visibilitychange',()=>{visible=!document.hidden;last=0;if(visible)request();});
  booted=true;new ResizeObserver(resize).observe(host);resize();
}
