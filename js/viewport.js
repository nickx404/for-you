(() => {
  // Safari's toolbar can leave CSS viewport units smaller than the visible page.
  const syncHeight = () => {
    if (window.visualViewport?.scale > 1) return;
    document.documentElement.style.setProperty('--scene-height', `${window.visualViewport?.height || window.innerHeight}px`);
  };
  syncHeight();
  const onResize = () => requestAnimationFrame(syncHeight);
  window.visualViewport?.addEventListener('resize', onResize);
  window.addEventListener('resize', onResize);
  window.addEventListener('pageshow', syncHeight);
})();
