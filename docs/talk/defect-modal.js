/* defect detail modal: every defect ID on every slide opens its card; data comes from the ground-truth table */
(function(){
  const TIER={T1:'Tier 1 · high impact, directly visible in the diff',T2:'Tier 2 · contract, lifecycle, data safety',T3:'Tier 3 · subtle scope, performance, locale, tests',A:'Adversarial trap',D:'Decoy · flagging it is a false positive'};
  const COL={T1:'var(--red-h)',T2:'var(--blue-h)',T3:'var(--yellow-h)',A:'var(--green-h)',D:'var(--green-h)'};
  const tierOf=id=>id.startsWith('T')?id.slice(0,2):id[0];
  const data={}, order=[];
  document.querySelectorAll('.tbl.gt tbody tr:not(.grp)').forEach(tr=>{
    const td=tr.children, id=td[0].textContent.trim(); if(!id) return;
    const files=[...td[3].querySelectorAll('a')].map(a=>{
      const m=a.href.match(/\/(?:blob|tree)\/[0-9a-f]{7,40}\/([^?#]+)(?:\?[^#]*)?(?:#L(\d+)(?:-L(\d+))?)?/);
      return {href:a.href,path:m?decodeURIComponent(m[1]):a.textContent.trim(),
        lines:m&&m[2]?(m[3]?'lines '+m[2]+'–'+m[3]:'line '+m[2]):(m?'':a.textContent.trim()),
        note:/— /.test(a.textContent)?a.textContent.split('— ').pop():''};
    });
    data[id]={id,title:td[1].querySelector('b').innerHTML,why:td[1].querySelector('.why').innerHTML,
      specs:[...td[2].querySelectorAll('a')].map(a=>({href:a.href,t:a.textContent.trim()})),files};
    order.push(id); tr.dataset.dfx=id;
  });
  if(!order.length) return;
  document.querySelectorAll('.drow .rid,.dcard .rid').forEach(r=>{ const id=r.textContent.trim(); if(data[id]) r.closest('.drow,.dcard').dataset.dfx=id; });

  const ov=document.createElement('div'); ov.id='dfx'; ov.hidden=true;
  ov.innerHTML='<div class="box" role="dialog" aria-modal="true" aria-labelledby="dfx-t" tabindex="-1"><button type="button" class="x" aria-label="Close">✕</button><div class="body"></div></div>';
  document.body.appendChild(ov);
  const box=ov.querySelector('.box'), body=ov.querySelector('.body');
  let cur=null, back=null;
  const esc=t=>String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const CODE=(()=>{ try{ return JSON.parse(document.getElementById('dfx-code').textContent); }catch(e){ return {}; } })();
  const snips=list=>'<div class="snips">'+list.map(c=>
    '<div class="snip"><a class="sb" href="'+esc(c.href)+'" target="_blank" rel="noopener"><i style="background:#ff5f57"></i><i style="background:#febc2e"></i><i style="background:#28c840"></i><span class="pth">'+esc(c.path)+'</span>'+(c.label?'<span class="ln">'+esc(c.label)+'</span>':'')+'<span class="go">GitHub ↗</span></a>'+
    (c.note?'<p class="sn">'+esc(c.note)+'</p>':'')+
    '<div class="dcode">'+c.rows.map(r=>'<div class="dl'+(r.x?' dx':'')+(r.d==='+'?' dp':r.d==='-'?' dm':r.d==='@'?' dat':'')+'"><span class="dn">'+r.n+'</span><span class="dd">'+(r.d&&r.d!=='@'&&r.d!==' '?r.d:'')+'</span><span>'+(r.h||' ')+'</span></div>').join('')+'</div></div>').join('')+'</div>';
  function fill(id){
    const d=data[id]; cur=id; const t=tierOf(id), k=order.indexOf(id);
    box.style.setProperty('--c',COL[t]);
    body.innerHTML=
      '<div class="hd"><span class="id">'+esc(id)+'</span><span class="tier">'+esc(TIER[t])+'</span></div>'+
      '<h3 id="dfx-t">'+d.title+'</h3><p class="why">'+d.why+'</p>'+
      '<h4>Where in the code · quick-blog PR #31 @ f9d44c3</h4>'+(CODE[id]&&CODE[id].length?snips(CODE[id]):'<div class="files">'+
      d.files.map(f=>'<a class="file" href="'+esc(f.href)+'" target="_blank" rel="noopener"><span class="pth">'+esc(f.path)+(f.note?' <span style="color:var(--tx3)">— '+esc(f.note)+'</span>':'')+'</span>'+(f.lines&&f.lines!==f.path?'<span class="ln">'+esc(f.lines)+'</span>':'')+'<span class="go">GitHub ↗</span></a>').join('')+'</div>')+
      (d.specs.length?'<h4>Spec · acceptance criteria</h4><div class="specs">'+d.specs.map(s=>'<a href="'+esc(s.href)+'" target="_blank" rel="noopener">'+esc(s.t)+' ↗</a>').join('')+'</div>':'')+
      '<div class="ft"><span>'+(k+1)+' / '+order.length+' · ← → next defect · Esc closes</span><span class="nav"><button type="button" data-d="-1">← Prev</button><button type="button" data-d="1">Next →</button></span></div>';
    box.scrollTop=0;
    box.querySelectorAll('.dcode').forEach(c=>{ const x=c.querySelector('.dl.dx'); if(x) c.scrollTop=Math.max(0,x.offsetTop-c.clientHeight/3); });
  }
  function open(id){ if(!data[id]) return; back=document.activeElement; fill(id); ov.hidden=false; requestAnimationFrame(()=>ov.classList.add('on')); box.focus({preventScroll:true}); }
  function close(){ ov.classList.remove('on'); ov.hidden=true; cur=null; if(back&&back.focus) back.focus({preventScroll:true}); }
  const step=d=>fill(order[(order.indexOf(cur)+d+order.length)%order.length]);
  window.DEFECTS={open,close,data};

  document.addEventListener('click',e=>{
    if(cur) return;
    if(e.target.closest('a,button')) return;
    const el=e.target.closest('[data-dfx],[data-dfx-zone]'); if(!el) return;
    e.stopPropagation(); e.preventDefault(); open(el.dataset.dfx||el.dataset.dfxZone);
  },true);
  ov.addEventListener('click',e=>{
    e.stopPropagation();
    if(e.target===ov||e.target.closest('.x')) return close();
    const b=e.target.closest('[data-d]'); if(b) step(+b.dataset.d);
  });
  addEventListener('keydown',e=>{
    if(!cur) return;
    e.stopImmediatePropagation();
    if(e.key==='Escape'){e.preventDefault();close();}
    else if(e.key==='ArrowRight'||e.key==='ArrowDown'&&e.altKey){e.preventDefault();step(1);}
    else if(e.key==='ArrowLeft'){e.preventDefault();step(-1);}
    else if(e.key==='Tab'){ const f=[...box.querySelectorAll('a,button')]; if(!f.length) return; const a=f[0],z=f[f.length-1];
      if(e.shiftKey&&document.activeElement===a){e.preventDefault();z.focus();} else if(!e.shiftKey&&document.activeElement===z){e.preventDefault();a.focus();} }
  },true);
})();
