(() => {
  const root = document.documentElement;
  // Phones navigate normally without creating a dark transition layer.
  if (matchMedia('(max-width: 700px), (pointer: coarse)').matches) {
    try { sessionStorage.removeItem('pippo-sky-transition'); } catch {}
    root.classList.remove('page-leaving', 'page-arriving');
    return;
  }
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const storageKey = 'pippo-sky-transition';
  const skyPage = /\/sky(?:\/|\/index\.html)$/.test(location.pathname);
  let leaving = false;
  let arriving = false;
  try {
    const started = Number(sessionStorage.getItem(storageKey));
    sessionStorage.removeItem(storageKey);
    arriving = skyPage && started > Date.now() - 10000 && !reduced.matches;
  } catch { /* Navigation still works without browser storage. */ }
  if (arriving) root.classList.add('page-arriving');

  document.addEventListener('DOMContentLoaded', async () => {
    if (arriving) {
      // Reveal the meadow after its main artwork is ready, with a bounded wait.
      const image = document.querySelector('.meadow-background img');
      await Promise.race([
        image?.decode().catch(() => {}),
        new Promise(resolve => setTimeout(resolve, 1800))
      ]);
      root.classList.remove('page-arriving');
      root.classList.add('page-leaving');
      void root.offsetWidth;
      root.classList.remove('page-leaving');
      setTimeout(() => root.classList.remove('page-leaving', 'page-arriving'), 650);
    }

    document.getElementById('btn-enter-sky')?.addEventListener('click', event => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || reduced.matches) return;
      event.preventDefault();
      if (leaving) return;
      leaving = true;
      const destination = event.currentTarget.href;
      root.classList.add('page-leaving');
      setTimeout(() => {
        try { sessionStorage.setItem(storageKey, String(Date.now())); } catch {}
        location.assign(destination);
      }, 550);
    });
  });

  // A restored page must never keep the opaque departure cover.
  addEventListener('pageshow', event => {
    if (event.persisted || !skyPage) {
      leaving = false;
      root.classList.remove('page-leaving', 'page-arriving');
    }
  });
})();
