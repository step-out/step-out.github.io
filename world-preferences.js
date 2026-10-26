const root = document.documentElement;
const control = document.querySelector('.appearance-control');
const toggle = document.querySelector('.theme-toggle');
const options = document.getElementById('theme-options');
const choices = [...document.querySelectorAll('[data-theme-choice]')];
let mode = 'auto';
try { const saved = localStorage.getItem('garden-lighting'); if (['auto','day','night'].includes(saved)) mode=saved; } catch {}
const icons = {
  day: '<circle cx="10" cy="10" r="3.5" stroke="currentColor" stroke-width="1.4"/><path d="M10 1v2m0 14v2M1 10h2m14 0h2M3.6 3.6 5 5m10 10 1.4 1.4M3.6 16.4 5 15M15 5l1.4-1.4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>',
  night: '<path d="M16.6 12.4A7 7 0 0 1 7.5 3.3 7 7 0 1 0 16.6 12.4Z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>'
};
function apply() {
  const hour = new Date().getHours();
  const theme = mode==='auto' ? (hour>=7 && hour<19 ? 'day' : 'night') : mode;
  const changed = root.dataset.theme !== theme;
  root.dataset.theme = theme; root.dataset.themeMode = mode;
  toggle.querySelector('svg').innerHTML=icons[theme];
  toggle.querySelector('span').textContent=theme==='night'?'Night':'Day';
  toggle.setAttribute('aria-label', `Lighting: ${theme}${mode==='auto'?' (automatic)':''}. Choose appearance.`);
  toggle.title = mode==='auto' ? `Automatic ${theme} lighting · follows your local time` : `${theme==='day'?'Day':'Night'} lighting`;
  choices.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.themeChoice===mode)));
  document.querySelector('meta[name="theme-color"]').content=theme==='night'?'#101b2d':'#f5f7fc';
  if(changed) window.dispatchEvent(new CustomEvent('world:lighting',{detail:{theme,mode}}));
}
function close() { options.hidden=true; toggle.setAttribute('aria-expanded','false'); }
toggle.addEventListener('click',()=>{options.hidden=!options.hidden;toggle.setAttribute('aria-expanded',String(!options.hidden));});
choices.forEach(button=>button.addEventListener('click',()=>{mode=button.dataset.themeChoice;try{localStorage.setItem('garden-lighting',mode);}catch{}apply();close();toggle.focus({preventScroll:true});}));
document.addEventListener('pointerdown',event=>{if(!control.contains(event.target))close();});
control.addEventListener('focusout',event=>{if(!control.contains(event.relatedTarget))close();});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!options.hidden){event.stopImmediatePropagation();close();toggle.focus({preventScroll:true});}},true);
window.addEventListener('storage',event=>{if(event.key==='garden-lighting'){mode=['day','night'].includes(event.newValue)?event.newValue:'auto';apply();}});
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&mode==='auto')apply();});
setInterval(()=>{if(mode==='auto')apply();},60000);
control.hidden=false;apply();
