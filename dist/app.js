import { content } from './content.js?v=first-date';
import { heartPoints, allViewed, whatsappUrl } from './logic.js';
const $ = selector => document.querySelector(selector);
const viewed = new Set();
let heartRevealed = false;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const theme = new URLSearchParams(location.search).get('theme');
if (['illustrated', 'scrapbook'].includes(theme)) document.body.dataset.theme = theme;
$('#sky-mode').addEventListener('change', event => {
  document.body.dataset.sky = event.target.value;
  $('meta[name="theme-color"]').content = {clouds:'#8fd1d2',pink:'#285373',purple:'#17162f'}[event.target.value];
});
if (content.name) $('#greeting').textContent = `HEY, ${content.name.toUpperCase()}`;
for (let i = 0; i < 95; i++) {
  const dot = document.createElement('span');
  dot.className = 'dust';
  dot.style.cssText = `left:${(i*73.13)%100}%;top:${(i*31.71)%88}%;--delay:${i%9}s;--size:${i%7===0?3:2}px;opacity:${.2+(i%5)*.13}`;
  $('#stardust').append(dot);
}
const points = heartPoints(content.stars.length);
if (points.length === 6) {
  points[1].x += 11; points[4].x -= 11;
  points[1].y += 8; points[4].y += 8;
}
// Derive the outline from the same image so the final fill matches its silhouette.
$('#lines').innerHTML = `<defs><filter id="pixel-outline" x="-10%" y="-10%" width="120%" height="120%"><feMorphology in="SourceAlpha" operator="erode" radius="4" result="inside"/><feComposite in="SourceAlpha" in2="inside" operator="out" result="edge"/><feFlood flood-color="#000000"/><feComposite in2="edge" operator="in"/></filter></defs>`;
$('#constellation').insertAdjacentHTML('beforeend', '<img class="heart-complete pixel-outline" src="assets/smiling-heart.png" alt=""><img class="heart-glow pixel-outline" src="assets/smiling-heart.png" alt="">');
const heart = document.createElement('div');
heart.className = 'heart-reveal'; heart.setAttribute('aria-hidden', 'true');
heart.innerHTML = '<img src="assets/smiling-heart.png" alt="">';
heart.querySelector('img').addEventListener('error', event => { event.target.hidden = true; });
$('#constellation').append(heart);
content.stars.forEach((star, index) => {
  const button = document.createElement('button');
  button.className = 'star'; button.dataset.index = index;
  button.classList.toggle('tip', points[index].y > 82);
  button.style.cssText = `left:${points[index].x}%;top:${points[index].y}%;--delay:${index*.4}s`;
  button.setAttribute('aria-label', `Open star ${index+1}: ${star.title}`);
  button.innerHTML = `<img class="star-shape" src="assets/pastel-star.png" alt=""><span class="star-label"></span><span class="star-number" aria-hidden="true">${index+1}</span>`;
  button.querySelector('.star-label').textContent = star.label || star.title;
  button.addEventListener('click', () => openStar(index));
  $('#stars').append(button);
});
function updateProgress() {
  const complete = allViewed(content.stars, viewed);
  $('#counter').textContent = `${viewed.size} of ${content.stars.length} stars discovered`;
  $('#progress-marks').replaceChildren(...content.stars.map((_, i) => {
    const mark = document.createElement('span'); mark.className = viewed.has(i) ? 'filled' : ''; mark.textContent = '✦'; return mark;
  }));
  $('#next').disabled = !complete || !heartRevealed;
  $('#next').hidden = $('#next').disabled;
  $('#progress-hint').textContent = complete ? 'All these little things were leading somewhere.' : 'Open every star to find what comes next.';
}
function revealHeart() {
  if (!allViewed(content.stars, viewed) || $('#constellation').classList.contains('complete')) return;
  $('#constellation').classList.add('complete');
  const finish = () => { heartRevealed = true; updateProgress(); };
  const popHeart = () => {
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
  const star = content.stars[index];
  const area = card(star.title, `STAR ${String(index+1).padStart(2,'0')} / A LITTLE PIECE OF US`);
  paragraph(area, star.text);
  if (star.sticker) sticker(area, star.sticker);
  if (Object.hasOwn(star, 'video')) {
    const frame = document.createElement('div'); frame.className = 'tv';
    if (star.video) {
      const video = document.createElement('video'); video.controls = true; video.playsInline = true; video.preload = 'metadata'; video.src = star.video;
      const speedLabel = document.createElement('label'); speedLabel.className = 'playback-speed'; speedLabel.textContent = 'Playback speed';
      const speed = document.createElement('select'); speed.setAttribute('aria-label', 'Playback speed');
      for (const rate of [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]) {
        const option = document.createElement('option'); option.value = rate; option.textContent = `${rate}×`; option.selected = rate === 1; speed.append(option);
      }
      speed.addEventListener('change', () => { video.playbackRate = Number(speed.value); });
      speedLabel.append(speed);
      video.addEventListener('error', () => { frame.replaceChildren(); paragraph(frame, 'The video couldn’t load, but you can keep exploring.'); });
      frame.append(video, speedLabel);
    } else paragraph(frame, '▶\nA message from me\nComing with a little courage.');
    area.append(frame);
  }
  if (star.photo) { const image = document.createElement('img'); image.className = 'memory-photo'; image.src = star.photo; image.alt = star.photoAlt || 'A shared memory'; image.onerror = () => image.remove(); area.append(image); }
  if (star.signoffPhoto) { const image = document.createElement('img'); image.className = 'memory-photo memory-signoff'; image.src = star.signoffPhoto; image.alt = star.signoffAlt || ''; image.onerror = () => image.remove(); area.append(image); }
  if (star.note) {
    const note = paragraph(area, '', 'note');
    star.note.split('🫵🏻').forEach((part, index) => {
      if (index) {
        const hand = document.createElement('img'); hand.className = 'inline-emoji'; hand.src = 'assets/pointing-hand.png'; hand.alt = '🫵🏻'; note.append(hand);
      }
      note.append(document.createTextNode(part));
    });
  }
  button(area, 'Keep exploring ✦', closeDialog);
  viewed.add(index);
  const starButton = $(`.star[data-index="${index}"]`); starButton.classList.add('visited'); starButton.setAttribute('aria-label', `Reopen discovered star ${index+1}: ${star.title}`);
  updateProgress(); showDialog();
}
function question() {
  const area = card('So… is this us, officially?', 'OKAY. ENOUGH PRETENDING.');
  paragraph(area, 'You, me, and a little less pretending.');
  const actions = document.createElement('div'); actions.className = 'actions'; area.append(actions);
  button(actions, 'Yes 💛', celebrate);
  button(actions, 'Wait… really?', () => { $('#really').hidden = false; }, 'secondary');
  const reply = paragraph(area, 'Really. I made you an entire sky.', 'note'); reply.id = 'really'; reply.hidden = true; reply.setAttribute('role','status');
  button(area, 'Maybe later', () => { const a = card('Take your time.', 'STILL YOUR LITTLE SKY'); paragraph(a, 'That’s okay. I’m glad you visited my little sky.'); button(a, 'Back to the question', question); }, 'text-button');
  showDialog();
}
function celebrate() {
  document.body.classList.add('together');
  const area = card('Okay, now I’m smiling at my screen.', 'IT’S US. OFFICIALLY.');
  sticker(area, 'celebration');
  const url = whatsappUrl(content.whatsappNumber, content.whatsappMessage);
  if (url) { const a = document.createElement('a'); a.className = 'primary'; a.textContent = 'Okay, come to me 💛'; a.href = url; area.append(a); }
  else { button(area, 'Okay, come to me 💛', () => { $('#missing-number').hidden = false; }); const p = paragraph(area, 'Your WhatsApp destination hasn’t been added yet. Add your number in content.js before sharing.', 'note'); p.id = 'missing-number'; p.hidden = true; p.setAttribute('role','status'); }
  if (!reduced) for (let i=0;i<12;i++) { const heart=document.createElement('span'); heart.className='celebration-heart'; heart.textContent='♥'; heart.setAttribute('aria-hidden','true'); heart.style.cssText=`left:${10+i*7}%;--delay:${i*.12}s`; $('#world').append(heart); heart.addEventListener('animationend',()=>heart.remove()); }
}
function closeDialog() { $('#card').querySelector('video')?.pause(); $('#card').close(); }
$('#close').onclick = closeDialog;
$('#card').addEventListener('close', () => { $('#card').querySelector('video')?.pause(); revealHeart(); });
$('#start').onclick = () => { $('#welcome').hidden = true; $('#explore').hidden = false; $('#world').classList.add('exploring'); $('.star')?.focus(); };
$('#next').onclick = () => { if (allViewed(content.stars, viewed)) question(); };
updateProgress();

