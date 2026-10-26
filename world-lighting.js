import * as THREE from 'three';

/** A single day/night value coordinates the sky, materials and practical lights. */
export function createLighting({scene,renderer,sun,hemisphere,fill,lampMaterial,lamps,waterMaterial,onChange}) {
  const day={fog:new THREE.Color(0xf5f7fc),sun:new THREE.Color(0xfff2de),sky:new THREE.Color(0xd7e6ff),ground:new THREE.Color(0xa5ad92),fill:new THREE.Color(0xc4d8ff),water:new THREE.Color(0x6abccc)};
  const night={fog:new THREE.Color(0x101b2d),sun:new THREE.Color(0xa9c7ff),sky:new THREE.Color(0x7797cc),ground:new THREE.Color(0x283b4d),fill:new THREE.Color(0x80a8e2),water:new THREE.Color(0x244b6a)};
  let target=document.documentElement.dataset.theme==='night'?1:0,amount=target;
  const practicals=lamps.map(position=>{const light=new THREE.PointLight(0xffd39a,0,4.4,1.7);light.position.copy(position);scene.add(light);return light;});
  const starGeometry=new THREE.BufferGeometry(),positions=[];
  for(let i=0;i<120;i++){const hash=n=>{const x=Math.sin(n*127.1+13.7)*43758.5453;return x-Math.floor(x);};const angle=hash(i+1)*Math.PI*2,r=29+hash(i+30)*18;positions.push(Math.cos(angle)*r,13+hash(i+72)*22,Math.sin(angle)*r);}
  starGeometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  const stars=new THREE.Points(starGeometry,new THREE.PointsMaterial({color:0xc8ddff,size:.065,sizeAttenuation:true,transparent:true,opacity:0,depthWrite:false,fog:false}));scene.add(stars);
  const mix=()=>{
    scene.fog.color.copy(day.fog).lerp(night.fog,amount);
    sun.color.copy(day.sun).lerp(night.sun,amount);sun.intensity=THREE.MathUtils.lerp(2.4,.7,amount);
    hemisphere.color.copy(day.sky).lerp(night.sky,amount);hemisphere.groundColor.copy(day.ground).lerp(night.ground,amount);hemisphere.intensity=THREE.MathUtils.lerp(.95,.6,amount);
    fill.color.copy(day.fill).lerp(night.fill,amount);fill.intensity=THREE.MathUtils.lerp(.4,.65,amount);
    scene.environmentIntensity=THREE.MathUtils.lerp(.25,.17,amount);
    renderer.toneMappingExposure=THREE.MathUtils.lerp(1.02,1.1,amount);
    lampMaterial.emissiveIntensity=THREE.MathUtils.lerp(.5,2.8,amount);
    practicals.forEach(light=>light.intensity=amount*3.4);
    waterMaterial.color.copy(day.water).lerp(night.water,amount);
    stars.material.opacity=amount*.7;stars.visible=amount>.02;
  };
  window.addEventListener('world:lighting',event=>{target=event.detail.theme==='night'?1:0;onChange();});
  mix();
  return {
    update(delta,immediate=false){amount=immediate?target:THREE.MathUtils.damp(amount,target,4,delta);if(Math.abs(target-amount)<.002)amount=target;mix();return amount;},
    get moving(){return amount!==target;},
    get night(){return amount;}
  };
}
