// One journey state drives the guide, navigation, content, and status display.
(() => {
  const $ = selector => document.querySelector(selector);
  const reader = $('#reader');
  const profile = $('.profile');
  const stage = $('.guide-stage');
  const scrollArea = $('.reader-scroll');
  const sections = [...scrollArea.children].filter(node => node.tagName === 'SECTION');
  const sectionIds = new Set(sections.map(section => section.id));
  const navLinks = [...document.querySelectorAll('.main-nav a, .section-nav a, .route-track a')];
  const papers = [...document.querySelectorAll('.publication')];
  const filters = [...document.querySelectorAll('[data-filter]')];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const stops = [
    {id: 'about', title: 'About'}, {id: 'research-map', title: 'Research'},
    {id: 'publications', title: 'Papers'}, {id: 'experience', title: 'Experience'},
    {id: 'projects', title: 'Projects'}, {id: 'recognition', title: 'Honors'}, {id: 'news', title: 'News'}
  ];
  const motionButton = $('.motion-toggle');
  const tourButton = $('.tour-toggle');
  const route = $('.journey-route');
  const countdown = $('.journey-countdown');
  const guidePlay = $('.guide-play');
  const compactGuideAction = $('.compact-guide-action');

  const state = {
    index: 0, section: null, progress: 0, travelling: false, action: 'wave',
    paused: reduced.matches, auto: !reduced.matches && (!location.hash || location.hash === '#about'),
    ready: false, failed: false, timeLeft: 0, dwell: 0
  };
  let navigationId = 0, ticker = 0, lastTick = 0, arrivalTimer = 0, returnFocus = null;
  const animations = new Set();
  const visited = new Set([0]);
  let restoringHistory = false, historySaveTimer = 0;
  const selectedYear = () => filters.find(button => button.getAttribute('aria-pressed') === 'true')?.dataset.filter || 'all';
  function saveReadingPosition() {
    if (restoringHistory) return;
    history.replaceState({...history.state, journey: {scrollY: window.scrollY, year: selectedYear()}}, '', location.href);
  }
  window.addEventListener('scroll', () => {
    if (!restoringHistory && !historySaveTimer) historySaveTimer = setTimeout(() => {historySaveTimer = 0; saveReadingPosition();}, 300);
  }, {passive: true});
  window.addEventListener('pagehide', saveReadingPosition);
  let stageAnimation = null;
  function clearStageAnimation() {
    const current = stageAnimation; stageAnimation = null;
    current?.cancel();
    stage.removeAttribute('style');
    stage.classList.remove('stage-in-transit');
  }
  function animateStage(from) {
    if (!from || state.paused || reduced.matches || !state.ready) return;
    const to = stage.getBoundingClientRect();
    if (Math.abs(from.width - to.width) < 2 && Math.abs(from.x - to.x) < 2 && Math.abs(from.height-to.height)<2 && Math.abs(from.y-to.y)<2) return;
    if (from.bottom < $('.site-header').getBoundingClientRect().bottom || from.y >= innerHeight) return;
    // Interpolate the live canvas viewport, never a scaled screenshot of the guide.
    Object.assign(stage.style, {position: 'fixed', left: `${to.x}px`, top: `${to.y}px`, right: 'auto', bottom: 'auto', width: `${to.width}px`, height: `${to.height}px`, margin: '0', zIndex: '10', pointerEvents: 'none'});
    stage.classList.add('stage-in-transit');
    const frame = rect => ({left: `${rect.x}px`, top: `${rect.y}px`, width: `${rect.width}px`, height: `${rect.height}px`});
    const animation = stage.animate([frame(from),frame(to)], {duration: 420, easing: 'cubic-bezier(.2,.75,.2,1)'});
    stageAnimation = animation;
    animation.finished.catch(() => {}).finally(() => {if (stageAnimation === animation) clearStageAnimation();});
  }
  let paperExhibit = '', exhibitFrame = 0;
  function setPaperExhibit(id) {
    if (id === paperExhibit) return;
    paperExhibit = id;
    window.dispatchEvent(new CustomEvent('scene:exhibit', {detail: {id}}));
  }
  function updatePaperExhibit() {
    exhibitFrame = 0;
    if (state.section !== 'publications') return;
    const top = readingTop();
    const bottom = route.getBoundingClientRect().top;
    const current = papers.filter(paper => !paper.hidden).map(paper => {
      const box = paper.getBoundingClientRect();
      return {paper, top: box.top, visible: Math.max(0, Math.min(box.bottom,bottom) - Math.max(box.top,top))};
    }).filter(item => item.visible > 48).sort((a,b) => Math.abs(a.top - top) - Math.abs(b.top - top))[0];
    if (current?.visible > 0) setPaperExhibit(current.paper.id);
  }
  function queuePaperExhibit() {
    if (state.section === 'publications' && !exhibitFrame) exhibitFrame = requestAnimationFrame(updatePaperExhibit);
  }
  function readingTop() {
    const headerBottom = $('.site-header').getBoundingClientRect().bottom;
    const sceneBottom = state.section && matchMedia('(max-width: 960px)').matches ? stage.getBoundingClientRect().bottom : 0;
    return Math.max(headerBottom,sceneBottom);
  }
  function updateReadingSeam() {
    if (reader.hidden) return;
    const edge = document.querySelector('.journey-main').getBoundingClientRect().right;
    document.documentElement.style.setProperty('--reader-edge', `${edge}px`);
  }
  new ResizeObserver(updateReadingSeam).observe(document.querySelector('.journey-main'));
  window.addEventListener('scroll', queuePaperExhibit, {passive: true});
  window.addEventListener('resize', queuePaperExhibit);
  window.addEventListener('resize', clearStageAnimation);
  window.addEventListener('resize', updateReadingSeam);
  const navIndicator = document.createElement('span');
  navIndicator.className = 'navigation-indicator';
  navIndicator.setAttribute('aria-hidden', 'true');
  $('.main-nav').appendChild(navIndicator);

  function positionIndicator() {
    const current = $('.main-nav a[aria-current]');
    navIndicator.style.opacity = current ? '1' : '0';
    if (current) {
      navIndicator.style.width = `${current.offsetWidth}px`;
      navIndicator.style.transform = `translate(${current.offsetLeft}px,${current.offsetTop + current.offsetHeight - 9}px)`;
    }
  }
  new ResizeObserver(() => requestAnimationFrame(positionIndicator)).observe($('.main-nav'));
  new ResizeObserver(([entry]) => {
    document.documentElement.style.setProperty('--scene-header-height', `${entry.target.getBoundingClientRect().height}px`);
  }).observe($('.site-header'));
  window.addEventListener('resize', () => requestAnimationFrame(positionIndicator));

  function cancelAnimations() {
    animations.forEach(animation => animation.cancel()); animations.clear();
    clearStageAnimation();
  }
  function animateItems(section) {
    if (!section || state.paused || reduced.matches) return;
    const items = section.querySelectorAll('.profile-identity,.profile-vision,.bio,.profile-actions,.profile-updates,.section-heading,.map-section-heading,.publication,.experience-item,.research-goal,.research-direction,.project-card,.award-column,.news-list li');
    [...items].slice(0, 8).forEach((item, index) => {
      const animation = item.animate([{opacity: 0, transform: 'translateX(16px)'}, {opacity: 1, transform: 'translateX(0)'}],
        {duration: 420, delay: Math.min(index * 35, 180), easing: 'cubic-bezier(.2,.7,.15,1)', fill: 'backwards'});
      animations.add(animation);
      animation.finished.catch(() => {}).finally(() => animations.delete(animation));
    });
  }
  function changeView(update, direction) {
    const mobile = matchMedia('(max-width: 960px)').matches;
    const wasAbout = state.section === null;
    const from = mobile ? stage.getBoundingClientRect() : null;
    ++navigationId; cancelAnimations();
    document.documentElement.dataset.transitionDirection = direction;
    // Animate live content only: capturing the whole page would freeze the guide
    // during the very turn-and-walk sequence that connects the chapters.
    update();
    if (wasAbout !== (state.section === null)) animateStage(from);
    animateItems(state.section ? document.getElementById(state.section) : profile);
  }

  function filterPapers(year) {
    let visible = 0;
    papers.forEach(paper => { paper.hidden = year !== 'all' && paper.dataset.year !== year; if (!paper.hidden) visible++; });
    filters.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.filter === year)));
    $('.publication-count').textContent = `${visible} selected publication${visible === 1 ? '' : 's'}`;
    queuePaperExhibit();
  }
  filters.forEach(button => button.addEventListener('click', () => { holdTour(); filterPapers(button.dataset.filter); saveReadingPosition(); }));
  filterPapers('all'); $('.publication-toolbar').hidden = false;

  const actionNames = {idle: 'Looking around', wave: 'Waving hello', walk: 'Walking', turnRight: 'Turning', turnFront: 'Turning',
    thinking: 'Thinking things through', think: 'Thinking things through', dance: 'Dancing', celebrate: 'Celebrating', jump: 'Jumping for joy'};
  let lastStatus = '';
  function renderState() {
    const here = stops[state.index];
    $('.journey-destination').textContent = here.title;
    $('.journey-mode').textContent = state.failed ? 'Illustrated preview' : !state.ready ? 'Meeting your guide' : state.paused ? 'Animations paused' : state.auto ? 'Exploring together' : 'Here while you read';
    const status = state.failed ? 'The guide is unavailable. All sections remain open.'
      : !state.ready ? 'Loading character animations…'
      : state.paused ? `Paused at ${here.title}`
      : state.travelling ? `Walking to ${here.title}…`
      : actionNames[state.action] || 'Looking around';
    if (status !== lastStatus) { $('.journey-status').textContent = status; lastStatus = status; }
    document.body.classList.toggle('journey-travelling', state.travelling);
    document.body.classList.toggle('tour-running', state.auto && !state.paused);
    document.body.classList.toggle('motion-paused', state.paused);
    route.style.setProperty('--route-progress', String(Math.max(0, Math.min(6, state.progress)) / 6));
    tourButton.setAttribute('aria-pressed', String(state.auto));
    tourButton.setAttribute('aria-label',state.auto?'Pause automatic tour':'Start automatic tour');
    tourButton.querySelector('span:first-child').textContent = state.auto ? 'Ⅱ' : '▷';
    tourButton.querySelector('span:last-child').textContent = state.auto ? 'Hold tour' : 'Resume tour';
    tourButton.disabled = state.paused || reduced.matches || state.failed;
    tourButton.title = state.paused ? 'Resume animations to continue the tour.' : 'Automatic exploration stops whenever you choose a section.';
    countdown.hidden = !state.auto || state.paused || state.failed || state.travelling || !state.ready;
    if (!countdown.hidden) {
      const next = stops[(state.index + 1) % stops.length];
      $('.countdown-copy').textContent = `Leaving for ${next.title} in ${Math.max(1, Math.ceil(state.timeLeft / 1000))}s`;
      countdown.style.setProperty('--dwell-progress', String(Math.max(0, Math.min(1, state.timeLeft / (state.dwell || 1)))));
    }
    $('.chapter-counter').textContent = `${String(state.index).padStart(2, '0')} / ${here.title}`;
    $('.previous-stop span:last-child').textContent = stops[Math.max(0, state.index - 1)].title;
    $('.next-stop span:first-child').textContent = state.index === 6 ? 'Return to About' : `Continue to ${stops[state.index + 1].title}`;
    motionButton.disabled = reduced.matches || state.failed;
    motionButton.setAttribute('aria-pressed', String(state.paused));
    motionButton.setAttribute('aria-label', state.failed ? 'Guide unavailable; showing an illustration' : state.paused ? 'Resume animations' : 'Pause animations');
    motionButton.querySelector('span').textContent = state.failed ? 'Preview' : reduced.matches ? 'Paused' : state.paused ? 'Play' : 'Pause';
    motionButton.querySelector('svg').innerHTML = state.paused
      ? '<path d="m6 4 9 6-9 6Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>'
      : '<path d="M7 5v10M13 5v10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>';
    motionButton.title = reduced.matches ? 'Animations follow your reduced-motion preference.' : '';
    const cannotInteract = state.paused || !state.ready || state.failed || state.travelling;
    document.querySelectorAll('[data-guide-action]').forEach(button => {
      button.disabled = cannotInteract;
      button.title = state.travelling ? 'Let her reach this stop first.' : state.paused ? 'Resume animations to interact.' : '';
    });
  }
  function setDwell() {
    state.dwell = state.index === 0 ? 10000 : 20000;
    state.timeLeft = state.dwell; lastTick = performance.now();
  }
  function startTicker() {
    if (ticker) return;
    lastTick = performance.now();
    ticker = setInterval(() => {
      const now = performance.now(), elapsed = Math.min(now - lastTick, 500); lastTick = now;
      if (!document.hidden && state.auto && state.ready && !state.failed && !state.paused && !state.travelling) {
        state.timeLeft -= elapsed;
        if (state.timeLeft <= 0) navigate(stops[(state.index + 1) % stops.length].id, null, {automatic: true});
      }
      renderState();
    }, 200);
  }
  function holdTour() { state.auto = false; renderState(); }
  function onArrival(index) {
    if (index !== state.index) return;
    clearTimeout(arrivalTimer);
    state.travelling = false; state.progress = index; visited.add(index); setDwell(); syncVisited(); renderState();
  }
  function travel(index, {immediate = false} = {}) {
    const changed = index !== state.index;
    state.index = index;
    const instant = immediate || state.paused || reduced.matches || !changed || state.failed;
    state.travelling = !instant; state.action = state.travelling ? 'walk' : state.action;
    clearTimeout(arrivalTimer);
    if (instant) { state.progress = index; visited.add(index); setDwell(); }
    renderState();
    window.dispatchEvent(new CustomEvent('journey:travel', {detail: {id: stops[index].id, index, immediate: instant}}));
    // A loaded scene is the only authority for arrival and action state.
    if (!instant && !state.ready) arrivalTimer = setTimeout(() => onArrival(index), 2200);
  }

  function syncVisited() {
    document.querySelectorAll('.route-track a').forEach((link, index) => link.classList.toggle('is-visited', visited.has(index)));
  }
  function syncNavigation() {
    updateReadingSeam();
    navLinks.forEach(link => {
      if (link.hash === `#${stops[state.index].id}`) link.setAttribute('aria-current', link.closest('.route-track') ? 'step' : 'page');
      else link.removeAttribute('aria-current');
    });
    $('.section-nav').hidden = state.section === null;
    syncVisited();
    profile.inert = false; $('.site-bottom').inert = false; stage.inert = false;
    positionIndicator();
    window.dispatchEvent(new CustomEvent('scene:visibility', {detail: {visible: true}}));
  }
  function renderPage(id, {focus = false, immediate = false} = {}) {
    const isAbout = id === 'about' || id === 'main' || !id;
    if (isAbout) {
      reader.hidden = true; state.section = null;
      document.body.classList.remove('content-open'); sections.forEach(section => {section.hidden = true;});
      travel(0, {immediate}); syncNavigation(); window.scrollTo({top: 0, behavior: 'instant'});
      if (focus) {
        const target = returnFocus?.isConnected && returnFocus.getClientRects().length ? returnFocus : $('.main-nav a[href="#about"]');
        target.focus({preventScroll: true});
      }
      window.dispatchEvent(new CustomEvent('scene:focus', {detail: {id: null}}));
      return true;
    }
    const target = document.getElementById(id), section = target?.closest('.reader-scroll > section');
    if (!section || !sectionIds.has(section.id)) return false;
    const paper = target.closest('.publication'); if (paper?.hidden) filterPapers('all');
    sections.forEach(item => {item.hidden = item !== section;});
    state.section = section.id; reader.hidden = false; document.body.classList.add('content-open');
    reader.setAttribute('aria-label', section.querySelector('h2')?.textContent || 'Research content');
    travel(stops.findIndex(stop => stop.id === section.id), {immediate}); syncNavigation();
    window.scrollTo({top: 0, behavior: 'instant'}); scrollArea.scrollTop = 0; scrollArea.style.paddingBottom = '';
    if (paper) {
      const offset = readingTop() + 24;
      window.scrollTo({top: Math.max(0, window.scrollY + paper.getBoundingClientRect().top - offset), behavior: 'instant'});
    }
    if (focus) {
      const heading = paper?.querySelector('h3') || section.querySelector('h2');
      if (heading) {heading.tabIndex = -1; heading.focus({preventScroll: true});}
    }
    if (section.id === 'publications') {
      if (paper) setPaperExhibit(paper.id);
      else queuePaperExhibit();
    }
    window.dispatchEvent(new CustomEvent('scene:focus', {detail: {id: section.id}}));
    return true;
  }
  function navigate(id, trigger, {automatic = false, immediate = false, replace = false} = {}) {
    if (id !== 'about' && id !== 'main' && !document.getElementById(id)?.closest('.reader-scroll > section')) return;
    if (!automatic) holdTour();
    saveReadingPosition();
    if (!state.section && trigger) returnFocus = trigger;
    changeView(() => {
      renderPage(id, {focus: !automatic, immediate});
      if (location.hash !== `#${id}`) history[replace ? 'replaceState' : 'pushState']({journey: {scrollY: window.scrollY, year: selectedYear()}}, '', `#${id}`);
    }, id === 'about' ? 'return' : state.section ? 'section' : 'enter');
  }
  document.querySelectorAll('a[href^="#"]').forEach(link => link.addEventListener('click', event => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const id = link.hash.slice(1);
    if (id === 'asset-credits') {
      event.preventDefault(); holdTour(); const target = document.getElementById(id); target.open = true;
      target.scrollIntoView({block: 'center', behavior: reduced.matches ? 'instant' : 'smooth'}); return;
    }
    if (id !== 'about' && id !== 'main' && !document.getElementById(id)?.closest('.reader-scroll > section')) return;
    event.preventDefault();
    if (link.classList.contains('skip-link')) {
      holdTour(); ++navigationId; cancelAnimations(); renderPage('about', {immediate: true});
      const title = $('#intro-title'); title.tabIndex = -1; title.focus({preventScroll: true}); return;
    }
    navigate(id, link);
  }));
  $('.reader-close').addEventListener('click', () => navigate('about', null));
  window.addEventListener('keydown', event => {if (event.key === 'Escape' && state.section) navigate('about', null);});
  $('.previous-stop').addEventListener('click', () => navigate(stops[Math.max(0, state.index - 1)].id, $('.previous-stop')));
  $('.next-stop').addEventListener('click', () => navigate(stops[(state.index + 1) % stops.length].id, $('.next-stop')));
  tourButton.addEventListener('click', () => {
    if (state.auto) holdTour();
    else {state.auto = true; setDwell(); renderState();}
  });
  document.querySelectorAll('[data-guide-action]').forEach(button => button.addEventListener('click', () => {
    holdTour(); window.dispatchEvent(new CustomEvent('guide:activity', {detail: {action: button.dataset.guideAction}}));
  }));
  // Give visitors time to adjust appearance or sound without the tour moving on.
  document.querySelector('.site-controls').addEventListener('pointerdown', event => {
    if (!tourButton.contains(event.target)) holdTour();
  });
  window.addEventListener('guide:interact', holdTour);
  window.addEventListener('scene:select', event => {if (sectionIds.has(event.detail?.id) || event.detail?.id === 'about') navigate(event.detail.id, null);});
  window.addEventListener('journey:progress', event => {
    const d = event.detail;
    if (d?.targetId && d.targetId !== stops[state.index].id) return;
    if (Number.isFinite(d?.progress)) state.progress = d.progress;
    if (typeof d?.travelling === 'boolean') state.travelling = d.travelling;
    renderState();
  });
  window.addEventListener('journey:arrive', event => onArrival(event.detail?.index));
  window.addEventListener('guide:state', event => {
    const d = event.detail;
    if (d?.stopId && d.stopId !== stops[state.index].id) return;
    if (d?.action) state.action = d.action;
    renderState();
  });
  window.addEventListener('scene:ready', () => {
    state.ready = true; state.failed = false; stage.classList.add('scene-ready'); guidePlay.hidden = false; compactGuideAction.hidden = false;
    document.body.classList.remove('scene-unavailable');
    window.dispatchEvent(new CustomEvent('scene:motion', {detail: {enabled: !state.paused}}));
    window.dispatchEvent(new CustomEvent('journey:travel', {detail: {id: stops[state.index].id, index: state.index, immediate: true}}));
    syncNavigation(); setDwell(); startTicker(); renderState();
    if (paperExhibit) window.dispatchEvent(new CustomEvent('scene:exhibit', {detail: {id: paperExhibit}}));
    queuePaperExhibit();
  });
  function sceneFailure() {
    state.failed = true; state.auto = false; state.travelling = false;
    document.body.classList.add('scene-unavailable');
    clearTimeout(arrivalTimer); stage.classList.remove('scene-ready'); guidePlay.hidden = true; compactGuideAction.hidden = true; renderState();
  }
  window.addEventListener('scene:error', sceneFailure);
  document.querySelector('script[src="world-scene.js"]').addEventListener('error', sceneFailure);
  function setPaused(paused) {
    state.paused = paused;
    if (paused) {state.auto = false; clearTimeout(arrivalTimer); cancelAnimations();}
    window.dispatchEvent(new CustomEvent('scene:motion', {detail: {enabled: !paused}}));
    renderState();
  }
  motionButton.addEventListener('click', () => setPaused(!state.paused));
  reduced.addEventListener('change', event => setPaused(event.matches));
  document.addEventListener('visibilitychange', () => {lastTick = performance.now();});
  // Reading intent holds the tour everywhere, including the introduction and News.
  const readingIntent = () => { if (state.auto) holdTour(); };
  window.addEventListener('wheel', readingIntent, {passive: true});
  window.addEventListener('touchmove', readingIntent, {passive: true});
  window.addEventListener('keydown', event => {
    if (['Tab', 'PageDown', 'PageUp', 'Home', 'End', 'ArrowDown', 'ArrowUp', ' '].includes(event.key)) readingIntent();
  });
  document.addEventListener('pointerup', () => {
    if (window.getSelection()?.toString().trim()) readingIntent();
  });
  document.addEventListener('focusin', event => {
    const target = event.target;
    if (!target.matches('a,button,input,select,textarea') || !(reader.contains(target) || $('.site-bottom').contains(target))) return;
    requestAnimationFrame(() => {
      if (document.activeElement !== target) return;
      const box = target.getBoundingClientRect();
      const top = readingTop() + 12;
      const bottom = route.getBoundingClientRect().top - 12;
      const delta = box.top < top ? box.top - top : box.bottom > bottom ? box.bottom - bottom : 0;
      if (delta) window.scrollBy({top: delta, behavior: 'instant'});
    });
  });
  history.scrollRestoration = 'manual';
  let historyTimer = 0;
  function restoreHistory() {
    clearTimeout(historyTimer);
    restoringHistory = true;
    historyTimer = setTimeout(() => {
      const entry = history.state?.journey;
      holdTour(); cancelAnimations();
      if (entry?.year) filterPapers(entry.year);
      renderPage(location.hash.slice(1) || 'about', {immediate: true});
      requestAnimationFrame(() => {
        if (Number.isFinite(entry?.scrollY)) window.scrollTo({top: entry.scrollY, behavior: 'instant'});
        restoringHistory = false; queuePaperExhibit(); saveReadingPosition();
      });
    }, 0);
  }
  window.addEventListener('popstate', restoreHistory); window.addEventListener('hashchange', restoreHistory);
  motionButton.hidden = false; tourButton.hidden = false; $('.reader-toolbar').hidden = false; route.hidden = false;
  document.body.classList.add('scene-enhanced');
  if (!renderPage(location.hash.slice(1) || 'about', {immediate: true})) renderPage('about', {immediate: true});
  renderState();
  // The browser can scroll to an initial hash after JS initialization; align it once after load.
  window.addEventListener('load', () => {
    if (!location.hash || location.hash === '#about') return;
    const auto = state.auto, entry = history.state?.journey;
    if (entry?.year) filterPapers(entry.year);
    renderPage(location.hash.slice(1), {immediate: true}); state.auto = auto;
    if (Number.isFinite(entry?.scrollY)) window.scrollTo({top: entry.scrollY, behavior: 'instant'});
    queuePaperExhibit(); renderState();
  }, {once: true});
  if (new URLSearchParams(location.search).has('scene-debug')) {
    window.__journeyUI = () => ({...state, transition: animations.size > 0});
  }
})();
