/**
 * WindowUnlock - Arched Window Key Drag & Magnetic Snapping
 * Handles pointer-based dragging with spring physics, golden sparkle trails,
 * magnetic lock attraction, padlock unlocking, shutter opening, and wind animation.
 */

class WindowUnlock {
  constructor() {
    this.key = document.getElementById('draggable-key');
    this.keyhole = document.getElementById('keyhole');
    this.lock = document.getElementById('window-lock');
    this.leftShutter = document.getElementById('left-shutter');
    this.rightShutter = document.getElementById('right-shutter');
    this.otterBubble = document.getElementById('otter-window-bubble');

    this.isDragging = false;
    this.keyX = 0;
    this.keyY = 0;
    this.startX = 0;
    this.startY = 0;
    this.keyWidth = 80;
    this.keyHeight = 80;
    this.snapThreshold = 60; // px distance for magnetic snapping
    this.isUnlocked = false;

    this.bindDrag();
  }

  /**
   * Binds unified Pointer events for seamless mouse and touch dragging.
   */
  bindDrag() {
    if (!this.key) return;

    // Ensure touch actions do not interfere with dragging
    this.key.style.touchAction = 'none';

    this.key.addEventListener('pointerdown', (e) => this.onDragStart(e));
    document.addEventListener('pointermove', (e) => this.onDragMove(e));
    document.addEventListener('pointerup', () => this.onDragEnd());
    document.addEventListener('pointercancel', () => this.onDragEnd());

    // Prevent default touch scrolling and HTML5 drag interference
    this.key.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
    this.key.addEventListener('dragstart', (e) => e.preventDefault());
  }

  /**
   * Initiates dragging of the golden key.
   * @param {PointerEvent} e
   */
  onDragStart(e) {
    if (this.isUnlocked || !this.key) return;

    const rect = this.key.getBoundingClientRect();
    this.isDragging = true;
    this.key.classList.add('dragging');
    this.key.style.animation = 'none'; // pause floating levitation while dragging
    // Freeze viewport coordinates before removing the centered resting layout.
    Object.assign(this.key.style, {
      position: 'fixed', left: `${rect.left}px`, top: `${rect.top}px`,
      right: 'auto', bottom: 'auto', margin: '0', transform: 'none',
      transition: 'none', zIndex: '9999'
    });

    try {
      this.key.setPointerCapture(e.pointerId);
    } catch (_) {
      // Pointer capture might fail if already released; safe to ignore
    }

    this.keyWidth = rect.width || 80;
    this.keyHeight = rect.height || 80;
    this.key.style.width = `${this.keyWidth}px`;
    this.key.style.height = `${this.keyHeight}px`;

    this.grabOffsetX = e.clientX - rect.left;
    this.grabOffsetY = e.clientY - rect.top;

    window.clawAudio?.playButtonPress();
  }

  /**
   * Updates key coordinates during drag and checks proximity to the keyhole.
   * @param {PointerEvent} e
   */
  onDragMove(e) {
    if (!this.isDragging || this.isUnlocked || !this.key) return;

    // Position the key directly with zero cursor jump
    this.key.style.position = 'fixed';
    this.key.style.left = `${e.clientX - this.grabOffsetX}px`;
    this.key.style.top = `${e.clientY - this.grabOffsetY}px`;
    this.key.style.zIndex = '9999';

    const rect = this.key.getBoundingClientRect();
    const currentCenterX = rect.left + rect.width / 2;
    const currentCenterY = rect.top + rect.height / 2;

    // Emit trailing golden sparkle particles
    window.particleEngine?.emitKeySparkle(currentCenterX, currentCenterY);

    // Check proximity to keyhole for magnetic snap
    if (this.keyhole) {
      const keyholeRect = this.keyhole.getBoundingClientRect();
      const keyholeCenterX = keyholeRect.left + keyholeRect.width / 2;
      const keyholeCenterY = keyholeRect.top + keyholeRect.height / 2;
      const distance = Math.hypot(currentCenterX - keyholeCenterX, currentCenterY - keyholeCenterY);

      if (distance < this.snapThreshold) {
        this.magneticSnap(keyholeCenterX, keyholeCenterY);
      }
    }
  }

  /**
   * Resets key position if released without snapping into the lock.
   */
  onDragEnd() {
    if (!this.isDragging || this.isUnlocked || !this.key) return;

    this.isDragging = false;
    this.key.classList.remove('dragging');

    // Return key to original levitating resting position with smooth transition
    this.key.style.transition = 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
    this.key.style.position = '';
    this.key.style.left = '';
    this.key.style.top = '';
    this.key.style.right = '';
    this.key.style.bottom = '';
    this.key.style.margin = '';
    this.key.style.transform = '';
    this.key.style.width = '';
    this.key.style.height = '';
    this.key.style.zIndex = '';

    setTimeout(() => {
      if (!this.isDragging && !this.isUnlocked && this.key) {
        this.key.style.transition = '';
        this.key.style.animation = ''; // restore levitation keyframe animation
      }
    }, 400);
  }

  /**
   * Magnetically snaps key into the keyhole and begins the turning sequence.
   * @param {number} targetX - Target X coordinate (keyhole center)
   * @param {number} targetY - Target Y coordinate (keyhole center)
   */
  async magneticSnap(targetX, targetY) {
    this.isDragging = false;
    this.isUnlocked = true;
    document.dispatchEvent(new Event('sceneTransitionStarted'));

    // Play magnetic suction whoosh
    window.clawAudio?.playKeySnap();

    if (this.key) {
      const halfW = this.keyWidth / 2 || 40;
      const halfH = this.keyHeight / 2 || 40;

      this.key.classList.remove('dragging');
      this.key.classList.add('snapped');
      this.key.style.transition = 'left 0.3s ease-out, top 0.3s ease-out';
      this.key.style.left = `${targetX - halfW}px`;
      this.key.style.top = `${targetY - halfH}px`;
    }

    // Sparkle burst at snap point
    window.particleEngine?.emitKeySparkle(targetX, targetY);

    // Wait for snap transition, then play lock turn clicks
    await this.delay(400);
    if (this.key) this.key.style.animation = 'keyTurn 0.6s var(--ease-spring) forwards';
    window.clawAudio?.playLockTurn();

    // Key turning delay before unlock
    await this.delay(600);
    this.unlock();
  }

  /**
   * Executes the full unlock sequence:
   * Golden flash -> Padlock open -> Shutters swing open -> Wind curtains -> Scene transition.
   */
  async unlock() {
    // Hide draggable key
    if (this.key) {
      this.key.style.display = 'none';
    }

    // Add golden flash overlay
    const flash = document.createElement('div');
    flash.className = 'golden-flash-overlay';
    document.body.appendChild(flash);
    setTimeout(() => flash.remove(), 800);

    // Unlock padlock
    this.lock?.classList.add('unlocked');

    await this.delay(800);

    // Open shutters with creak & wind audio
    window.clawAudio?.playShutterCreak();
    this.leftShutter?.classList.add('open');
    this.rightShutter?.classList.add('open');

    // Blow curtains in the wind
    document.querySelectorAll('.curtain').forEach(c => c.classList.add('blowing'));

    // Update Otter speech bubble
    if (this.otterBubble) {
      this.otterBubble.innerHTML = '<img src="assets/pixel-sparkle.svg" class="pixel-icon" alt="*"><img src="assets/pixel-moon.svg" class="pixel-icon" alt="moon"><img src="assets/pixel-sparkle.svg" class="pixel-icon" alt="*">';
    }

    // Mascots celebrate in window scene
    document.querySelectorAll('#scene-window .mascot, .window-mascots .mascot').forEach(m => {
      m.classList.add('celebrating');
      setTimeout(() => m.classList.remove('celebrating'), 2000);
    });

    // Wait for shutters to fully open, then dispatch transition event
    await this.delay(2000);

    // Dispatch event for main.js to handle scene transition to sky
    document.dispatchEvent(new CustomEvent('windowOpened'));
  }

  /**
   * Resets the window scene state for replayability.
   */
  reset() {
    this.isUnlocked = false;
    this.isDragging = false;

    if (this.key) {
      this.key.style.display = '';
      this.key.style.position = '';
      this.key.style.left = '';
      this.key.style.top = '';
      this.key.style.right = '';
      this.key.style.bottom = '';
      this.key.style.margin = '';
      this.key.style.transform = '';
      this.key.style.width = '';
      this.key.style.height = '';
      this.key.style.zIndex = '';
      this.key.style.transition = '';
      this.key.style.animation = '';
      this.key.classList.remove('dragging', 'snapped');
    }

    this.lock?.classList.remove('unlocked');
    this.leftShutter?.classList.remove('open');
    this.rightShutter?.classList.remove('open');
    document.querySelectorAll('.curtain').forEach(c => c.classList.remove('blowing'));

    if (this.otterBubble) {
      this.otterBubble.innerHTML = "Here's your key, pippo... try the lock! <img src=\"assets/pixel-key.svg\" class=\"pixel-icon inline-right\" alt=\"key\">";
    }

    const windowScene = document.getElementById('scene-window');
    if (windowScene) {
      windowScene.style.animation = '';
    }
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
window.windowUnlock = null;
