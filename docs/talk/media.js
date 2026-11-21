// Plays each slide's <video> loop only while that slide is active, restarting it from the first frame.
// Videos carry data-src and get their src only when their slide first becomes active (keeps memory low on phones).
(() => {
  const slides = [...document.querySelectorAll('.slide')].filter((s) => s.querySelector('video'));
  if (!slides.length) return;
  const sync = () => slides.forEach((s) => s.querySelectorAll('video').forEach((v) => {
    if (s.classList.contains('active')) { if (!v.getAttribute('src') && v.dataset.src) v.src = v.dataset.src; if (v.paused) { v.currentTime = 0; v.play().catch(() => {}); } }
    else if (!v.paused) v.pause();
  }));
  const mo = new MutationObserver(sync);
  slides.forEach((s) => mo.observe(s, { attributes: true, attributeFilter: ['class'] }));
  addEventListener('deck:start', sync); sync();
})();
