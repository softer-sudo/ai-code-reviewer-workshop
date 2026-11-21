// Slide sources. Directives ({{prompt:…}} {{start:…}} {{lost:…}} {{verify:…}} {{expect:…}} {{specbody:…}} {{specraw:…}}
// and constants) are resolved by build.mjs.
//
// Layout grid (stage is 1600×900; .z1 / .z2 sit closer to the camera, so they render ~2% / ~6% larger):
//   head (z1): left 120          content (z2): left 141, width 1318, top 262 … 665 (full width) or … 780 (left 990px only)
const X = 141, W = 1318, HX = 120, TOP = 262;
const PANEL = '<div class="panel" data-shape="notch-br:403:131" style="left:62px;top:66px;width:1474px;height:768px"></div>';
const GDG = '<div class="gdgtext z1">Google<br>Developer<br>Groups</div>';
const C = { b: 'var(--blue-h)', g: 'var(--green-h)', y: 'var(--yellow-h)', r: 'var(--red-h)', n: '#e8eaed' };
const TINT = { 1: 'blue', 2: 'green', 3: 'mix', 4: 'red' };

const svg = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const I = {
  file: svg('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8M8 17h5"/>'),
  read: svg('<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'),
  copy: svg('<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>'),
  down: svg('<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/>'),
};

const notes = (ua, say, prompts = []) =>
  `<template class="notes"><p class="ua">${ua}</p><p class="say"><b>Say:</b> ${say}</p>${prompts.map(([t, p]) => `<pre class="prompt" data-t="${t}">${p}</pre>`).join('')}</template>`;

function slide({ tint = 'mix', logo = 'dock', block, time, toc, body, note, panel = true, foot = true }) {
  return `
  <section class="slide" data-logo="${logo}" data-tint="${tint}" data-block="${block}" data-time="${time}" data-toc="${toc}">
    <div class="rig"><div class="tilt">
      ${panel ? PANEL : ''}
${body}
      ${GDG}
      ${foot ? `<div class="foot"><b></b><span>${block}</span></div>` : ''}
    </div></div>
    ${note}
  </section>`;
}
const head = (kicker, h, c = C.b, size = 54) =>
  `<div class="abs z1" style="left:${HX}px;top:108px;width:1350px;--c:${c}"><p class="kicker">${kicker}</p><h2 class="h" style="margin:0;font-size:${size}px">${h}</h2></div>`;
const at = (top, inner, { left = X, width = W, cls = '', style = '' } = {}) =>
  `<div class="abs z2 ${cls}" style="left:${left}px;top:${top}px;width:${width}px;${style}">${inner}</div>`;
const cmd = (t, pf = '$', cls = '') => `<div class="cmd ${cls}">${pf ? `<span class="pf">${pf}</span>` : ''}<code>${t}</code></div>`;
const card = (label, title, text, { c = '', ac = false, style = '' } = {}) =>
  `<div class="card${ac ? ' ac' : ''}" style="${c ? `--c:${c};` : ''}${style}"><p class="lbl2">${label}</p><h3>${title}</h3>${text ? `<p>${text}</p>` : ''}</div>`;
/* a looping screen recording in a window frame; the file lives in media/ and is inlined by build.mjs */
const demo = (src, title) =>
  `<div class="win vid"><div class="bar"><i style="background:var(--red)"></i><i style="background:var(--yellow)"></i><i style="background:var(--green)"></i><span style="margin-left:10px">${title}</span></div><video src="${src}" autoplay loop muted playsinline preload="auto" aria-label="${title}"></video></div>`;
const row = (i, c, title, sub, bodyHtml, cls = '') =>
  `<div class="trow ${cls}"><span class="stepn" style="--c:${c}">${i}</span><div class="tl"><b>${title}</b>${sub ? `<small>${sub}</small>` : ''}</div>${bodyHtml}</div>`;

/* ---------- the pipeline: one scheme, reused on every step ---------- */
const STAGES = [['PR diff', 'input'], ['Context', 'repo + spec'], ['Prompt', 'rules'], ['Model', 'OpenRouter'], ['Grounding', 'in the diff?'], ['Gate', 'count blockers'], ['Inline review', 'on GitHub']];
/* mini map on step slides. on = highlighted stages (0-based), x = stages that run ×N */
const pipe = (on = [], c = C.b, x = []) =>
  `<div class="pipe" style="--c:${c}">${STAGES.map(([a, s], k) => `${k ? '<span class="pa"></span>' : ''}<div class="pst${on.includes(k) ? ' on' : ''}${x.includes(k) ? ' x' : ''}">${a}<small>${s}</small></div>`).join('')}</div>`;
/* the full scheme: stages + which step builds which stage */
const MAP = `<div class="map">
        ${STAGES.map(([a, s], k) => `<div class="mn${k === 0 ? ' given' : ''}${k === 3 ? ' ai' : ''}">${k === 3 ? '<i>the only AI call</i>' : ''}<b>${a}</b><small>${s}</small></div>`).join('')}
        <div class="br" tabindex="0" style="grid-column:1;--c:${C.n}"><b>Given</b><span>A real pull request</span></div>
        <div class="br" tabindex="0" style="grid-column:2;--c:${C.g}"><b>Step 2</b><span>Repository context</span></div>
        <div class="br" tabindex="0" style="grid-column:3/6;--c:${C.b}"><b>Step 1</b><span>Findings you can trust</span></div>
        <div class="br" tabindex="0" style="grid-column:6/8;--c:${C.y}"><b>Step 3</b><span>Gate + GitHub Action</span></div>
        <div class="br" tabindex="0" style="grid-column:3/5;grid-row:3;--c:${C.r}"><b>Step 4</b><span>More reviewers, ×N</span></div>
      </div>`;

/* ---------- step slides ---------- */
/* big step marker + a title that says what we do */
const stepHead = (n, tag, h, c) =>
  `<div class="abs z1" style="left:${HX}px;top:100px;width:1350px;--c:${c}"><p class="stepbig"><b>Step ${n}</b><span>${tag}</span></p><h2 class="h" style="margin:0;font-size:50px">${h}</h2></div>`;
/* explain: where we are on the scheme, then three rows read top to bottom: problem → what we build → what you will see */
function stepA({ n, name, c, on, x = [], does, mins, problem, build, see, time, block, ua, say }) {
  const r = (label, [t, d], cls = '') => `<div class="xr ${cls}"><p class="lbl2">${label}</p><div><h3>${t}</h3><p>${d}</p></div></div>`;
  return slide({
    tint: TINT[n], block, time, toc: `Step ${n} · ${name}`,
    body: `${stepHead(n, `of 4 · ${name} · ${mins} min`, does, c)}
      ${at(250, pipe(on, c, x))}
      ${at(340, `<div class="xrows" style="--c:${c}">
        ${r('The problem', problem)}
        ${r('What we build', build, 'ac')}
        ${r('What you will see', see)}
      </div>`)}`,
    note: notes(ua, say),
  });
}
/* your turn: start → prompt and spec as two separate blocks → check; "stuck" is its own block at the bottom */
function stepB({ n, name, c, file, startNote, time, block, ua, say }) {
  return slide({
    tint: TINT[n], block, time, toc: `Your turn · Step ${n}`,
    body: `${stepHead(n, 'your turn · about 6 min', `Your turn: <em>${name}</em>`, c)}
      ${at(244, `
        ${row(1, c, 'Start', startNote, cmd('{{start:' + file + '}}'))}
        <div class="trow two"><span class="stepn" style="--c:${c}">2</span>
          <div class="pcard" style="--c:${c}">
            <header><span><b>Prompt</b> · paste it into your coding agent</span></header>
            <pre tabindex="0">{{prompt:${file}}}</pre>
          </div>
          <div class="scard" style="--c:${c}">
            <header><span><b>Spec</b> · what the agent builds from</span></header>
            <div class="sbody"><p class="sf">${I.file}<b>${file}</b></p><ol>{{specparts:${file}}}</ol></div>
            <footer>
              <button type="button" class="sbtn main" data-spec="${file}" data-act="open">${I.read}Read</button>
              <button type="button" class="sbtn" data-spec="${file}" data-act="copy">${I.copy}<span>Copy</span></button>
              <button type="button" class="sbtn" data-spec="${file}" data-act="download">${I.down}Download</button>
            </footer>
          </div>
        </div>
        ${row(3, c, 'Check', 'done when the tests pass', `<div class="chk">${cmd('{{verify:' + file + '}}')}<span class="pa"></span><span class="exp">{{expect:${file}}}</span></div>`)}
      `, { cls: 'turn' })}
      ${at(700, `<div class="tl"><b>Stuck?</b><small>take the finished step</small></div><div style="flex:1;min-width:0">${cmd('{{lost:' + file + '}}')}</div>`, { width: 950, cls: 'stuck' })}
      <template class="spec-data" data-file="${file}" data-gh="{{REPO_URL}}/blob/main/${file}"><div class="html md">{{specbody:${file}}}</div><pre class="raw">{{specraw:${file}}}</pre></template>`,
    note: notes(ua, say, [[`Step ${n} · prompt`, `{{prompt:${file}}}`], [`Step ${n} · stuck: the finished step`, `{{lost:${file}}}`]]),
  });
}

export const slides = [];
const S1 = 'specs/step-1-findings.md', S2 = 'specs/step-2-context.md', S3 = 'specs/step-3-github-action.md', S4 = 'specs/step-4-more-reviewers.md';

/* ================= OPENING ================= */
slides.push(`
  <section class="slide" data-logo="1400 175 190 0" data-tint="mix" data-block="Opening" data-time="0:00–0:03" data-toc="Cover">
    <div class="rig"><div class="tilt">
      <div class="panel ghost" data-shape="cut-tl:540:196 notch-br:403:131" style="left:62px;top:66px;width:1474px;height:768px"></div>
      <div class="badge z1" style="left:96px;top:80px"><img src="img/devfest-logo.png" alt="DevFest"><div class="loc">Warsaw</div></div>
      <div class="abs z2" style="left:118px;top:290px;width:1100px">
        <p class="kicker" style="--c:var(--yellow-h)">Workshop · DevFest Warsaw 2026 · Classroom</p>
        <h1 class="title long" style="font-size:88px">Build your own<br><span class="shine">AI code reviewer</span></h1>
        <div class="author"><b>Ivan Lapa</b>Senior Engineer (UI), Netflix<br>Independent AI Consultant</div>
      </div>
      <div class="gdgtext z1">Google<br>Developer<br>Groups</div>
    </div></div>
    ${notes('Привітання. 45 хвилин, ~40 людей, у кожного ноутбук. Кажу одразу: ми будуємо, а не слухаємо. Усе, що треба скопіювати, є на слайдах з кнопкою Copy. Натисніть P, щоб бачити ці нотатки.', 'Welcome. In 45 minutes you will build an AI code reviewer that comments on a real pull request. Everything you need to copy has a Copy button.')}
  </section>`);

slides.push(slide({
  tint: 'blue', block: 'Opening', time: '0:00–0:03', toc: 'Disclaimer',
  body: `<div class="abs z1" style="left:${HX}px;top:120px;width:1150px">
        <p class="kicker" style="--c:var(--red-h)">Before we start</p>
        <h2 class="h">Disclaimer</h2>
        <p class="body" style="font-size:32px;max-width:44ch;margin-top:32px">DevDigest is a personal open-source tool built for educational purposes, not affiliated with Netflix.</p>
        <p class="body" style="font-size:32px;max-width:44ch;margin-top:20px;color:var(--tx2)">All views in this workshop are my own and do not represent Netflix.</p>
        <p class="body" style="font-size:23px;max-width:84ch;margin-top:34px;color:var(--tx2)">Results for CodeRabbit, Greptile, Claude, Codex and other tools come from my own runs on a demo PR. They are subjective and may not reflect how these tools work for you.</p>
        <p class="body" style="font-size:23px;max-width:84ch;margin-top:12px;color:var(--tx2)">Prices are public list prices as of November 2026. Your plan, discounts or contract terms may differ.</p>
      </div>`,
  note: notes('Дисклеймер без змін із доповіді: інструмент особистий, відкритий, освітній; погляди мої.', 'This is a personal open-source project, built for education. Views are my own.'),
}));

slides.push(slide({
  tint: 'mix', block: 'Opening', time: '0:00–0:03', toc: 'About me',
  body: `<div class="abs z2" style="left:${X}px;top:132px"><img class="me-photo" src="img/ivan.jpg" alt="Ivan Lapa"></div>
      <div class="abs z1" style="left:620px;top:82px;width:860px">
        <p class="kicker" style="--c:var(--yellow-h)">About me</p>
        <h2 class="h" style="margin:0">Ivan Lapa</h2>
        <div class="me-rows">
          <div class="me-row" style="--c:var(--blue-h)"><span>Now</span><p>Senior Engineer (UI) at Netflix<br>Independent AI consultant</p></div>
          <div class="me-row" style="--c:var(--green-h)"><span>Before</span><p>Engineer and team lead at unicorn companies DataRobot, Gelato</p></div>
          <div class="me-row" style="--c:var(--yellow-h)"><span>AI</span><p>Developing AI tools since 2019: data preparation and feature discovery<br>Using AI engineering tools daily since early 2024<br>5+ AI products in daily use at printing companies, 2 autonomous agents</p></div>
          <div class="me-row" style="--c:var(--red-h)"><span>Off work</span><p>Ironman full-distance finisher<br>Enduro, rally, ultra-distance cycling</p></div>
        </div>
      </div>`,
  note: notes('Про мене, 20–30 секунд. Netflix лише як місце роботи, без його процесів і команд. Консалтинг і всі приклади тут з особистих проєктів.', 'I am Ivan: a UI engineer at Netflix and an independent AI consultant. Everything you will see today comes from my personal open-source projects.'),
}));

slides.push(slide({
  tint: 'mix', block: 'Opening', time: '0:00–0:03', toc: 'What we build and why',
  body: `${head('The goal · 45 minutes from now', 'A reviewer that <em>blocks a bad PR</em>', C.g)}
      ${at(TOP, `<div class="stack">
        ${card('What', 'Your own AI code reviewer', 'It comments on a real pull request and turns the check red.', { c: C.g, ac: true })}
        ${card('Why build it yourself', 'You see every stage', 'So you know what to trust: the model is one stage, the rest is plain code.')}
        ${card('Who decides', 'A human merges', 'The reviewer only advises.')}
      </div>`, { width: 560 })}
      <div class="abs win pr z2" style="left:741px;top:${TOP}px;width:718px">
        <div class="bar"><i style="background:var(--red)"></i><i style="background:var(--yellow)"></i><i style="background:var(--green)"></i><span style="margin-left:12px">your fork · pull request</span><span class="st" style="color:var(--red-h)">● Open</span></div>
        <div class="body-in">
          <div class="t">feat: post analytics dashboard</div>
          <div class="chk"><span>✓ build</span><span>✓ tests</span><span style="color:var(--red-h);background:rgba(255,125,175,.1);border-color:rgba(255,125,175,.45)">✗ AI review</span></div>
          <div class="win mini" style="border-color:rgba(255,125,175,.4)"><div class="bar"><span>inline comment · file:lines</span><b class="rid" style="background:var(--red-h)">CRITICAL</b></div>
            <pre>Rationale: why this breaks.
Suggestion: how to fix it.</pre></div>
          <div class="meta">Merge: waiting for a human</div>
        </div>
      </div>
      <div class="abs z1" style="left:741px;top:668px;width:700px"><p class="src">Illustration, not real output</p></div>`,
  note: notes('Що і навіщо. Показую кінцевий результат одразу: PR із зеленою збіркою, але червоною перевіркою AI review та inline-коментарями. Навіщо будувати самим: бачимо кожну ланку і знаємо, чому їй можна довіряти. Мердж робить людина.', 'By the end, a pull request in your own fork turns red with inline comments, and a human still decides to merge.'),
}));

slides.push(slide({
  tint: 'blue', block: 'Opening', time: '0:00–0:03', toc: 'How it fits together',
  body: `${head('The plan · four steps', 'Seven stages. <em>One</em> of them is the model.', C.b)}
      ${at(TOP + 22, MAP)}`,
  note: notes('Це схема всього воркшопу: сім ланок зліва направо. Модель — лише одна з них, решту (контекст, перевірка, гейт, публікація) робить звичайний код. Під ланками видно, який крок яку ланку будує: крок 1 — Prompt, Model, Grounding; крок 2 — Context; крок 3 — Gate і публікація; крок 4 — кілька рев’юерів на тому самому конвеєрі. Ця ж схема стоїть угорі кожного кроку, з підсвіченою ланкою. Таймінг: Setup 4 хв, крок 1 — 8, крок 2 — 8, крок 3 — 9, крок 4 — 7, показ і завершення — 6. Кожен крок: пояснюю, вони будують агентом за промптом і специфікацією, перевіряють тестами. Якщо відстаємо, крок 4 скорочуємо до демо.', 'The model is one box out of seven. The other six are plain code, and that is where trust comes from. You will see this map on every step.'),
}));

slides.push(slide({
  tint: 'green', block: 'Opening', time: '0:00–0:03', toc: 'Meet QuickBlog',
  body: `${head('The app · QuickBlog', 'A small blog platform. <em>This is what we review.</em>', C.g)}
      ${at(TOP, demo('media/quick-demo-loop.mp4', 'QuickBlog · write, publish, comment, moderate'), { left: 141, width: 800 })}
      ${at(TOP, `<div class="stack">
        ${card('Site', 'Stories, search, comments')}
        ${card('Admin', 'Write, publish, moderate')}
        ${card('Analytics', 'Views, trends, day drill-down', '', { c: C.g, ac: true })}
      </div>`, { left: 981, width: 478 })}`,
  note: notes('Коротко знайомимо з цільовим застосунком QuickBlog: сайт зі статтями й коментарями та адмінка. У ролику: створюємо блог, публікуємо, лишаємо коментар і схвалюємо його. Analytics лише згадуємо, її покажемо на наступному слайді. Не затримуємось: це лише контекст для PR.', 'This is QuickBlog, the app we review. A site with stories and comments, and an admin to write and moderate. Nothing more to learn here, it is just the target.'),
}));

slides.push(slide({
  tint: 'green', block: 'Opening', time: '0:00–0:03', toc: 'The target',
  body: `${head('The target · QuickBlog · a public demo PR', 'We are going to review <em>this pull request</em>', C.g)}
      ${at(TOP - 26, demo('media/analytics-demo-loop.mp4', 'QuickBlog · analytics'), { width: 860 })}
      ${at(TOP - 34, `<div class="stat" style="--c:var(--green-h);font-size:112px">28</div>
        <p class="statcap" style="font-size:24px;margin-top:4px">planted defects <span class="tx2">+ 3 traps</span></p>
        <div class="stack" style="gap:10px;margin-top:18px">
          ${card('In the diff', 'Bugs you can point at', '', { style: 'padding:12px 18px 14px' })}
          ${card('Only against the spec', 'Bugs with no line', '<code>POST /view</code> is never called.', { c: C.g, ac: true, style: 'padding:12px 18px 14px' })}
        </div>
        <p class="src" style="margin-top:14px">Same PR as in the talk.</p>`, { left: 1051, width: 408 })}`,
  note: notes('Це той самий PR із доповіді: 28 підкладених дефектів і 3 пастки. Частину видно в diff, частину видно лише порівнянням зі специфікацією. Саме це ми й відтворимо.', 'Same PR as the talk. Defects are planted by hand, so we can count what each reviewer catches.'),
}));

slides.push(slide({
  tint: 'blue', block: 'Opening', time: '0:00–0:03', toc: 'Branches = checkpoints',
  body: `${head('How the repo is organised', 'Every step has a <em>checkpoint branch</em>', C.b)}
      ${at(TOP + 10, `<div class="pipe ladder">${[['main', 'start', C.n], ['step-1-findings', 'after step 1', C.b], ['step-2-context', 'after step 2', C.g], ['step-3-gate-action', 'after step 3', C.y], ['step-4-more-reviewers', 'after step 4', C.r], ['final', 'everything', C.n]]
        .map(([b, s, c], k) => `${k ? '<span class="pa"></span>' : ''}<div class="pst on" style="--c:${c}">${b}<small>${s}</small></div>`).join('')}</div>`)}
      ${at(400, `<div class="grid2">
        ${card('The rule', 'Step N starts where step N−1 ended', 'The start command is on every “Your turn” slide.')}
        <div class="card ac" style="--c:${C.r}"><p class="lbl2">Fell behind?</p><h3>Jump to the solution</h3>${cmd('git stash && git checkout &lt;branch&gt;', '$', 'nocp')}<p style="margin-top:12px">The exact command is the <b>Lost?</b> line on each step.</p></div>
      </div>`)}`,
  note: notes('Гілки — це контрольні точки. main — старт; step-N-* — готове рішення кроку N; final — повна функціональність; stretch/mcp — MCP-інструмент. Старт кроку N дорівнює готовому кроку N-1. Якщо відстали — git stash && git checkout потрібної гілки (точна команда є в Lost? на слайді кроку).', 'Every step has a solution branch. If you fall behind, stash and check out the branch of the step you missed.'),
}));

slides.push(slide({
  tint: 'blue', block: 'Setup', time: '0:03–0:07', toc: 'Initial setup',
  body: `${head('Setup · 4 min · do it with me', 'Initial setup: <em>get the application running!</em>', C.g)}
      ${at(250, `
        ${row(1, C.g, 'Use this template', 'all branches · same name · Public', cmd('{{REPO_URL}}/generate', '', 'url'))}
        ${row(2, C.g, 'Clone', 'or open a Codespace', cmd('git clone https://github.com/&lt;you&gt;/ai-code-reviewer-workshop &amp;&amp; cd ai-code-reviewer-workshop'))}
        ${row(3, C.g, 'Add the key', '{{OPENROUTER_KEY_NOTE}}, into .env', cmd('cp .env.example .env'))}
        ${row(4, C.g, 'Install', '', cmd('npm ci'))}
        ${row(5, C.g, 'Smoke test', 'offline, a recorded answer', cmd('npm run review:mock'))}
        ${row('+', 'rgba(255,255,255,.55)', 'Optional', 'prefer clicking? open the UI', cmd('npm run ui'))}
      `, { cls: 'turn setup' })}`,
  note: notes('Чотири хвилини. Усі команди копіюються кнопкою Copy. Після clone одразу cd у папку (команда вже з cd). Template: галочка Include all branches, назву ai-code-reviewer-workshop не змінюємо і лишаємо Public — CI на кроці 3 бере рев’юер саме з <you>/ai-code-reviewer-workshop (не перейменовуємо). Ключ OpenRouter — у чаті; вставляємо у .env після OPENROUTER_API_KEY=, не комітимо. Перевірка: review:mock має завершитись без помилок — це офлайн-запуск із записаною відповіддю моделі. Хто застряг — Codespace. Необов’язково: npm run ui відкриває локальний UI на localhost:3000 для тих, хто воліє клікати.', 'Copy each command with its button. The key is in the chat. If review:mock prints findings, you are ready.'),
}));

/* ================= STEP 1 ================= */
slides.push(stepA({
  n: 1, name: 'Findings you can trust', c: C.b, on: [2, 3, 4], block: '1 · Findings', time: '0:07–0:09',
  does: 'Shape the findings, <em>check them against the diff</em>', mins: 8,
  problem: ['Models invent locations', 'One comment on a line outside the diff, and GitHub rejects the whole review.'],
  build: ['A typed finding + a grounding check', '<code>json_schema</code> gives every finding a file, lines and a severity. Code drops what is not in the diff.'],
  see: ['Severities and DROPPED lines', 'Every dropped finding prints its reason in your terminal.'],
  ua: 'Фаза пояснення кроку 1 (~2 хв). Проблема: вільний текст не прив’язати до рядка, а модель вигадує місця. Рішення: json_schema, три правила в промпті (шкала severity, семантика verdict, дисципліна findings) і перевірка в коді: finding поза diff відкидаємо з причиною.',
  say: 'Do not trust the model, check its output. Every finding gets a shape, and a finding that points outside the diff is dropped with a reason.',
}));
slides.push(stepB({ n: 1, name: 'findings you can trust', c: C.b, file: S1, block: '1 · Findings', time: '0:09–0:15',
  startNote: 'the starting point',
  ua: 'Практика кроку 1 (~5-6 хв). Три дії: команда старту, короткий промпт у свого агента, перевірка тестами. Поруч із промптом окремий блок специфікації: Read відкриває її в модальному вікні, Copy і Download віддають markdown. Уся інструкція живе у специфікації, промпт лише відсилає до неї агента. Stuck? — стрибок на готове рішення кроку. Після тестів: npm run review:mock — без undefined, кожен DROPPED має причину.',
  say: 'Run the start command, paste the prompt into your coding agent, and stop when the check passes. Lost? jumps to the solution.' }));
slides.push(slide({
  tint: 'blue', block: '1 · Findings', time: '0:09–0:15', toc: 'Result · kept or dropped',
  body: `${head('Step 1 · what you should see', 'Kept, or <em>dropped with a reason</em>', C.b)}
      ${at(TOP, `<div class="win mini"><div class="bar"><i style="background:#ff5f57"></i><i style="background:#febc2e"></i><i style="background:#28c840"></i><span>schematic · your terminal shows the same idea</span></div>
          <div class="rows kd">
            <div><span class="pill" style="--c:var(--red-h)">CRITICAL</span><span>file in diff · lines in diff</span><span style="color:var(--green-h)">kept → inline comment</span></div>
            <div><span class="pill" style="--c:var(--yellow-h)">WARNING</span><span>file in diff · lines in diff</span><span style="color:var(--green-h)">kept → inline comment</span></div>
            <div class="drop"><span class="pill" style="--c:var(--tx2)">DROPPED</span><span>file is not in the diff</span><span>reason printed</span></div>
            <div class="drop"><span class="pill" style="--c:var(--tx2)">DROPPED</span><span>lines are outside the hunk</span><span>reason printed</span></div>
          </div></div>`)}
      ${at(590, '<p class="keyline">Code checks the model’s output, <em>not the model.</em></p>', { width: 1100, style: `--c:${C.b}` })}`,
  note: notes('Що вони мають побачити після кроку 1: у терміналі severities і рядки DROPPED із причиною. Схема ілюстративна, точний формат виводу — у їхньому репо.', 'This is why grounding matters: one invented line number can fail the whole review.'),
}));

/* ================= STEP 2 ================= */
slides.push(stepA({
  n: 2, name: 'Repository context', c: C.g, on: [1], block: '2 · Context', time: '0:15–0:17',
  does: 'Give the reviewer <em>repository context</em>', mins: 8,
  problem: ['A missing call has no line', 'The diff is only the changed lines. Nothing in it says the client never calls <code>POST /view</code>.'],
  build: ['<code>gatherContext()</code>', 'Project rules, the linked spec, full changed files and callers. Within a budget, wrapped as untrusted.'],
  see: ['The spec-only bugs show up', 'Run it with and without <code>--no-context</code> and compare.'],
  ua: 'Пояснення кроку 2. Diff показує лише змінені рядки, тому дефект «клієнт ніколи не викликає POST /view» у diff не видно: немає рядка. Збираємо контекст у бюджеті токенів і загортаємо як недовірений (prompt injection).',
  say: 'The diff cannot show what is missing. Give the model the spec and the callers, within a budget, and mark all of it as untrusted.',
}));
const LADDER = [
  ['1', 'Rules files', 'CLAUDE.md · AGENTS.md · README', 1, 1, 1, 1],
  ['2', 'PR intent + linked spec', 'what it should do', 1, 1, 2, 1],
  ['3', 'Full changed files', 'not just the hunks', 2, 1, 2, 1],
  ['4', 'Repo map', 'symbols and structure', 2, 2, 1, 0],
  ['5', 'Callers', 'who uses the changed functions', 2, 2, 1, 1],
  ['6', 'Retrieval / embeddings', 'search the repo by meaning', 3, 3, 2, 0],
  ['7', 'Agentic tool use', 'the model reads the repo via tools / MCP', 3, 3, 3, 0],
];
const meter = (v) => `<span class="lv" data-v="${v}"><i></i><i></i><i></i><em>${['', 'low', 'med', 'high'][v]}</em></span>`;
slides.push(slide({
  tint: 'green', block: '2 · Context', time: '0:15–0:17', toc: 'The context ladder',
  body: `${head('Step 2 · how much context is enough', 'Climb the ladder only as far as <em>the bug needs</em>', C.g, 50)}
      ${at(238, `<div class="ladder2">
        <div class="lr hd"><i></i><span>Rung</span><span>Tokens</span><span>Noise</span><span>Injection</span></div>
        ${LADDER.map(([i, a, s, t, n, j, w]) => `<div class="lr${w ? ' use' : ''}"><i>${i}</i><b>${a}<small>${s}</small></b>${meter(t)}${meter(n)}${meter(j)}</div>`).join('')}
      </div>`, { style: `--c:${C.g}` })}
      ${at(716, `<p class="src"><b style="color:${C.g}">■ green</b> = the four rungs we build in step 2</p>`, { width: 990 })}`,
  note: notes('Сходи контексту — від дешевого до дорогого. Кожен щабель додає токени, шум і поверхню для prompt injection. У кроці 2 ми беремо щаблі 1, 2, 3 і 5 (підсвічені зеленим). Репо-мапа, retrieval та агентний доступ — наступні рівні («What’s next»).', 'More context is not free: tokens, noise, and more text an attacker can write into. Climb only as far as the bug needs.'),
}));
slides.push(stepB({ n: 2, name: 'repository context', c: C.g, file: S2, block: '2 · Context', time: '0:17–0:23',
  startNote: 'the end of step 1',
  ua: 'Практика кроку 2. Після тестів запустити npm run review:mock -- --dry-run: у лозі CLAUDE.md і docs/specs/analytics-dashboard-spec.md, потім рядок context: N block(s). Далі додати --no-context і порівняти розмір промпту (або npm run ui). Спец-дефекти мають з’явитися лише з контекстом.',
  say: 'Run the reviewer with and without context and compare. The spec-only bugs only show up with context.' }));

/* ================= STEP 3 ================= */
slides.push(stepA({
  n: 3, name: 'Gate + GitHub Action', c: C.y, on: [5, 6], block: '3 · Gate + Action', time: '0:23–0:25',
  does: 'Add a gate, <em>run it in GitHub Actions</em>', mins: 9,
  problem: ['The model’s verdict is not a decision', 'It can say “approve” while listing a CRITICAL finding.'],
  build: ['A gate in code + a GitHub Action', 'Count blockers by severity, post one inline review, exit 1 when there are blockers.'],
  see: ['A red check on your pull request', 'Inline comments in your QuickBlog fork in 2–3 min. A human still merges.'],
  ua: 'Пояснення кроку 3. Verdict від моделі ігноруємо: гейт рахує blockers за severity у коді та повертає exit code. Workflow читає ворожий текст (заголовок, опис PR), тому безпека workflow — наступний слайд.',
  say: 'Pass or fail is arithmetic over findings, in code. The workflow itself reads untrusted PR text, so we lock it down.',
}));
const rule = (i, title, text, code) => `<div class="card rule"><p class="lbl2"><span>${i}</span>${title}</p><p>${text}</p><div class="cmd"><code>${code}</code></div></div>`;
slides.push(slide({
  tint: 'red', block: '3 · Gate + Action', time: '0:23–0:25', toc: 'Workflow security rules',
  body: `${head('Step 3 · the workflow reads hostile text', 'Four rules for a <em>safe</em> review workflow', C.r)}
      ${at(250, `<div class="grid2 rules">
        ${rule(1, 'Trigger', '<code>pull_request</code>, never <code>pull_request_target</code>', 'on: pull_request')}
        ${rule(2, 'Permissions', 'Least privilege: only what posting a review needs', 'permissions: {contents: read, pull-requests: write}')}
        ${rule(3, 'Fork guard', 'Skip runs from forks: no secrets for strangers', 'if: github.event.pull_request.head.repo.full_name == github.repository')}
        ${rule(4, 'No PR text in run:', 'Never put <code>\${{ }}</code> with PR text into a script. Pass it through <code>env:</code>', 'env: { TITLE: \${{ github.event.pull_request.title }} }')}
      </div>`, { style: `--c:${C.r}` })}`,
  note: notes('Чотири правила безпеки workflow. 1) pull_request, а не pull_request_target — другий дає токен із правами запису коду з форку. 2) Мінімальні permissions. 3) Guard на форки. 4) Жодного тексту PR усередині run: через ${{ }} — це shell-ін’єкція; передавати через env. У специфікації ще persist-credentials: false на обох checkout.', 'The PR title is attacker-controlled text. Never paste it into a shell command.'),
}));
slides.push(stepB({ n: 3, name: 'the gate and the workflow', c: C.y, file: S3, block: '3 · Gate + Action', time: '0:25–0:29',
  startNote: 'the end of step 2',
  ua: 'Практика кроку 3, частина 1: гейт і workflow-файл локально, тести зелені. Агент нічого не пушить — пушимо самі на наступному слайді.',
  say: 'Make the gate pass locally first. The agent does not push anything: you do, on the next slide.' }));
slides.push(slide({
  tint: 'mix', block: '3 · Gate + Action', time: '0:29–0:32', toc: 'Step 3 · run it in CI',
  body: `${head('Step 3 of 4 · your turn · run it in CI', 'Your turn: <em>a red check on your fork</em>', C.y)}
      ${at(250, `
        ${row(1, C.y, 'Fork QuickBlog', '<u>untick</u> “main branch only”', cmd('{{QUICKBLOG_URL}}', '', 'url'))}
        ${row(2, C.y, 'Enable Actions', 'the Actions tab of your fork', cmd('“I understand my workflows, go ahead and enable them”', '', 'nocp'))}
        ${row(3, C.y, 'Add your key', 'Secrets → Actions → New secret', cmd('OPENROUTER_API_KEY', ''))}
        ${row(4, C.y, 'Add the workflow', 'fork → Add file → Create new file; paste your yml', cmd('.github/workflows/ai-review.yml', ''))}
        ${row(5, C.y, 'Open the PR', 'analytics → main, in your fork', cmd('gh pr create -R &lt;you&gt;/quick-blog -B main -H analytics -t Analytics -b \"\"'))}
      `, { cls: 'turn setup' })}
      ${at(716, '<span class="warnb">Keep the analytics branch: untick “Copy the main branch only”.</span>', { width: 990 })}`,
  note: notes('Підготовка форку QuickBlog. Критично: зняти галочку «Copy the main branch only», інакше гілки analytics не буде. Далі Actions → enable workflows. Ключ OpenRouter у GitHub: Settings → Secrets and variables → Actions → New repository secret, імʼя OPENROUTER_API_KEY, значення — той самий ключ, що в .env (без нього крок review впаде). Workflow додаємо прямо в GitHub: у форку Add file → Create new file, імʼя .github/workflows/ai-review.yml (кнопка Copy), вставляємо вміст свого examples/quick-blog-workflow.yml, commit у main. PR — командою gh з -R (інакше gh або веб-форма запропонують базою burnjohn/quick-blog замість вашого форку). CI іде ~2–3 хв (DeepSeek, три агенти паралельно): поки чекаємо — відкриваємо вкладку Actions і дивимось, як іде job.', 'Fork QuickBlog, untick copy-main-only, add the secret, create the workflow file in the GitHub UI, open the PR, and watch the Actions tab: the red check lands in 2–3 minutes.'),
}));

/* ================= STEP 4 ================= */
slides.push(stepA({
  n: 4, name: 'More reviewers', c: C.r, on: [2, 3], x: [3], block: '4 · More reviewers', time: '0:32–0:34',
  does: 'Add more reviewers, <em>merge their findings</em>', mins: 7,
  problem: ['One generalist misses whole classes', 'In the talk, 8 diff agents and 1 spec agent each found 22 of 28, and their finds barely overlap.'],
  build: ['Agents as .md files + dedup', 'Security and spec-conformance run in parallel. The same file, lines and title merge into one finding.'],
  see: ['A table per agent', 'Findings, tokens and cost for each agent, then the total after dedup.'],
  ua: 'Пояснення кроку 4. Один універсальний рев’юер пропускає цілі класи. У доповіді вісім diff-агентів дорівнювали одному spec-агенту (22/28), а знахідки майже не перетиналися; разом 27/28. Агенти — це .md файли; дедуп по file+lines+title; модель можна обрати на агента.',
  say: 'Agents are just markdown files. Run several, dedup the overlap, and look at what each one costs.',
}));
slides.push(stepB({ n: 4, name: 'more reviewers', c: C.r, file: S4, block: '4 · More reviewers', time: '0:34–0:39',
  startNote: 'the end of step 3',
  ua: 'Практика кроку 4: додати агентів-файлів, запустити всі, подивитись таблицю по агентах: npm run review (або npm run ui) — три секції з вартістю і рядок «Findings per agent … → N after dedup». Після — показуємо результат на екрані.',
  say: 'Add an agent, run all of them, and compare the table.' }));
slides.push(slide({
  tint: 'red', block: '4 · More reviewers', time: '0:34–0:39', toc: 'Result · the combination wins',
  body: `${head('Step 4 · from the talk · same PR · 28 core defects', 'The <em>combination</em> found the most', C.r)}
      ${at(TOP + 20, `<div class="hbars">
          <div class="hb"><div class="lbl">8 diff agents<small>diff-only reviewers</small></div><div class="track"><div class="fill" style="--w:78.6%;--c:var(--tx2)"></div></div><div class="val">22/28</div></div>
          <div class="hb"><div class="lbl">1 spec agent<small>reads the spec</small></div><div class="track"><div class="fill" style="--w:78.6%;--c:var(--tx2)"></div></div><div class="val">22/28</div></div>
          <div class="hb"><div class="lbl">Combined<small>union of both</small></div><div class="track"><div class="fill" style="--w:96.4%;--c:var(--red-h)"></div></div><div class="val" style="color:var(--red-h)">27/28</div></div>
        </div>`, { width: 1260 })}
      ${at(560, '<p class="keyline">Their finds barely overlap, so <em>dedup + union wins.</em></p><p class="src" style="margin-top:14px">Source: DevDigest talk, same QuickBlog PR, 28 core defects</p>', { width: 1100, style: `--c:${C.r}` })}`,
  note: notes('Підсумок із доповіді: вісім diff-агентів і один spec-агент дають по 22 з 28, але знаходять різне; разом 27 з 28. Тому цінність у різноманітності рев’юерів, а не в кількості однакових.', 'Eight copies of the same idea find the same bugs. One different idea finds new ones.'),
}));

/* ================= WRAP ================= */
slides.push(slide({
  tint: 'mix', block: '5 · Show + wrap', time: '0:39–0:45', toc: 'One engine, four doors',
  body: `${head('Show · 6 minutes', 'One engine, <em>four doors</em>', C.b)}
      ${at(TOP, `<div class="doors" style="grid-template-columns:repeat(2,1fr);gap:14px">
          <div class="door2" style="--c:${C.b};width:auto"><b>CLI</b><small>npm run review</small></div>
          <div class="door2" style="--c:${C.b};width:auto"><b>GitHub Action</b><small>every pull request</small></div>
          <div class="door2" style="--c:${C.b};width:auto"><b>MCP tool</b><small>Claude Code · branch stretch/mcp</small></div>
          <div class="door2" style="--c:${C.b};width:auto"><b>UI</b><small>npm run ui · ours, live</small></div>
        </div>
        <div class="engine" style="margin-top:16px;padding:16px"><b style="font-size:30px">review engine</b><div style="font-size:20px">one pipeline, four ways in</div></div>`, { width: 740 })}
      ${at(TOP, demo('media/ui-demo-loop.mp4', 'npm run ui · three agents, mock run'), { left: 921, width: 538 })}
      ${at(716, `<p class="lbl2" style="--c:${C.b};margin:0;flex:none;width:106px">At home</p><div style="flex:1;min-width:0">${cmd('claude mcp add ai-reviewer -- npx tsx mcp/server.ts')}</div>`, { width: 990, style: 'display:flex;align-items:center;gap:18px' })}`,
  note: notes('Показ (~4 хв): той самий двигун через чотири «двері». Живе демо MCP: у репо рев’юера на гілці stretch/mcp (npm ci, claude mcp add ai-reviewer -- npx tsx mcp/server.ts) внести маленьку зміну з багом і попросити Claude Code «Review my changes with ai-reviewer, agents: general» — перевірено, ~20 с. Сервер дивиться git diff HEAD і .reviewer/agents у поточній папці, тому працює саме в репо рев’юера. Праворуч — запис UI (npm run ui, mock): це план B, якщо мережа підведе. Вдома — команда внизу: спершу git switch stretch/mcp && npm ci у репо рев’юера, потім claude mcp add.', 'The engine does not care who calls it. CLI, CI, MCP and a UI are four adapters.'),
}));

slides.push(slide({
  tint: 'mix', block: '5 · Show + wrap', time: '0:39–0:45', toc: 'Where it grows: DevDigest studio',
  body: `${head('Where it grows', 'The same engine, <em>grown into a product</em>', C.g)}
      ${at(TOP - 20, demo('media/demo-studio.mp4', 'DevDigest studio · quick-blog PR #44 · recording'), { left: 141, width: 860 })}`,
  note: notes('DevDigest studio — це те, у що виростає той самий двигун. Показуємо запис, не наживо. Наш мінімальний UI з репо — маленька версія цього.', 'This is where the same engine grows. It is a recording, not a live run.'),
}));

slides.push(slide({
  tint: 'green', block: '5 · Show + wrap', time: '0:39–0:45', toc: 'What is next',
  body: `${head('After today', 'Three <em>next moves</em>', C.g)}
      ${at(TOP + 20, `<div class="grid3">
        ${card('More context', 'Repo map', 'Give the model the structure of the repo, not only the changed files.')}
        ${card('A skeptic', 'Verifier agent', 'A second agent tries to refute each finding before it is posted.')}
        ${card('A score', 'Evals', 'Plant defects in PRs, count what you catch, watch it over time.')}
      </div>`)}`,
  note: notes('Що далі: repo map (щабель 4 драбини контексту), verifier-агент (спростовує знахідки перед публікацією), evals на PR із підкладеними дефектами — так вимірюємо, чи стало краще.', 'Three next moves: more context, a skeptic, and a score.'),
}));
slides.push(slide({
  logo: '1400 175 190 0', tint: 'mix', block: '5 · Show + wrap', time: '0:39–0:45', toc: 'Thank you', panel: false, foot: false,
  body: `<div class="panel ghost" data-shape="cut-tl:540:196 notch-br:403:131" style="left:62px;top:66px;width:1474px;height:768px"></div>
      <div class="badge z1" style="left:96px;top:80px"><img src="img/devfest-logo.png" alt="DevFest"><div class="loc">Warsaw</div></div>
      <div class="abs z2" style="left:118px;top:300px;width:1000px">
        <p class="kicker" style="--c:var(--yellow-h)">Thank you · questions?</p>
        <h2 class="title" style="font-size:96px">Build it <span class="shine">at home</span></h2>
        <div style="margin-top:36px;display:flex;flex-direction:column;gap:12px;width:980px">
          <p class="lbl2" style="--c:${C.b};margin:0">Workshop repo</p>${cmd('{{REPO_URL}}', '', 'url')}
          <p class="lbl2" style="--c:${C.g};margin:8px 0 0">QuickBlog (the target)</p>${cmd('{{QUICKBLOG_URL}}', '', 'url')}
        </div>
      </div>
      <div class="abs z2" style="left:1190px;top:310px;width:300px;text-align:center"><div class="qrwrap"><div class="qr" data-url="{{REPO_URL}}" role="img" aria-label="QR code: workshop repository"></div></div>
        <p class="src" style="margin-top:16px">Workshop repo</p></div>`,
  note: notes('Завершення: репозиторій і QuickBlog з кнопками Copy, QR на репо воркшопу. Питання.', 'Thank you. The repo and the target PR are yours to keep.'),
}));
slides.push(slide({
  tint: 'mix', block: '5 · Show + wrap', time: '0:39–0:45', toc: 'Contacts', foot: false,
  body: `<div class="abs z1" style="left:${HX}px;top:110px;width:1300px">
        <p class="kicker" style="--c:var(--yellow-h)">Thank you</p>
        <h2 class="h" style="margin:0">Let's stay <span class="shine">in touch</span></h2>
      </div>
      <div class="abs z2 qrcard" style="left:150px;top:260px;width:320px;--c:var(--blue-h)"><div class="qrwrap"><div class="qr" data-url="https://www.linkedin.com/in/ai-consult/" role="img" aria-label="QR code: LinkedIn"></div></div>
        <span class="lbl">LinkedIn</span><b>Ivan Lapa</b><small>linkedin.com/in/ai-consult</small></div>
      <div class="abs z2 qrcard" style="left:520px;top:260px;width:320px;--c:var(--red-h)"><div class="qrwrap"><div class="qr" data-url="https://www.instagram.com/burning_johnny/" role="img" aria-label="QR code: Instagram"></div></div>
        <span class="lbl">Instagram</span><b>@burning_johnny</b><small>instagram.com/burning_johnny</small></div>
      <div class="abs qrsep z1" style="left:920px;top:270px;height:380px"></div>
      <div class="abs z2 qrcard" style="left:1000px;top:260px;width:400px;--c:var(--green-h)"><div class="qrwrap"><div class="qr" data-url="{{REPO_URL}}" role="img" aria-label="QR code: workshop repository"></div></div>
        <span class="lbl">Code</span><b>Workshop repo</b><small>github.com/burnjohn/<br>ai-code-reviewer-workshop</small></div>`,
  note: notes('Контакти: LinkedIn, Instagram і репозиторій воркшопу. Лишаю на екрані, поки відповідаю на питання.', 'If you want to keep in touch: LinkedIn, Instagram, and the repo is yours to keep.'),
}));
