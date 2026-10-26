// The route companion uses frames rendered from the same 3D model as the guide.
// A small 2D canvas avoids allocating another WebGL context for the navigation.
const element = document.querySelector('.route-traveler');
const canvas = document.querySelector('.route-robot');
const track = document.querySelector('.route-track');
const route = document.querySelector('.journey-route');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
let stopped = reduced.matches || document.body.classList.contains('motion-paused');
let visible = !document.hidden, travelling = false, station = 0, progress = 0;
let x = 0, direction = 1, clock = 0, rest = .65, last = 0, raf = 0, ready = false;
let metrics = {start: 0, span: 0, y: 0, size: 64};
let atlas, picture, context, lastFrame = -1, lastFacing = 0;
const diagnostics = new URLSearchParams(location.search).has('scene-debug');

function measure() {
  const links = [...track.querySelectorAll('a')];
  const first = links[0].getBoundingClientRect(), end = links.at(-1).getBoundingClientRect();
  const area = track.getBoundingClientRect();
  const dot = links[0].querySelector('.route-dot').getBoundingClientRect();
  const old = metrics;
  metrics = {start:first.x+first.width/2-area.x,span:end.x+end.width/2-first.x-first.width/2,y:dot.y+dot.height/2-area.y,size:innerHeight<450?44:area.width<650?52:64};
  track.querySelectorAll('.route-line,.route-progress').forEach(line=>line.style.top=`${metrics.y}px`);
  const fraction = old.span ? (x-old.start)/old.span : station/6;
  x = metrics.start + Math.max(0,Math.min(1,fraction))*metrics.span;
  element.style.width = element.style.height = `${metrics.size}px`;
  const foot = atlas?.anchor?.y ?? .92;
  element.style.top = `${metrics.y-metrics.size*foot}px`;
  lastFrame=-1;place(); draw('idle',0);request();
}
function place() {
  element.style.left = `${x}px`;
}
function patrolBounds() {
  const center = metrics.start + station / 6 * metrics.span;
  const reach = Math.min(18, metrics.span / 6 * .18);
  return {reach, low: Math.max(metrics.start, center - reach), high: Math.min(metrics.start + metrics.span, center + reach)};
}
function draw(clipName, elapsed) {
  if (!ready) return;
  const clip=atlas.clips[clipName] || atlas.clips.idle;
  const index=clip.start+Math.floor(elapsed*clip.fps)%clip.count;
  if(index===lastFrame&&direction===lastFacing)return;
  lastFrame=index;lastFacing=direction;
  const size=atlas.frameSize;
  context.clearRect(0,0,canvas.width,canvas.height);
  context.save();
  if(direction<0){context.translate(canvas.width,0);context.scale(-1,1);}
  context.drawImage(picture,(index%atlas.columns)*size,Math.floor(index/atlas.columns)*size,size,size,0,0,canvas.width,canvas.height);
  context.restore();
}
function render(now) {
  raf=0;if(!visible||!ready)return;
  const dt=last?Math.min((now-last)/1000,.25):0;last=now;
  let clip='idle';
  if(stopped){x=metrics.start+station/6*metrics.span;clock=0;}
  else {
    clock+=dt;
    if(!travelling){const bounds=patrolBounds();x=Math.max(bounds.low,Math.min(bounds.high,x));}
    if(travelling){
      const target=metrics.start+progress/6*metrics.span;
      const difference=target-x;
      if(Math.abs(difference)>1){direction=Math.sign(difference);x+=difference*(1-Math.exp(-dt*9));clip='run';}
    }else if(rest>0){rest-=dt;}
    else{
      // Keep the companion beside its own dot, well inside the current column.
      const {reach,low,high}=patrolBounds();
      x+=direction*dt*Math.min(metrics.size*.65,reach*1.6);
      if(x>=high){x=high;direction=-1;rest=.24;clock=0;}
      else if(x<=low){x=low;direction=1;rest=.24;clock=0;}
      clip='run';
    }
  }
  place();draw(clip,clock);
  if(diagnostics)window.__routeRobot={x,station,progress,direction,clip,frame:lastFrame,paused:stopped,travelling,ready};
  if(!stopped)request();
}
function request(){if(!raf&&ready&&visible)raf=requestAnimationFrame(render);}
function pause(value){stopped=value;last=0;if(raf)cancelAnimationFrame(raf);raf=0;request();}
window.addEventListener('journey:progress',event=>{
  const data=event.detail||{};
  if(Number.isFinite(data.progress))progress=Math.max(0,Math.min(6,data.progress));
  if(data.travelling&&!travelling){clock=0;rest=0;}
  travelling=Boolean(data.travelling);
  if(!travelling)station=Math.round(progress);
  request();
});
window.addEventListener('journey:travel',event=>{
  if(event.detail?.immediate&&Number.isInteger(event.detail.index)){
    station=event.detail.index;progress=station;travelling=false;
    x=metrics.start+station/6*metrics.span;rest=.7;clock=0;request();
  }
});
window.addEventListener('journey:arrive',event=>{
  const wasTravelling=travelling;
  if(Number.isInteger(event.detail?.index))station=event.detail.index;
  if(!wasTravelling)x=metrics.start+station/6*metrics.span;
  travelling=false;progress=station;rest=.7;clock=0;request();
});
window.addEventListener('scene:motion',event=>pause(!event.detail?.enabled||reduced.matches));
window.addEventListener('scene:error',()=>pause(true));
window.addEventListener('scene:ready',()=>pause(reduced.matches||document.body.classList.contains('motion-paused')));
reduced.addEventListener('change',()=>pause(reduced.matches||document.body.classList.contains('motion-paused')));
document.addEventListener('visibilitychange',()=>{visible=!document.hidden;last=0;if(!visible&&raf){cancelAnimationFrame(raf);raf=0;}else request();});
new ResizeObserver(measure).observe(track);
new MutationObserver(()=>{if(!route.hidden)measure();}).observe(route,{attributes:true,attributeFilter:['hidden']});

(async()=>{
  try {
    const response=await fetch('./assets/world/character/route-robot.json');
    if(!response.ok)throw new Error('Route frames unavailable');
    atlas=await response.json();picture=new Image();picture.decoding='async';
    await new Promise((resolve,reject)=>{picture.onload=resolve;picture.onerror=reject;picture.src=`./assets/world/character/${atlas.image}`;});
    context=canvas.getContext('2d');if(!context)throw new Error('Canvas unavailable');
    canvas.width=canvas.height=atlas.frameSize;
    ready=true;measure();x=metrics.start+station/6*metrics.span;place();element.classList.add('robot-ready');request();
  }catch{element.hidden=true;}
})();
