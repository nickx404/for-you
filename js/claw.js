/**
 * ClawGame - State Machine and Controller for the Arcade Claw Machine
 * Handles gantry movement, cable extension, prong grasping, hit detection,
 * and prize transportation.
 */

class ClawGame {
  constructor() {
    // State machine: IDLE, MOVING, DROPPING, GRABBING, LIFTING, RETURNING, RELEASING, PRIZE_READY
    this.state = 'IDLE';
    this.carriageX = 50; // percentage across gantry (0-100)
    this.cableLength = 20; // px
    this.moveDirection = 0; // -1, 0, 1
    this.moveInterval = null;
    this.soundThrottle = 0;
    this.maxCableLength = 220; // px — depth of prize pit

    // DOM elements
    this.carriage = document.getElementById('claw-carriage');
    this.cable = this.carriage?.querySelector('.claw-cable');
    this.clawHead = this.carriage?.querySelector('.claw-head');
    this.prizePit = document.querySelector('.prize-pit');
    this.keyCapsule = document.getElementById('key-capsule');
    this.prizeTray = document.getElementById('prize-tray');
    this.otterBubble = document.getElementById('otter-claw-bubble');
    this.otter = document.querySelector('.claw-mascots .otter');
    this.bunny = document.querySelector('.claw-mascots .bunny');
    this.joystickShaft = document.getElementById('joystick-shaft');
    this.joystickPod = document.getElementById('joystick-pod');
    this.creditDisplay = document.getElementById('credit-display');
    this.btnCoin = document.getElementById('btn-coin');
    this.credits = 1;

    this.bindControls();
    this.updateCarriagePosition();
  }

  /**
   * Binds pointer, touch, and keyboard controls.
   */
  bindControls() {
    const btnLeft = document.getElementById('btn-left');
    const btnRight = document.getElementById('btn-right');
    const btnDrop = document.getElementById('btn-drop');

    // Prevent default context menus and mobile long-press selection on buttons
    [btnLeft, btnRight, btnDrop, this.btnCoin].forEach(btn => {
      if (btn) {
        btn.addEventListener('contextmenu', (e) => e.preventDefault());
      }
    });

    // Pointer events for left button
    if (btnLeft) {
      btnLeft.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        this.startMove(-1);
      });
      btnLeft.addEventListener('pointerup', () => this.stopMove());
      btnLeft.addEventListener('pointerleave', () => this.stopMove());
      btnLeft.addEventListener('pointercancel', () => this.stopMove());
    }

    // Pointer events for right button
    if (btnRight) {
      btnRight.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        this.startMove(1);
      });
      btnRight.addEventListener('pointerup', () => this.stopMove());
      btnRight.addEventListener('pointerleave', () => this.stopMove());
      btnRight.addEventListener('pointercancel', () => this.stopMove());
    }

    // Interactive Joystick Pod control (clicking/dragging joystick pod)
    if (this.joystickPod) {
      const handlePodPointer = (e) => {
        const rect = this.joystickPod.getBoundingClientRect();
        const midX = rect.left + rect.width / 2;
        if (e.clientX < midX) {
          this.startMove(-1);
        } else {
          this.startMove(1);
        }
      };

      this.joystickPod.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        handlePodPointer(e);
      });
      this.joystickPod.addEventListener('pointerup', () => this.stopMove());
      this.joystickPod.addEventListener('pointerleave', () => this.stopMove());
      this.joystickPod.addEventListener('pointercancel', () => this.stopMove());
    }

    // Interactive Retro Coin Slot
    if (this.btnCoin) {
      this.btnCoin.addEventListener('click', (e) => {
        e.preventDefault();
        this.insertCoin();
      });
    }

    // Drop button
    if (btnDrop) {
      btnDrop.addEventListener('click', (e) => {
        e.preventDefault();
        this.triggerDrop();
      });
    }

    // Keyboard controls
    document.addEventListener('keydown', (e) => {
      const scene = document.getElementById('scene-claw');
      if (!scene.classList.contains('active') || scene.classList.contains('arcade-arriving') ||
          !document.getElementById('capsule-modal').classList.contains('hidden') ||
          e.repeat || e.target.closest('button, a, input, textarea, select, [role="button"], [contenteditable]')) return;

      // Allow drop while moving or idle
      if (e.key === ' ' || e.key === 'Enter') {
        if (this.state === 'IDLE' || this.state === 'MOVING') {
          e.preventDefault();
          this.triggerDrop();
        }
        return;
      }

      if (this.state !== 'IDLE') return;

      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        this.startMove(-1);
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        this.startMove(1);
      }
    });

    document.addEventListener('keyup', (e) => {
      if (
        e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A' ||
        e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D'
      ) {
        this.stopMove();
      }
    });
  }

  /**
   * Starts moving the claw carriage along the gantry rail.
   * @param {number} direction - -1 (left) or 1 (right)
   */
  startMove(direction) {
    if (this.state !== 'IDLE') return;
    this.state = 'MOVING';
    this.moveDirection = direction;

    window.clawAudio?.playButtonPress();
    window.clawAudio?.playGantryMove();

    // Tilt physical ball-top joystick
    if (this.joystickShaft) {
      this.joystickShaft.classList.remove('tilt-left', 'tilt-right');
      this.joystickShaft.classList.add(direction < 0 ? 'tilt-left' : 'tilt-right');
    }

    // Add motor vibration animation to carriage
    this.carriage?.classList.add('vibrating');

    // Mascot: Otter leans curiously in the travel direction
    if (this.otter) {
      this.otter.classList.remove('leaning-left', 'leaning-right');
      this.otter.classList.add(direction < 0 ? 'leaning-left' : 'leaning-right');
    }

    let tick = 0;
    clearInterval(this.moveInterval);
    this.moveInterval = setInterval(() => {
      this.carriageX += direction * 2; // move 2% per tick
      this.carriageX = Math.max(10, Math.min(90, this.carriageX)); // clamp to rail bounds
      this.updateCarriagePosition();

      // Mechanical sound rhythm while continuously moving
      tick++;
      if (tick % 5 === 0) {
        window.clawAudio?.playGantryMove();
      }
    }, 30);
  }

  /**
   * Stops horizontal movement of the carriage.
   */
  stopMove() {
    if (this.state !== 'MOVING') return;
    this.state = 'IDLE';
    clearInterval(this.moveInterval);
    this.carriage?.classList.remove('vibrating');

    // Reset joystick tilt
    if (this.joystickShaft) {
      this.joystickShaft.classList.remove('tilt-left', 'tilt-right');
    }

    // Reset Otter posture
    if (this.otter) {
      this.otter.classList.remove('leaning-left', 'leaning-right');
    }
  }

  /**
   * Handles retro arcade coin insertion (100¥ / Coin).
   */
  insertCoin() {
    this.credits = (this.credits || 0) + 1;
    window.clawAudio?.playCoinInsert();

    // Update LED credit display and flash effect
    if (this.creditDisplay) {
      const ledText = this.creditDisplay.querySelector('.led-text');
      if (ledText) {
        ledText.textContent = this.credits.toString().padStart(2, '0');
      }
      this.creditDisplay.classList.remove('coin-inserted');
      void this.creditDisplay.offsetWidth;
      this.creditDisplay.classList.add('coin-inserted');
      setTimeout(() => this.creditDisplay?.classList.remove('coin-inserted'), 600);
    }

    // Otter cheers for the extra coin
    if (this.otterBubble) {
      this.otterBubble.innerHTML = '100¥ inserted! Pippo\'s ready! <img src="assets/pixel-joystick.svg" class="pixel-icon" alt="joystick"><img src="assets/pixel-sparkle.svg" class="pixel-icon" alt="*">';
    }
  }

  /**
   * Applies carriage position percentage to CSS.
   */
  updateCarriagePosition() {
    if (this.carriage) {
      this.carriage.style.left = `${this.carriageX}%`;
    }
  }

  /**
   * Triggers the full claw drop sequence:
   * Drop -> Clamp -> Lift -> Return to chute if prize won -> Drop into tray.
   */
  async triggerDrop() {
    if (this.state !== 'IDLE' && this.state !== 'MOVING') return;

    this.stopMove();
    this.state = 'DROPPING';

    window.clawAudio?.playButtonPress();

    // Mascot: Bunny perks up and holds breath in anticipation
    if (this.bunny) {
      this.bunny.classList.add('anticipating');
    }

    // Open prongs wide
    this.clawHead?.classList.add('open');
    this.clawHead?.classList.remove('grabbing');

    // Animate cable extending downwards into the pit
    window.clawAudio?.playCableDrop();
    await this.animateCable(this.maxCableLength, 600);

    // Grab action
    this.state = 'GRABBING';
    this.clawHead?.classList.remove('open');
    this.clawHead?.classList.add('grabbing');
    window.clawAudio?.playClawClamp();
    await this.delay(400);

    // Release Bunny anticipation hold
    if (this.bunny) {
      this.bunny.classList.remove('anticipating');
    }

    // Smart alignment check (detects which egg the claw catches)
    const capturedCapsule = this.findCapturedCapsule();
    const isWin = !!capturedCapsule;

    // Decoy eggs (non-reward) are marked as 'empty' so they never give keys
    const isRewardEgg = capturedCapsule && capturedCapsule.dataset.reward;
    const rewardType = isRewardEgg ? capturedCapsule.dataset.reward : 'empty';
    const rewardColor = capturedCapsule?.dataset.color || 'gold';

    // Update Otter's speech bubble — keep suspense until cracked open!
    if (isWin && this.otterBubble) {
      this.otterBubble.innerHTML = 'You caught a capsule, pippo! Tap it to open! <img src="assets/pixel-gift.svg" class="pixel-icon" alt="gift"><img src="assets/pixel-sparkle.svg" class="pixel-icon" alt="*">';
    } else if (this.otterBubble) {
      this.otterBubble.innerHTML = 'Almost had it, pippo! Try again! <img src="assets/pixel-heart.svg" class="pixel-icon" alt="heart">';
    }

    // Lift claw back up
    this.state = 'LIFTING';
    await this.animateCable(20, 500);

    if (isWin) {
      // Success sequence
      this.state = 'RETURNING';

      // Hide the captured capsule from the pit as it is lifted
      if (capturedCapsule) {
        capturedCapsule.style.visibility = 'hidden';
      }

      // Move carriage horizontally to the drop chute on the left (15%)
      await this.animateCarriageTo(15, 600);

      // Release capsule into chute
      this.state = 'RELEASING';
      this.clawHead?.classList.remove('grabbing');
      this.clawHead?.classList.add('open');
      window.clawAudio?.playChuteDrop();
      await this.delay(300);

      // Capsule appears in prize tray
      this.state = 'PRIZE_READY';
      this.clawHead?.classList.remove('open');
      this.showPrizeInTray(rewardType, rewardColor);

      // Mascot celebration animation
      document.querySelectorAll('.claw-mascots .mascot').forEach(m => {
        m.classList.add('celebrating');
        setTimeout(() => m.classList.remove('celebrating'), 1500);
      });

      // Celebration hearts particle burst from prize tray
      if (this.prizeTray && window.particleEngine) {
        const rect = this.prizeTray.getBoundingClientRect();
        window.particleEngine.emitCelebrationHearts(rect.left + rect.width / 2, rect.top);
      }

      window.clawAudio?.playVictoryChime();
    } else {
      // Missed capsule — reset to idle so user can retry
      this.clawHead?.classList.remove('grabbing');
      await this.delay(300);
      this.state = 'IDLE';

      // Reset Otter bubble after delay
      setTimeout(() => {
        if (this.otterBubble && this.state === 'IDLE') {
          this.otterBubble.innerHTML = 'Go get that capsule, kuttupups! <img src="assets/pixel-joystick.svg" class="pixel-icon" alt="joystick">';
        }
      }, 2000);
    }
  }

  /**
   * Smart alignment: checks which capsule the claw is closest to.
   * Supports Blue (Key), Pink (Flower), and Red (Chocolate).
   * @returns {HTMLElement|null}
   */
  findCapturedCapsule() {
    const clawRect = this.clawHead?.getBoundingClientRect();
    const clawCenter = clawRect ? clawRect.left + clawRect.width / 2 : null;

    // Gather all visible capsules in the pit
    const capsules = Array.from(document.querySelectorAll('.prize-pit .capsule')).filter(
      c => c.style.visibility !== 'hidden'
    );
    if (!capsules.length) return null;

    if (clawCenter !== null) {
      let closest = null;
      let minDistance = Infinity;

      for (const cap of capsules) {
        const rect = cap.getBoundingClientRect();
        if (rect.width === 0) continue;
        const center = rect.left + rect.width / 2;
        const dist = Math.abs(clawCenter - center);
        if (dist < minDistance) {
          minDistance = dist;
          closest = cap;
        }
      }

      // If claw is reasonably close to a capsule (generous 58px catch radius)
      if (closest && minDistance <= 58) {
        return closest;
      }
    }

    // Fallback: if near blue key capsule or in typical catch zone
    if (this.keyCapsule && this.keyCapsule.style.visibility !== 'hidden') {
      const rect = this.keyCapsule.getBoundingClientRect();
      if (rect.width > 0 && clawCenter !== null && Math.abs(clawCenter - (rect.left + rect.width / 2)) <= 65) {
        return this.keyCapsule;
      }
    }

    // Safe fallback to first available reward capsule or visible capsule
    const rewardCap = capsules.find(c => c.dataset.reward) || capsules[0];
    return rewardCap || null;
  }

  /**
   * Legacy alias for backward compatibility.
   * @returns {boolean}
   */
  isNearKeyCapsule() {
    return !!this.findCapturedCapsule();
  }

  /**
   * Smoothly animates the cable length using CSS transitions.
   * @param {number} targetLength - Cable height in px
   * @param {number} duration - Transition duration in ms
   * @returns {Promise<void>}
   */
  async animateCable(targetLength, duration) {
    return new Promise(resolve => {
      if (this.cable) {
        this.cable.style.transition = `height ${duration}ms var(--ease-smooth, cubic-bezier(0.4, 0, 0.2, 1))`;
        this.cable.style.height = `${targetLength}px`;
      }
      setTimeout(resolve, duration);
    });
  }

  /**
   * Smoothly animates the carriage along the rail.
   * @param {number} targetPercent - Destination percentage (0-100)
   * @param {number} duration - Transition duration in ms
   * @returns {Promise<void>}
   */
  async animateCarriageTo(targetPercent, duration) {
    return new Promise(resolve => {
      if (this.carriage) {
        this.carriage.style.transition = `left ${duration}ms var(--ease-smooth, cubic-bezier(0.4, 0, 0.2, 1))`;
        this.carriageX = targetPercent;
        this.carriage.style.left = `${targetPercent}%`;
      }
      setTimeout(() => {
        if (this.carriage) this.carriage.style.transition = '';
        resolve();
      }, duration);
    });
  }

  /**
   * Spawns the won capsule in the prize tray with an interactive click event.
   * @param {string} rewardType - 'key', 'flower', 'chocolate'
   * @param {string} rewardColor - 'blue', 'pink', 'red'
   */
  showPrizeInTray(rewardType = 'key', rewardColor = 'blue') {
    if (!this.prizeTray) return;

    this.prizeTray.innerHTML = `<div class="capsule tray-capsule" data-type="${rewardType}" data-color="${rewardColor}" title="Click to open capsule!"></div>`;
    const trayCapsule = this.prizeTray.querySelector('.tray-capsule');

    if (trayCapsule) {
      trayCapsule.style.cursor = 'pointer';
      trayCapsule.addEventListener('click', () => {
        window.clawAudio?.playButtonPress();
        // Dispatch custom event for main.js to open capsule modal with details
        document.dispatchEvent(new CustomEvent('openCapsuleModal', {
          detail: { reward: rewardType, color: rewardColor }
        }));
      });
    }
  }

  /**
   * Resets the claw machine state for replayability.
   */
  reset() {
    this.state = 'IDLE';
    this.carriageX = 50;
    this.updateCarriagePosition();
    if (this.cable) {
      this.cable.style.transition = '';
      this.cable.style.height = '20px';
    }
    this.clawHead?.classList.remove('open', 'grabbing');
    document.querySelectorAll('.prize-pit .capsule').forEach(cap => {
      cap.style.visibility = '';
    });
    if (this.prizeTray) {
      this.prizeTray.innerHTML = '';
    }
    if (this.otterBubble) {
      this.otterBubble.innerHTML = 'Go get that capsule, kuttupups! <img src="assets/pixel-joystick.svg" class="pixel-icon" alt="joystick">';
    }
    if (this.otter) {
      this.otter.classList.remove('leaning-left', 'leaning-right', 'celebrating');
    }
    if (this.bunny) {
      this.bunny.classList.remove('anticipating', 'celebrating');
    }
    if (this.joystickShaft) {
      this.joystickShaft.classList.remove('tilt-left', 'tilt-right');
    }
    this.credits = 1;
    if (this.creditDisplay) {
      const ledText = this.creditDisplay.querySelector('.led-text');
      if (ledText) ledText.textContent = '01';
      this.creditDisplay.classList.remove('coin-inserted');
    }
  }

  /**
   * Restores visibility of decoy eggs so the pit remains populated.
   */
  restoreDecoyCapsules() {
    document.querySelectorAll('.prize-pit .capsule:not([data-reward])').forEach(cap => {
      cap.style.visibility = '';
    });
  }

  /**
   * Async sleep helper.
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise<void>}
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Global instance variable initialized in main.js
window.clawGame = null;
