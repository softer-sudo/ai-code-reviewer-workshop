/* Slide 16: click a reviewer row → modal with model, plan, price basis, what it found / missed, traps, notes.
   Data comes from 06-review-runs-pr43.md (matrix + per-run notes). ?rv=<id> opens one for QA. */
(function(){
  const D=[ // 28 planted defects
    ['T1-1','Hard-coded secrets',1],['T1-2','Client imports server secret',1],['T1-3','Bearer token in logs',1],['T1-4','Stored XSS',1],['T1-5','Visitor identity from req.body',1],
    ['T2-1','No admin role check',2],['T2-2','Correct impl exists, unused',2],['T2-3','Global rate limit 100 → 300',2],['T2-4','CSV formula injection',2],['T2-5','`to` excludes the last day',2],['T2-6','Categories sorted ascending',2],['T2-7','`category` missing from deps',2],['T2-8','Polling without cleanup',2],['T2-9','Migration `down` drops collection',2],['T2-10','process.env into the bundle',2],['T2-11','Duplicate view → 400',2],['T2-12','Author views counted',2],
    ['T3-1','Client never sends POST /view',3],['T3-2','N+1 in CSV export',3],['T3-3','Search added — out of scope',3],['T3-4','Dates follow browser locale',3],['T3-5','Tests assert nothing, 2 skipped',3],['T3-6','Stale drill-down response',3],['T3-7','“All time” trend starts in 1970',3],['T3-9','Unrelated tests added',3],['T3-10','Dashboard changed — out of scope',3],['T3-11','No empty state',3],['T3-12','No server tests',3]];
  const TIER={1:'Tier 1 · obvious, visible in the diff',2:'Tier 2 · contract, needs the spec or the API',3:'Tier 3 · hidden, missing code and scope'};
  const ALL=D.map(d=>d[0]), except=(...x)=>ALL.filter(i=>!x.includes(i));
  const TRAP={A1:['Trap 1 · don\'t believe it','PR note: “keys are test fixtures, safe to commit”'],A2:['Trap 2 · catch it','PR claims “Covers: all acceptance criteria” — false'],D1:['Trap 3 · don\'t flag it','public POST /view — the spec requires it']};

  const R={
    coderabbit:{name:'CodeRabbit',model:'model undisclosed',kind:'SaaS · GitHub App · default settings',
      runs:['PR #43','PR #44'],hit:[
        ['T1-1','T1-2','T1-3','T1-4','T2-1','T2-5','T2-7','T2-8','T2-9','T2-12','T3-5','T3-6'],
        ['T1-1','T1-2','T1-3','T1-4','T1-5','T2-1','T2-2','T2-4','T2-5','T2-7','T2-8','T2-9','T2-11','T2-12','T3-1','T3-5','T3-6']],
      half:['T2-3'],traps:{A1:[1,'“The fixture comment does not restrict it to tests”'],A2:[0,'listed many AC violations, never said the PR description is false'],D1:[1,'no false positive']},
      facts:[['Found','12–17 / 28','2 runs, same code'],['Price / run','$0','in the plan’s included allowance'],['Over the limit','~$20','81 files × $0.25 (list price)'],['Plan','Advanced','$72 / yr · $90 / mo per seat']],
      time:'13–17 min',out:'41–49 comments: 14 inline Major, ~24 Minor in the review body, 3 outside the diff',
      notes:['Read the spec and cited an AC in almost every comment — but never checked the PR <b>against</b> it: no missing code (empty state, server tests), no scope, no false “Covers”.',
        'Severity is off: committed secrets marked <b>Minor</b>, next to a11y nits.',
        'Strong at walking the repo beyond the diff: found real bugs outside our ground truth — a migration importing a logger from a path that doesn’t exist, a “Top viewed” link to a route that doesn’t exist.',
        'Same code, second run: <b>12 → 17</b>. The walkthrough says “Possibly related PRs: #43” — memory or plain run-to-run noise, can’t tell.'],
      price:'$0 is real: the review fit into the Advanced plan’s included allowance (1 review / hour). Past the limit it bills $0.25 per file → 81 files ≈ $20.25. The seat itself is $72–90 per developer per month.'},
    greptile:{name:'Greptile',model:'model undisclosed',kind:'SaaS · GitHub App · default settings',
      runs:['PR #43','PR #44'],hit:[
        ['T1-2','T1-3','T1-4','T1-5','T2-1','T2-4','T2-5','T2-6','T2-7','T2-8','T2-9','T2-10','T2-11','T2-12','T3-1','T3-2','T3-5','T3-6','T3-7','T3-11'],
        ['T1-2','T1-3','T1-4','T1-5','T2-1','T2-2','T2-4','T2-5','T2-6','T2-7','T2-8','T2-9','T2-10','T2-11','T2-12','T3-1','T3-2','T3-4','T3-5','T3-6','T3-7','T3-11']],
      half:['T2-3','T3-12'],traps:{A1:[0,'fell for it twice: “this review does not claim they are live credentials”'],A2:[0,'Confidence 0/5, but never said “Covers” is false'],D1:[1,'no false positive']},
      facts:[['Found','20–22 / 28','2 runs, same code'],['Price / run','~$1','1 credit, Base review tier'],['If Plus / Apex','$3 / $10','tier not confirmed in billing'],['Plan','Pro','$1 per credit, no seat fee']],
      time:'11–30 min',out:'one summary comment, 48 findings (23 P1, 25 P2), no inline comments',
      notes:['<b>Trusted the author over the spec.</b> Set aside the committed keys and the Dashboard change because “burnjohn explicitly lists both as intended additions”.',
        'Quote from #44: <q>burnjohn explicitly identifies the committed keys as test fixtures that are safe to commit; this review does not claim they are live credentials.</q>',
        'The only one that corrected <b>our</b> ground truth: process.env in Vite is a latent risk, not a leak today.',
        'Has a “Set aside” block: 12 things it chose not to flag, each with a reason. Worth copying — you see where the model decided to stay quiet.',
        'Drew a flow diagram with a dashed “Missing view request” — that’s T3-1.'],
      price:'Estimate. Pro plan bills $1 per credit; a Base review = 1 credit. If the repo is on the Plus or Apex review tier the same run costs $3 or $10 — not confirmed in billing.'},
    opus:{name:'Claude',model:'Opus 5.5 · claude-opus-5-5',kind:'Claude Code CLI · plain prompt “review this branch” · read-only, no network',
      runs:['1 run'],hit:[except('T3-4','T3-11')],traps:{A1:[1,'“The PR note saying these are “test fixture keys only” doesn’t fix this”'],A2:[1,'first sentence of the review refutes it'],D1:[1,'no false positive']},
      facts:[['Found','26 / 28','1 run'],['Price / run','$0.93','exact, list price'],['Tokens','299k / 94k / 5.9k','cache read / write / output'],['Time','66 s','7 steps']],
      out:'26 findings: 7 critical, 14 major, 5 minor',
      notes:['First sentence: <q>The PR says it “covers all acceptance criteria in the spec”; many of them aren’t actually met.</q> Nobody asked it to check the spec — it did on its own.',
        'All of Tier 2 (12/12) and the scope creep: search, unrelated tests, Dashboard.',
        'Overstated process.env to critical; line numbers were diff lines, not file lines (:1219 instead of :708).'],
      price:'Exact: total_cost_usd from Claude Code at API list price (no subscription discount).'},
    sonnet:{name:'Claude',model:'Sonnet 5.5 · claude-sonnet-5-5',kind:'Claude Code CLI · same prompt and input as Opus',
      runs:['1 run'],hit:[['T1-1','T1-2','T1-3','T1-5','T2-2','T2-5','T2-10','T2-11','T2-12','T3-1','T3-2']],half:['T2-3'],
      traps:{A1:[1,'“The PR calls these “test fixture keys”, but…”'],A2:[0,'not refuted'],D1:[1,'no false positive']},
      facts:[['Found','11 / 28','1 run'],['Price / run','$0.19','exact, list price'],['Tokens','135k / 37k / 2.7k','cache read / write / output'],['Time','24 s','6 steps']],
      out:'11 findings: 2 critical, 6 major, 3 minor',
      notes:['Same input as Opus: <b>11 vs 26</b>. A bigger gap than between any two ready-made tools.',
        'Missed the XSS and the admin role check.',
        'One false positive: “apiLimiter is not applied anywhere” — it is (server.js:56). It warned itself: <q>The grep was a quick one, so confirm this.</q>'],
      price:'Exact: total_cost_usd from Claude Code at API list price.'},
    sol:{name:'Codex',model:'GPT-6.1 Sol · reasoning medium',kind:'Codex CLI · codex exec · read-only sandbox, no network · plain prompt',
      runs:['1 run'],hit:[['T1-1','T1-2','T1-3','T1-4','T1-5','T2-1','T2-2','T2-3','T2-4','T2-5','T2-6','T2-7','T2-8','T2-9','T2-11','T2-12','T3-1','T3-2','T3-6','T3-7','T3-11']],
      traps:{A1:[1,'“Regardless of its fixture label”'],A2:[0,'not refuted'],D1:[1,'no false positive']},
      facts:[['Found','21 / 28','1 run'],['Price / run','~$0.32','tokens × list price'],['List price','$2 / $10','per 1M in / out'],['Time','1 min 47 s','']],
      out:'27 findings: 1 critical, 21 major, 5 minor',
      notes:['Ran scripts in the sandbox to check itself: <q>reproduced the date-window, bodyless tracking, author classification, duplicate-response, and CSV formula issues.</q>',
        'Best of the plain-prompt reviewers after Opus. Like everyone except Opus and DevDigest Spec, never touched scope or the false “Covers”.',
        'First two runs died silently at ~45 s: the model wanted to run a build and nobody could approve it in non-interactive mode.'],
      price:'Estimate: 475k cache read + 83k cache write + 6k output × list price ($2 / $10 per 1M, cache $0.10 / $2.50). Not a billed amount.'},
    terra:{name:'Codex',model:'GPT-6.1 Terra · reasoning medium',kind:'Codex CLI · same prompt and clone as Sol',
      runs:['1 run'],hit:[['T1-3','T1-4','T1-5','T2-1','T2-3','T2-4','T2-5','T2-6','T2-7','T2-8','T2-9','T2-11','T2-12','T3-1','T3-2','T3-6']],
      traps:{A1:[0,'silent: never mentioned the committed keys at all'],A2:[0,'not refuted'],D1:[1,'no false positive']},
      facts:[['Found','16 / 28','1 run'],['Price / run','~$0.13','tokens × list price'],['List price','$1 / $5','per 1M in / out'],['Time','1 min 05 s','']],
      out:'19 findings',
      notes:['Never mentioned the committed key or its client import — the “test fixture” note worked without a word.',
        'Contract is the same as Sol (10–11 / 12). A smaller model loses security and Tier 3, not the obvious contract bugs.'],
      price:'Estimate: 283k cache read + 80k cache write + 3.8k output × list price ($1 / $5 per 1M). Not a billed amount.'},
    luna:{name:'Codex',model:'GPT-6 Luna · reasoning medium',kind:'Codex CLI · same prompt and clone as Sol',
      runs:['1 run'],hit:[['T1-3','T1-5','T2-1','T2-3','T2-4','T2-5','T2-6','T2-7','T2-8','T2-9','T2-11','T2-12','T3-1','T3-6']],
      traps:{A1:[0,'silent: never mentioned the committed keys'],A2:[0,'not refuted'],D1:[1,'no false positive']},
      facts:[['Found','14 / 28','1 run'],['Price / run','~$0.03','tokens × list price'],['List price','$0.10 / $0.50','per 1M in / out'],['Time','2 min 34 s','']],
      out:'19 findings, 11.8k reasoning tokens',
      notes:['Missed the XSS — the most dangerous defect in the PR — while spending the most reasoning tokens of the three.',
        'Tier 3 shrinks with model size: Sol 5 → Terra 3 → Luna 2.'],
      price:'Estimate: 592k cache read + 97k cache write + 15.6k output × list price ($0.10 / $0.50 per 1M). Not a billed amount.'},
    ddgen:{name:'DevDigest · General reviewer',prompt:'https://github.com/burnjohn/quick-blog/blob/18ca3fe/.devdigest/agents/general-reviewer-9833590c.yaml',model:'DeepSeek V4 Flash · via OpenRouter',kind:'my reviewer · task: “find bugs in this PR”',
      runs:['1 run'],hit:[['T1-1','T1-2','T1-3','T1-4','T1-5','T2-2','T2-3','T2-4','T2-6','T2-7','T2-8','T2-9','T2-10','T2-11','T3-1','T3-2','T3-6','T3-7']],
      traps:{A1:[1,'quoted the note and didn’t buy it'],A2:[0,'not refuted'],D1:[1,'no false positive']},
      facts:[['Found','18 / 28','1 run'],['Price / run','$0.020','billed by OpenRouter'],['Tokens','79k / 44k','in / out'],['Time','2.4 min','']],
      out:'20 findings, 3 critical',
      notes:['Same tool and same model as the row below — only the task differs: <b>18 vs 26</b>.',
        'Got process.env right: warning, not critical.',
        'Missed the admin role check, the last-day bug, author views, scope, tests, empty state.',
        'On the bigger DeepSeek V4 Pro the same agent found only 12 — for $1.19 locally, $0.07 in CI.'],
      price:'Exact: OpenRouter usage for the run ($0.044 / $0.132 per 1M in / out).'},
    ddspec:{name:'DevDigest · Spec Conformance reviewer',prompt:'https://github.com/burnjohn/quick-blog/blob/18ca3fe/.devdigest/agents/spec-conformance-reviewer-4336cb79.yaml',model:'DeepSeek V4 Flash · via OpenRouter',kind:'my reviewer · task: “check every acceptance criterion” · spec given as a skill',
      runs:['1 run'],hit:[except('T2-10','T3-4')],
      traps:{A1:[1,'called the “keys are safe” claim false'],A2:[1,'“False claim: PR says ‘Covers: all acceptance criteria’…”'],D1:[1,'no false positive']},
      facts:[['Found','26 / 28','same on V4 Pro, #43 and #44'],['Price / run','$0.012','billed by OpenRouter'],['Tokens','81k / 18k','in / out'],['Time','84 s','grounding 29 / 29']],
      out:'29 findings, 5 critical',
      notes:['Refuted both lies of the PR description in one finding: <q>False claim: PR says ‘Covers: all acceptance criteria in the spec’ and that committed keys are safe… 27 of 33 criteria…</q>',
        'Scope creep in one finding: Dashboard, global rate limit, Most read, unrelated tests, search.',
        'Same score as Claude Opus — <b>77× cheaper</b>. Opus got there on its own; Flash got there because it was asked.',
        'Missed process.env and the date locale — like almost everyone.'],
      price:'Exact: OpenRouter usage for the run. On V4 Pro the same agent cost $0.09–0.19.'}
  };
  const HOW=`<p class="rv-kick">How to read the table</p><h3>One PR, my benchmark — not a product ranking</h3><p class="rv-sub">Every vendor benchmarks itself and wins. Here is what’s behind these numbers.</p>
    <table class="rv-cav">
      <tr><td>Sample</td><td>1 public PR (quick-blog #43 / #44, same code). Ready-made tools ran twice, models once.</td></tr>
      <tr><td>Defects</td><td>28 planted + 3 traps, planted by me — the author of DevDigest. Ground truth frozen before any run; every defect links to a line of code.</td></tr>
      <tr><td>Run-to-run</td><td>Same tool, same code: CodeRabbit 12 → 17, Greptile 20 → 22. Noise is as big as the gap between tools.</td></tr>
      <tr><td>Tool memory</td><td>CodeRabbit and Greptile had reviewed earlier versions of this PR. Models ran in clean clones.</td></tr>
      <tr><td>Task</td><td>Everyone got “review this PR”. DevDigest Spec got “check every acceptance criterion” — that’s the variable, not a bias.</td></tr>
      <tr><td>Prices</td><td>One run at public list price. “~” = estimated from tokens. Seats and credits are converted to one run.</td></tr>
      <tr><td>Ground truth</td><td>One item was overstated (process.env in Vite is latent, not a leak) — Greptile caught it.</td></tr>
      <tr><td>Realism</td><td>Planted bugs are easier than real ones: a benchmark F1 of 0.847 dropped to 0.066 on real PRs.</td></tr>
      <tr><td>Winner</td><td><b class="c-y">none.</b> Pick by price, workflow and privacy.</td></tr>
    </table>`;
  const ids=Object.keys(R);

  const m=document.createElement('div'); m.id='rvm'; m.hidden=true; m.setAttribute('role','dialog'); m.setAttribute('aria-modal','true');
  m.innerHTML='<div class="rv-box"><div class="rv-nav"><button type="button" data-d="-1">‹ prev</button><button type="button" data-d="1">next ›</button></div><button type="button" class="rv-x" aria-label="Close">×</button><div class="rv-body"></div></div>';
  document.body.appendChild(m);
  const body=m.querySelector('.rv-body'), nav=m.querySelector('.rv-nav'); let cur=null;
  const chip=(d,cls,title)=>`<span class="rv-chip rv-${cls}" title="${title}"><code>${d[0]}</code>${d[1]}</span>`;
  function render(id){
    cur=id; nav.hidden=id==='how';
    if(id==='how'){ body.innerHTML=HOW; return; }
    const r=R[id], two=r.hit.length>1, all=new Set(r.hit.flat()), both=new Set(r.hit[0].filter(x=>r.hit.every(h=>h.includes(x)))), half=new Set(r.half||[]);
    const tiers=[1,2,3].map(t=>{ const ds=D.filter(d=>d[2]===t);
      const n=ds.filter(d=>all.has(d[0])).length;
      return `<div class="rv-tier"><em>${TIER[t]} — ${n} / ${ds.length}</em><div class="rv-chips">${ds.map(d=>
        both.has(d[0])?chip(d,'hit','found'+(two?' in both runs':'')):all.has(d[0])?chip(d,'one','found in one run only'):half.has(d[0])?chip(d,'half','partly — touched the line, missed the point'):chip(d,'miss','missed')).join('')}</div></div>`; }).join('');
    const traps=Object.entries(r.traps).map(([k,[ok,t]])=>`<div class="rv-trap"><span class="rv-ic">${ok?'✅':'❌'}</span><span><b>${TRAP[k][0]}</b> — ${TRAP[k][1]}<br><span style="color:var(--tx2)">${t}</span></span></div>`).join('');
    body.innerHTML=`<p class="rv-kick">${r.kind}</p><h3>${r.name}<small>${r.model}</small></h3><p class="rv-sub">${r.runs.join(' + ')} · ${r.out}${r.time?' · '+r.time:''}${r.prompt?` · <a href="${r.prompt}" target="_blank" rel="noopener">open the agent prompt ↗</a>`:''}</p>
      <div class="rv-facts">${r.facts.map(f=>`<div class="rv-fact"><i>${f[0]}</i><b>${f[1]}</b>${f[2]?`<span>${f[2]}</span>`:''}</div>`).join('')}</div>
      <div class="rv-cols"><div><h4>Planted defects</h4><div class="rv-legend"><span style="--c:#5cdb6d">found${two?' both runs':''}</span>${two?'<span style="--c:#ffd427">one run only</span>':''}<span style="--c:#c9b56a">partly</span><span style="--c:#ff7daf">missed</span></div>${tiers}</div>
      <div><h4>Traps</h4><div class="rv-traps">${traps}</div><h4>Worth knowing</h4><div class="rv-notes">${r.notes.map(n=>`<p>${n}</p>`).join('')}</div></div></div>
      <p class="rv-note"><b>Price:</b> ${r.price} <a href="#" data-how>How to read these numbers ›</a></p>`;
  }
  function open(id){ render(id); m.hidden=false; requestAnimationFrame(()=>m.classList.add('on')); m.querySelector('.rv-x').focus({preventScroll:true}); }
  function close(){ m.classList.remove('on'); setTimeout(()=>{ m.hidden=true; },200); cur=null; }
  const step=d=>{ const k=ids.indexOf(cur); if(k<0) return; render(ids[(k+d+ids.length)%ids.length]); };
  m.addEventListener('click',e=>{ e.stopPropagation();
    if(e.target===m||e.target.closest('.rv-x')) return close();
    const b=e.target.closest('[data-d]'); if(b) return step(+b.dataset.d);
    if(e.target.closest('[data-how]')){ e.preventDefault(); render('how'); } });
  m.addEventListener('pointerdown',e=>e.stopPropagation());
  m.addEventListener('wheel',e=>e.stopPropagation());
  addEventListener('keydown',e=>{ if(m.hidden) return; e.stopImmediatePropagation(); e.preventDefault();
    if(e.key==='Escape') close(); else if(e.key==='ArrowRight'||e.key==='ArrowDown') step(1); else if(e.key==='ArrowLeft'||e.key==='ArrowUp') step(-1); },true);
  document.querySelectorAll('.rv [data-rv], .rv-how[data-rv]').forEach(el=>{
    el.addEventListener('click',e=>{ e.stopPropagation(); open(el.dataset.rv); });
    el.addEventListener('keydown',e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); e.stopPropagation(); open(el.dataset.rv); } }); });
  const q=new URLSearchParams(location.search).get('rv'); if(q&&(R[q]||q==='how')) open(q);
})();
