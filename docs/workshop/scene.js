/* DevFest Night: WebGL scene with the 3D GDG mark.
   The mark is rebuilt from its own geometry: four capsules,
   red + blue = "<", green + yellow = ">". */
(function(){
  const D=window.DECK, canvas=document.getElementById('gl');
  if(THREE.ColorManagement) THREE.ColorManagement.legacyMode=false; // hex colors are sRGB: convert to linear
  let renderer;
  try{ renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance',preserveDrawingBuffer:!!(window.DECK&&window.DECK.QA)}); }
  catch(e){ document.body.classList.add('nogl'); canvas.remove(); return; }
  // resolution is picked once from a pixel budget (~4.2 MP) and never changed while presenting:
  // switching it mid-animation is a visible jump. A 1080p projector gets 1.5x, a 5K monitor gets ~1x.
  const pickDpr=()=>Math.max(.75,Math.min(devicePixelRatio,1.5,Math.sqrt(4.2e6/(innerWidth*innerHeight))));
  let dpr=pickDpr(); renderer.setPixelRatio(dpr);
  renderer.outputEncoding=THREE.sRGBEncoding;
  renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=.95;

  const BG=new THREE.Color('#06070a');
  const scene=new THREE.Scene(); scene.background=BG; scene.fog=new THREE.FogExp2(BG,0.05);
  const camera=new THREE.PerspectiveCamera(35,1,0.1,100); camera.position.set(0,0,12);
  const baseCam=camera.clone(); baseCam.updateMatrixWorld();

  /* ---------- environment for glossy reflections: soft boxes in Google colors ---------- */
  const pmrem=new THREE.PMREMGenerator(renderer);
  const env=new THREE.Scene();
  env.add(new THREE.Mesh(new THREE.SphereGeometry(20,32,16),new THREE.MeshBasicMaterial({color:0x0a0b10,side:THREE.BackSide})));
  const box=(c,s,x,y,z,w,h)=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({color:new THREE.Color(c).multiplyScalar(s),side:THREE.DoubleSide}));m.position.set(x,y,z);m.lookAt(0,0,0);env.add(m);};
  box('#ffffff',3,0,9,4,10,3);  box('#57caff',3,-10,1,2,4,8); box('#ff7daf',2.6,10,1,2,4,8);
  box('#5cdb6d',1.6,0,-9,3,10,2); box('#ffd427',2.2,4,3,-10,8,4); box('#ffffff',1.2,-4,3,10,6,3);
  scene.environment=pmrem.fromScene(env,0.03).texture;

  /* ---------- lights that move: the shimmer ---------- */
  scene.add(new THREE.AmbientLight(0xffffff,0.06));
  const key=new THREE.DirectionalLight(0xffffff,1.1); key.position.set(3,5,6); scene.add(key);
  const L=['#57caff','#ff7daf','#ffd427','#5cdb6d'].map(c=>{const l=new THREE.PointLight(c,1.7,14,1.6);scene.add(l);return l;});

  /* ---------- the GDG mark ---------- */
  const COLORS={red:'#ea4335',blue:'#4285f4',green:'#34a853',yellow:'#fbbc04'};
  const mat=c=>new THREE.MeshPhysicalMaterial({color:new THREE.Color(c),roughness:.4,metalness:0,clearcoat:.25,clearcoatRoughness:.35,
    iridescence:.18,iridescenceIOR:1.3,iridescenceThicknessRange:[250,520],envMapIntensity:.5});
  const capGeo=(()=>{ // a flat stroke of the logo: stadium shape, extruded, bevelled edges
    const r=.3, h=.6, sh=new THREE.Shape();
    sh.moveTo(-r,-h); sh.lineTo(-r,h); sh.absarc(0,h,r,Math.PI,0,true); sh.lineTo(r,-h); sh.absarc(0,-h,r,0,Math.PI,true);
    const g=new THREE.ExtrudeGeometry(sh,{depth:.26,bevelEnabled:true,bevelThickness:.07,bevelSize:.045,bevelSegments:6,curveSegments:32});
    g.center(); g.computeVertexNormals(); return g; })();
  const A=0.982; // arm angle (≈56°) so each arm runs at ~34° to the horizontal, as in the logo
  const ARMS=[
    {c:'red',   x:-1.0,y: .4,rz:-A,z:0},
    {c:'blue',  x:-1.0,y:-.4,rz: A,z:.22},   // blue overlaps red at the "<" tip
    {c:'green', x: 1.0,y: .4,rz: A,z:.22},   // green overlaps yellow at the ">" tip
    {c:'yellow',x: 1.0,y:-.4,rz:-A,z:0},
  ];
  const W0=3.62; // natural width of the mark in world units
  const logo=new THREE.Group(); scene.add(logo); logo.visible=!!(D.started||D.QA);
  addEventListener('deck:start',()=>{ logo.visible=true; clock.getDelta(); });
  const arms=ARMS.map((a,k)=>{
    const m=new THREE.Mesh(capGeo,mat(COLORS[a.c])); m.userData={...a,k,side:a.x<0?-1:1};
    // intro: start scattered
    const r=7+Math.random()*3, th=Math.random()*Math.PI*2, ph=(Math.random()-.5)*1.6;
    m.userData.from=new THREE.Vector3(Math.cos(th)*r,Math.sin(ph)*r*.6,-4-Math.random()*6);
    m.userData.spin=new THREE.Vector3((Math.random()-.5)*8,(Math.random()-.5)*8,(Math.random()-.5)*8);
    logo.add(m); return m;
  });
  // soft colored halo behind the mark
  const haloTex=(()=>{const c=document.createElement('canvas');c.width=c.height=256;const g=c.getContext('2d');
    const gr=g.createRadialGradient(128,128,0,128,128,128);gr.addColorStop(0,'rgba(255,255,255,.55)');gr.addColorStop(.35,'rgba(140,180,255,.18)');gr.addColorStop(1,'rgba(0,0,0,0)');
    g.fillStyle=gr;g.fillRect(0,0,256,256);return new THREE.CanvasTexture(c);})();
  const halo=new THREE.Sprite(new THREE.SpriteMaterial({map:haloTex,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,opacity:.55}));
  halo.scale.set(7,7,1); halo.position.z=-1.2; logo.add(halo);

  /* ---------- field: floating code glyphs  { } < > / # +  in Google colors ---------- */
  const field=new THREE.Group(); scene.add(field);
  const fieldMats=Object.values(COLORS).map(c=>new THREE.MeshStandardMaterial({color:c,roughness:.45,metalness:0,envMapIntensity:.8}));
  const ext={depth:.14,bevelEnabled:true,bevelThickness:.035,bevelSize:.025,bevelSegments:3,curveSegments:16};
  const barGeo=(len,r)=>{ const sh=new THREE.Shape(), h=len/2-r; sh.moveTo(-r,-h); sh.lineTo(-r,h); sh.absarc(0,h,r,Math.PI,0,true); sh.lineTo(r,-h); sh.absarc(0,-h,r,0,Math.PI,true);
    const g=new THREE.ExtrudeGeometry(sh,ext); g.center(); return g; };
  const BAR=barGeo(.9,.085), BAR_S=barGeo(.62,.085);
  const braceGeo=dir=>{ const P=[[.30,1],[.12,.93],[.1,.55],[.09,.18],[-.1,0],[.09,-.18],[.1,-.55],[.12,-.93],[.30,-1]].map(p=>new THREE.Vector3(p[0]*dir,p[1]*.85,0));
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(P,false,'catmullrom',.4),64,.075,12,false); };
  const BRACE_L=braceGeo(1), BRACE_R=braceGeo(-1);
  const SLASH=(()=>{ const sh=new THREE.Shape(); sh.moveTo(-.33,-.8); sh.lineTo(-.08,-.8); sh.lineTo(.33,.8); sh.lineTo(.08,.8); sh.closePath(); const g=new THREE.ExtrudeGeometry(sh,ext); g.center(); return g; })();
  const part=(geo,mat,x=0,y=0,rz=0)=>{ const m=new THREE.Mesh(geo,mat); m.position.set(x,y,0); m.rotation.z=rz; return m; };
  const GLYPHS=[
    mat=>[part(BRACE_L,mat,-.42,0),part(BRACE_R,mat,.42,0)],                                    // { }
    mat=>[part(BAR_S,mat,-.18,.17,-0.98),part(BAR_S,mat,-.18,-.17,0.98)],                        // <
    mat=>[part(BAR_S,mat,.18,.17,0.98),part(BAR_S,mat,.18,-.17,-0.98)],                          // >
    mat=>[part(SLASH,mat)],                                                                      // /
    mat=>[part(BAR,mat,-.18,0,.22),part(BAR,mat,.18,0,.22),part(BAR,mat,0,.17,Math.PI/2),part(BAR,mat,0,-.17,Math.PI/2)], // #
    mat=>[part(BAR,mat),part(BAR,mat,0,0,Math.PI/2)],                                            // +
  ];
  const bits=[];
  for(let k=0;k<28;k++){
    const g=new THREE.Group(); GLYPHS[k%GLYPHS.length](fieldMats[(k*7)%4]).forEach(p=>g.add(p));
    g.scale.setScalar(.2+Math.random()*.22);
    // talk deck: small glyphs kept in the top-right corner, away from the text
    const hz=-5-Math.random()*15, hh=(12-hz)*Math.tan(THREE.MathUtils.degToRad(17.5)), hw=hh*16/9;
    const home=new THREE.Vector3(hw*(.35+Math.random()*.6),hh*(.6+Math.random()*.35),hz);
    g.position.copy(home); g.rotation.set((Math.random()-.5)*1.2,(Math.random()-.5)*1.6,(Math.random()-.5)*1.2);
    g.userData={home,o:new THREE.Vector3(),v:new THREE.Vector3(),vr:new THREE.Vector3((Math.random()-.5)*.25,(Math.random()-.5)*.35,(Math.random()-.5)*.2),
      spin:new THREE.Vector3(),ph:Math.random()*6,amp:.15+Math.random()*.3};
    field.add(g); bits.push(g);
  }
  // wireframe globe: a nod to the template's line-art globe
  const globe=new THREE.Group(), gm=new THREE.LineBasicMaterial({color:0xffffff,transparent:true,opacity:.22});
  for(let k=0;k<8;k++){ const g=new THREE.BufferGeometry().setFromPoints(new THREE.EllipseCurve(0,0,1,1,0,Math.PI*2).getPoints(96).map(p=>new THREE.Vector3(p.x,p.y,0)));
    const l=new THREE.LineLoop(g,gm); l.rotation.y=k*Math.PI/8; globe.add(l); }
  for(let k=-2;k<=2;k++){ const y=k*.3, r=Math.sqrt(1-y*y); const g=new THREE.BufferGeometry().setFromPoints(new THREE.EllipseCurve(0,0,r,r,0,Math.PI*2).getPoints(96).map(p=>new THREE.Vector3(p.x,0,p.y)));
    const l=new THREE.LineLoop(g,gm); l.position.y=y; globe.add(l); }
  globe.scale.setScalar(2.6); globe.position.set(-8.5,-3.2,-11); field.add(globe);

  /* ---------- stars: fly toward the camera, twinkle, warp on slide change (all on the GPU) ---------- */
  const N=1600, pos=new Float32Array(N*3), col=new Float32Array(N*3), pha=new Float32Array(N);
  const pal=['#57caff','#5cdb6d','#ffd427','#ff7daf','#ffffff','#ffffff','#ffffff'].map(c=>new THREE.Color(c).convertLinearToSRGB());
  for(let k=0;k<N;k++){ pos.set([(Math.random()-.5)*64,(Math.random()-.5)*38,-46+Math.random()*46],k*3); const c=pal[k%pal.length]; col.set([c.r,c.g,c.b],k*3); pha[k]=Math.random()*6.28; }
  const sg=new THREE.BufferGeometry(); sg.setAttribute('position',new THREE.BufferAttribute(pos,3)); sg.setAttribute('color',new THREE.BufferAttribute(col,3)); sg.setAttribute('phase',new THREE.BufferAttribute(pha,1));
  const starU={uTime:{value:0},uTravel:{value:0},uWarp:{value:0},uPix:{value:1}};
  const stars=new THREE.Points(sg,new THREE.ShaderMaterial({uniforms:starU,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,vertexColors:true,
    vertexShader:`attribute float phase; uniform float uTime,uTravel,uWarp,uPix; varying vec3 vC; varying float vA;
      void main(){ vec3 p=position; p.z=-46.0+mod(p.z+46.0+uTravel,46.0);
        vec4 mv=modelViewMatrix*vec4(p,1.0); gl_Position=projectionMatrix*mv;
        float fade=smoothstep(-46.0,-38.0,p.z)*(1.0-smoothstep(-4.0,1.0,p.z));
        vA=fade*(0.55+0.45*sin(uTime*(1.4+fract(phase)*2.0)+phase));
        vC=color; gl_PointSize=uPix*(2.2+uWarp*2.5)*(36.0/max(1.0,-mv.z)); }`,
    fragmentShader:`varying vec3 vC; varying float vA;
      void main(){ float d=length(gl_PointCoord-0.5); float a=vA*smoothstep(0.5,0.05,d); if(a<0.01) discard; gl_FragColor=vec4(vC*a,a); }`}));
  stars.frustumCulled=false; scene.add(stars);
  let warp=0; addEventListener('deck:slide',e=>{ if(e.detail.step===0||true){ warp=1;
    bits.forEach(b=>{ const u=b.userData; u.v.add(new THREE.Vector3((Math.random()-.5)*2.2,(Math.random()-.5)*2.2,(Math.random()-.5)*1.2)); u.spin.set((Math.random()-.5)*2,(Math.random()-.5)*2,(Math.random()-.5)*2); }); } });
  const _w=new THREE.Vector3();

  /* ---------- presets per slide ---------- */
  const TINT={mix:['#57caff','#ff7daf','#ffd427','#5cdb6d'],blue:['#57caff','#4285f4','#a7e3ff','#5cdb6d'],
    green:['#5cdb6d','#57caff','#c6ffcf','#34a853'],yellow:['#ffd427','#fbbc04','#ff7daf','#ffe7a5'],red:['#ff7daf','#ea4335','#ffd427','#57caff']};
  const target={pos:new THREE.Vector3(),scale:1,calm:0,tint:TINT.mix.map(c=>new THREE.Color(c)),fieldRot:0};
  let spin=0, spinCur=0;
  function stageToWorld(px,py){
    const r=D.stage.getBoundingClientRect();
    const sx=r.left+px*r.width/1600, sy=r.top+py*r.height/900;
    const v=new THREE.Vector3(sx/innerWidth*2-1,-(sy/innerHeight*2-1),.5).unproject(baseCam).sub(baseCam.position).normalize();
    const t=-baseCam.position.z/v.z; return baseCam.position.clone().add(v.multiplyScalar(t));
  }
  function worldPerStagePx(){ const r=D.stage.getBoundingClientRect(); const visH=2*Math.tan(THREE.MathUtils.degToRad(baseCam.fov/2))*baseCam.position.z; return visH/innerHeight*(r.width/1600); }
  let spec=[1272,796,158,1];
  function placeTarget(){ target.pos.copy(stageToWorld(spec[0],spec[1])); target.scale=spec[2]*worldPerStagePx()/W0; target.calm=spec[3]||0; }
  function applyPreset(slide,first){
    const sp=(slide.dataset.logo||'dock');
    spec=sp==='dock'?[1272,796,158,1]:sp.split(/\s+/).map(Number); placeTarget();
    target.tint=(TINT[slide.dataset.tint]||TINT.mix).map(c=>new THREE.Color(c));
    target.fieldRot=D.i*.22;
    if(!first) spin+=Math.PI*2*(D.i%2?1:-1);
  }
  let first=true, lastI=-1;
  addEventListener('deck:slide',e=>{ if(e.detail.i!==lastI){ applyPreset(e.detail.slide,first); lastI=e.detail.i; first=false; } });

  /* ---------- resize ---------- */
  function resize(){ dpr=pickDpr(); renderer.setPixelRatio(dpr); renderer.setSize(innerWidth,innerHeight,false); camera.aspect=baseCam.aspect=innerWidth/innerHeight;
    camera.updateProjectionMatrix(); baseCam.updateProjectionMatrix(); baseCam.updateMatrixWorld(); if(lastI>=0) applyPreset(D.slides[lastI],true); }
  addEventListener('resize',resize); resize();
  applyPreset(D.slides[D.i],true); lastI=D.i;
  logo.position.copy(target.pos); logo.scale.setScalar(target.scale);

  /* ---------- loop ---------- */
  const clock=new THREE.Clock(); const QA=D.QA; let t0=QA?100:0;
  const ease=t=>{const c1=1.70158,c3=c1+1;return 1+c3*Math.pow(t-1,3)+c1*Math.pow(t-1,2);}; // easeOutBack
  /* ?perf: overlay with fps, frame time, JS cost; results also land in <body data-perf> */
  const PERF=new URLSearchParams(location.search).has('perf'); let pf={n:0,dt:0,js:0,t0:performance.now(),last:performance.now()}, pfEl;
  if(PERF){ pfEl=document.createElement('pre'); pfEl.style.cssText='position:fixed;right:10px;top:10px;z-index:9;margin:0;padding:8px 10px;background:rgba(0,0,0,.7);color:#5cdb6d;font:12px/1.4 monospace;border-radius:8px'; document.body.appendChild(pfEl); }
  let lastRender=0, slow=0, quietUntil=performance.now()+8000;
  addEventListener('deck:slide',()=>{ quietUntil=performance.now()+3000; slow=0; });
  let LITE=D.lite, still=false;
  function frame(now){
    if(LITE&&!still) return;                    // lite mode: no loop, only still frames on demand
    if(!LITE) requestAnimationFrame(frame);
    if(!still&&now-lastRender<15.5) return;            // cap at ~60 fps: 120 Hz screens don't render twice as often
    const gap=now-lastRender; lastRender=now;
    // adaptive resolution: drop the pixel ratio if frames run long, raise it back when there's headroom
    // adaptive resolution: only for sustained slowness, never during the first 4 s or a slide transition,
    // and only downwards (switching back up mid-talk would cause another visible hitch)
    // only a machine that stays slow for seconds gets switched to lite mode (no resolution flips)
    if(gap<100&&now-quietUntil>0&&D.started){ if(gap>28) slow+=1; else slow=Math.max(0,slow-.5);
      if(slow>180&&!D.QA){ slow=0; dispatchEvent(new CustomEvent('deck:too-slow')); } }
    const js0=performance.now();
    const dt=Math.min(clock.getDelta(),.05), t=(t0+=(D.started||QA)?dt:0), k=(QA||still)?1:1-Math.pow(.0016,dt); // frame-rate independent damping
    placeTarget(); const m=D.mouse, calm=target.calm;

    // camera parallax
    const par=.55*(1-.6*calm);
    camera.position.x+=((m.x*par)-camera.position.x)*k*1.2; camera.position.y+=((-m.y*par*.7)-camera.position.y)*k*1.2;
    camera.lookAt(0,0,0);

    // logo travel + spin
    logo.position.lerp(target.pos,k); logo.scale.setScalar(logo.scale.x+(target.scale-logo.scale.x)*k);
    spinCur+=(spin-spinCur)*((QA||still)?1:1-Math.pow(.02,dt));
    const sway=(1-calm*.75);
    logo.rotation.y=spinCur+Math.sin(t*.6)*.32*sway+m.x*.45*sway;
    logo.rotation.x=Math.sin(t*.47)*.1*sway-m.y*.25*sway;
    logo.rotation.z=Math.sin(t*.35)*.04;
    logo.position.y+=Math.sin(t*1.1)*.0025*sway;

    // arms: intro assembly, then breathing "< >"
    arms.forEach(a=>{ const u=a.userData;
      const p=Math.min(1,Math.max(0,(t-.25-u.k*.16)/1.5)), e=ease(p);
      const breathe=Math.sin(t*1.5)*.07*(1-calm*.6)+Math.max(0,Math.sin(t*.37))**8*.22*(1-calm); // pulse + an occasional wide "open"
      const hx=u.x+u.side*breathe, hy=u.y, hz=u.z+Math.sin(t*1.3+u.k)*.05;
      a.position.set(u.from.x+(hx-u.from.x)*e,u.from.y+(hy-u.from.y)*e,u.from.z+(hz-u.from.z)*e);
      const r=1-e; a.rotation.set(u.spin.x*r,u.spin.y*r,u.rz+u.spin.z*r);
    });
    halo.material.opacity=.22+.06*Math.sin(t*1.7);

    // shimmer: lights orbit the mark in the slide's tint
    L.forEach((l,n)=>{ const a=t*(.5+n*.13)+n*Math.PI/2, R=2.8*logo.scale.x+1.2;
      l.position.set(logo.position.x+Math.cos(a)*R,logo.position.y+Math.sin(a*1.3)*R*.6,logo.position.z+2+Math.sin(a)*1.5);
      l.color.lerp(target.tint[n],k*.6); });

    // field drift
    field.rotation.y+=(target.fieldRot-field.rotation.y)*((QA||still)?1:1-Math.pow(.05,dt));
    field.rotation.x=Math.sin(t*.1)*.05;
    // glyphs: drift, spring back to home, get pushed by the cursor and by slide changes
    const asp=innerWidth/innerHeight;
    bits.forEach(b=>{ const u=b.userData;
      b.getWorldPosition(_w).project(camera);
      const dx=(_w.x-m.x)*asp, dy=_w.y+m.y, d=Math.hypot(dx,dy);
      if(D.mouseActive&&d<.32&&_w.z<1){ const f=(.32-d)/.32*7*dt/(d+.05); u.v.x+=dx*f; u.v.y+=dy*f; u.spin.z+=dx*f*.6; }
      u.v.addScaledVector(u.o,-2.2*dt); u.v.multiplyScalar(Math.pow(.25,dt)); u.o.addScaledVector(u.v,dt);
      if(still||QA){ u.o.set(0,0,0); u.v.set(0,0,0); u.spin.set(0,0,0); }
      b.position.set(u.home.x+u.o.x, u.home.y+u.o.y+Math.sin(t*.5+u.ph)*u.amp, u.home.z+u.o.z);
      b.rotation.x+=(u.vr.x+u.spin.x)*dt; b.rotation.y+=(u.vr.y+u.spin.y)*dt; b.rotation.z+=(u.vr.z+u.spin.z)*dt; u.spin.multiplyScalar(Math.pow(.3,dt)); });
    globe.rotation.y+=dt*.12; globe.rotation.x=.35;
    // stars: steady flight + warp burst after a slide change
    warp*=Math.pow(.18,dt); if(still||QA) warp=0;
    starU.uTime.value=t; starU.uTravel.value+=dt*(.9+warp*22); starU.uWarp.value=warp; starU.uPix.value=renderer.getPixelRatio();
    stars.position.x=-m.x*.8; stars.position.y=m.y*.5;

    renderer.render(scene,camera);
    if(PERF){ const now=performance.now(); pf.n++; pf.dt+=now-pf.last; pf.last=now; pf.js+=now-js0;
      if(now-pf.t0>1000){ const r={fps:Math.round(pf.n*1000/(now-pf.t0)),frameMs:+(pf.dt/pf.n).toFixed(1),jsMs:+(pf.js/pf.n).toFixed(2),dpr:renderer.getPixelRatio(),px:innerWidth+'x'+innerHeight};
        pfEl.textContent=JSON.stringify(r,null,1); document.body.dataset.perf=JSON.stringify(r); pf={n:0,dt:0,js:0,t0:now,last:now}; } }
  }
  // one still frame: everything snapped to its final place (logo assembled, docked, no motion)
  function stillFrame(){ still=true; if(t0<4) t0=4; clock.getDelta(); frame(lastRender+1000); still=false; }
  addEventListener('deck:lite',e=>{ LITE=e.detail.lite; clock.getDelta();
    if(LITE){ canvas.classList.add('still'); stillFrame(); } else { canvas.classList.remove('still'); requestAnimationFrame(frame); } });
  addEventListener('deck:slide',()=>{ if(LITE) requestAnimationFrame(stillFrame); });
  addEventListener('resize',()=>{ if(LITE) stillFrame(); });
  // light theme: light sky, same fog; the white stars simply vanish against it
  const setSky=l=>{ BG.set(l?'#e9ecf2':'#06070a'); scene.fog.color.copy(BG); scene.fog.density=l?0.006:0.05; halo.visible=!l; if(LITE) stillFrame(); };
  addEventListener('deck:theme',e=>setSky(e.detail.light)); if(D.light) setSky(true);
  if(LITE) stillFrame(); else requestAnimationFrame(frame);
  document.addEventListener('visibilitychange',()=>clock.getDelta());
})();
