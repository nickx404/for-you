/**
 * ParticleEngine - High-performance 2D Canvas Particle System
 * Powers confetti explosions, golden key sparkle trails, and floating celebration hearts.
 */

class ParticleEngine {
  constructor(canvasId = 'canvas-particles') {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) {
      console.warn(`[ParticleEngine] Canvas with id "${canvasId}" not found.`);
      return;
    }

    this.ctx = this.canvas.getContext('2d');
    this.particles = [];
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.dpr = window.devicePixelRatio || 1;

    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.animate();
  }

  /**
   * Resizes the canvas to match the window, accounting for retina/high-DPI displays.
   */
  resize() {
    if (!this.canvas || !this.ctx) return;
    this.dpr = window.devicePixelRatio || 1;
    this.width = window.innerWidth;
    this.height = window.innerHeight;

    this.canvas.width = Math.floor(this.width * this.dpr);
    this.canvas.height = Math.floor(this.height * this.dpr);
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;

    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  /**
   * Emits a radial burst of confetti, stars, and hearts at the given screen coordinates.
   * @param {number} x - Origin X
   * @param {number} y - Origin Y
   */
  emitCapsuleBurst(x, y) {
    if (!this.ctx) return;

    const count = 70 + Math.floor(Math.random() * 20); // 70-90 particles
    const heartColors = ['#ff7597', '#ffb3c6', '#f472b6', '#d8b4e2', '#c084fc', '#ffd166'];
    const starColors = ['#f59e0b', '#fde047', '#ffd700', '#ffffff', '#fed7aa'];
    const confettiColors = ['#a7f3d0', '#bae6fd', '#fbcfe8', '#fef08a', '#c7d2fe', '#fecdd3'];

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2.5 + Math.random() * 6.5; // 2.5 - 9.0
      const typeChoice = Math.random();

      let shape = 'circle';
      let color = confettiColors[Math.floor(Math.random() * confettiColors.length)];
      let size = 4 + Math.random() * 5;

      if (typeChoice < 0.35) {
        shape = 'heart';
        color = heartColors[Math.floor(Math.random() * heartColors.length)];
        size = 8 + Math.random() * 7;
      } else if (typeChoice < 0.65) {
        shape = 'star';
        color = starColors[Math.floor(Math.random() * starColors.length)];
        size = 7 + Math.random() * 6;
      }

      const maxLife = 90 + Math.floor(Math.random() * 50); // ~1.5 - 2.3 seconds at 60fps

      this.particles.push({
        x: x || this.width / 2,
        y: y || this.height / 2,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - (Math.random() * 2), // slight upward pop bias
        gravity: 0.12,
        friction: 0.982,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.16,
        size,
        shape,
        color,
        alpha: 1,
        life: maxLife,
        maxLife
      });
    }
  }

  /**
   * Emits trailing golden sparkles following a position (e.g. while dragging key).
   * @param {number} x - Current pointer X
   * @param {number} y - Current pointer Y
   */
  emitKeySparkle(x, y) {
    if (!this.ctx) return;

    const sparkleColors = ['#ffd700', '#fef08a', '#facc15', '#fffbeb', '#ffffff'];
    const count = 2 + Math.floor(Math.random() * 2); // 2-3 sparkles

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.5 + Math.random() * 1.8;
      const maxLife = 20 + Math.floor(Math.random() * 15); // ~350-550ms

      this.particles.push({
        x: x + (Math.random() - 0.5) * 16,
        y: y + (Math.random() - 0.5) * 16,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.6, // gentle upward float
        gravity: -0.02, // float slightly upward
        friction: 0.95,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.25,
        size: 2.5 + Math.random() * 3.5,
        shape: Math.random() > 0.4 ? 'sparkle' : 'circle',
        color: sparkleColors[Math.floor(Math.random() * sparkleColors.length)],
        alpha: 1,
        life: maxLife,
        maxLife
      });
    }
  }

  /**
   * Emits romantic celebration hearts floating upward.
   * @param {number} x - Origin X
   * @param {number} y - Origin Y
   */
  emitCelebrationHearts(x, y) {
    if (!this.ctx) return;

    const heartColors = ['#ff7597', '#f43f5e', '#ec4899', '#f472b6', '#ffd166', '#c084fc'];
    const count = 12 + Math.floor(Math.random() * 5); // 12-16 hearts

    for (let i = 0; i < count; i++) {
      const maxLife = 120 + Math.floor(Math.random() * 50); // ~2.0 - 2.8s
      const delayOffset = Math.random() * 20;

      this.particles.push({
        x: x + (Math.random() - 0.5) * 40,
        y: y + (Math.random() - 0.5) * 15,
        vx: (Math.random() - 0.5) * 1.2,
        vy: -1.6 - Math.random() * 2.2, // float up
        gravity: -0.015,
        friction: 0.99,
        swayAmp: 0.8 + Math.random() * 1.2,
        swaySpeed: 0.04 + Math.random() * 0.04,
        swayPhase: Math.random() * Math.PI * 2,
        age: -delayOffset,
        rotation: (Math.random() - 0.5) * 0.4,
        rotationSpeed: (Math.random() - 0.5) * 0.03,
        size: 9 + Math.random() * 7,
        shape: 'heart',
        color: heartColors[Math.floor(Math.random() * heartColors.length)],
        alpha: 1,
        life: maxLife,
        maxLife
      });
    }
  }

  /**
   * Updates particle physics, lifetimes, and alpha decays.
   */
  update() {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      p.age = (p.age || 0) + 1;
      if (p.age < 0) continue; // delayed spawn

      p.x += p.vx;
      p.y += p.vy;

      // Lateral sine sway for floating hearts
      if (p.swayAmp) {
        p.x += Math.sin(p.age * p.swaySpeed + p.swayPhase) * p.swayAmp;
      }

      p.vy += p.gravity;
      p.vx *= p.friction;
      p.vy *= p.friction;
      p.rotation += p.rotationSpeed;

      p.life--;
      p.alpha = Math.max(0, p.life / p.maxLife);

      if (p.life <= 0 || p.alpha <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  /**
   * Helper to draw an authentic 8-bit pixel heart centered at (0, 0).
   * @private
   */
  _drawHeart(s) {
    const px = Math.max(1, Math.round(s / 7));
    const ox = -px * 3.5;
    const oy = -px * 3;
    const fill = (c, r, w = 1) => this.ctx.fillRect(ox + c * px, oy + r * px, w * px, px);

    fill(1, 0, 2); fill(4, 0, 2); // Row 0
    fill(0, 1, 7);                // Row 1
    fill(0, 2, 7);                // Row 2
    fill(1, 3, 5);                // Row 3
    fill(2, 4, 3);                // Row 4
    fill(3, 5, 1);                // Row 5
  }

  /**
   * Helper to draw an authentic 8-bit pixel cross star centered at (0, 0).
   * @private
   */
  _drawStar(s) {
    const px = Math.max(1, Math.round(s / 7));
    const ox = -px * 3.5;
    const oy = -px * 3.5;
    const fill = (c, r, w = 1) => this.ctx.fillRect(ox + c * px, oy + r * px, w * px, px);

    fill(3, 0, 1);
    fill(3, 1, 1);
    fill(2, 2, 3);
    fill(0, 3, 7);
    fill(2, 4, 3);
    fill(3, 5, 1);
    fill(3, 6, 1);
  }

  /**
   * Helper to draw an authentic 8-bit pixel diamond sparkle centered at (0, 0).
   * @private
   */
  _drawSparkle(s) {
    const px = Math.max(1, Math.round(s / 5));
    const ox = -px * 2.5;
    const oy = -px * 2.5;
    const fill = (c, r, w = 1) => this.ctx.fillRect(ox + c * px, oy + r * px, w * px, px);

    fill(2, 0, 1);
    fill(1, 1, 3);
    fill(0, 2, 5);
    fill(1, 3, 3);
    fill(2, 4, 1);
  }

  /**
   * Renders all active particles to the canvas.
   */
  render() {
    if (!this.ctx) return;

    this.ctx.clearRect(0, 0, this.width, this.height);

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      if (p.age < 0) continue;

      this.ctx.save();
      this.ctx.translate(Math.round(p.x), Math.round(p.y));
      this.ctx.rotate(p.rotation);
      this.ctx.globalAlpha = p.alpha;
      this.ctx.fillStyle = p.color;

      if (p.shape === 'heart') {
        this._drawHeart(p.size);
      } else if (p.shape === 'star') {
        this._drawStar(p.size);
      } else if (p.shape === 'sparkle') {
        this._drawSparkle(p.size);
      } else {
        // Square 8-bit confetti flake
        const sz = Math.max(3, Math.round(p.size));
        this.ctx.fillRect(-sz / 2, -sz / 2, sz, sz);
      }

      this.ctx.restore();
    }
  }

  /**
   * Core animation loop via requestAnimationFrame.
   */
  animate() {
    this.update();
    this.render();
    requestAnimationFrame(() => this.animate());
  }
}

// Global instance variable initialized in main.js
window.particleEngine = null;
