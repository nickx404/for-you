/**
 * CapsuleCracker - Interactive 3-Tap Capsule Cracking Experience
 * Handles cracking physics, shell separation, particle reveal bursts,
 * scroll unrolling, and progression to the window scene.
 */

class CapsuleCracker {
  constructor() {
    this.cracks = 0;
    this.maxCracks = 3;

    // DOM Elements
    this.shell = document.getElementById('capsule-shell');
    this.contents = document.getElementById('capsule-contents');
    this.scroll = document.getElementById('mini-scroll');
    this.tapPrompt = document.getElementById('tap-prompt');
    this.gotoBtn = document.getElementById('btn-goto-window');
    this.collectBtn = document.getElementById('btn-collect-continue');
    this.tryAgainBtn = document.getElementById('btn-try-again');
    this.modal = document.getElementById('capsule-modal');
    this.currentReward = 'key';
    this.currentColor = 'blue';
    this.isFinalKeyInspect = false;

    this.bindEvents();
  }

  /**
   * Configures the active reward and shell color before cracking.
   * @param {string} reward - 'key', 'flower', 'chocolate', 'empty'
   * @param {string} color - 'blue', 'pink', 'red', 'gold', 'green', 'brown', 'lavender'
   * @param {boolean} isFinalKeyInspect - True when opening from collectibles shelf at 3/3
   */
  setup(reward = 'key', color = 'blue', isFinalKeyInspect = false) {
    this.currentReward = reward;
    this.currentColor = color;
    this.isFinalKeyInspect = isFinalKeyInspect;
    this.scroll?.classList.toggle('hidden', !this.canOpenWindow());
    this.gotoBtn?.classList.add('hidden');

    if (this.shell) {
      this.shell.setAttribute('data-color', color);
    }

    // Toggle appropriate reward view
    document.querySelectorAll('.reward-view').forEach(v => v.classList.add('hidden'));
    const targetView = document.getElementById(`reward-view-${reward}`);
    if (targetView) {
      targetView.classList.remove('hidden');
    } else {
      document.getElementById('reward-view-empty')?.classList.remove('hidden');
    }

    // Golden Egg Prank: playful fake-out message if golden decoy egg is opened
    if (reward === 'empty') {
      const dudIcon = document.getElementById('dud-icon');
      const dudMessage = document.getElementById('dud-message-card');
      if (color === 'gold') {
        if (dudIcon) {
          dudIcon.innerHTML = '<img src="assets/tongue-out-pixel.svg" class="dud-tongue-img" alt="Fool you!" width="80" height="80">';
        }
        if (dudMessage) {
          dudMessage.innerHTML = 'HAHAHAHAHA, FOOLED YOU HAHAHAA! <img src="assets/pixel-laugh.svg" class="pixel-icon" alt="XD"><br/>Try again, pippo! <img src="assets/pixel-joystick.svg" class="pixel-icon inline-right" alt="joystick">';
        }
      } else {
        if (dudIcon) {
          dudIcon.innerHTML = '<img src="assets/tongue-out-pixel.svg" class="dud-tongue-img" alt="Fool you!" width="80" height="80">';
        }
        if (dudMessage) {
          dudMessage.innerHTML = 'Oops! This egg is empty! <img src="assets/pixel-question.svg" class="pixel-icon" alt="?"><br/>Try again, pippo! <img src="assets/pixel-joystick.svg" class="pixel-icon inline-right" alt="joystick">';
        }
      }
    }
  }

  /**
   * Binds user interaction listeners.
   */
  bindEvents() {
    this.shell?.addEventListener('click', () => this.tap());
    this.scroll?.addEventListener('click', () => this.unrollScroll());

    // "Add to Collectibles ✨" action
    this.collectBtn?.addEventListener('click', () => {
      window.clawAudio?.playButtonPress();
      this.modal?.classList.add('hidden');

      // Dispatch event to update collectibles shelf
      document.dispatchEvent(new CustomEvent('itemCollected', {
        detail: { reward: this.currentReward }
      }));

      if (window.clawGame) {
        window.clawGame.state = 'IDLE';
        if (window.clawGame.prizeTray) {
          window.clawGame.prizeTray.innerHTML = '';
        }
      }
    });

    // "Try Again 🕹️" dud egg action
    this.tryAgainBtn?.addEventListener('click', () => {
      window.clawAudio?.playButtonPress();
      this.modal?.classList.add('hidden');

      // If golden egg trick was triggered, mark played and reset hint to normal
      if (this.currentColor === 'gold') {
        window.goldenTrickPlayed = true;
        window.updateCollectiblesUI?.();
        const popup = document.getElementById('glass-hint-popup');
        popup?.classList.remove('animate-fade');
        const otterBubble = document.getElementById('otter-claw-bubble');
        if (otterBubble) {
          otterBubble.innerHTML = 'Go get that capsule, kuttupups! <img src="assets/pixel-joystick.svg" class="pixel-icon inline-right" alt="joystick">';
        }
      }

      if (window.clawGame) {
        window.clawGame.state = 'IDLE';
        if (window.clawGame.prizeTray) {
          window.clawGame.prizeTray.innerHTML = '';
        }
        // Restore non-reward decoy eggs in the pit so pit stays full
        window.clawGame.restoreDecoyCapsules();
      }
    });
  }

  /**
   * Handles user tapping on the capsule shell.
   * Advances crack stage from 1 -> 2 -> 3 (break open).
   */
  tap() {
    if (this.cracks >= this.maxCracks) return;
    this.cracks++;

    if (this.shell) {
      this.shell.setAttribute('data-cracks', this.cracks.toString());
    }

    // Procedural crack audio for current stage
    window.clawAudio?.playCrack(this.cracks);

    if (this.cracks < this.maxCracks) {
      // Trigger wobble animation
      this.shell?.classList.remove('wobbling');
      // Force reflow to re-trigger animation if clicked in rapid succession
      void this.shell?.offsetWidth;
      this.shell?.classList.add('wobbling');
      setTimeout(() => this.shell?.classList.remove('wobbling'), 500);

      // Fade out tap prompt after first tap
      if (this.cracks === 1 && this.tapPrompt) {
        this.tapPrompt.style.opacity = '0';
      }
    } else {
      // Final crack — break open and reveal contents
      this.reveal();
    }
  }

  /**
   * Triggers the final capsule explosion and reveals the contents.
   */
  reveal() {
    // Hide tap prompt immediately
    if (this.tapPrompt) {
      this.tapPrompt.style.display = 'none';
    }

    // Allow shell halves to animate away (800ms transition), then show contents
    setTimeout(() => {
      if (this.shell) {
        this.shell.style.display = 'none';
      }
      this.contents?.classList.remove('hidden');

      // Update Otter and Bunny speech bubbles now that capsule is revealed!
      const otterBubble = document.getElementById('otter-claw-bubble');
      const bunnyBubble = document.getElementById('bunny-claw-bubble');
      const clawBunny = document.getElementById('claw-bunny') || document.querySelector('.claw-mascots .bunny');

      const isEmpty = (this.currentReward === 'empty');
      const bunnyText = isEmpty ? 'Ugh soooo annoyinggg' : 'YAAAYYYYYYYY!!!';

      if (bunnyBubble) {
        bunnyBubble.textContent = bunnyText;
        bunnyBubble.style.display = '';
      }

      if (clawBunny) {
        if (isEmpty) {
          clawBunny.classList.remove('cheering');
          clawBunny.classList.add('annoyed');
        } else {
          clawBunny.classList.remove('annoyed');
          clawBunny.classList.add('cheering');
        }
      }

      if (otterBubble) {
        if (this.currentReward === 'flower') {
          otterBubble.innerHTML = 'indhaa a special phool for you <img src="assets/pixel-flower.svg" class="pixel-icon" alt="flower"><img src="assets/pixel-heart.svg" class="pixel-icon" alt="heart">';
        } else if (this.currentReward === 'chocolate') {
          otterBubble.innerHTML = 'indhaaa chokii for the sweetest girl ever :) <img src="assets/pixel-heart.svg" class="pixel-icon" alt="heart">';
        } else if (this.currentReward === 'key') {
          otterBubble.innerHTML = 'A mysterious key, pippo!! <img src="assets/pixel-key.svg" class="pixel-icon" alt="key"><img src="assets/pixel-heart.svg" class="pixel-icon" alt="heart">';
        } else if (this.currentColor === 'gold') {
          otterBubble.innerHTML = 'HAHAHAHAHA, FOOLED YOU HAHAHAA! <img src="assets/pixel-laugh.svg" class="pixel-icon" alt="XD">';
        } else {
          otterBubble.innerHTML = 'Oops, that egg was empty! Try again, pippo! <img src="assets/pixel-question.svg" class="pixel-icon" alt="?">';
        }
      }

      if (this.currentReward === 'empty') {
        // Dud egg -> show Try Again button
        setTimeout(() => {
          this.tryAgainBtn?.classList.remove('hidden');
        }, 400);
      } else if (this.currentReward === 'chocolate' || this.currentReward === 'flower') {
        // Collectible items -> show Add to Collectibles button
        setTimeout(() => {
          this.collectBtn?.classList.remove('hidden');
        }, 400);
      } else if (this.currentReward === 'key') {
        if (!this.isFinalKeyInspect) {
          // Key found from claw before all 3 gathered -> add to inventory shelf!
          setTimeout(() => {
            this.collectBtn?.classList.remove('hidden');
          }, 400);
        } else {
          // Final inspection when all 3 found -> unroll scroll & show window progression
          setTimeout(() => {
            this.unrollScroll();
          }, 600);
        }
      }

      // Emit radial particle burst at the center of the capsule modal
      if (window.particleEngine) {
        const modal = this.modal || document.getElementById('capsule-modal');
        if (modal) {
          const rect = modal.getBoundingClientRect();
          const centerX = rect.left + rect.width / 2;
          const centerY = rect.top + rect.height / 2;
          window.particleEngine.emitCapsuleBurst(centerX, centerY);
        } else {
          window.particleEngine.emitCapsuleBurst(window.innerWidth / 2, window.innerHeight / 2);
        }
      }
    }, 800);
  }

  /**
   * Opens direct inspection modal for a collected item.
   * @param {string} reward - 'chocolate', 'flower', 'key'
   */
  openInspection(reward) {
    if (!this.modal) return;
    this.reset();
    this.setup(reward, reward === 'chocolate' ? 'red' : reward === 'flower' ? 'pink' : 'blue', reward === 'key');
    this.cracks = 3;
    if (this.shell) this.shell.style.display = 'none';
    if (this.tapPrompt) this.tapPrompt.style.display = 'none';
    this.contents?.classList.remove('hidden');
    this.modal.classList.remove('hidden');

    if (reward === 'key') {
      setTimeout(() => {
        this.unrollScroll();
      }, 400);
    } else {
      setTimeout(() => {
        this.collectBtn?.classList.remove('hidden');
      }, 300);
    }
  }

  /**
   * Unrolls the parchment scroll when clicked by the user.
   */
  unrollScroll() {
    if (!this.canOpenWindow() || !this.scroll || this.scroll.classList.contains('unrolled')) return;

    this.scroll.classList.add('unrolled');
    window.clawAudio?.playScrollOpen();

    // After scroll is read, show the "go to window" progression button
    setTimeout(() => {
      if (this.canOpenWindow() && this.scroll?.classList.contains('unrolled')) {
        this.gotoBtn?.classList.remove('hidden');
      }
    }, 800);
  }

  canOpenWindow() {
    return this.currentReward === 'key' && this.isFinalKeyInspect &&
      !!(window.inventory?.chocolate && window.inventory?.flower && window.inventory?.key);
  }

  /**
   * Resets the cracker to initial state for replayability.
   */
  reset() {
    this.cracks = 0;
    this.isFinalKeyInspect = false;
    if (this.shell) {
      this.shell.setAttribute('data-cracks', '0');
      this.shell.style.display = '';
      this.shell.classList.remove('wobbling');
    }
    this.contents?.classList.add('hidden');
    this.scroll?.classList.remove('unrolled');
    this.scroll?.classList.add('hidden');
    this.gotoBtn?.classList.add('hidden');
    this.collectBtn?.classList.add('hidden');
    this.tryAgainBtn?.classList.add('hidden');

    if (this.tapPrompt) {
      this.tapPrompt.style.display = '';
      this.tapPrompt.style.opacity = '1';
    }
  }
}

// Global instance variable initialized in main.js
window.capsuleCracker = null;
