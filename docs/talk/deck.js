/* DevFest Night deck engine: slides, steps, 3D tilt, panel shapes, QA modes. */
(function(){
  const stage=document.getElementById('stage');
  const slides=[...stage.querySelectorAll('.slide')];
  const total=slides.length, q=new URLSearchParams(location.search);
  const QA=q.has('shot'); if(QA) document.body.classList.add('qa');
  const ls=k=>{ try{ return localStorage.getItem(k); }catch(e){ return null; } };
  const lsSet=(k,v)=>{ try{ localStorage.setItem(k,v); }catch(e){} };
  // phones/tablets: iOS kills the tab when blur panels + 3D layers + WebGL exceed its memory budget,
  // so they start in lite mode (stored choice still wins) and skip the all-slides warm-up paint
  const PHONE=/iPhone|iPad|iPod|Android|Mobile/i.test(navigator.userAgent)||(navigator.maxTouchPoints>1&&matchMedia('(pointer:coarse)').matches);
  /* motion: '3d' (tilt follows the cursor), 'flat' (straight, animations kept), 'lite' (no effects).
     Settings panel, key M, ?lite / ?flat / ?3d; remembered per browser */
  let motion=q.has('lite')?'lite':q.has('flat')?'flat':q.has('3d')?'3d':(ls('deck-motion')||(ls('deck-lite')==='1'||PHONE?'lite':'flat'));
  let lite=motion==='lite';
  document.body.classList.toggle('lite',lite); document.body.classList.toggle('flat',motion==='flat');
  const maxS=s=>+(s.dataset.steps||0);
  let i=0, step=0;

  /* ---------- notched panel shapes ----------
     data-shape tokens: notch-br:W:H (cut bottom-right), cut-tl:W:H (cut top-left),
     tab-tl:W:H (top-left tab, panel drops below it), tab-tr:W:H (top-right tab). */
  function roundPoly(pts,r){
    const n=pts.length; let d='';
    for(let k=0;k<n;k++){
      const p0=pts[(k-1+n)%n], p1=pts[k], p2=pts[(k+1)%n];
      const v1=[p0[0]-p1[0],p0[1]-p1[1]], v2=[p2[0]-p1[0],p2[1]-p1[1]];
      const l1=Math.hypot(...v1), l2=Math.hypot(...v2), rr=Math.min(r,l1/2,l2/2);
      const a=[p1[0]+v1[0]/l1*rr,p1[1]+v1[1]/l1*rr], b=[p1[0]+v2[0]/l2*rr,p1[1]+v2[1]/l2*rr];
      d+=(k?'L':'M')+a[0].toFixed(1)+' '+a[1].toFixed(1)+'Q'+p1[0]+' '+p1[1]+' '+b[0].toFixed(1)+' '+b[1].toFixed(1);
    }
    return d+'Z';
  }
  function shapePts(w,h,spec){
    const t={}; (spec||'').split(/\s+/).filter(Boolean).forEach(s=>{const [k,a,b]=s.split(':');t[k]=[+a,+b];});
    const tl=t['cut-tl'], tab=t['tab-tl'], tr=t['tab-tr'], br=t['notch-br'], pts=[];
    if(tl) pts.push([tl[0],0]); else if(tr) pts.push([w-tr[0],0]); else pts.push([0,0]);
    pts.push([w,0]);
    if(br) pts.push([w,h-br[1]],[w-br[0],h-br[1]],[w-br[0],h]); else pts.push([w,h]);
    if(tab) pts.push([tab[0],h],[tab[0],tab[1]],[0,tab[1]]); else pts.push([0,h]);
    if(tl) pts.push([0,tl[1]],[tl[0],tl[1]]);
    if(tr) pts.push([0,tr[1]],[w-tr[0],tr[1]]);
    return pts;
  }
  stage.querySelectorAll('.panel').forEach(p=>{
    const w=p.offsetWidth, h=p.offsetHeight;
    const d=roundPoly(shapePts(w,h,p.dataset.shape),38);
    p.style.clipPath=`path('${d}')`;
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.setAttribute('class','edge'); svg.setAttribute('width',w); svg.setAttribute('height',h);
    svg.style.left=p.style.left; svg.style.top=p.style.top;
    svg.innerHTML=`<path class="base" d="${d}"/><path class="run" d="${d}"/><path class="run" d="${d}"/>`;
    p.after(svg);
    // two lights running along the edge in parallel, half a lap apart; one dash per lap
    // two lights leave the same point and run around the panel in opposite directions, meeting on the far side
    const runs=svg.querySelectorAll('.run'), L=runs[0].getTotalLength(), dash=150, dur=Math.max(12000,L*4.2);
    runs.forEach((r,k)=>{ r.style.strokeDasharray=`${dash} ${L-dash}`;
      const an=r.animate([{strokeDashoffset:k?-L+dash:0},{strokeDashoffset:k?dash:-L}],{duration:dur,iterations:Infinity});
      an.pause(); if(QA) an.currentTime=dur*.18; (p.closest('.slide').__runs||(p.closest('.slide').__runs=[])).push(an); });
  });

  /* ---------- statement word split ---------- */
  stage.querySelectorAll('.split').forEach(el=>{
    let n=0;
    const walk=node=>{[...node.childNodes].forEach(c=>{
      if(c.nodeType===3){ const frag=document.createDocumentFragment();
        c.textContent.split(/(\s+)/).forEach(t=>{ if(!t) return; if(/^\s+$/.test(t)){frag.appendChild(document.createTextNode(t));return;}
          const s=document.createElement('span'); s.className='w'; s.style.setProperty('--i',n++); s.textContent=t; frag.appendChild(s); });
        c.replaceWith(frag);
      } else if(c.classList&&c.classList.contains('hl')){ c.classList.add('w'); c.style.setProperty('--i',n++); }
      else walk(c); });};
    walk(el);
  });

  /* ---------- 3D extrusion clones ---------- */
  stage.querySelectorAll('.extrude').forEach(el=>{
    const face=el.querySelector('.face'), N=+(el.dataset.depth||12);
    for(let k=N;k>=1;k--){ const s=document.createElement('span'); s.textContent=face.textContent; s.setAttribute('aria-hidden','true');
      const t=k/N; s.style.transform=`translateZ(${-k*3}px)`;
      s.style.color=`rgb(${Math.round(20+30*(1-t))},${Math.round(30+50*(1-t))},${Math.round(60+90*(1-t))})`; el.insertBefore(s,face); }
    face.style.transform='translateZ(0)';
  });

  /* ---------- reveal: how slide content comes in ----------
     'auto'  heading first, then the other blocks animate in by themselves (one click = one slide)
     'click' each click reveals the next block (at most 4 per slide)
     'off'   everything is there at once
     Settings panel, key A, ?reveal=auto|click|off; remembered. data-build="off" on a slide opts out,
     data-b="N" on a block sets its click step by hand. */
  let reveal=q.get('reveal')||(q.has('builds')?'click':null)||ls('deck-reveal')||'auto';
  const SKIP='.panel,svg.edge,.gdgtext,.badge,.foot';
  const isHead=e=>e.matches('.num')||!!e.querySelector(':scope>.kicker,:scope>.h,:scope>.h1,:scope>.title');
  stage.querySelectorAll('[data-b]').forEach(e=>e.dataset.bHand=e.dataset.b);
  function plan(s){
    const t=s.querySelector('.tilt'); if(!t||s.dataset.build==='off') return [];
    let items=[...t.children].filter(e=>!e.matches(SKIP)&&!isHead(e));
    const hand=items.filter(e=>e.dataset.bHand); if(hand.length) return hand.map(e=>[e,+e.dataset.bHand]);
    const wires=items.filter(e=>e.matches('svg.wires')); items=items.filter(e=>!e.matches('svg.wires'));
    if(items.length<2) return [];
    const k=Math.min(items.length,4), out=items.map((e,j)=>[e,Math.floor(j*k/items.length)+1]);
    wires.forEach(w=>out.push([w,k])); return out;
  }
  function applyReveal(){
    slides.forEach(s=>{
      s.querySelectorAll('[data-b],[data-in]').forEach(e=>{ e.removeAttribute('data-b'); e.removeAttribute('data-in'); e.style.removeProperty('--in'); e.classList.remove('on'); });
      delete s.dataset.steps; if(reveal==='off') return;
      const p=plan(s); if(!p.length) return;
      if(reveal==='click'){ p.forEach(([e,n])=>e.dataset.b=n); s.dataset.steps=Math.max(...p.map(x=>x[1])); }
      else{ const gap=Math.min(.14,1/p.length); p.forEach(([e],j)=>{ e.dataset.in=''; e.style.setProperty('--in',(.3+j*gap).toFixed(2)+'s'); }); }
    });
  }
  applyReveal();

  /* ---------- light theme: button, key L, ?light; remembered per browser ---------- */
  let light=q.has('light');
  if(!q.has('light')&&ls('deck-theme')==='light') light=true;
  document.body.classList.toggle('light',light);

  /* ---------- fit & render ---------- */
  function fit(){ const s=Math.min(innerWidth/1600,innerHeight/900);
    stage.style.transform=`translate(${(innerWidth-1600*s)/2}px,${(innerHeight-900*s)/2}px) scale(${s})`; }
  function render(){
    slides.forEach((s,k)=>{ s.classList.toggle('active',k===i); s.classList.toggle('past',k<i);
      s.querySelectorAll('[data-s],[data-b]').forEach(e=>e.classList.toggle('on',k===i&&+(e.dataset.s||e.dataset.b)<=step)); });
    document.getElementById('bar').style.width=((i+1)/total*100)+'%';
    if(!QA) history.replaceState(null,'',location.pathname+location.search+'#s'+(i+1));
    const still=QA||lite||matchMedia('(prefers-reduced-motion: reduce)').matches;
    slides.forEach((s,k)=>(s.__runs||[]).forEach(a=>(k===i&&!still)?a.play():a.pause()));
    window.dispatchEvent(new CustomEvent('deck:slide',{detail:{i,step,slide:slides[i]}}));
  }
  const next=()=>{ if(step<maxS(slides[i])) step++; else if(i<total-1){i++;step=0;} render(); };
  const prev=()=>{ if(step>0) step--; else if(i>0){i--;step=maxS(slides[i]);} render(); };
  addEventListener('keydown',e=>{
    if(['ArrowRight','PageDown',' ','Enter'].includes(e.key)){e.preventDefault();next();}
    else if(['ArrowLeft','PageUp','Backspace'].includes(e.key)){e.preventDefault();prev();}
    else if(e.key==='Home'){i=0;step=0;render();}
    else if(e.key==='End'){i=total-1;step=0;render();}
    else if(e.key==='m'||e.key==='M'){setMotion({'3d':'flat',flat:'lite',lite:'3d'}[motion]);}
    else if(e.key==='a'||e.key==='A'){setReveal({auto:'click',click:'off',off:'auto'}[reveal]);}
    else if(e.key==='Escape'){closeSettings();}
    else if(e.key==='l'||e.key==='L'){setLight(!light);}
    else if(e.key==='f'||e.key==='F'){document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen();}
  });
  addEventListener('click',e=>{ if(e.target.closest('a,button')) return; (e.clientX<innerWidth*.25)?prev():next(); });

  /* ---------- mouse: 3D tilt + panel spotlight ---------- */
  const m={x:0,y:0,tx:0,ty:0};
  addEventListener('pointermove',e=>{ if(motion==='3d'){ m.tx=e.clientX/innerWidth*2-1; m.ty=e.clientY/innerHeight*2-1; mouseActive=true; }
    const r=stage.getBoundingClientRect(), sx=(e.clientX-r.left)/r.width*1600, sy=(e.clientY-r.top)/r.height*900;
    slides[i].querySelectorAll('.panel').forEach(p=>{ p.style.setProperty('--px',(sx-p.offsetLeft)+'px'); p.style.setProperty('--py',(sy-p.offsetTop)+'px'); });
  });
  let mouseActive=false; document.addEventListener('pointerleave',()=>mouseActive=false);
  window.DECK={PHONE,get light(){return light;},get motion(){return motion;},get reveal(){return reveal;},get mouseActive(){return mouseActive;},mouse:m,stage,slides,get i(){return i;},QA,get lite(){return lite;},get started(){return started;}};
  window.DECK.go=n=>{ i=Math.max(0,Math.min(total-1,n)); step=0; render(); };
  let looping=false;
  function loop(){ m.x+=(m.tx-m.x)*.07; m.y+=(m.ty-m.y)*.07;
    const t=slides[i].querySelector('.tilt'); if(t){ t.style.setProperty('--ry',(m.x*5).toFixed(2)+'deg'); t.style.setProperty('--rx',(-m.y*4).toFixed(2)+'deg'); }
    if(Math.abs(m.tx-m.x)+Math.abs(m.ty-m.y)>.002) requestAnimationFrame(loop); else looping=false; }
  const kick=()=>{ if(!looping&&!QA&&motion==='3d'){ looping=true; requestAnimationFrame(loop); } };

  /* ---------- settings: one gear button, the panel holds every switch ---------- */
  function toast(msg){ const t=document.createElement('div'); t.className='toast'; t.textContent=msg; document.body.appendChild(t); setTimeout(()=>t.remove(),4000); }
  const OPTS={
    theme:{label:'Theme',key:'L',vals:[['dark','Dark'],['light','Light']],get:()=>light?'light':'dark',set:v=>setLight(v==='light')},
    motion:{label:'Motion',key:'M',vals:[['3d','3D tilt'],['flat','Flat'],['lite','Off']],get:()=>motion,set:v=>setMotion(v)},
    reveal:{label:'Content',key:'A',vals:[['auto','Animate in'],['click','Per click'],['off','Static']],get:()=>reveal,set:v=>setReveal(v)},
  };
  const tools=document.createElement('div'); tools.id='tools';
  tools.innerHTML='<button type="button" id="gear" aria-expanded="false" aria-controls="settings" title="Settings">⚙︎ Settings</button><div id="settings" role="dialog" aria-label="Deck settings" hidden></div>';
  const gear=tools.querySelector('#gear'), panel=tools.querySelector('#settings');
  Object.entries(OPTS).forEach(([id,o])=>{
    const row=document.createElement('div'); row.className='row'; row.innerHTML=`<span>${o.label} <kbd>${o.key}</kbd></span><div class="seg2" role="group" aria-label="${o.label}"></div>`;
    o.vals.forEach(([v,t])=>{ const b=document.createElement('button'); b.type='button'; b.textContent=t; b.dataset.v=v;
      b.addEventListener('click',()=>o.set(v)); row.lastChild.appendChild(b); });
    o.row=row; panel.appendChild(row); });
  panel.insertAdjacentHTML('beforeend','<p class="hint">Saved in this browser. F = fullscreen.</p>');
  function sync(){ Object.values(OPTS).forEach(o=>o.row.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.v===o.get())))); }
  const openSettings=()=>{ panel.hidden=false; gear.setAttribute('aria-expanded','true'); tools.classList.add('open'); };
  function closeSettings(){ panel.hidden=true; gear.setAttribute('aria-expanded','false'); tools.classList.remove('open'); }
  gear.addEventListener('click',()=>{ panel.hidden?openSettings():closeSettings(); gear.blur(); });
  tools.addEventListener('click',e=>e.stopPropagation()); tools.addEventListener('pointerdown',e=>e.stopPropagation());
  addEventListener('pointerdown',e=>{ if(!tools.contains(e.target)) closeSettings(); });

  function setMotion(v,why){ motion=v; lite=v==='lite';
    document.body.classList.toggle('lite',lite); document.body.classList.toggle('flat',v==='flat');
    if(!why) lsSet('deck-motion',v);
    if(v!=='3d'){ m.tx=m.ty=m.x=m.y=0; mouseActive=false; slides.forEach(s=>{ const t=s.querySelector('.tilt'); if(t){t.style.removeProperty('--rx');t.style.removeProperty('--ry');} }); }
    slides.forEach((s,k)=>(s.__runs||[]).forEach(a=>(k===i&&!lite&&!QA)?a.play():a.pause()));
    window.dispatchEvent(new CustomEvent('deck:lite',{detail:{lite,why}})); sync();
    if(why==='auto') toast('Slow graphics detected: effects off. Settings → Motion to turn them back on.'); }
  function setReveal(v){ reveal=v; lsSet('deck-reveal',v); applyReveal(); step=0; render(); sync(); }
  function setLight(on){ light=!!on; document.body.classList.toggle('light',light); lsSet('deck-theme',light?'light':'dark');
    window.dispatchEvent(new CustomEvent('deck:theme',{detail:{light}})); sync(); }
  sync(); if(!QA) document.body.appendChild(tools);
  // the scene asks for lite mode when frames stay slow even at the lowest resolution
  addEventListener('deck:too-slow',()=>{ if(!lite) setMotion('lite','auto'); });
  let idle; addEventListener('pointermove',()=>{ tools.classList.add('show'); clearTimeout(idle); idle=setTimeout(()=>tools.classList.remove('show'),2500); });
  addEventListener('pointermove',kick); addEventListener('deck:slide',kick);

  addEventListener('resize',fit); fit();
  const h=+location.hash.replace('#s','');
  if(QA){ i=Math.max(0,Math.min(total-1,+q.get('shot')-1)); step=q.has('step')?+q.get('step'):maxS(slides[i]); }
  else if(h){ i=Math.max(0,Math.min(total-1,h-1)); }
  /* start sequence: wait for fonts, pre-paint every slide once (invisible), THEN show the cover and
     start the intro. All the heavy one-off work happens before anything moves, so nothing stutters later. */
  let started=QA;
  const start=()=>{ if(started) return; started=true; document.body.classList.remove('booting'); render(); dispatchEvent(new CustomEvent('deck:start')); };
  if(QA){ render(); }
  else{
    document.body.classList.add('booting');
    const fonts=Promise.race([document.fonts?document.fonts.ready:Promise.resolve(),new Promise(r=>setTimeout(r,1500))]);
    if(PHONE) fonts.then(()=>requestAnimationFrame(start));
    else fonts.then(()=>{ slides.forEach(s=>s.classList.add('warm'));
      requestAnimationFrame(()=>requestAnimationFrame(()=>requestAnimationFrame(()=>{ slides.forEach(s=>s.classList.remove('warm')); requestAnimationFrame(start); }))); });
  }
})();
