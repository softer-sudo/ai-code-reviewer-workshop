// Demo slide: highlight the chapter that matches the studio video's playhead.
(() => {
  const v = document.querySelector('video.demo-studio'); if (!v) return;
  const lis = [...document.querySelectorAll('.chaps li')];
  const sync = () => { let k = 0; lis.forEach((li, i) => { if (v.currentTime >= +li.dataset.t) k = i; }); lis.forEach((li, i) => li.classList.toggle('on', i === k)); };
  v.addEventListener('timeupdate', sync); sync();
})();
