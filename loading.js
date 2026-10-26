// Reveal the document only after the scene has loaded and painted its first complete frame.
(() => {
  const root=document.documentElement, overlay=document.querySelector('.page-loader');
  root.dataset.loadingController='ready';
  const status=document.getElementById('loading-status'),title=document.getElementById('loading-title');
  const progress=document.querySelector('.loading-progress'),actions=document.querySelector('.loading-actions');
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let state='loading', completed=0, exitAnimation=null;
  const blocked=[...document.body.children].filter(el=>el!==overlay&&!['SCRIPT','STYLE'].includes(el.tagName));
  const originals=blocked.map(el=>({el,inert:el.inert,hidden:el.getAttribute('aria-hidden')}));
  originals.forEach(({el})=>{el.inert=true;el.setAttribute('aria-hidden','true');});
  document.body.setAttribute('aria-busy','true');overlay.dataset.state=state;
  overlay.querySelector('img').addEventListener('error',event=>{event.currentTarget.hidden=true;});
  overlay.focus({preventScroll:true});
  const slowTimer=setTimeout(()=>{
    if(state!=='loading')return;
    status.textContent='This is taking a little longer…';
    document.querySelector('.loading-continue').innerHTML='Read while it loads <span aria-hidden="true">→</span>';
    actions.hidden=false;
  },12000);
  function release(fallback=false) {
    if(state==='revealing'||state==='complete')return;
    state='revealing';overlay.dataset.state=state;clearTimeout(slowTimer);
    if(!fallback){progress.value=1;status.textContent='Ready to explore.';}
    // Keep the renderer live throughout the fade; the page never becomes a screenshot.
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      root.classList.add('is-revealing');root.classList.remove('is-loading');
      const finish=()=>{
        if(state==='complete')return;
        state='complete';root.classList.remove('is-revealing');overlay.hidden=true;
        originals.forEach(({el,inert,hidden})=>{el.inert=inert;if(hidden===null)el.removeAttribute('aria-hidden');else el.setAttribute('aria-hidden',hidden);});
        document.body.removeAttribute('aria-busy');
        if(overlay.contains(document.activeElement)){
          const heading=document.querySelector('#reader section:not([hidden]) h2')||document.getElementById('intro-title');
          heading.setAttribute('tabindex','-1');heading.focus({preventScroll:true});
        }
        window.dispatchEvent(new CustomEvent('page:revealed',{detail:{fallback}}));
      };
      if(reduced.matches){finish();return;}
      exitAnimation=overlay.animate([{opacity:1},{opacity:0}],{duration:480,easing:'ease-out',fill:'forwards'});
      exitAnimation.finished.then(finish).catch(finish);
    }));
  }
  function fail() {
    if(state==='revealing'||state==='complete')return;
    state='error';overlay.dataset.state=state;clearTimeout(slowTimer);
    title.textContent='The garden needs a moment.';
    status.textContent='The 3D scene could not load. You can still read everything.';
    document.querySelector('.loading-continue').innerHTML='Read without the scene <span aria-hidden="true">→</span>';
    actions.hidden=false;
  }
  window.addEventListener('scene:load-progress',event=>{
    if(state!=='loading')return;
    const d=event.detail||{};
    if(Number.isFinite(d.loaded)&&d.total>0){completed=Math.max(completed,Math.min(1,d.loaded/d.total));progress.value=completed;}
    const labels={initializing:'Preparing your visit…',assets:'Preparing the garden…',character:'Meeting your guide…',compile:'Setting the light…',compiling:'Setting the light…',render:'Almost there…',ready:'Almost there…'};
    if(actions.hidden&&labels[d.stage])status.textContent=labels[d.stage];
  });
  window.addEventListener('scene:ready',()=>release());
  window.addEventListener('scene:error',fail);
  document.querySelector('script[src="world-scene.js"]').addEventListener('error',fail);
  document.querySelector('script[src="script.js"]').addEventListener('error',fail);
  document.querySelector('.loading-retry').addEventListener('click',()=>location.reload());
  document.querySelector('.loading-continue').addEventListener('click',()=>release(true));
  document.addEventListener('keydown',event=>{
    if(state==='complete'||event.key!=='Tab')return;
    const buttons=[...actions.querySelectorAll('button')].filter(button=>button.getClientRects().length);
    if(!buttons.length){event.preventDefault();overlay.focus({preventScroll:true});return;}
    if(event.shiftKey&&(document.activeElement===buttons[0]||document.activeElement===overlay)){event.preventDefault();buttons.at(-1).focus();}
    else if(!event.shiftKey&&document.activeElement===buttons.at(-1)){event.preventDefault();buttons[0].focus();}
  },true);
  reduced.addEventListener('change',event=>{if(event.matches)exitAnimation?.finish();});
  if(new URLSearchParams(location.search).has('scene-debug'))window.__pageLoading=()=>({state,progress:progress.value,blocked:originals.some(({el})=>el.inert),fallbackVisible:!actions.hidden});
})();
