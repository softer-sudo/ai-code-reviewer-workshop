/* Bottom scrubber: hover shows a slide preview, click or drag jumps to the slide. */
(function(){
  const D=window.DECK; if(!D||D.QA) return;
  const slides=D.slides, total=slides.length;
  const scrub=document.getElementById('scrub'), trk=scrub.querySelector('.trk'), fill=scrub.querySelector('.fill');
  const peek=document.getElementById('peek'), pv=peek.querySelector('.pv'), capN=peek.querySelector('.cap b'), capT=peek.querySelector('.cap span');
  scrub.setAttribute('aria-valuemin',1); scrub.setAttribute('aria-valuemax',total);
  const isSection=s=>!!s.querySelector('.h1,.num');
  const ticks=[];
  slides.forEach((s,k)=>{ const t=document.createElement('i'); t.className='tk'+(isSection(s)?' blk':''); t.style.left=(k/total*100)+'%'; t.style.width=(100/total)+'%'; trk.appendChild(t); ticks.push(t); });
  const title=s=>{ const h=s.querySelector('.h,.h1,.title,.say'); return h?h.textContent.replace(/\s+/g,' ').trim():''; };
  const cache=new Map();
  function thumb(k){
    if(cache.has(k)) return cache.get(k);
    const w=document.createElement('div'); w.className='pvs';
    const c=slides[k].cloneNode(true); c.classList.remove('past'); c.classList.add('active');
    c.querySelectorAll('[id]').forEach(e=>e.removeAttribute('id')); c.querySelectorAll('[data-b],[data-s]').forEach(e=>e.classList.add('on')); c.querySelectorAll('[data-in]').forEach(e=>e.removeAttribute('data-in'));
    w.appendChild(c); cache.set(k,w); return w;
  }
  const idxAt=x=>{ const r=scrub.getBoundingClientRect(); return Math.max(0,Math.min(total-1,Math.floor((x-r.left)/r.width*total))); };
  let dragging=false, hoverK=-1;
  function show(x){
    const k=idxAt(x);
    if(k!==hoverK){ hoverK=k; pv.replaceChildren(thumb(k)); capN.textContent=String(k+1).padStart(2,'0')+' / '+total; capT.textContent=title(slides[k]);
      ticks.forEach((t,j)=>t.classList.toggle('hov',j===k)); }
    peek.style.left=Math.max(8,Math.min(innerWidth-336,x-164))+'px'; peek.classList.add('show');
    return k;
  }
  function sync(){ const i=D.i; fill.style.width=((i+1)/total*100)+'%'; scrub.setAttribute('aria-valuenow',i+1); ticks.forEach((t,j)=>t.classList.toggle('cur',j===i)); }
  addEventListener('deck:slide',sync); sync();
  /* QA: ?peek=N opens the preview of slide N, as if hovered */
  const pq=new URLSearchParams(location.search).get('peek');
  if(pq) setTimeout(()=>{ const r=scrub.getBoundingClientRect(); show(r.left+(+pq-.5)/total*r.width); scrub.classList.add('drag'); },2500);
  scrub.addEventListener('pointermove',e=>{ const k=show(e.clientX); if(dragging&&k!==D.i) D.go(k); });
  scrub.addEventListener('pointerdown',e=>{ e.stopPropagation(); dragging=true; scrub.classList.add('drag'); try{scrub.setPointerCapture(e.pointerId);}catch(_){} const k=show(e.clientX); if(k!==D.i) D.go(k); });
  scrub.addEventListener('click',e=>e.stopPropagation());
  const end=()=>{ dragging=false; scrub.classList.remove('drag'); };
  scrub.addEventListener('pointerup',end); scrub.addEventListener('pointercancel',end);
  scrub.addEventListener('pointerleave',()=>{ if(!dragging){ peek.classList.remove('show'); hoverK=-1; ticks.forEach(t=>t.classList.remove('hov')); } });
})();
