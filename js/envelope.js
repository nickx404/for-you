class EnvelopeScene {
  constructor(onEnterArcade) {
    this.scene = document.getElementById('scene-envelope');
    this.letter = document.getElementById('envelope-letter');
    this.seal = document.getElementById('wax-seal');
    this.enterButton = document.getElementById('btn-enter-arcade');
    this.hint = document.getElementById('envelope-hint');
    this.onEnterArcade = onEnterArcade;
    this.state = 'sealed';
    this.seal.addEventListener('click', () => this.open());
    this.enterButton.addEventListener('click', () => this.enterArcade());
  }

  reducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  open() {
    if (this.state !== 'sealed') return;
    this.state = this.scene.dataset.state = 'opening';
    this.seal.disabled = true;
    this.seal.setAttribute('aria-expanded', 'true');
    this.hint.textContent = 'A surprise, just for you';
    window.clawAudio?.playScrollOpen();
    this.openTimer = setTimeout(() => {
      this.state = this.scene.dataset.state = 'open';
      this.letter.inert = false;
      this.letter.setAttribute('aria-hidden', 'false');
      this.enterButton.classList.remove('hidden');
      this.enterButton.focus({ preventScroll: true });
    }, this.reducedMotion() ? 0 : 850);
  }

  async enterArcade() {
    if (this.state !== 'open') return;
    this.state = this.scene.dataset.state = 'zooming';
    document.dispatchEvent(new Event('sceneTransitionStarted'));
    this.enterButton.disabled = true;
    window.clawAudio?.playKeySnap();

    const rect = this.letter.getBoundingClientRect();
    const flight = this.letter.cloneNode(true);
    flight.removeAttribute('id');
    flight.querySelectorAll('[id]').forEach(el => el.removeAttribute('id'));
    flight.classList.add('letter-flight');
    flight.setAttribute('aria-hidden', 'true');
    flight.inert = true;
    Object.assign(flight.style, {
      left: `${rect.left}px`, top: `${rect.top}px`,
      width: `${rect.width}px`, height: `${rect.height}px`
    });
    document.body.appendChild(flight);
    this.flight = flight;
    this.letter.style.visibility = 'hidden';

    const reduce = this.reducedMotion();
    const dx = window.innerWidth / 2 - (rect.left + rect.width / 2);
    const dy = window.innerHeight / 2 - (rect.top + rect.height / 2);
    const scale = Math.max(window.innerWidth / rect.width, window.innerHeight / rect.height) * 1.15;

    try {
      this.flightAnimation = flight.animate(reduce
        ? [{ opacity: 1 }, { opacity: 0 }]
        : [{ transform: 'translate(0, 0) scale(1)' }, { transform: `translate(${dx}px, ${dy}px) scale(${scale})` }],
      { duration: reduce ? 150 : 650, easing: 'cubic-bezier(0.55, 0, 0.8, 0.4)', fill: 'forwards' });
      await this.flightAnimation.finished;

      const arcade = document.getElementById('scene-claw');
      arcade.classList.add('arcade-arriving');
      this.onEnterArcade();
      const title = arcade.querySelector('.arcade-title');
      title.setAttribute('tabindex', '-1');
      title.focus({ preventScroll: true });

      this.flightAnimation = flight.animate([{ opacity: reduce ? 0 : 1 }, { opacity: 0 }],
        { duration: reduce ? 150 : 350, fill: 'forwards' });
      await this.flightAnimation.finished;
      flight.remove();
      this.flight = null;
      arcade.classList.remove('arcade-arriving');
      this.state = this.scene.dataset.state = 'entered';
    } catch (error) {
      // Reset cancels an in-flight transition when replay or scene navigation interrupts it.
      if (error.name !== 'AbortError') throw error;
    }
  }

  reset() {
    clearTimeout(this.openTimer);
    this.flightAnimation?.cancel();
    this.flight?.remove();
    this.flight = null;
    document.getElementById('scene-claw').classList.remove('arcade-arriving');
    this.state = this.scene.dataset.state = 'sealed';
    this.seal.disabled = false;
    this.seal.setAttribute('aria-expanded', 'false');
    this.enterButton.disabled = false;
    this.enterButton.classList.add('hidden');
    this.letter.inert = true;
    this.letter.setAttribute('aria-hidden', 'true');
    this.letter.style.visibility = '';
    this.hint.textContent = 'Tap the heart to open';
    this.scene.scrollTop = 0;
  }
}
