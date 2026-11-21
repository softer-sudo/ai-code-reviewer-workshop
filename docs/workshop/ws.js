/* Workshop mechanics on top of the talk-deck engine: copy buttons, command bars, presenter notes (key P). */
(function(){
  const D=window.DECK; if(!D) return;
  const stage=D.stage, slides=D.slides;
  const ICON_COPY='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
  const ICON_OK='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';
  function selectEl(el){ const r=document.createRange(); r.selectNodeContents(el); const s=getSelection(); s.removeAllRanges(); s.addRange(r); }
  function copyText(text,btn,el){
    const done=()=>{ if(!btn) return; const o=btn.innerHTML; btn.classList.add('ok'); btn.innerHTML=ICON_OK+'<span>Copied</span>'; setTimeout(()=>{ btn.innerHTML=o; btn.classList.remove('ok'); },1400); };
    const fallback=()=>{ if(el) selectEl(el); try{ document.execCommand('copy'); done(); }catch(e){} };
    try{ navigator.clipboard.writeText(text).then(done,fallback); }catch(e){ fallback(); }
  }
  function addBtn(parent,getText,el,label){
    const b=document.createElement('button'); b.type='button'; b.className='cp'; b.innerHTML=ICON_COPY+'<span>Copy</span>';
    b.setAttribute('aria-label','Copy '+label.slice(0,60));
    b.addEventListener('click',e=>{ e.stopPropagation(); copyText(getText(),b,el); }); parent.appendChild(b);
  }
  /* branch names never break mid-word: wrap those tokens in nowrap spans (text content stays identical) */
  stage.querySelectorAll('.cmd code').forEach(code=>{ if(code.children.length||code.querySelector('*')) return;
    const parts=code.textContent.split(/(\s+)/); if(!parts.some(t=>/^(step-[\w-]+|final|main)$/.test(t))) return;
    code.textContent=''; parts.forEach(t=>{ if(/^(step-[\w-]+|final|main)$/.test(t)){ const sp=document.createElement('span'); sp.style.whiteSpace='nowrap'; sp.textContent=t; code.appendChild(sp); } else code.appendChild(document.createTextNode(t)); }); });
  stage.querySelectorAll('.cmd:not(.nocp)').forEach(c=>{ const code=c.querySelector('code'); addBtn(c,()=>code.textContent.trim(),code,code.textContent.trim()); });
  stage.querySelectorAll('.pcard').forEach(p=>{ const pre=p.querySelector('pre'); addBtn(p.querySelector('header'),()=>pre.textContent,pre,'prompt'); p.querySelector('.cp span').textContent='Copy prompt'; });
  /* clicking inside copyable things must not flip the slide */
  stage.addEventListener('click',e=>{ if(e.target.closest('.cmd,.pcard,.scard,.chk')) e.stopPropagation(); });
  stage.querySelectorAll('.pcard pre').forEach(p=>p.addEventListener('keydown',e=>e.stopPropagation()));

  /* ---------- spec modal (on <body>, so it works with the presenter panel open) ----------
     tabs: Spec (rendered) · Markdown (raw) · Detailed prompt; actions: copy, download .md, open on GitHub */
  const ICON_DOWN='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></svg>';
  const ICON_EXT='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>';
  const specData=file=>{ const t=document.querySelector('template.spec-data[data-file="'+file+'"]'); if(!t) return null; const c=t.content;
    return {file, html:c.querySelector('.html').innerHTML, raw:c.querySelector('pre.raw').textContent, gh:t.dataset.gh}; };
  function download(d){ const a=document.createElement('a'); const url=URL.createObjectURL(new Blob([d.raw],{type:'text/markdown;charset=utf-8'}));
    a.href=url; a.download=d.file.split('/').pop(); document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),2000); }
  function flash(btn,label){ const o=btn.innerHTML; btn.classList.add('ok'); btn.innerHTML=ICON_OK+'<span>'+label+'</span>'; setTimeout(()=>{ btn.innerHTML=o; btn.classList.remove('ok'); },1400); }
  const modal=document.createElement('div'); modal.id='specmodal'; modal.setAttribute('role','dialog'); modal.setAttribute('aria-modal','true'); modal.setAttribute('aria-labelledby','sm-title');
  modal.innerHTML='<div class="box2"><header><div class="t"><b id="sm-title"></b><span></span></div><button type="button" class="x">Close · Esc</button></header>'
    +'<div class="bar2"><div class="tabs" role="tablist"><button type="button" role="tab" data-tab="html">Spec</button><button type="button" role="tab" data-tab="raw">Markdown</button></div>'
    +'<button type="button" class="act pri cpy">'+ICON_COPY+'<span></span></button><button type="button" class="act dl">'+ICON_DOWN+'<span>Download .md</span></button><a class="act gh" target="_blank" rel="noopener">'+ICON_EXT+'<span>GitHub</span></a></div>'
    +'<div class="bd" tabindex="0"></div></div>';
  document.body.appendChild(modal);
  const mT=modal.querySelector('.t b'), mF=modal.querySelector('.t span'), mBd=modal.querySelector('.bd'), mCp=modal.querySelector('.cpy'), mDl=modal.querySelector('.dl'), mGh=modal.querySelector('.gh'), mX=modal.querySelector('.x');
  const tabs=[...modal.querySelectorAll('.tabs button')];
  let opener=null, cur=null, tab='html';
  function setTab(t){ tab=t; tabs.forEach(b=>b.setAttribute('aria-selected',b.dataset.tab===t?'true':'false'));
    if(t==='html'){ mBd.innerHTML='<div class="md">'+cur.html+'</div>'; } else { const pre=document.createElement('pre'); pre.className='plain'; pre.textContent=cur[t]; mBd.replaceChildren(pre); }
    mCp.querySelector('span').textContent='Copy spec (markdown)'; mBd.scrollTop=0; }
  function openSpec(file,from,t){ const d=specData(file); if(!d) return; cur=d; opener=from||document.activeElement;
    const h=d.raw.match(/^#\s+(.*)$/m); mT.textContent=h?h[1]:file; mF.textContent=file; mGh.href=d.gh; modal.classList.add('open'); setTab(t||'html'); mX.focus(); }
  function closeSpec(){ modal.classList.remove('open'); if(opener&&opener.focus) try{ opener.focus({preventScroll:true}); }catch(e){} }
  tabs.forEach(b=>b.addEventListener('click',()=>setTab(b.dataset.tab)));
  mCp.addEventListener('click',()=>copyText(cur.raw,mCp,null));
  mDl.addEventListener('click',()=>{ download(cur); flash(mDl,'Saved'); });
  mX.addEventListener('click',closeSpec);
  modal.addEventListener('click',e=>{ e.stopPropagation(); if(e.target===modal) closeSpec(); });
  window.addEventListener('keydown',e=>{ if(!modal.classList.contains('open')) return; e.stopPropagation();
    if(e.key==='Escape'){ e.preventDefault(); closeSpec(); return; }
    if(e.key==='Tab'){ const f=[mX,...tabs,mCp,mDl,mGh,mBd]; const a=f.indexOf(document.activeElement);
      if(e.shiftKey&&a<=0){ e.preventDefault(); f[f.length-1].focus(); } else if(!e.shiftKey&&(a===f.length-1||a<0)){ e.preventDefault(); f[0].focus(); } } },true);
  stage.querySelectorAll('.sbtn[data-spec]').forEach(b=>{ b.addEventListener('click',e=>{ e.stopPropagation();
    const d=specData(b.dataset.spec); if(!d) return; const act=b.dataset.act;
    if(act==='copy') copyText(d.raw,b,null); else if(act==='download'){ download(d); flash(b,'Saved'); } else openSpec(d.file,b); }); });
  window.DECK_openSpec=openSpec;
  /* QA: ?spec=<file>[&tab=raw|full] opens the modal on load */
  const sq=new URLSearchParams(location.search); if(sq.get('spec')) openSpec(sq.get('spec'),null,sq.get('tab'));

  /* ---------- presenter notes ---------- */
  const np=document.createElement('aside'); np.id='notesp'; np.setAttribute('aria-label','Presenter notes');
  np.innerHTML='<div class="hd"><span id="np-pos"></span><span id="np-blk"></span></div><div class="bd" id="np-bd"></div><div class="nx" id="np-nx"></div>';
  document.body.appendChild(np);
  const title=s=>{ const h=s.querySelector('.h,.title,.h1'); return h?h.textContent.replace(/\s+/g,' ').trim():''; };
  function draw(){
    const i=D.i, s=slides[i], bd=document.getElementById('np-bd'); bd.innerHTML='';
    document.getElementById('np-pos').textContent=(i+1)+' / '+slides.length;
    document.getElementById('np-blk').textContent=(s.dataset.block||'')+(s.dataset.time?' · '+s.dataset.time:'');
    const t=s.querySelector('template.notes');
    if(t){ const f=t.content.cloneNode(true);
      f.querySelectorAll('pre.prompt').forEach(p=>{ const box=document.createElement('div'); box.className='pr2';
        const h=document.createElement('div'); h.className='ph'; const l=document.createElement('span'); l.textContent=p.dataset.t||'Prompt';
        const b=document.createElement('button'); b.type='button'; b.textContent='Copy'; const pre=document.createElement('pre'); pre.textContent=p.textContent;
        b.addEventListener('click',()=>copyText(pre.textContent,null,pre)); h.append(l,b); box.append(h,pre); bd.appendChild(box); p.remove(); });
      bd.prepend(f); }
    document.getElementById('np-nx').textContent=i<slides.length-1?'Next: '+title(slides[i+1]):'End';
  }
  addEventListener('deck:slide',draw);
  const ls=(k,v)=>{ try{ if(v===undefined) return localStorage.getItem(k); localStorage.setItem(k,v); }catch(e){ return null; } };
  const toggle=()=>{ document.body.classList.toggle('presenter'); ls('ws-presenter',document.body.classList.contains('presenter')?'1':'0'); };
  addEventListener('keydown',e=>{ if(e.metaKey||e.ctrlKey||e.altKey) return; if(e.key.length===1&&'pPзЗ'.includes(e.key)) toggle(); });
  if(ls('ws-presenter')==='1'||new URLSearchParams(location.search).has('notes')) document.body.classList.add('presenter');
  draw();
})();

/* plan map: hovering or focusing a step bracket highlights the stage blocks it covers (read from its grid columns) */
(function(){
  document.querySelectorAll('.map').forEach(map=>{
    const stages=[...map.querySelectorAll('.mn')];
    const cover=br=>{ const m=(br.style.gridColumn||'').match(/^(\d+)(?:\s*\/\s*(\d+))?$/); if(!m) return []; const a=+m[1], b=m[2]?+m[2]:a+1; return stages.filter((_,k)=>k+1>=a&&k+1<b); };
    const set=(br,on)=>{ br.classList.toggle('lit',on); cover(br).forEach(s=>s.classList.toggle('lit',on)); map.classList.toggle('has-lit',on); };
    map.querySelectorAll('.br').forEach(br=>{
      br.addEventListener('mouseenter',()=>set(br,true)); br.addEventListener('mouseleave',()=>set(br,false));
      br.addEventListener('focus',()=>set(br,true)); br.addEventListener('blur',()=>set(br,false));
    });
  });
})();
