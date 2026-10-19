/**
 * main.js - Master Orchestrator and Scene Transition Controller
 * Coordinates the particle canvas, procedural audio engine, claw machine game,
 * capsule cracker, arched window unlock, and sky scene transitions.
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize particle engine on full-viewport canvas
  window.particleEngine = new ParticleEngine('canvas-particles');

  // 2. Initialize audio lazily on first user interaction (browser autoplay policy)
  let audioInitialized = false;
  const initAudio = () => {
    if (!audioInitialized) {
      if (!window.clawAudio) {
        window.clawAudio = new ClawAudio();
      }
      window.clawAudio.init();
      audioInitialized = true;
    }
    window.clawAudio?.resumeSceneMusic();
  };

  document.addEventListener('click', initAudio, { once: true });
  document.addEventListener('touchstart', initAudio, { once: true });
  document.addEventListener('pointerdown', initAudio, { once: true });
  document.addEventListener('keydown', initAudio, { once: true });

  // 3. Initialize game modules
  window.clawGame = new ClawGame();
  window.capsuleCracker = new CapsuleCracker();
  window.windowUnlock = new WindowUnlock();
  const envelopeScene = new EnvelopeScene(() => showScene('scene-claw'));

  // 4. Audio mute/unmute toggle button
  const audioButtons = [document.getElementById('audio-toggle'), document.getElementById('gate-audio-toggle')].filter(Boolean);
  audioButtons.forEach(audioBtn => audioBtn.addEventListener('click', () => {
    initAudio();
    const muted = window.clawAudio?.toggleMute();
    audioButtons.forEach(button => {
      button.innerHTML = muted
        ? '<img src="assets/pixel-sound-off.svg" class="pixel-icon" width="22" height="22" alt="">'
        : '<img src="assets/pixel-sound-on.svg" class="pixel-icon" width="22" height="22" alt="">';
      button.setAttribute('aria-label', muted ? 'Unmute sound' : 'Mute sound');
      button.setAttribute('aria-pressed', String(muted));
    });
  }));

  // 5. Scene transition helper
  function triggerBlackScreenHint() {
    const popup = document.getElementById('glass-hint-popup');
    if (popup && !window.goldenTrickPlayed) {
      popup.classList.remove('animate-fade');
      void popup.offsetWidth; // Force CSS reflow
      setTimeout(() => {
        if (!window.goldenTrickPlayed) {
          popup.classList.add('animate-fade');
        }
      }, 350);
    }
  }

  window.triggerBlackScreenHint = triggerBlackScreenHint;

  const sceneIds = [...document.querySelectorAll('.scene')].map(scene => scene.id);
  const backButton = document.getElementById('scene-back');
  const forwardButton = document.getElementById('scene-forward');
  let currentSceneIndex = 0;
  let furthestSceneIndex = 0;
  let sceneFrame;

  function updateSceneNavigation() {
    backButton.disabled = currentSceneIndex === 0;
    forwardButton.disabled = currentSceneIndex >= furthestSceneIndex;
  }

  function revisitScene(direction) {
    const nextIndex = currentSceneIndex + direction;
    if (nextIndex < 0 || nextIndex > furthestSceneIndex) return;
    envelopeScene.reset();
    if (sceneIds[nextIndex] === 'scene-window') window.windowUnlock.reset();
    showScene(sceneIds[nextIndex]);
    const heading = document.querySelector(`#${sceneIds[nextIndex]} h1, #${sceneIds[nextIndex]} h2`);
    if (heading && sceneIds[nextIndex] !== 'scene-envelope') {
      heading.setAttribute('tabindex', '-1');
      heading.focus({ preventScroll: true });
    }
  }

  backButton.addEventListener('click', () => revisitScene(-1));
  forwardButton.addEventListener('click', () => revisitScene(1));
  document.addEventListener('sceneTransitionStarted', () => {
    backButton.disabled = true;
    forwardButton.disabled = true;
  });

  function showScene(sceneId) {
    if (!passcodeGate?.unlocked) return;
    const targetScene = document.getElementById(sceneId);
    if (!targetScene?.classList.contains('scene')) return;
    window.clawAudio?.startSceneMusic();

    currentSceneIndex = sceneIds.indexOf(sceneId);
    furthestSceneIndex = Math.max(furthestSceneIndex, currentSceneIndex);
    updateSceneNavigation();

    try {
      sessionStorage.setItem('pippo-current-scene', sceneId);
      sessionStorage.setItem('pippo-furthest-scene', sceneIds[furthestSceneIndex]);
    } catch {
      // Scene navigation still works when browser storage is unavailable.
    }

    if (sceneId === 'scene-envelope' || sceneId === 'scene-hello') {
      envelopeScene.reset();
    }
    if (sceneId !== 'scene-claw') window.clawGame?.stopMove();

    document.querySelectorAll('.scene').forEach(s => {
      if (s.id !== sceneId) {
        s.classList.remove('active');
        s.classList.add('hidden');
      }
    });

    targetScene.classList.remove('hidden');
    cancelAnimationFrame(sceneFrame);
    sceneFrame = requestAnimationFrame(() => {
      targetScene.classList.add('active');
    });

    if (sceneId === 'scene-claw') {
      triggerBlackScreenHint();
    } else if (sceneId === 'scene-isabella') {
      window.clawAudio?.playIsabellaVoice();
    } else if (sceneId === 'scene-hello') {
      initHelloScene();
    } else if (sceneId === 'scene-envelope') {
      document.getElementById('wax-seal').focus({ preventScroll: true });
    }
  }

  // Expose showScene globally for scene navigation
  window.showScene = showScene;

  // Scene 1: Typewriter Animation Controller
  let helloTypeTimer = null;
  function initHelloScene() {
    const titleEl = document.getElementById('typewriter-text');
    const mascotsEl = document.getElementById('hello-mascots');
    const btnHelloNext = document.getElementById('btn-hello-next');
    if (!titleEl) return;

    if (helloTypeTimer) clearInterval(helloTypeTimer);
    titleEl.textContent = '';
    mascotsEl?.classList.remove('visible');
    btnHelloNext?.classList.remove('visible');

    const fullText = "Hallloosss Kuttupuppss!";
    const graphemes = typeof Intl !== 'undefined' && Intl.Segmenter
      ? [...new Intl.Segmenter().segment(fullText)].map(s => s.segment)
      : Array.from(fullText);

    let idx = 0;
    helloTypeTimer = setInterval(() => {
      if (idx < graphemes.length) {
        titleEl.textContent += graphemes[idx];
        idx++;
      } else {
        clearInterval(helloTypeTimer);
        helloTypeTimer = null;
        setTimeout(() => {
          mascotsEl?.classList.add('visible');
        }, 300);
        setTimeout(() => {
          btnHelloNext?.classList.add('visible');
        }, 650);
      }
    }, 110);
  }

  // Hook up Scene 1 Next button
  const btnHelloNext = document.getElementById('btn-hello-next');
  btnHelloNext?.addEventListener('click', () => {
    initAudio();
    window.clawAudio?.playCoinInsert();
    showScene('scene-isabella');
  });

  // Scene 2 leads to the envelope invitation.
  const btnIsabellaNext = document.getElementById('btn-isabella-next');
  btnIsabellaNext?.addEventListener('click', () => {
    window.clawAudio?.playButtonPress();
    showScene('scene-envelope');
  });

  // 6. Collectibles State Tracker & Shelf Management
  window.inventory = {
    chocolate: false,
    flower: false,
    key: false
  };

  // Golden Egg Decoy Trick State Tracker
  window.goldenTrickPlayed = false;

  const ITEM_LABELS = {
    chocolate: 'CHOCOLATE',
    flower: 'FLOWER',
    key: 'GOLDEN KEY'
  };

  function updateCollectiblesUI() {
    const items = ['chocolate', 'flower', 'key'];
    let count = 0;

    items.forEach(item => {
      const isCollected = window.inventory[item];
      const slot = document.getElementById(`slot-${item}`);
      if (!slot) return;

      const nameEl = slot.querySelector('.slot-name');
      const statusEl = slot.querySelector('.slot-status');

      if (isCollected) {
        count++;
        slot.classList.remove('locked');
        slot.classList.add('unlocked');
        slot.setAttribute('title', ITEM_LABELS[item]);
        slot.querySelector('.slot-mystery')?.classList.add('hidden');
        slot.querySelector('.slot-img')?.classList.remove('hidden');
        slot.querySelector('.slot-key-glyph')?.classList.remove('hidden');
        if (nameEl) nameEl.textContent = ITEM_LABELS[item];
        if (statusEl) statusEl.textContent = 'FOUND!';
      } else {
        slot.classList.add('locked');
        slot.classList.remove('unlocked');
        slot.setAttribute('title', '??');
        slot.querySelector('.slot-mystery')?.classList.remove('hidden');
        slot.querySelector('.slot-img')?.classList.add('hidden');
        slot.querySelector('.slot-key-glyph')?.classList.add('hidden');
        if (nameEl) nameEl.textContent = '??';
        if (statusEl) statusEl.textContent = 'LOCKED';
      }
    });

    const counter = document.getElementById('shelf-counter');
    if (counter) counter.textContent = `${count} / 3`;

    const keySlot = document.getElementById('slot-key');
    const pointer = document.getElementById('key-pointer');
    const hint = document.getElementById('shelf-hint');

    // All 3 Found condition: Pointer directs player to click the key
    if (count === 3) {
      if (counter) counter.innerHTML = '3 / 3 <img src="assets/pixel-sparkle.svg" class="pixel-icon" alt="*">';
      keySlot?.classList.add('ready-pulse');
      pointer?.classList.remove('hidden');
      if (hint) hint.innerHTML = 'What is the Golden Key for?<br/>Click the Key! <img src="assets/pixel-key.svg" class="pixel-icon" alt="key"><img src="assets/pixel-sparkle.svg" class="pixel-icon" alt="*">';

      const otterBubble = document.getElementById('otter-claw-bubble');
      if (otterBubble) {
        otterBubble.innerHTML = 'All 3 found! <img src="assets/pixel-party.svg" class="pixel-icon" alt="party"> What is this key for? Try clicking it, pippo! <img src="assets/pixel-key.svg" class="pixel-icon" alt="key"><img src="assets/pixel-sparkle.svg" class="pixel-icon" alt="*">';
      }
      window.clawAudio?.playVictoryChime();
    } else {
      keySlot?.classList.remove('ready-pulse');
      pointer?.classList.add('hidden');
      if (hint) {
        if (!window.goldenTrickPlayed) {
          hint.innerHTML = '<img src="assets/tongue-out-pixel.svg" class="shelf-hint-emote" alt=":P" width="15" height="15"> Hint: It might be something golden and sparkly';
        } else {
          hint.innerHTML = 'Find all 3 treasures! <img src="assets/pixel-sparkle.svg" class="pixel-icon" alt="*">';
        }
      }
    }
  }

  // Expose to window for cross-module coordination
  window.updateCollectiblesUI = updateCollectiblesUI;

  // Initial call to sync shelf UI on startup
  updateCollectiblesUI();

  // Handle item collected from modal
  document.addEventListener('itemCollected', (e) => {
    const reward = e?.detail?.reward;
    if (reward && window.inventory.hasOwnProperty(reward)) {
      window.inventory[reward] = true;
      updateCollectiblesUI();

      // Celebration burst on the collected shelf slot
      const slot = document.getElementById(`slot-${reward}`);
      if (slot && window.particleEngine) {
        const rect = slot.getBoundingClientRect();
        window.particleEngine.emitCelebrationHearts(rect.left + rect.width / 2, rect.top + rect.height / 2);
      }
    }
  });

  // Shelf Slot Inspection Click Handlers
  document.getElementById('slot-chocolate')?.addEventListener('click', () => {
    if (window.inventory.chocolate) {
      window.clawAudio?.playButtonPress();
      window.capsuleCracker?.openInspection('chocolate');
    }
  });

  document.getElementById('slot-flower')?.addEventListener('click', () => {
    if (window.inventory.flower) {
      window.clawAudio?.playButtonPress();
      window.capsuleCracker?.openInspection('flower');
    }
  });

  document.getElementById('slot-key')?.addEventListener('click', () => {
    if (window.inventory.key) {
      window.clawAudio?.playButtonPress();
      const allFound = window.inventory.chocolate && window.inventory.flower && window.inventory.key;
      if (allFound) {
        // Grand Reveal with scroll and button to Scene 5
        window.capsuleCracker?.openInspection('key');
      } else {
        // Key clicked before finding all 3
        const otterBubble = document.getElementById('otter-claw-bubble');
        if (otterBubble) {
          otterBubble.innerHTML = "A mysterious key! Let's find the other treasures first, kuttupups! <img src=\"assets/pixel-joystick.svg\" class=\"pixel-icon\" alt=\"joystick\"><img src=\"assets/pixel-heart.svg\" class=\"pixel-icon\" alt=\"heart\">";
        }
      }
    }
  });

  // 7. Custom Event: Open capsule modal after prize dropped into tray
  document.addEventListener('openCapsuleModal', (e) => {
    const modal = document.getElementById('capsule-modal');
    if (modal) {
      modal.classList.remove('hidden');
    }
    const reward = e?.detail?.reward || 'empty';
    const color = e?.detail?.color || 'gold';
    // Configure cracker with won reward and color
    window.capsuleCracker?.reset();
    window.capsuleCracker?.setup(reward, color, false);
  });

  // 8. Event: "Go to Window" button inside modal
  const btnGotoWindow = document.getElementById('btn-goto-window');
  btnGotoWindow?.addEventListener('click', () => {
    if (!window.capsuleCracker?.canOpenWindow() ||
        !document.getElementById('mini-scroll')?.classList.contains('unrolled')) return;
    window.clawAudio?.playButtonPress();

    // Close capsule modal
    const modal = document.getElementById('capsule-modal');
    modal?.classList.add('hidden');

    // Transition from claw machine scene to arched window scene
    showScene('scene-window');
  });

  // 9. Custom Event: Window unlocked and opened — transition to starry sky scene
  document.addEventListener('windowOpened', () => {
    // Trigger smooth camera glide animation on window scene
    const windowScene = document.getElementById('scene-window');
    if (windowScene) {
      windowScene.style.animation = 'cameraGlide 1.5s ease-in forwards';
    }

    // After camera glide completes, transition to Scene 6 (Sky)
    setTimeout(() => {
      showScene('scene-sky');
    }, 1500);
  });

  // 10. Theme Lock: Pure Kawaii Pixel Art Theme
  document.body.setAttribute('data-theme', 'pixel');

  // 11. Replay Button: Reset progress and return to the beginning
  const btnReplay = document.getElementById('btn-replay');
  btnReplay?.addEventListener('click', () => {
    window.clawAudio?.playButtonPress();
    window.inventory = { chocolate: false, flower: false, key: false };
    window.goldenTrickPlayed = false;
    updateCollectiblesUI();
    window.clawGame?.reset();
    window.capsuleCracker?.reset();
    window.windowUnlock?.reset();
    furthestSceneIndex = 0;
    showScene('scene-hello');
  });

  let initialScene = 'scene-hello';
  try {
    const savedScene = sessionStorage.getItem('pippo-current-scene');
    furthestSceneIndex = Math.max(0, sceneIds.indexOf(sessionStorage.getItem('pippo-furthest-scene')));
    if (document.getElementById(savedScene)?.classList.contains('scene')) {
      initialScene = savedScene;
    }
  } catch {
    // Start normally when browser storage is unavailable.
  }
  const passcodeGate = new PasscodeGate(() => {
    showScene(initialScene);
    const heading = document.querySelector(`#${initialScene} h1, #${initialScene} h2`);
    if (heading && initialScene !== 'scene-envelope') {
      heading.setAttribute('tabindex', '-1');
      heading.focus({ preventScroll: true });
    }
  });
  passcodeGate.start();
  // The first soundtrack ends only when navigating to the separate Sky page.
  document.getElementById('btn-enter-sky')?.addEventListener('click', () => {
    try { sessionStorage.removeItem('sky-music-position'); } catch {}
  });
  window.addEventListener('pagehide', () => window.clawAudio?.stopSceneMusic());
  window.addEventListener('pageshow', event => {
    if (event.persisted && passcodeGate.unlocked) window.clawAudio?.startSceneMusic();
  });
});
