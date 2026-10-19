(() => {
  const audio = document.createElement('audio');
  audio.id = 'sky-music';
  audio.src = new URL('../sky/assets/sky-music.mp3', document.currentScript.src).href;
  audio.loop = true; audio.preload = 'none';
  document.body.append(audio);
  let context, gain, fadeTimer;
  let wanted = false, held = false, muted = false;
  try { muted = sessionStorage.getItem('sky-music-muted') === 'true'; } catch {}

  function updateControls() {
    document.querySelectorAll('.sky-music-toggle').forEach(button => {
      const blocked = wanted && !held && !muted && (audio.paused || context?.state === 'suspended');
      button.textContent = blocked ? '▶' : '♫';
      button.setAttribute('aria-label', muted ? 'Turn on sky music' : blocked ? 'Play sky music' : 'Mute sky music');
      button.setAttribute('aria-pressed', String(muted));
    });
  }
  function remember() {
    try {
      sessionStorage.setItem('sky-music-position', String(audio.currentTime));
      sessionStorage.setItem('sky-music-muted', String(muted));
    } catch {}
  }
  function restorePosition() {
    try {
      const position = Number(sessionStorage.getItem('sky-music-position'));
      if (Number.isFinite(audio.duration) && position > 0) audio.currentTime = position % audio.duration;
    } catch {}
  }
  // A GainNode provides real fades on mobile browsers that ignore audio.volume.
  function fade(level, seconds, finish) {
    clearTimeout(fadeTimer);
    if (!gain) { if (finish) finish(); return; }
    const now = context.currentTime;
    const current = gain.gain.value;
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(current, now);
    gain.gain.linearRampToValueAtTime(level, now + seconds);
    if (finish) fadeTimer = setTimeout(finish, seconds * 1000);
  }
  function resume() {
    if (!wanted || held || muted) return;
    try {
      if (!context) {
        context = new (window.AudioContext || window.webkitAudioContext)();
        context.addEventListener('statechange', updateControls);
        gain = context.createGain(); gain.gain.value = 0;
        context.createMediaElementSource(audio).connect(gain).connect(context.destination);
      }
      context.resume().catch(() => {});
      clearTimeout(fadeTimer);
      audio.play().then(() => {
        if (wanted && !held && !muted) fade(.3, 1);
        else fade(0, 1, () => audio.pause());
        updateControls();
      }).catch(updateControls);
    } catch { updateControls(); }
  }
  function setMuted(value) {
    muted = value; remember();
    if (muted) fade(0, .5, () => audio.pause());
    else resume();
    updateControls();
  }
  window.skyMusic = {
    start() { wanted = true; resume(); updateControls(); },
    hold() { held = true; fade(0, 1, () => audio.pause()); updateControls(); },
    release() { held = false; resume(); updateControls(); }
  };
  audio.addEventListener('loadedmetadata', restorePosition, {once:true});
  audio.addEventListener('play', updateControls);
  audio.addEventListener('pause', updateControls);
  for (const event of ['pointerdown', 'keydown']) {
    document.addEventListener(event, input => {
      if (input.target instanceof Element && input.target.closest('.sky-music-toggle')) return;
      if (audio.paused || context?.state === 'suspended') resume();
    }, {capture:true});
  }
  document.querySelectorAll('.sky-music-toggle').forEach(button => button.addEventListener('click', () => {
    if (!muted && !held && (audio.paused || context?.state === 'suspended')) resume();
    else setMuted(!muted);
  }));
  window.addEventListener('pagehide', () => {
    if (wanted) remember();
    clearTimeout(fadeTimer); audio.pause();
  });
  window.addEventListener('pageshow', event => {
    if (event.persisted && wanted) { restorePosition(); resume(); }
  });
  updateControls();
})();
