import { content } from './content.js?v=cosmic-ending';
import { heartPoints, allViewed, whatsappUrl } from './logic.js';
const $ = selector => document.querySelector(selector);
window.skyMusic.start();
const viewed = new Set();
const seenReels = new Set();
let heartRevealed = false;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const theme = new URLSearchParams(location.search).get('theme');
if (['illustrated', 'scrapbook'].includes(theme)) document.body.dataset.theme = theme;
if (content.name) $('#greeting').textContent = `HEY, ${content.name.toUpperCase()}`;
for (let i = 0; i < 170; i++) {
  const dot = document.createElement('span');
  dot.className = 'dust';
  dot.style.cssText = `left:${(i*73.13)%100}%;top:${(i*31.71)%88}%;--delay:-${i%9}s;--twinkle-duration:${3.5+i%5}s;--size:${i%7===0?4:2}px;opacity:${.2+(i%5)*.13}`;
  $('#stardust').append(dot);
}
for (const [className, count] of [['tiny-comet', 5], ['pixel-butterfly', 6], ['meadow-breeze', 3], ['falling-petal', 12]]) {
  for (let i = 0; i < count; i++) {
    const particle = document.createElement('i');
    particle.className = className;
    particle.style.setProperty('--i', i);
    if (className === 'pixel-butterfly') particle.innerHTML = '<b></b><b></b>';
    $('.sky-ambience').append(particle);
  }
}
const points = heartPoints(content.stars.length);
if (points.length === 6) {
  points[1].x += 11; points[4].x -= 11;
  points[1].y += 8; points[4].y += 8;
}
// Derive the outline from the same image so the final fill matches its silhouette.
$('#lines').innerHTML = `<defs><filter id="pixel-outline" x="-10%" y="-10%" width="120%" height="120%"><feMorphology in="SourceAlpha" operator="erode" radius="4" result="inside"/><feComposite in="SourceAlpha" in2="inside" operator="out" result="edge"/><feFlood flood-color="#000000"/><feComposite in2="edge" operator="in"/></filter></defs>`;
$('#constellation').insertAdjacentHTML('beforeend', '<img class="heart-complete pixel-outline" src="assets/smiling-heart.png" alt="" loading="lazy"><img class="heart-glow pixel-outline" src="assets/smiling-heart.png" alt="" loading="lazy">');
const heart = document.createElement('div');
heart.className = 'heart-reveal'; heart.setAttribute('aria-hidden', 'true');
heart.innerHTML = '<img src="assets/smiling-heart.png" alt="" loading="lazy">';
heart.querySelector('img').addEventListener('error', event => { event.target.hidden = true; });
$('#constellation').append(heart);
content.stars.forEach((star, index) => {
  const button = document.createElement('button');
  button.className = 'star'; button.dataset.index = index;
  button.classList.toggle('tip', points[index].y > 82);
  button.style.cssText = `left:${points[index].x}%;top:${points[index].y}%;--delay:${index*.4}s`;
  button.setAttribute('aria-label', `Open star ${index+1}: ${star.title}`);
  button.innerHTML = `<img class="star-shape" src="assets/pastel-star.png" alt="" loading="lazy"><span class="star-number" aria-hidden="true">${index+1}</span>`;
  button.addEventListener('click', () => openStar(index));
  $('#stars').append(button);
});
function updateProgress() {
  const complete = allViewed(content.stars, viewed);
  content.stars.forEach((star, index) => {
    const button = $(`.star[data-index="${index}"]`);
    const discovered = viewed.has(index);
    button.disabled = !discovered && index > 0 && !viewed.has(index - 1);
    button.classList.toggle('current', !discovered && !button.disabled);
    button.setAttribute('aria-label', button.disabled ? `Star ${index+1} locked: open star ${index} first` : `${discovered ? 'Reopen discovered' : 'Open'} star ${index+1}: ${star.title}`);
  });
  $('#counter').textContent = `${viewed.size} of ${content.stars.length} stars discovered`;
  $('#progress-marks').replaceChildren(...content.stars.map((_, i) => {
    const mark = document.createElement('span'); mark.className = viewed.has(i) ? 'filled' : ''; mark.textContent = '✦'; return mark;
  }));
  $('#next').disabled = !complete || !heartRevealed;
  $('#next').hidden = $('#next').disabled;
  $('#progress-hint').textContent = complete ? 'All these little things were leading somewhere.' : `Open star ${viewed.size+1} next. Discovered stars stay open.`;
  if ($('#world').classList.contains('exploring')) $('#guide-line').textContent = complete ? 'See? All our little moments made a heart. There’s one more thing I want to ask you.' : 'Look up Kuttupupss! Pick a star, each one holds a little piece of us.';
}
function revealHeart() {
  if (!allViewed(content.stars, viewed) || $('#constellation').classList.contains('complete')) return;
  $('#constellation').classList.add('complete');
  const finish = () => {
    heartRevealed = true;
    $('#constellation').classList.add('heart-settled');
    if (!reduced) floatingHearts($('#constellation'), 6);
    updateProgress();
  };
  const popHeart = () => {
    document.body.classList.add('rose-sky');
    $('#constellation').classList.add('heart-shown');
    if (reduced) finish();
    else heart.addEventListener('animationend', finish, { once: true });
  };
  if (reduced) { $('#constellation').classList.add('outline-glow'); popHeart(); }
  else $('.heart-complete').addEventListener('animationend', () => {
    $('.heart-glow').addEventListener('animationend', popHeart, { once: true });
    $('#constellation').classList.add('outline-glow');
  }, { once: true });
}
function card(title, eyebrow = 'A LITTLE SOMETHING FOR YOU') {
  const area = $('#card-content'); area.replaceChildren();
  const tag = document.createElement('p'); tag.className = 'eyebrow'; tag.textContent = eyebrow;
  const heading = document.createElement('h2'); heading.id = 'card-title'; heading.textContent = title;
  area.append(tag, heading); return area;
}
function paragraph(parent, text, className = '') {
  const p = document.createElement('p'); p.textContent = text; p.className = className; parent.append(p); return p;
}
function button(parent, text, callback, className = 'primary') {
  const b = document.createElement('button'); b.textContent = text; b.className = className; b.onclick = callback; parent.append(b); return b;
}
function sticker(parent, kind) {
  const image = document.createElement('img'); image.className = 'sticker'; image.alt = ({sweet:'A little heart beating for you',funny:'A shy pixel face trying to look casual',celebration:'Two little hearts celebrating'})[kind];
  image.src = `assets/${kind}.${reduced ? 'png' : 'gif'}`;
  image.onerror = () => { image.onerror = null; image.src = `assets/${kind}.png`; };
  parent.append(image);
}
function showDialog() { if (!$('#card').open) $('#card').showModal(); }
function openStar(index) {
  if (!viewed.has(index) && index > 0 && !viewed.has(index - 1)) return;
  const star = content.stars[index];
  const area = card(star.title, `STAR ${String(index+1).padStart(2,'0')} / A LITTLE PIECE OF US`);
  paragraph(area, star.text);
  if (star.songUrl) {
    window.skyMusic.hold();
    const player = document.createElement('iframe'); player.className = 'song-player';
    player.src = `https://www.youtube.com/embed/${new URL(star.songUrl).searchParams.get('v')}?playsinline=1`;
    player.title = 'A song for you — YouTube player';
    player.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
    player.allowFullscreen = true; player.referrerPolicy = 'strict-origin-when-cross-origin';
    area.append(player);
    const link = document.createElement('a'); link.className = 'primary';
    link.href = star.songUrl; link.target = '_blank'; link.rel = 'noopener noreferrer';
    link.textContent = 'Listen on YouTube ♫'; area.append(link);
  }
  if (Object.hasOwn(star, 'video')) {
    const frame = document.createElement('div'); frame.className = 'tv';
    if (star.video) {
      window.skyMusic.hold();
      const video = document.createElement('video'); video.controls = true; video.playsInline = true; video.preload = 'metadata'; video.src = star.video;
      video.addEventListener('play', () => window.skyMusic.hold());
      video.addEventListener('ended', () => window.skyMusic.release());
      const speedLabel = document.createElement('label'); speedLabel.className = 'playback-speed'; speedLabel.textContent = 'Playback speed';
      const speed = document.createElement('select'); speed.setAttribute('aria-label', 'Playback speed');
      for (const rate of [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]) {
        const option = document.createElement('option'); option.value = rate; option.textContent = `${rate}×`; option.selected = rate === 1; speed.append(option);
      }
      speed.addEventListener('change', () => { video.playbackRate = Number(speed.value); });
      speedLabel.append(speed);
      video.addEventListener('error', () => { window.skyMusic.release(); frame.replaceChildren(); paragraph(frame, 'The video couldn’t load, but you can keep exploring.'); });
      frame.append(video, speedLabel);
    } else paragraph(frame, '▶\nA message from me\nComing with a little courage.');
    area.append(frame);
  }
  if (star.photo) { const image = document.createElement('img'); image.className = 'memory-photo'; image.src = star.photo; image.alt = star.photoAlt || 'A shared memory'; image.onerror = () => image.remove(); area.append(image); }
  if (star.sticker) sticker(area, star.sticker);
  if (star.note) {
    const note = paragraph(area, '', 'note');
    star.note.split('🫵🏻').forEach((part, index) => {
      if (index) {
        const hand = document.createElement('img'); hand.className = 'inline-emoji'; hand.src = 'assets/pointing-hand.png'; hand.alt = '🫵🏻'; note.append(hand);
      }
      note.append(document.createTextNode(part));
    });
  }
  if (star.reels) {
    const list = document.createElement('section'); list.className = 'reel-list';
    list.setAttribute('aria-label', 'Reels for you');
    paragraph(list, 'I also want you to see these. Don’t forget, this is very important.');
    star.reels.forEach((url, reelIndex) => {
      const number = reelIndex + 1;
      const link = document.createElement('a'); link.className = 'primary reel-link';
      link.href = url; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.textContent = `Reel ${number} ↗`;
      const status = document.createElement('span'); status.className = 'reel-status';
      status.setAttribute('aria-hidden', 'true'); status.textContent = '✓'; link.append(status);
      try { if (localStorage.getItem(`seen-reel:${url}`) === 'true') seenReels.add(url); } catch {}
      const markOpened = () => {
        link.classList.add('opened'); link.setAttribute('aria-label', `Reel ${number}, opened`);
      };
      if (seenReels.has(url)) markOpened();
      link.addEventListener('click', () => {
        seenReels.add(url); markOpened();
        try { localStorage.setItem(`seen-reel:${url}`, 'true'); } catch {}
      });
      list.append(link);
    });
    area.append(list);
  }
  button(area, star.buttonText || 'Keep exploring ✦', closeDialog);
  viewed.add(index);
  const starButton = $(`.star[data-index="${index}"]`); starButton.classList.add('visited'); starButton.setAttribute('aria-label', `Reopen discovered star ${index+1}: ${star.title}`);
  updateProgress(); showDialog();
}
const finale = $('#finale');
const noButton = $('#answer-no');
let questionEvents;
let positionFrame;
let lastDodge = -Infinity;
let collageObserver;
let noMotion;

function showStickerCollage(layer) {
  collageObserver?.disconnect();
  // Each supplied illustration gets a turn before any sticker repeats.
  const artwork = ['romantic-love', 'heart-jar', 'love-letter', 'painted-heart', 'love-balloons', 'love-coupon', 'bear-hug', 'capybara-kiss', 'couple-heart', 'kiss-mark', 'couple-headpat', 'love-bubble', 'couple-kiss', 'love-hearts', 'love-script', 'couple-hug', 'pink-ribbon', 'love-ticket', 'couple-embrace', 'cat-heart', 'bunny-strawberry', 'cute-frog', 'cat-kiss', 'bunny-boba', 'flower-pink', 'cat-flower-shy', 'cute-books', 'bunny-heart', 'cat-blush', 'flower-daisy', 'cat-couple', 'cute-boba', 'bunny-cup', 'cat-pleading', 'cat-flower-happy'];
  let grid = '';
  const fill = () => {
    if (!layer.clientWidth || !layer.clientHeight) return;
    const size = layer.clientWidth <= 700 ? 78 : 126;
    const columns = Math.ceil(layer.clientWidth / size);
    const rows = Math.ceil(layer.clientHeight / size);
    if (grid === `${columns}:${rows}`) return;
    grid = `${columns}:${rows}`;
    layer.style.setProperty('--columns', columns); layer.style.setProperty('--rows', rows);
    const decorations = [];
    const placed = [];
    let remaining = [];
    for (let i = 0; i < columns * rows; i++) {
      if (!remaining.length) remaining = [...artwork];
      const left = i % columns ? placed[i - 1] : undefined;
      const above = placed[i - columns];
      const choices = remaining.map((name, index) => ({name, index})).filter(item => item.name !== left && item.name !== above);
      const choice = choices[Math.floor(Math.random() * choices.length)];
      const name = remaining.splice(choice?.index ?? 0, 1)[0];
      placed.push(name);
      const decoration = document.createElement('div'); decoration.className = 'party-sticker';
      decoration.style.cssText = `--i:${i};--tilt:${i * 13 % 29 - 14}deg;--offset:${i * 7 % 13 - 6}%;--scale:${.9 + i % 4 * .04}`;
      const art = document.createElement('span');
      art.className = `art-sticker ${name}`;
      decoration.append(art); decorations.push(decoration);
    }
    layer.replaceChildren(...decorations);
  };
  fill();
  collageObserver = new ResizeObserver(fill); collageObserver.observe(layer);
}

function floatingHearts(parent, count) {
  for (let i = 0; i < count; i++) {
    const particle = document.createElement('span');
    particle.className = 'floating-heart'; particle.textContent = '♥';
    particle.setAttribute('aria-hidden', 'true');
    particle.style.cssText = `--i:${i};left:${8 + i * 16}%;--delay:${-i * 1.1}s`;
    parent.append(particle);
  }
}
function stopDodging() {
  questionEvents?.abort();
  cancelAnimationFrame(positionFrame);
  noMotion?.cancel();
  noMotion = undefined;
}
function moveNo(pointer, immediate = false) {
  if (!finale.open || $('#final-question').hidden) return;
  const viewport = window.visualViewport;
  const sceneStyle = getComputedStyle($('#final-question'));
  const safeStyle = getComputedStyle(finale);
  const left = (viewport?.offsetLeft || 0) + parseFloat(sceneStyle.paddingLeft);
  const top = (viewport?.offsetTop || 0) + Math.max(20, parseFloat(safeStyle.getPropertyValue('--safe-top')) || 0);
  const right = (viewport?.offsetLeft || 0) + (viewport?.width || innerWidth) - parseFloat(sceneStyle.paddingRight);
  const bottom = (viewport?.offsetTop || 0) + (viewport?.height || innerHeight) - Math.max(20, parseFloat(safeStyle.getPropertyValue('--safe-bottom')) || 0);
  const current = noButton.getBoundingClientRect();
  const obstacles = [...finale.querySelectorAll('.question-core, #finale-close, #finale > .sky-music-toggle')].map(el => el.getBoundingClientRect());
  const overlaps = (x, y, rect, gap) => x < rect.right + gap && x + current.width > rect.left - gap && y < rect.bottom + gap && y + current.height > rect.top - gap;
  const candidates = [];
  const minimumTravel = Math.min(100, (right - left - current.width) / 2, (bottom - top - current.height) / 2);
  const consider = (x, y) => {
    if (x < left || y < top || x + current.width > right || y + current.height > bottom) return;
    if (Math.hypot(x - current.x, y - current.y) < minimumTravel) return;
    if (obstacles.some(rect => overlaps(x, y, rect, 16))) return;
    if (pointer && overlaps(x, y, {left:pointer.clientX, right:pointer.clientX, top:pointer.clientY, bottom:pointer.clientY}, 36)) return;
    candidates.push({x, y});
  };
  for (let i = 0; i < 100; i++) {
    consider(left + Math.random() * (right - left - current.width), top + Math.random() * (bottom - top - current.height));
  }
  // Very short screens may only have a narrow safe strip; sample its edges as a fallback.
  if (!candidates.length) for (let row = 0; row <= 8; row++) for (let column = 0; column <= 6; column++) {
    consider(left + (right - left - current.width) * column / 6, top + (bottom - top - current.height) * row / 8);
  }
  const destination = candidates[Math.floor(Math.random() * candidates.length)];
  if (!destination) return;
  noMotion?.cancel();
  noButton.classList.add('dodging');
  noButton.style.left = `${destination.x}px`; noButton.style.top = `${destination.y}px`;
  if (!reduced && !immediate) {
    noMotion = noButton.animate([
      {transform:`translate(${current.x - destination.x}px, ${current.y - destination.y}px)`},
      {transform:'translate(0, 0)'}
    ], {duration:400, easing:'cubic-bezier(.22, 1, .36, 1)'});
  }
}
function question() {
  stopDodging();
  $('#final-question').hidden = false; $('#celebration').hidden = true;
  finale.classList.remove('is-celebrating');
  finale.setAttribute('aria-labelledby', 'question-title');
  noButton.classList.remove('dodging'); noButton.removeAttribute('style');
  lastDodge = -Infinity;
  document.body.classList.add('finale-open');
  finale.showModal(); finale.scrollTop = 0;
  showStickerCollage($('#question-stickers'));
  $('#question-title').focus();
  questionEvents = new AbortController();
  const options = {signal:questionEvents.signal};
  const dodge = event => {
    event.preventDefault(); event.stopPropagation();
    if (noMotion?.playState === 'running' || performance.now() - lastDodge < 250) return;
    lastDodge = performance.now();
    moveNo(event instanceof PointerEvent ? event : undefined);
  };
  noButton.addEventListener('pointerenter', event => { if (event.pointerType === 'mouse') dodge(event); }, options);
  noButton.addEventListener('pointerdown', dodge, options);
  noButton.addEventListener('click', event => {
    event.preventDefault(); event.stopPropagation();
    if (event.detail === 0) dodge(event);
  }, options);
  noButton.addEventListener('keydown', event => { if (['Enter', ' '].includes(event.key)) dodge(event); }, options);
  const reposition = () => {
    if (!noButton.classList.contains('dodging')) return;
    cancelAnimationFrame(positionFrame);
    positionFrame = requestAnimationFrame(() => moveNo(undefined, true));
  };
  window.addEventListener('resize', reposition, options);
  finale.addEventListener('scroll', reposition, {...options, passive:true});
  window.visualViewport?.addEventListener('resize', reposition, options);
  window.visualViewport?.addEventListener('scroll', reposition, options);
}
let heartRainTimer;
let heartRevealTimer;
function clearHeartRain() {
  clearTimeout(heartRainTimer); clearTimeout(heartRevealTimer);
  const rain = $('#heart-rain');
  rain.hidden = true; rain.classList.remove('revealing'); rain.replaceChildren();
  $('#answer-yes').disabled = false; noButton.disabled = false;
  finale.removeAttribute('aria-busy');
}
function rainThenCelebrate() {
  if ($('#answer-yes').disabled) return;
  stopDodging();
  if (reduced) { celebrate(); return; }
  $('#answer-yes').disabled = true; noButton.disabled = true;
  finale.setAttribute('aria-busy', 'true');
  const rain = $('#heart-rain');
  const columns = innerWidth <= 700 ? 6 : 12, rows = 96 / columns;
  rain.style.setProperty('--columns', columns); rain.style.setProperty('--rows', rows);
  for (let i = 0; i < 96; i++) {
    const heart = document.createElement('span');
    const row = Math.floor(i / columns), column = i % columns;
    heart.style.cssText = `--column:${column};--row:${row};--delay:${(rows-1-row)*1.12/(rows-1)+(column*7%12)*.035}s;--shade:${(row+column)%4}`;
    rain.append(heart);
  }
  rain.hidden = false;
  heartRainTimer = setTimeout(() => {
    celebrate();
    rain.classList.add('revealing');
    heartRevealTimer = setTimeout(clearHeartRain, 650);
  }, 2700);
}
function celebrate() {
  stopDodging();
  document.body.classList.add('together');
  $('#final-question').hidden = true; $('#celebration').hidden = false;
  finale.classList.add('is-celebrating');
  finale.setAttribute('aria-labelledby', 'celebration-title');
  finale.scrollTop = 0;
  $('#question-stickers').replaceChildren();
  showStickerCollage($('#party-stickers'));
  $('#party-drift').replaceChildren();
  if (!reduced) floatingHearts($('#party-drift'), 6);
  $('#celebration-title').focus();
}
$('#answer-yes').onclick = rainThenCelebrate;
$('#party-contact').href = whatsappUrl(content.whatsappNumber, content.whatsappMessage) || `https://wa.me/?text=${encodeURIComponent(content.whatsappMessage)}`;
$('#party-back').onclick = $('#finale-close').onclick = () => finale.close();
finale.addEventListener('close', () => {
  clearHeartRain();
  stopDodging();
  collageObserver?.disconnect();
  document.body.classList.remove('finale-open');
  for (const selector of ['#party-burst', '#party-drift', '#party-stickers', '#question-stickers']) $(selector).replaceChildren();
  $('#next').focus();
});
function closeDialog() { $('#card').querySelector('video')?.pause(); $('#card').close(); }
$('#close').onclick = closeDialog;
$('#card').addEventListener('close', () => { $('#card').querySelector('video')?.pause(); $('#card').querySelector('iframe')?.remove(); window.skyMusic.release(); revealHeart(); });
$('#start').onclick = () => { $('#welcome').hidden = true; $('#explore').hidden = false; $('#world').classList.add('exploring'); updateProgress(); $('.star')?.focus(); };
$('#next').onclick = () => { if (heartRevealed && allViewed(content.stars, viewed)) question(); };
updateProgress();

