// shortcut: this playful client-side gate is inspectable; use server authentication for private content.
class PasscodeGate {
  constructor(onUnlock) {
    this.unlocked = false;
    this.opening = false;
    this.attempts = 0;
    this.lastValue = '';
    this.onUnlock = onUnlock;
    this.gate = document.getElementById('passcode-gate');
    this.content = document.getElementById('site-content');
    this.input = document.getElementById('passcode-input');
    this.status = document.getElementById('passcode-status');
    this.card = this.gate.querySelector('.gate-card');
    this.button = document.getElementById('passcode-submit');
    document.getElementById('passcode-form').addEventListener('submit', event => {
      event.preventDefault();
      this.submit();
    });
    this.input.addEventListener('input', () => {
      this.input.value = this.input.value.replace(/[^0-9]/g, '').slice(0, 4);
      if (this.input.value !== this.lastValue) {
        window.clawAudio?.playPasscodeEffect(this.input.value.length < this.lastValue.length ? 'erase' : 'key');
      }
      this.input.removeAttribute('aria-invalid');
      this.status.textContent = '';
      this.renderSlots();
    });
    this.gate.querySelector('.gate-keypad').addEventListener('click', event => {
      const key = event.target.closest('[data-code-key]')?.dataset.codeKey;
      if (!key || this.opening || this.unlocked) return;
      if (key === 'clear') this.input.value = '';
      else if (key === 'delete') this.input.value = this.input.value.slice(0, -1);
      else this.input.value = (this.input.value + key).slice(0, 4);
      this.input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    this.renderSlots();
  }

  start() {
    try {
      if (sessionStorage.getItem('pippo-unlocked') === 'true') {
        this.finish();
        return;
      }
    } catch {
      // The gate still works in memory when storage is blocked.
    }
    // Avoid opening the mobile keyboard before the recipient chooses to type.
    if (!matchMedia('(pointer: coarse)').matches) this.input.focus({ preventScroll: true });
  }

  renderSlots() {
    this.lastValue = this.input.value;
    this.gate.querySelectorAll('.gate-slots span').forEach((slot, index) => {
      slot.textContent = index < this.input.value.length ? '●' : '';
      slot.toggleAttribute('data-filled', index < this.input.value.length);
      slot.toggleAttribute('data-current', index === Math.min(this.input.value.length, 3));
    });
  }

  submit() {
    if (this.opening || this.unlocked) return;
    if (!/^[0-9]{4}$/.test(this.input.value)) {
      this.status.textContent = 'Enter all four digits, sweetie.';
      this.input.setAttribute('aria-invalid', 'true');
      return;
    }
    if (this.input.value !== '1613') {
      window.clawAudio?.playPasscodeEffect('wrong');
      this.attempts++;
      this.status.textContent = 'Oops, try again!';
      this.input.setAttribute('aria-invalid', 'true');
      if (this.attempts >= 2) {
        const hint = document.getElementById('passcode-hint');
        hint.hidden = false;
        this.input.setAttribute('aria-describedby', 'passcode-status passcode-hint');
      }
      this.card.classList.remove('gate-wrong');
      void this.card.offsetWidth;
      this.card.classList.add('gate-wrong');
      this.input.value = '';
      this.renderSlots();
      return;
    }
    this.opening = true;
    window.clawAudio?.playPasscodeEffect('unlock');
    this.button.disabled = true;
    this.input.disabled = true;
    this.gate.querySelectorAll('[data-code-key]').forEach(key => { key.disabled = true; });
    this.status.textContent = 'You found it! Come on in ♡';
    this.card.classList.remove('gate-wrong');
    this.card.classList.add('gate-success');
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    setTimeout(() => this.finish(), reducedMotion ? 0 : 750);
  }

  finish() {
    this.unlocked = true;
    try {
      sessionStorage.setItem('pippo-unlocked', 'true');
    } catch {
      // A reload will require the code again when storage is blocked.
    }
    this.gate.hidden = true;
    this.content.hidden = false;
    this.content.inert = false;
    this.onUnlock();
  }
}
