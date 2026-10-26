// A small, opt-in sound layer. Every sound is synthesized locally; no audio files,
// looping soundtrack, or network requests are needed to explore the world.
const button = document.querySelector('.sound-toggle');
if (button) {
  try { createWorldAudio(button); }
  catch { button.hidden = true; }
}

function createWorldAudio(toggle) {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  const storageKey = 'step-out-sound';
  const diagnostic = new URLSearchParams(location.search).has('scene-debug');
  let remembered = false;
  try { remembered = localStorage.getItem(storageKey) === 'on'; } catch {}
  let context, master, noise, enabled = false, armed = remembered, activating = false;
  let motion = !document.body.classList.contains('motion-paused'), sceneVisible = true;
  let travelling = false, walked = false, action = '', hovered = null;
  let footAt = -Infinity, hoverAt = -Infinity, cueAt = -Infinity, arrivalAt = -Infinity;
  let generation = 0, count = 0, lastCue = null, failed = !AudioContext;
  const voices = new Set(), counts = {};

  function snapshot() {
    return {
      ready: Boolean(context), supported: Boolean(AudioContext) && !failed,
      enabled, remembered, armed, activating, context: context?.state || 'uncreated',
      count, counts: {...counts}, lastCue, activeSources: voices.size,
      travelling, action, visible: !document.hidden && sceneVisible, motion
    };
  }
  if (diagnostic) window.__worldAudio = snapshot;

  function paint() {
    toggle.hidden = false;
    toggle.disabled = failed;
    toggle.setAttribute('aria-pressed', String(enabled));
    toggle.setAttribute('aria-label', failed ? 'Sound is unavailable in this browser' : enabled ? 'Turn sound off' : 'Turn sound on');
    toggle.title = failed ? 'Sound is unavailable in this browser' : armed ? 'Sound resumes after your next interaction' : enabled ? 'Sound on · Click to mute' : 'Sound off · Click to enable';
    const label = toggle.querySelector('span');
    if (label) label.textContent = enabled ? 'Sound on' : 'Sound off';
    const icon = toggle.querySelector('svg');
    if (icon) icon.innerHTML = `<path d="M8 7H4v6h4l5 4V3L8 7Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>${enabled ? '<path d="M16 6a6 6 0 0 1 0 8M15 9a2 2 0 0 1 0 2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' : '<path d="m16 8 4 4m0-4-4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>'}`;
  }
  function remember(value) {
    remembered = value;
    try { localStorage.setItem(storageKey, value ? 'on' : 'off'); } catch {}
  }
  function initialize() {
    if (context) return;
    context = new AudioContext({latencyHint: 'interactive'});
    master = context.createGain();
    master.gain.value = 0;
    master.connect(context.destination);
    noise = context.createBuffer(1, Math.ceil(context.sampleRate * .12), context.sampleRate);
    const samples = noise.getChannelData(0);
    // A fixed seed keeps the footstep texture consistent across visits.
    let seed = 971;
    for (let i = 0; i < samples.length; i++) {
      seed = (seed * 16807) % 2147483647;
      samples[i] = (seed / 1073741824 - 1) * (1 - i / samples.length);
    }
  }
  function stop() {
    if (!context) return;
    master.gain.cancelScheduledValues(context.currentTime);
    master.gain.setValueAtTime(0, context.currentTime);
    voices.forEach(voice => { try { voice.stop(); } catch {} });
    voices.clear();
    footAt = -Infinity;
  }
  async function enable() {
    if (failed) return;
    const token = ++generation;
    armed = false; activating = true;
    try {
      initialize();
      await context.resume();
      if (token !== generation) return;
      if (document.hidden) { activating = false; return; }
      enabled = context.state === 'running';
      if (enabled) {
        remember(true);
        master.gain.setValueAtTime(.36, context.currentTime);
        cue('enable');
      }
    } catch {
      enabled = false;
      // A blocked resume can be retried with the next explicit button press.
      if (!context) failed = true;
    }
    activating = false;
    paint();
  }
  function disable() {
    ++generation; enabled = false; armed = false; activating = false; remember(false); stop(); paint();
    if (context?.state === 'running') context.suspend().catch(() => {});
  }
  function canPlay() {
    return enabled && context?.state === 'running' && !document.hidden && sceneVisible;
  }
  function register(source, nodes, end) {
    voices.add(source);
    source.onended = () => {
      voices.delete(source);
      source.disconnect();
      nodes.forEach(node => node.disconnect());
    };
    source.stop(end);
  }
  function note(frequency, duration, gain, delay = 0, endFrequency = frequency, type = 'sine') {
    const start = context.currentTime + delay;
    const oscillator = context.createOscillator(), envelope = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    if (endFrequency !== frequency) oscillator.frequency.exponentialRampToValueAtTime(endFrequency, start + duration);
    envelope.gain.setValueAtTime(0, start);
    envelope.gain.linearRampToValueAtTime(gain, start + .008);
    envelope.gain.exponentialRampToValueAtTime(.0001, start + duration);
    oscillator.connect(envelope); envelope.connect(master);
    oscillator.start(start); register(oscillator, [envelope], start + duration + .01);
  }
  function footstep() {
    const start = context.currentTime;
    const source = context.createBufferSource(), filter = context.createBiquadFilter(), envelope = context.createGain();
    source.buffer = noise;
    filter.type = 'lowpass'; filter.frequency.value = 620; filter.Q.value = .6;
    envelope.gain.setValueAtTime(.09, start);
    envelope.gain.exponentialRampToValueAtTime(.0001, start + .075);
    source.connect(filter); filter.connect(envelope); envelope.connect(master);
    source.start(start); register(source, [filter, envelope], start + .09);
    note(115, .055, .05, 0, 74, 'sine');
  }
  function cue(kind) {
    if (!canPlay()) return;
    const now = performance.now();
    // Keep rapid pointer movements and repeated actions from becoming a jingle.
    if (kind !== 'step' && now - cueAt < 85) return;
    if (kind !== 'step') cueAt = now;
    master.gain.setValueAtTime(.36, context.currentTime);
    if (kind === 'step') footstep();
    else if (kind === 'hover') note(740, .07, .055, 0, 810);
    else if (kind === 'travel') { note(392, .11, .10); note(523.25, .16, .075, .045); }
    else if (kind === 'arrive' || kind === 'enable') { note(523.25, .19, .105); note(783.99, .24, .055, .065); }
    else if (kind === 'jump') { note(196, .17, .10, 0, 622.25, 'triangle'); note(783.99, .15, .045, .09); }
    else if (kind === 'dance' || kind === 'celebrate') { note(392, .15, .085); note(493.88, .17, .07, .10); note(587.33, .23, .055, .20); }
    else if (kind === 'wave') { note(659.25, .14, .085); note(523.25, .17, .055, .08); }
    else return;
    count++; counts[kind] = (counts[kind] || 0) + 1; lastCue = kind;
  }
  // Audio is deliberately isolated: unavailable audio must never interrupt a
  // scene event, link, or the academic content.
  function listen(target, event, callback, options) {
    target.addEventListener(event, value => { try { callback(value)?.catch?.(() => {}); } catch {} }, options);
  }
  listen(toggle, 'click', () => enabled || activating ? disable() : void enable());
  function unlock(event) {
    if (!armed || !event.isTrusted || event.target.closest?.('.sound-toggle')) return;
    if (event.type === 'keydown' && !['Enter', ' '].includes(event.key)) return;
    void enable();
  }
  listen(document, 'pointerdown', unlock, {capture: true, passive: true});
  listen(document, 'keydown', unlock, {capture: true});
  listen(window, 'journey:travel', event => {
    if (event.detail?.immediate) return;
    walked = true; footAt = performance.now(); cue('travel');
  });
  listen(window, 'guide:state', event => {
    action = event.detail?.action || '';
    travelling = Boolean(event.detail?.travelling);
    if (!travelling) footAt = -Infinity;
  });
  listen(window, 'journey:progress', event => {
    travelling = Boolean(event.detail?.travelling);
    if (!travelling || !motion || !['walk', 'run'].includes(action) || !canPlay()) return;
    const now = performance.now();
    if (now - footAt < 380) return;
    footAt = now; walked = true; cue('step');
  });
  listen(window, 'journey:arrive', () => {
    travelling = false;
    if (walked && performance.now() - arrivalAt > 500) { arrivalAt = performance.now(); cue('arrive'); }
    walked = false;
  });
  listen(window, 'guide:interact', event => {
    const requested = event.detail?.action;
    if (motion && requested) cue(requested);
  });
  listen(window, 'scene:hover', event => {
    const id = event.detail?.id || null;
    if (id === hovered) return;
    hovered = id;
    if (!id || performance.now() - hoverAt < 240) return;
    hoverAt = performance.now(); cue('hover');
  });
  listen(window, 'scene:motion', event => {
    motion = Boolean(event.detail?.enabled);
    if (!motion) stop();
    else if (canPlay()) master.gain.setValueAtTime(.36, context.currentTime);
  });
  listen(window, 'scene:visibility', event => {
    sceneVisible = Boolean(event.detail?.visible);
    if (!sceneVisible) stop();
    else if (canPlay()) master.gain.setValueAtTime(.36, context.currentTime);
  });
  listen(document, 'visibilitychange', async () => {
    if (!context) return;
    if (document.hidden) {
      stop();
      if (context.state === 'running') await context.suspend().catch(() => {});
    } else if (enabled) {
      await context.resume().catch(() => {});
      if (canPlay()) master.gain.setValueAtTime(.36, context.currentTime);
    }
  });
  listen(window, 'pagehide', stop);
  paint();
}
