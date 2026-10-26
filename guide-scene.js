/** Illustrated journey with local, frame-aligned Whale-chan artwork.
 * Artwork credit and license: assets/guide/deepseek/SOURCES.md.
 * All landscape shapes are drawn at device resolution; no external runtime requests.
 */
const host = document.querySelector('#guide-scene');
if (host) createGuide(host).catch(error => {
  window.dispatchEvent(new CustomEvent('scene:error', { detail: { message: error.message } }));
  console.warn('The illustrated journey is unavailable.', error);
});

async function createGuide(container) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let motion = !document.body.classList.contains('motion-paused'), pageVisible = !document.hidden, visible = true, onScreen = true;
  let raf = 0, lastTime = 0, lastDraw = 0, lastProgress = 0, width = 0, height = 0, time = 0, ready = false;
  let progress = 0, index = 0, targetIndex = 0, travelling = false, from = 0, travelTime = 0, pending = null;
  let action = 'wave', actionTime = 0, focus = null, frames = 0, displayedFrame = 24, pointerDown = null;
  let worldDistance = 0, activityCursor = 0, idleUntil = 1.8, travelFacing = 1, travelPhase = 'idle';
  const departureDuration = .25, walkingDuration = 1.65, arrivalDuration = .30;
  const journeyDuration = departureDuration + walkingDuration + arrivalDuration;
  let characterArea = null, hoverTime = -10, actionState = '', activeAtlas = 'base';
  let exhibit = 'duplex-mpe';
  let renderedPose = null, poseState = '';
  const stops = [
    ['about', 'Welcome', 'A little journey'], ['research-map', 'Research', 'Ideas & directions'],
    ['publications', 'Papers', 'Selected publications'], ['experience', 'Experience', 'Places along the way'],
    ['projects', 'Projects', 'Things I build'], ['recognition', 'Honors', 'Milestones'], ['news', 'News', 'The latest notes'],
  ].map(([id, title, subtitle], index) => ({ id, title, subtitle, index }));
  const debug = new URLSearchParams(location.search).has('scene-debug');
  const diagnostics = debug ? { frames: 0, drawN: 0, elapsed: 0, action, frame: displayedFrame, progress, targetId: 'about', travelling: false, loading: true, actionSequence: [], frameSequence: [] } : null;
  if (diagnostics) window.__guideScene = diagnostics;
  const queue = event => { pending = event.detail || {}; };
  window.addEventListener('journey:travel', queue);
  const canvas = document.createElement('canvas'), ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('Canvas rendering is unavailable');
  canvas.setAttribute('aria-hidden', 'true'); canvas.style.cssText = 'display:block;width:100%;height:100%;touch-action:pan-y';
  container.appendChild(canvas);
  async function loadAtlas(metadata) {
    const url = new URL(`./assets/guide/deepseek/${metadata}`, import.meta.url);
    const response = await fetch(url);
    if (!response.ok) throw new Error('Character animation metadata could not be loaded');
    const sprite = await response.json(), image = new Image(); image.decoding = 'async';
    await new Promise((resolve,reject) => { image.onload = resolve; image.onerror = () => reject(new Error('Character artwork could not be loaded')); image.src = new URL(sprite.image,url).href; });
    for (const clip of Object.values(sprite.animations)) clip.durationMs = clip.durationsMs.reduce((a,b)=>a+b,0);
    return { sprite, image };
  }
  const [baseAtlas, activityAtlas] = await Promise.all([loadAtlas('sprite.json'), loadAtlas('activities.json')]);
  const { sprite } = baseAtlas;
  // Familiar work appears in the scenery. These optional local images never delay the guide.
  const artwork = {};
  for (const [key, file] of Object.entries({'omnidrive': 'omnidrive', 'motion-omni': 'MotionOmni', 'duplex-mpe': 'DuplexMPE', c3: 'C3', pku: 'pku', seed: 'seed'})) {
    const image = new Image(); image.decoding = 'async';
    image.onload = () => { artwork[key] = image; request(); };
    image.src = new URL(`./photo/optimized/${file}.webp`, import.meta.url).href;
  }
  for (const file of ['tree','tree-round','shrub','daisies','cloud']) {
    const image = new Image(); image.decoding = 'async';
    image.onload = () => { artwork[file] = image; request(); };
    image.src = new URL(`./assets/guide/landscape/${file}.webp`, import.meta.url).href;
  }
  const activities = {
    about: ['wave','eat','thinking','jump'],
    'research-map': ['thinking','wave','thinking','jump'],
    publications: ['thinking','eat','thinking','wave'],
    experience: ['wave','thinking','celebrate'],
    projects: ['thinking','jump','thinking','wave'],
    recognition: ['celebrate','jump','wave','celebrate'],
    news: ['wave','eat','celebrate'],
  };
  const atlasFor = key => activityAtlas.sprite.animations[key] ? activityAtlas : baseAtlas;
  let hitAreas = [];
  const random = n => { const v = Math.sin(n * 127.1 + 53.7) * 43758.5453; return v - Math.floor(v); };
  const wrap = (n, span) => ((n % span) + span) % span;
  const clamp = (n,a,b) => Math.min(b,Math.max(a,n));
  function path(points, fill, stroke, lineWidth = 1) {
    ctx.beginPath(); points(ctx); if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lineWidth; ctx.stroke(); }
  }
  function ellipse(x,y,rx,ry,color) { ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fillStyle=color;ctx.fill(); }
  function rounded(x,y,w,h,r,fill,stroke) {
    ctx.beginPath();ctx.roundRect(x,y,w,h,r);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1;ctx.stroke();}
  }
  function cloud(x,y,s,opacity) {
    if (artwork.cloud) {
      ctx.save();ctx.globalAlpha=Math.min(1,opacity*1.7);
      ctx.drawImage(artwork.cloud,x-115*s,y-45*s,230*s,90*s);ctx.restore();return;
    }
    ctx.save();ctx.translate(x,y);ctx.scale(s,s);ctx.globalAlpha=opacity;
    path(p=>{p.moveTo(-50,12);p.bezierCurveTo(-72,8,-59,-9,-40,-6);p.bezierCurveTo(-37,-29,-7,-35,8,-18);p.bezierCurveTo(30,-28,55,-10,50,2);p.bezierCurveTo(78,5,68,19,48,18);p.lineTo(-50,18);},'#ffffff');
    ctx.restore();
  }
  function mountain(y,amplitude,seed,color,shift) {
    path(p=>{
      // Continuous, overlapping ridges avoid the repeated half-circle silhouette.
      const unit=Math.max(110,width*.16),first=Math.floor(shift/unit)-2;
      const ridge=i=>y-amplitude*(.26+random(i+seed)*.54+Math.sin(i*.73+seed)*.13);
      p.moveTo(-unit*2,height);p.lineTo(first*unit-shift,ridge(first));
      for(let i=first;i<first+Math.ceil(width/unit)+5;i++){
        const x=i*unit-shift,nextX=x+unit,here=ridge(i),next=ridge(i+1);
        p.bezierCurveTo(x+unit*.40,here,nextX-unit*.38,next,nextX,next);
      }
      p.lineTo(width+80,height);p.closePath();
    },color);
  }
  function tree(x,foot,s,seed,foreground=false) {
    if (artwork.tree) {
      const painting=seed%2===1&&artwork['tree-round']?artwork['tree-round']:artwork.tree;
      const treeHeight=(foreground?205:128)*s,treeWidth=treeHeight*painting.width/painting.height;
      ctx.save();ctx.translate(x,foot);ctx.rotate(Math.sin(time*.48+seed)*.004);
      ctx.globalAlpha=foreground?.91:.65;
      ctx.drawImage(painting,-treeWidth*.49,-treeHeight,treeWidth,treeHeight);
      ctx.restore();return;
    }
    ctx.save();ctx.translate(x,foot);ctx.scale(s,s);
    const sway=Math.sin(time*.65+seed)*1.5;
    path(p=>{p.moveTo(-4,0);p.bezierCurveTo(-5,-40,4,-81,sway,-132);p.lineTo(sway+5,-132);p.bezierCurveTo(7,-78,2,-42,5,0);p.closePath();},foreground?'#748784':'#9aa899');
    path(p=>{p.moveTo(0,-65);p.quadraticCurveTo(-22,-76,-36,-96);p.moveTo(3,-91);p.quadraticCurveTo(24,-104,35,-126);},null,foreground?'#748784':'#9aa899',2.5);
    const leaves=foreground?['#7faba0','#92b8a3','#acc7ad']:['#b5cbbb','#c4d6bf','#a8c4b6'];
    [[-32,-107,35,27],[20,-133,40,35],[-11,-155,38,29],[40,-99,30,25],[-34,-147,24,25]].forEach(([a,b,c,d],i)=>ellipse(a+sway,b,c,d,leaves[i%3]));
    ctx.globalAlpha=.38;
    for(let i=0;i<15;i++)ellipse((random(seed+i*2)-.5)*91,-94-random(seed+i*3)*78,2.5,1.5,'#f0f2d9');
    ctx.restore();
  }
  function flower(x,y,scale,color,seed) {
    const breeze=Math.sin(time*1.15+seed)*scale*1.3;
    path(p=>{p.moveTo(x,y);p.quadraticCurveTo(x+breeze,y-3*scale,x+breeze,y-7*scale);},null,'#91a795',.8*scale);
    for(let i=0;i<5;i++){const a=i*Math.PI*2/5;ellipse(x+breeze+Math.cos(a)*2.1*scale,y-7*scale+Math.sin(a)*2.1*scale,1.65*scale,1.5*scale,color);}
    ellipse(x+breeze,y-7*scale,.9*scale,.9*scale,'#d3b978');
  }
  function books(x,y,s) {
    ctx.save();ctx.translate(x,y);ctx.scale(s,s);
    rounded(-27,-10,54,10,2,'#6387a8');rounded(-24,-8,47,5,1,'#f5f1df');
    ctx.save();ctx.rotate(-.08);rounded(-21,-23,47,12,2,'#92b7a5');rounded(-18,-21,40,6,1,'#fbf7e7');ctx.restore();
    rounded(-18,-32,37,9,2,'#e1c498');rounded(-16,-30,33,4,1,'#fffaf0');
    ctx.restore();
  }
  function art(key,x,y,w,h) {
    const image=artwork[key];if(!image)return false;
    const s=Math.min(w/image.naturalWidth,h/image.naturalHeight),iw=image.naturalWidth*s,ih=image.naturalHeight*s;
    ctx.drawImage(image,x+(w-iw)/2,y+(h-ih)/2,iw,ih);return true;
  }
  function station(stop,x,foot,scale,active) {
    ctx.save();ctx.translate(x,foot);ctx.scale(scale,scale);
    ellipse(0,5,72,8,'#617b8c14');
    // Every stop is a different little place, rather than a repeated title card.
    const breathe=Math.sin(time*.8+stop.index),ink='#6e8dad',paper='#fffef8',wood='#b4b0a2';
    ctx.textAlign='center';ctx.textBaseline='middle';ctx.letterSpacing='1.6px';
    ctx.fillStyle='#7a91a8';ctx.font='500 9px system-ui,sans-serif';
    ctx.fillText(stop.index===0?'HELLO, TRAVELER':`CHAPTER ${String(stop.index).padStart(2,'0')}`,0,-167);
    ctx.letterSpacing='0px';ctx.fillStyle='#365c84';ctx.font='22px Georgia,serif';ctx.fillText(stop.title,0,-144);
    if(stop.id==='about'){
      // A bench marks the start; the tote is ready for the next stroll.
      rounded(-58,-70,116,10,4,'#b9c6c6');rounded(-58,-50,116,10,4,'#b9c6c6');
      rounded(-61,-25,122,10,3,'#9aafa9');rounded(-48,-49,5,51,2,wood);rounded(44,-49,5,51,2,wood);
      rounded(17,-60,31,35,7,'#e1d2b9','#c9bdaa');
      path(p=>{p.moveTo(24,-60);p.bezierCurveTo(23,-83,41,-83,40,-60);},null,'#adab99',3);
      ellipse(30,-42,7,5,'#80aac4');
      books(-32,-24,.6);
    }else if(stop.id==='research-map'){
      path(p=>{p.moveTo(-46,3);p.lineTo(-29,-109);p.moveTo(46,3);p.lineTo(29,-109);},null,wood,6);
      rounded(-67,-113,134,87,5,'#d3d9d3');rounded(-62,-108,124,77,3,paper,'#b9c9cd');
      if(!art('omnidrive',-58,-104,116,69)){
        const dots=[[-39,-69],[-9,-87],[17,-59],[41,-88],[39,-44]];
        path(p=>{p.moveTo(...dots[0]);p.lineTo(...dots[1]);p.lineTo(...dots[2]);p.lineTo(...dots[3]);p.moveTo(...dots[2]);p.lineTo(...dots[4]);},null,'#a1b8d5',1.5);
        dots.forEach(([a,b],i)=>ellipse(a,b,5,5,i===Math.floor(time/1.2)%5?'#678ec1':'#adc6de'));
      }
      rounded(-17,-27,36,4,1,'#94abbe');
    }else if(stop.id==='publications'){
      // An actual paper illustration sits above the reading stack.
      rounded(-47,-15,94,11,3,'#b3c2c7');rounded(-33,-6,5,10,1,wood);rounded(29,-6,5,10,1,wood);
      books(-1,-17,1.5);
      ctx.save();ctx.rotate(-.045+breathe*.008);
      rounded(-58,-122,116,74,3,paper,'#a5bacd');
      if(!art(exhibit,-53,-117,106,60))books(0,-76,.8);
      rounded(-46,-54,67,2,1,'#b9cbdc');ctx.restore();
    }else if(stop.id==='experience'){
      // A campus gate; the pennant moves with the same breeze as the trees.
      rounded(-57,-76,20,76,2,'#d9d8cb');rounded(37,-76,20,76,2,'#d9d8cb');
      path(p=>{p.moveTo(-61,-74);p.quadraticCurveTo(0,-142,61,-74);p.lineTo(52,-62);p.quadraticCurveTo(0,-116,-52,-62);p.closePath();},'#c0ccc9','#afc2c7');
      path(p=>{p.moveTo(-40,-69);p.lineTo(40,-69);p.moveTo(-30,-69);p.lineTo(-30,-9);p.moveTo(-10,-69);p.lineTo(-10,-9);p.moveTo(10,-69);p.lineTo(10,-9);p.moveTo(30,-69);p.lineTo(30,-9);},null,'#8ba8b4',2);
      rounded(-62,-7,124,8,2,'#c2c6bc');
      path(p=>{p.moveTo(0,-96);p.lineTo(0,-125);},null,ink,1.3);
      path(p=>{p.moveTo(1,-125);p.quadraticCurveTo(19,-130+breathe*3,32,-120);p.lineTo(13,-111);p.lineTo(1,-115);p.closePath();},'#91b1d8');
      if(artwork.pku||artwork.seed){rounded(-30,-85,60,29,3,paper,'#bdcbce');art('pku',-24,-81,21,21);art('seed',4,-81,21,21);}
    }else if(stop.id==='projects'){
      // A tiny outdoor worktable, with a real ticking terminal caret.
      rounded(-56,-40,112,8,3,'#b7beb3');rounded(-48,-32,5,34,2,wood);rounded(43,-32,5,34,2,wood);
      rounded(-41,-110,82,60,5,'#9fb5ce');rounded(-36,-105,72,49,2,'#f4f9ff');rounded(-4,-51,8,11,1,ink);
      rounded(-21,-43,42,3,1,ink);
      ctx.fillStyle='#809fc7';ctx.font='15px ui-monospace,monospace';ctx.textAlign='left';ctx.fillText('>_',-27,-88);
      [31,43,24].forEach((w,i)=>rounded(-26,-78+i*7,w,2,1,i===Math.floor(time*.7)%3?'#779dcc':'#c3d5e9'));
      if(Math.floor(time*2)%2===0)rounded(0,-64,4,4,1,'#7194c1');
      rounded(48,-60,16,20,4,'#e0d5be');
      path(p=>{p.moveTo(62,-56);p.bezierCurveTo(78,-59,72,-41,63,-46);},null,'#ccbfab',2);
      path(p=>{p.moveTo(54,-66);p.bezierCurveTo(43+breathe*3,-77,64,-79,57,-89);},null,'#9fb5c244',1.3);
    }else if(stop.id==='recognition'){
      // A gold medal, not a generic game trophy; the ribbon follows the wind.
      rounded(-4,-117,7,118,2,wood);
      path(p=>{p.moveTo(1,-117);p.bezierCurveTo(28,-125+breathe*4,45,-102,74,-113);p.lineTo(67,-68);p.bezierCurveTo(42,-57,27,-82+breathe*4,1,-74);p.closePath();},'#8eafd2');
      path(p=>{p.moveTo(24,-113);p.lineTo(28,-88);p.lineTo(41,-81);p.lineTo(51,-91);p.lineTo(49,-110);},null,'#d6e6f5',5);
      ellipse(39,-84,13,13,'#e1c78e');ellipse(39,-84,9,9,'#f1deb3');
      path(p=>{for(let i=0;i<10;i++){const a=i*Math.PI/5-Math.PI/2,r=i%2?3:6;if(i===0)p.moveTo(39+Math.cos(a)*r,-84+Math.sin(a)*r);else p.lineTo(39+Math.cos(a)*r,-84+Math.sin(a)*r);}p.closePath();},'#b89b61');
      rounded(-27,-6,54,8,3,'#c3caba');
      if(active){for(let i=0;i<5;i++){const q=wrap(time*.35+i*.21,1);ctx.globalAlpha=(1-q)*.7;ellipse(17+Math.sin(i*3)*53,-88-q*45,1.8,1.8,i%2?'#a7bddf':'#dbc28b');}ctx.globalAlpha=1;}
    }else{
      // Fresh letters arriving at a little mailbox.
      rounded(-6,-69,12,71,2,wood);rounded(-48,-111,96,55,10,'#9eb6cc','#88a4bb');
      rounded(-39,-101,78,4,2,'#587b9c');rounded(-37,-83,74,5,2,'#7e9db8');
      ctx.save();ctx.translate(2,-105);ctx.rotate(-.14+breathe*.03);
      rounded(-23,-27,46,32,2,paper,'#b7c9d8');path(p=>{p.moveTo(-23,-27);p.lineTo(0,-9);p.lineTo(23,-27);},null,'#a4bed3',1.2);ctx.restore();
      path(p=>{p.moveTo(47,-80);p.lineTo(47,-113);p.lineTo(68,-113);p.lineTo(68,-101);p.lineTo(48,-101);},'#d9b79e','#c5a78e',1.2);
      books(-39,0,.67);
    }
    ctx.restore();
    hitAreas.push({id:stop.id,left:x-89*scale,right:x+89*scale,top:foot-184*scale,bottom:foot+12*scale});
  }
  function animationFrame() {
    const atlas=atlasFor(action),data=atlas.sprite.animations[action]||sprite.animations.idle;
    const total=data.durationMs;
    activeAtlas=atlas===baseAtlas?'base':'activities';
    // Walking is phase-locked to the distance covered by the feet, including easing.
    let t=data.loop?(actionTime+(action==='idle'?2900:0))%total:Math.min(actionTime,total-1);
    for(let i=0;i<data.frames.length;i++){if(t<data.durationsMs[i])return data.frames[i];t-=data.durationsMs[i];}
    return data.frames[0];
  }
  function emitState(force=false){
    const stopId=stops[travelling?targetIndex:index].id,key=`${action}:${stopId}:${travelling}`;
    if(!force&&key===actionState)return;actionState=key;
    window.dispatchEvent(new CustomEvent('guide:state',{detail:{action,stopId,travelling}}));
  }
  function setAction(key){
    const atlas=atlasFor(key);
    action=atlas.sprite.animations[key]?key:'idle';actionTime=0;
    if(action==='idle')idleUntil=time+1.7+random(activityCursor+index*13)*1.4;
    if(diagnostics){diagnostics.actionSequence.push({action,stopId:stops[travelling?targetIndex:index].id,at:Math.round(time*1000)});if(diagnostics.actionSequence.length>60)diagnostics.actionSequence.shift();}
    emitState();
  }
  function nextActivity(){
    const sequence=activities[stops[index].id];
    setAction(sequence[activityCursor++%sequence.length]);
  }
  function updateActivity(){
    if(travelling)return;
    const clip=atlasFor(action).sprite.animations[action];
    if(action==='idle'){if(time>=idleUntil)nextActivity();}
    else if(!clip.loop&&actionTime>=clip.durationMs)setAction('idle');
  }
  function geometry(){
    const compact=height<300,narrow=width<700,portraitBadge=width<210&&height<=170;
    // The same live canvas expands from the mobile greeting into the reading strip.
    // Interpolating its composition avoids a character-size snap at a breakpoint.
    const blendT=clamp((width-150)/150,0,1),stripBlend=blendT*blendT*(3-2*blendT);
    const small=compact&&height<=170,badgeSize=Math.min(height*1.06,width*1.18,170),stripSize=Math.min(122,height*.86);
    const size=small?badgeSize+(stripSize-badgeSize)*stripBlend:compact?stripSize:narrow?Math.min(235,height*.49):clamp(height*.39,260,300);
    const badgeSpacing=clamp(width*.55,size*1.6,size*2.15);
    return {
      compact,narrow,portraitBadge,stripBlend:small?stripBlend:1,
      foot:height*(small?.94-.05*stripBlend:compact?.89:narrow?.77:.735),
      size,
      charX:width*(small?.5-.12*stripBlend:compact?.38:narrow?.42:.80),
      signBase:width*(compact?.76:narrow?.79:.91),
      signScale:compact?clamp(height/360,.23,.47):narrow?.67:clamp(height/780,.76,1.03),
      spacing:compact?badgeSpacing+(width*.88-badgeSpacing)*stripBlend:badgeSpacing,
    };
  }
  function samplePose() {
    const atlas=reduced.matches?baseAtlas:atlasFor(action),meta=atlas.sprite;
    displayedFrame=reduced.matches?0:animationFrame();
    activeAtlas=atlas===baseAtlas?'base':'activities';
    const facing=!reduced.matches&&travelling&&travelFacing<0?'left':'right';
    renderedPose={atlas:activeAtlas,frame:displayedFrame,columns:meta.columns,rows:meta.rows,facing};
    return atlas;
  }
  function character(x,foot,size) {
    const atlas=samplePose(),meta=atlas.sprite,anchor=meta.anchor;
    const breathing=!travelling&&!reduced.matches?Math.sin(time*1.7)*size*.0025:0;
    const facing=renderedPose.facing;
    const sx=(displayedFrame%meta.columns)*meta.cellWidth,sy=Math.floor(displayedFrame/meta.columns)*meta.cellHeight;
    const airborne=meta.animations[action]?.stages?.find(stage=>stage.name==='airborne');
    const jump=airborne&&actionTime>airborne.start&&actionTime<airborne.end?Math.sin((actionTime-airborne.start)/(airborne.end-airborne.start)*Math.PI)*size*.082:0;
    const stride=action==='walk'?Math.sin(actionTime/sprite.animations.walk.durationMs*Math.PI*4):0;
    ellipse(x,foot+size*.012,size*(.225-jump/size*.25+stride*.008),size*.030,'#627b8028');
    // A tight contact shadow anchors the feet; it softens during the airborne arc.
    ctx.save();ctx.globalAlpha=1-Math.min(1,jump/(size*.065));
    ellipse(x,foot+size*.005,size*(.11+stride*.009),size*.012,'#4e667441');ctx.restore();
    ctx.save();ctx.translate(x,foot+breathing-jump);if(facing==='left')ctx.scale(-1,1);
    ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
    ctx.drawImage(atlas.image,sx,sy,meta.cellWidth,meta.cellHeight,-anchor.x/meta.cellWidth*size,-anchor.y/meta.cellHeight*size,size,size);
    ctx.restore();
    characterArea={left:x-size*.43,right:x+size*.43,top:foot-size*.90,bottom:foot+size*.04};
  }
  function emitPose(){
    if(!renderedPose)return;
    const key=`${renderedPose.atlas}:${renderedPose.frame}:${renderedPose.facing}`;
    if(key===poseState)return;poseState=key;
    // The fixed route marker uses this same frame, even while the landscape is offscreen.
    window.dispatchEvent(new CustomEvent('guide:pose',{detail:{...renderedPose}}));
  }
  function publishFrame(canvasDrawn){
    if(diagnostics){
      const {portraitBadge,charX,foot,size}=geometry();
      if(diagnostics.frameSequence.at(-1)?.frame!==displayedFrame||diagnostics.frameSequence.at(-1)?.action!==action){diagnostics.frameSequence.push({action,frame:displayedFrame,at:Math.round(time*1000)});if(diagnostics.frameSequence.length>96)diagnostics.frameSequence.shift();}
      Object.assign(diagnostics,{frames,drawN:frames,elapsed:time,action,atlas:activeAtlas,frame:displayedFrame,pose:renderedPose,progress,worldDistance,targetId:stops[targetIndex].id,stopId:stops[index].id,travelling,travelPhase,loading:false,canvas:[width,height],canvasDrawn,onScreen,portraitBadge,character:{x:charX,foot,size},signs:hitAreas,focus,exhibit});
    }
    emitPose();
  }
  function draw() {
    if(!width||!height)return;
    const {compact,narrow,portraitBadge,stripBlend,foot,size:figureSize,charX,signBase,signScale,spacing}=geometry();
    const horizon=height*(compact?.40:.405);
    const ground=height*(compact?.63:.615),drift=worldDistance;
    const sky=ctx.createLinearGradient(0,0,0,height);sky.addColorStop(0,'#d9e9f4');sky.addColorStop(.50,'#f2f6ed');sky.addColorStop(1,'#e0e9d3');
    ctx.fillStyle=sky;ctx.fillRect(0,0,width,height);
    // Distant air: very slow cloud motion never interferes with text.
    for(let i=0;i<7;i++)cloud(wrap(i*width/4+time*(i%2?2:1.2)-drift*.08,width+250)-125,height*(.14+(i%3)*.095),compact?.35:.62+(i%3)*.25,.44);
    mountain(horizon+height*.11,height*(compact?.13:.19),17,'#becfd4',drift*.09);
    mountain(horizon+height*.14,height*.14,4,'#a8c3bc',drift*.17);
    const lake=ctx.createLinearGradient(0,horizon,0,ground+30);lake.addColorStop(0,'#b3d3dc');lake.addColorStop(1,'#d9e7d8');ctx.fillStyle=lake;ctx.fillRect(0,horizon+height*.10,width,height*.35);
    path(p=>{p.moveTo(0,horizon+height*.12);p.bezierCurveTo(width*.25,horizon+height*.15,width*.48,horizon+height*.08,width*.71,horizon+height*.14);p.bezierCurveTo(width*.89,horizon+height*.19,width,horizon+height*.16,width,horizon+height*.14);},null,'#f7f9efb8',1.5);
    for(let i=0;i<46;i++){
      const y=horizon+height*(.125+random(i+20)*.26),x=wrap(random(i)*width+time*(2+random(i+3)*3)-drift*.23,width+60)-30;
      ctx.globalAlpha=.15+Math.sin(time*.7+i)*.10;ctx.strokeStyle='#ffffff';ctx.lineWidth=compact?.7:1.1;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+(8+random(i+14)*37)*(compact?.6:1),y);ctx.stroke();
    }ctx.globalAlpha=1;
    // A shore path rather than a game HUD: soft grassy contours and fine dry-stone edges.
    path(p=>{p.moveTo(0,ground+height*.035);p.bezierCurveTo(width*.30,ground-height*.045,width*.51,ground+height*.054,width*.72,ground+height*.012);p.bezierCurveTo(width*.83,ground-height*.017,width*.92,ground+height*.011,width,ground-height*.013);p.lineTo(width,height);p.lineTo(0,height);p.closePath();},'#d2dfc6');
    const farEdge=p=>{p.moveTo(0,foot-height*.045);p.bezierCurveTo(width*.25,foot-height*.09,width*.55,foot-height*.055,width*.73,foot-height*.058);p.bezierCurveTo(width*.84,foot-height*.06,width*.93,foot-height*.098,width,foot-height*.073);};
    path(p=>{farEdge(p);p.lineTo(width,foot+height*.13);p.bezierCurveTo(width*.82,foot+height*.071,width*.63,foot+height*.098,width*.46,foot+height*.078);p.bezierCurveTo(width*.25,foot+height*.052,width*.13,foot+height*.123,0,foot+height*.096);p.closePath();},'#f1ead8');
    path(farEdge,null,'#dce0c6',1.1);
    const treeScale=compact?.32:clamp(height/760,.6,1.25);
    for(let i=0;i<5;i++){
      const x=wrap(i*width*.37+width*1.03-drift*.5,width*1.8)-width*.4;
      tree(x,ground+height*.015,treeScale*(.62+random(i)*.24),i*7,false);
    }
    // Small meadow detail changes with world position, never randomizes between frames.
    for(let i=0;i<(compact?24:96);i++){
      const x=wrap(random(i+61)*(width+90)-drift,width+90)-45;
      const y=foot+height*(.105+random(i+92)*.15),scale=compact?.5:.75+random(i+34)*.7;
      if(y<height-2)flower(x,y,scale,i%4===0?'#bed0e0':'#fffcee',i);
    }
    for(let i=0;i<26;i++){
      const x=wrap(random(i+315)*(width+90)-drift,width+90)-45,y=foot+height*(.024+random(i+22)*.055);
      ellipse(x,y,compact?1.4:2.1,compact?.6:.9,'#d6d1bf');
    }
    hitAreas=[];
    // Landmarks belong to the path, so returning visits the same place. The camera
    // reveals each stop through movement instead of swapping translucent scenery.
    if(stripBlend>0)for(const stop of stops){
      const x=signBase+(stop.index-progress)*spacing,margin=100*signScale;
      if(x>-margin&&x<width+margin){ctx.save();ctx.globalAlpha=stripBlend;station(stop,x,foot-figureSize*.04,signScale,stop.index===targetIndex);ctx.restore();}
    }
    if(travelling)hitAreas=[];
    character(charX,foot,figureSize);
    // A few distant birds and drifting petals keep the parked view alive.
    ctx.strokeStyle='#829da1';ctx.lineWidth=compact?.7:1.1;ctx.lineCap='round';
    for(let i=0;i<3;i++){
      const x=wrap(width*.54+i*24+time*5-drift*.07,width+60)-30,y=height*.26+Math.sin(time*.4+i)*height*.014+i*8,wing=(compact?2:4)*(1+Math.sin(time*2+i)*.2);
      ctx.beginPath();ctx.moveTo(x-wing*2,y);ctx.quadraticCurveTo(x-wing,y-wing*.6,x,y);ctx.quadraticCurveTo(x+wing,y-wing*.6,x+wing*2,y);ctx.stroke();
    }
    if(!compact){
      // Small hand-painted plants give the near ground a different scale and depth.
      for(let i=0;i<6;i++){
        const painting=artwork[i%3===0?'daisies':'shrub'];if(!painting)continue;
        const plantWidth=65+random(i+602)*45,plantHeight=plantWidth*painting.height/painting.width;
        const x=wrap(i*width*.29+width*.21-drift*1.12,width*1.8)-width*.35;
        const y=height-10+random(i+65)*28;
        ctx.save();ctx.translate(x,y);ctx.rotate(Math.sin(time*.75+i)*.012);ctx.globalAlpha=.83;
        ctx.drawImage(painting,-plantWidth/2,-plantHeight,plantWidth,plantHeight);ctx.restore();
      }
      const vignette=ctx.createLinearGradient(0,0,0,height);vignette.addColorStop(0,'#f7f9f800');vignette.addColorStop(.88,'#f7f9f800');vignette.addColorStop(1,'#f7f9f82b');ctx.fillStyle=vignette;ctx.fillRect(0,0,width,height);
    }
    frames++;
    publishFrame(true);
  }
  function emit(force=false){
    if(!force&&time-lastProgress<.05)return;lastProgress=time;
    window.dispatchEvent(new CustomEvent('journey:progress',{detail:{progress,travelling,activeId:stops[index].id,targetId:stops[targetIndex].id}}));
  }
  function arrive(){
    travelling=false;travelPhase='idle';progress=targetIndex;index=targetIndex;activityCursor=0;worldDistance=progress*geometry().spacing;
    window.dispatchEvent(new CustomEvent('journey:arrive',{detail:{id:stops[index].id,index}}));
    if(reduced.matches)setAction('idle');else nextActivity();
    emitState(true);emit(true);
  }
  function travel(detail={}){
    const named=stops.find(stop=>stop.id===detail.id);
    targetIndex=named?named.index:clamp(Number.isInteger(detail.index)?detail.index:0,0,6);
    const nextFacing=Math.sign(targetIndex-progress)||1,alreadyWalking=travelling&&travelPhase==='walk'&&nextFacing===travelFacing;
    from=progress;travelFacing=nextFacing;travelTime=alreadyWalking?departureDuration:0;travelling=Math.abs(targetIndex-progress)>.001;
    travelPhase=travelling?(alreadyWalking?'walk':'depart'):'idle';
    setAction(travelling?(alreadyWalking?'walk':'turnRight'):'wave');
    if(detail.immediate||!motion||reduced.matches||!travelling)arrive();
    emit(true);request();
  }
  const animated=()=>motion&&!reduced.matches;
  const canRun=()=>visible&&pageVisible;
  function request(){if(!raf&&canRun())raf=requestAnimationFrame(render);}
  function cancel(){if(raf)cancelAnimationFrame(raf);raf=0;lastTime=0;}
  function render(now){
    raf=0;if(!canRun())return;
    if(ready&&animated()&&now-lastDraw<1000/30-1){request();return;}
    const delta=lastTime?Math.min((now-lastTime)/1000,.1):0;lastTime=now;
    if(animated()){
      time+=delta;actionTime+=delta*1000;
      if(travelling){
        travelTime+=delta;
        if(travelTime<departureDuration){
          travelPhase='depart';actionTime=travelTime/departureDuration*sprite.animations.turnRight.durationMs;
        }else if(travelTime<departureDuration+walkingDuration){
          travelPhase='walk';if(action!=='walk')setAction('walk');
          const p=clamp((travelTime-departureDuration)/walkingDuration,0,1),ease=p*p*(3-2*p);
          progress=from+(targetIndex-from)*ease;
          const {spacing,size}=geometry(),distance=Math.abs(progress-from)*spacing;
          actionTime=distance/(size*.85)*sprite.animations.walk.durationMs;
        }else if(travelTime<journeyDuration){
          progress=targetIndex;travelPhase='arrive';if(action!=='turnFront')setAction('turnFront');
          actionTime=(travelTime-departureDuration-walkingDuration)/arrivalDuration*sprite.animations.turnFront.durationMs;
        }else arrive();
      }else updateActivity();
    }
    worldDistance=progress*geometry().spacing;
    if(onScreen)draw();
    else {samplePose();publishFrame(false);}
    lastDraw=now;emit();
    if(!ready){ready=true;window.dispatchEvent(new CustomEvent('scene:ready',{detail:{assets:4,view:'guide'}}));emitState(true);}
    if(animated())request();
  }
  function resize(){
    width=container.clientWidth;height=container.clientHeight;if(!width||!height)return;
    const dpr=Math.min(devicePixelRatio||1,2);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);request();
  }
  const hit=event=>{const r=canvas.getBoundingClientRect(),x=event.clientX-r.left,y=event.clientY-r.top;const within=a=>a&&x>=a.left&&x<=a.right&&y>=a.top&&y<=a.bottom;return within(characterArea)?{id:'character'}:hitAreas.find(within);};
  function interact(key){
    if(travelling||!animated())return;
    window.dispatchEvent(new CustomEvent('guide:interact',{detail:{action:key}}));
    setAction(key);request();
  }
  canvas.addEventListener('pointermove',event=>{
    const target=hit(event);canvas.style.cursor=target?'pointer':'';
    if(target?.id==='character'&&!travelling&&action==='idle'&&time-hoverTime>5&&animated()){
      // A quick blink acknowledges a visitor, without interrupting the tour or changing stops.
      actionTime=600;hoverTime=time;request();
    }
  });
  canvas.addEventListener('pointerdown',event=>{pointerDown={x:event.clientX,y:event.clientY};});
  canvas.addEventListener('click',event=>{
    if(pointerDown&&Math.hypot(event.clientX-pointerDown.x,event.clientY-pointerDown.y)>8)return;
    const target=hit(event);
    if(target?.id==='character')interact(['wave','jump','celebrate','eat'][Math.floor(random(Math.floor(time*10)+frames)*4)]);
    else if(target)window.dispatchEvent(new CustomEvent('scene:select',{detail:{id:target.id}}));
  });
  window.removeEventListener('journey:travel',queue);window.addEventListener('journey:travel',event=>travel(event.detail));
  window.addEventListener('scene:motion',event=>{motion=Boolean(event.detail?.enabled);cancel();request();});
  window.addEventListener('scene:visibility',event=>{visible=Boolean(event.detail?.visible);cancel();request();});
  window.addEventListener('scene:focus',event=>{focus=event.detail?.id||null;request();});
  window.addEventListener('scene:exhibit',event=>{
    if(['duplex-mpe','motion-omni','omnidrive','c3'].includes(event.detail?.id)){exhibit=event.detail.id;request();}
  });
  window.addEventListener('guide:greet',()=>interact('wave'));
  window.addEventListener('guide:activity',event=>{
    const key=event.detail?.action;
    if(key==='auto'){if(!travelling){activityCursor=0;nextActivity();request();}}
    else if(key&&atlasFor(key).sprite.animations[key]&&key!=='walk')interact(key);
  });
  reduced.addEventListener('change',()=>{if(reduced.matches&&travelling)arrive();cancel();request();});
  document.addEventListener('visibilitychange',()=>{pageVisible=!document.hidden;cancel();request();});
  new ResizeObserver(resize).observe(container);
  new IntersectionObserver(([entry])=>{onScreen=entry.isIntersecting;cancel();request();}).observe(container);
  if(pending)travel({...pending,immediate:true});
  resize();
}
