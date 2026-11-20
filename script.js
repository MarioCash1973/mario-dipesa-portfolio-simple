function coverError(el){el.hidden=true}const lightbox=document.getElementById('lightbox');
if(lightbox){
  const galleries=[...document.querySelectorAll('.gallery')];
  const large=document.getElementById('large-photo');
  const counter=document.getElementById('counter');
  let activePhotos=[];
  let current=0;
  function show(i){
    if(!activePhotos.length)return;
    current=(i+activePhotos.length)%activePhotos.length;
    large.src=activePhotos[current].src;
    large.alt=activePhotos[current].alt;
    counter.textContent=(current+1)+' / '+activePhotos.length;
  }
  galleries.forEach(gallery=>{
    const photos=[...gallery.querySelectorAll('.shot img')];
    gallery.querySelectorAll('.shot').forEach((button,i)=>{
      button.addEventListener('click',()=>{
        activePhotos=photos;
        show(i);
        lightbox.showModal();
      });
    });
  });
  document.getElementById('prev').addEventListener('click',()=>show(current-1));
  document.getElementById('next').addEventListener('click',()=>show(current+1));
  document.getElementById('close').addEventListener('click',()=>lightbox.close());
  document.addEventListener('keydown',e=>{
    if(!lightbox.open)return;
    if(e.key==='ArrowLeft')show(current-1);
    if(e.key==='ArrowRight')show(current+1);
  });
}
/* Featured DLC artwork previews. Keep poster still; frame highlight is CSS-only. */
document.querySelectorAll('.feature-composition').forEach(card => {
  const poster = card.querySelector('img.feature-primary-image');
  if (!poster) return;
  const originalSrc = poster.dataset.originalSrc || poster.getAttribute('src');
  const originalAlt = poster.dataset.originalAlt || poster.alt;
  const thumbs = [...card.querySelectorAll('.expansion-art[data-preview]')];
  let active = null;
  let requestId = 0;

  // Preload each local DLC image so a hover swap appears immediately.
  thumbs.forEach(link => { const preload = new Image(); preload.src = link.dataset.preview; });

  function display(src, alt) {
    const id = ++requestId;
    // Use an offscreen loader so a failed image never hides the existing poster.
    const loader = new Image();
    loader.onload = () => {
      if (id !== requestId) return;
      poster.hidden = false;
      poster.src = src;
      poster.alt = alt;
    };
    loader.onerror = () => {
      if (id !== requestId) return;
      if (src !== originalSrc) display(originalSrc, originalAlt);
    };
    loader.src = src;
    if (loader.complete && loader.naturalWidth > 0) loader.onload();
  }
  function show(link) {
    if (active === link) return;
    active = link;
    display(link.dataset.preview, link.dataset.previewAlt || 'DLC artwork');
  }
  function restore() {
    if (!active) return;
    active = null;
    display(originalSrc, originalAlt);
  }

  thumbs.forEach(link => {
    link.addEventListener('pointerenter', e => {
      if (e.pointerType !== 'touch') show(link);
    });
    link.addEventListener('mouseenter', () => show(link));
    link.addEventListener('focus', () => show(link));
    link.addEventListener('pointerleave', restore);
    link.addEventListener('mouseleave', restore);
    link.addEventListener('blur', restore);
    link.addEventListener('click', e => {
      if (window.matchMedia('(hover: none)').matches && link.dataset.selected !== 'true') {
        e.preventDefault();
        thumbs.forEach(p => delete p.dataset.selected);
        link.dataset.selected = 'true';
        show(link);
      }
    });
  });
  card.addEventListener('mouseleave', restore);
  card.addEventListener('focusout', e => {
    if (!card.contains(e.relatedTarget)) restore();
  });
});

/* Elastic cursor follower: spring physics from the approved portfolio demo. */
(()=>{
  if(!window.matchMedia('(pointer:fine)').matches || window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const dot=document.createElement('div');
  dot.className='elastic-cursor-dot';
  dot.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 0.5 C13.2 7.5 16.5 10.8 23.5 12 C16.5 13.2 13.2 16.5 12 23.5 C10.8 16.5 7.5 13.2 0.5 12 C7.5 10.8 10.8 7.5 12 0.5 Z"/></svg>';
  const starMarkup=dot.innerHTML;
  // A quiet easter egg beside the site wordmark, on every page.
  const shipMarkup='<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 1.5 21.4 11 25.5 13.3 29 26 20 22.8 16 29 12 22.8 3 26 6.5 13.3 10.6 11Z" fill="currentColor"/><path d="M16 8 18.3 16 16 20 13.7 16Z" fill="#11161c" opacity=".75"/></svg>';
  // Remember the visitor's choice across project pages and return visits.
  let shipMode=false;
  try{shipMode=localStorage.getItem('portfolio-cursor-mode')==='ship';}catch(e){}
  let shipHeading=0; // degrees; ship SVG points upward at zero
  const brand=document.querySelector('header .brand');
  if(brand){
    const toggle=document.createElement('button');
    toggle.type='button';
    toggle.className='cursor-ship-toggle';
    toggle.setAttribute('aria-label','Toggle spaceship cursor');
    toggle.setAttribute('aria-pressed','false');
    toggle.title='Switch to spaceship cursor';
    toggle.innerHTML=shipMode?starMarkup:shipMarkup;
    toggle.setAttribute('aria-pressed',String(shipMode));
    toggle.setAttribute('aria-label',shipMode?'Switch to star cursor':'Switch to spaceship cursor');
    toggle.title=shipMode?'Switch to star cursor':'Switch to spaceship cursor';
    brand.insertAdjacentElement('afterend',toggle);
    toggle.addEventListener('click',()=>{
      shipMode=!shipMode;
      try{localStorage.setItem('portfolio-cursor-mode',shipMode?'ship':'star');}catch(e){}
      toggle.setAttribute('aria-pressed',String(shipMode));
      toggle.innerHTML=shipMode?starMarkup:shipMarkup;
      toggle.setAttribute('aria-label',shipMode?'Switch to star cursor':'Switch to spaceship cursor');
      toggle.title=shipMode?'Switch to star cursor':'Switch to spaceship cursor';
      dot.innerHTML=shipMode?shipMarkup:starMarkup;
      dot.classList.toggle('is-spaceship',shipMode);
      points=[];
      ctx.clearRect(0,0,trail.width/dpr,trail.height/dpr);
    });
  }
  dot.innerHTML=shipMode?shipMarkup:starMarkup;
  dot.classList.toggle('is-spaceship',shipMode);
  dot.setAttribute('aria-hidden','true');
  document.body.appendChild(dot);
  // Draw a curved comet tail through the star's recent positions.
  const trail=document.createElement('canvas');
  trail.className='elastic-cursor-trail';
  trail.setAttribute('aria-hidden','true');
  document.body.insertBefore(trail,dot);
  const ctx=trail.getContext('2d');
  let points=[],dpr=1;
  function resizeTrail(){
    dpr=Math.min(window.devicePixelRatio||1,2);
    trail.width=Math.round(innerWidth*dpr);
    trail.height=Math.round(innerHeight*dpr);
    trail.style.width=innerWidth+'px';
    trail.style.height=innerHeight+'px';
    ctx.setTransform(dpr,0,0,dpr,0,0);
  }
  resizeTrail();
  window.addEventListener('resize',resizeTrail,{passive:true});
  let tx=0,ty=0,x=0,y=0,vx=0,vy=0,started=false,last=performance.now();
  document.addEventListener('pointermove',e=>{
    if(e.pointerType!=='mouse')return;
    tx=e.clientX;ty=e.clientY;
    if(!started){x=tx;y=ty;started=true;dot.style.opacity='1';}
  },{passive:true});
  document.addEventListener('pointerleave',()=>{dot.style.opacity='0';points=[];ctx.clearRect(0,0,trail.width/dpr,trail.height/dpr);});
  document.addEventListener('pointerenter',()=>{if(started)dot.style.opacity='1';});
  function frame(now){
    const dt=Math.min((now-last)/1000,.04);last=now;
    if(started){
      vx+=((tx-x)*105-vx*16)*dt;vy+=((ty-y)*105-vy*16)*dt;
      x+=vx*dt;y+=vy*dt;
      const dist=Math.hypot(tx-x,ty-y);
      if(dist>90){x=tx+(x-tx)*90/dist;y=ty+(y-ty)*90/dist;vx*=.7;vy*=.7;}
      const separation=Math.hypot(tx-x,ty-y);
      const scale=1-0.45*Math.min(separation/90,1);
      // Turn the ship's nose toward its actual velocity, not the cursor target.
      const movementSpeed=Math.hypot(vx,vy);
      if(shipMode && movementSpeed>12){
        const targetHeading=Math.atan2(vy,vx)*180/Math.PI+90;
        const delta=((targetHeading-shipHeading+540)%360)-180;
        shipHeading+=delta*Math.min(1,dt*18);
      }
      dot.style.transform=`translate3d(${x-10}px,${y-10}px,0) rotate(${shipMode?shipHeading:0}deg) scale(${scale})`;
      // Sample the actual curved trajectory, limiting both its age and distance.
      const speed=Math.hypot(vx,vy);
      const strength=Math.min(speed/620,1);
      points.push({x,y,t:now});
      while(points.length>2 && now-points[0].t>240)points.shift();
      let distance=0;
      for(let i=points.length-1;i>0;i--){
        distance+=Math.hypot(points[i].x-points[i-1].x,points[i].y-points[i-1].y);
        if(distance>105){points.splice(0,i);break;}
      }
      ctx.clearRect(0,0,trail.width/dpr,trail.height/dpr);
      if(points.length>2 && strength>.015){
        ctx.lineCap='round';
        ctx.lineJoin='round';
        ctx.shadowColor=shipMode?'rgba(183,197,210,.85)':'rgba(224,184,131,.85)';
        ctx.shadowBlur=10;
        for(let i=1;i<points.length;i++){
          const a=points[i-1],b=points[i];
          const age=Math.min((now-b.t)/240,1);
          const opacity=(1-age)*Math.min(strength*1.1,.95);
          ctx.beginPath();
          ctx.moveTo(a.x,a.y);
          ctx.lineTo(b.x,b.y);
          ctx.lineWidth=1+3*(i/points.length);
          ctx.strokeStyle=shipMode?`rgba(183,197,210,${opacity})`:`rgba(224,184,131,${opacity})`;
          ctx.stroke();
        }
        ctx.shadowBlur=0;
      }
      const glow=Math.min(speed/750,1);
      dot.style.filter=shipMode
        ? `drop-shadow(0 0 ${5+8*glow}px rgba(183,197,210,${0.5+0.45*glow})) drop-shadow(0 0 ${3+10*glow}px rgba(225,235,245,${0.12+0.4*glow}))`
        : `drop-shadow(0 0 ${5+8*glow}px rgba(224,184,131,${0.5+0.45*glow})) drop-shadow(0 0 ${3+10*glow}px rgba(255,224,174,${0.12+0.4*glow}))`;
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();


/* STARFALL hidden jump: project-page exploration easter egg. */
(()=>{
  // Cloudflare Pages serves clean URLs such as /bioshock as well as /bioshock.html.
  const path=location.pathname.split('/').filter(Boolean).pop()?.toLowerCase()||'';
  const slug=path.replace(/\.html$/,'');
  if(!slug || slug==='index' || slug==='index-fr' || slug==='starfall' || path.includes('.pdf'))return;
  if(!matchMedia('(pointer:fine)').matches || matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const toggle=document.querySelector('.cursor-ship-toggle');
  if(!toggle)return;
  let active=false,portal=null,spawnTimer=null,hideTimer=null,jumping=false,lastX=-100,lastY=-100;
  const enabled=()=>toggle.getAttribute('aria-pressed')==='true';
  const clearTimers=()=>{clearTimeout(spawnTimer);clearTimeout(hideTimer);};
  function removePortal(){if(portal){portal.remove();portal=null;}}
  function stop(){active=false;clearTimers();removePortal();}
  function schedule(ms){clearTimers();if(active&&!jumping)spawnTimer=setTimeout(spawn,ms);}
  function openSpace(){
    // Test the whole portal footprint, not just its center. Reject text, artwork and controls.
    const radius=61, samples=[[0,0],[-radius,0],[radius,0],[0,-radius],[0,radius],[-46,-46],[46,-46],[-46,46],[46,46],[-62,-24],[62,24]];
    const blocked='a,button,input,textarea,select,img,video,iframe,canvas,svg,h1,h2,h3,h4,h5,h6,p,li,blockquote,.cover,.shot,.gallery,.project-header,.feature-composition,.writing-sample-card,.card,.project-card,nav,header,footer';
    const spots=[];
    for(let k=0;k<110;k++){
      const x=85+Math.random()*Math.max(1,innerWidth-170);
      const y=Math.max(125,innerHeight*.15)+Math.random()*Math.max(1,innerHeight-Math.max(125,innerHeight*.15)-95);
      let valid=true;
      for(const [dx,dy] of samples){
        const el=document.elementFromPoint(x+dx,y+dy);
        if(!el || el.closest(blocked)){valid=false;break;}
        const range=document.caretRangeFromPoint?.(x+dx,y+dy);
        if(range && range.startContainer.nodeType===Node.TEXT_NODE && range.startContainer.textContent.trim()){
          const rect=range.getBoundingClientRect();
          if(rect.width && rect.height && Math.abs(rect.left-(x+dx))<18 && Math.abs(rect.top-(y+dy))<20){valid=false;break;}
        }
      }
      if(valid)spots.push({x,y});
      if(spots.length>=12)break;
    }
    return spots.length?spots[Math.floor(Math.random()*spots.length)]:null;
  }
  function spawn(){
    if(!active||!enabled()||document.hidden||jumping)return;
    removePortal();
    const spot=openSpace();
    if(!spot){schedule(2500);return;} // Never cover content just to force a spawn.
    const p=document.createElement('div');p.className='starfall-wormhole';p.setAttribute('aria-hidden','true');
    p.style.left=spot.x+'px';p.style.top=spot.y+'px';
    const canvas=document.createElement('canvas');canvas.width=240;canvas.height=240;p.appendChild(canvas);
    document.body.appendChild(p);portal=p;
    const ctx=canvas.getContext('2d'),birth=performance.now();
    const particles=Array.from({length:95},(_,i)=>({
      radius:17+Math.random()*87,angle:Math.random()*Math.PI*2,
      size:.35+Math.random()*.85,phase:Math.random()*Math.PI*2,
      tint:i%4
    }));
    function swirl(now){
      if(portal!==p||document.hidden)return;
      const t=(now-birth)/1000, cx=120,cy=120;
      ctx.clearRect(0,0,240,240);
      ctx.save();
      ctx.translate(cx,cy);
      ctx.rotate(-.46); // A tilted gateway rather than a face-on disc.
      ctx.scale(1,.69); // Foreshortened opening gives the vortex its perspective.
      // Deep outer atmosphere. Keep the edges transparent against the portfolio.
      const haze=ctx.createRadialGradient(0,0,12,0,0,113);
      haze.addColorStop(0,'rgba(3,4,17,.98)');
      haze.addColorStop(.28,'rgba(14,9,45,.91)');
      haze.addColorStop(.49,'rgba(31,21,82,.64)');
      haze.addColorStop(.72,'rgba(32,38,90,.25)');
      haze.addColorStop(1,'rgba(20,20,65,0)');
      ctx.fillStyle=haze;ctx.beginPath();ctx.arc(0,0,113,0,Math.PI*2);ctx.fill();
      // Layered spiral arms: hundreds of short translucent filaments produce
      // turbulent nebula-like texture rather than a handful of geometric lines.
      const palette=[[124,103,225],[64,168,222],[185,106,187],[118,148,211],[211,164,203]];
      for(let arm=0;arm<8;arm++){
        for(let filament=0;filament<11;filament++){
          const color=palette[(arm+Math.floor(filament/3))%palette.length];
          const offset=(filament-5)*.052;
          ctx.beginPath();
          for(let k=0;k<=75;k++){
            const u=k/75,r=10+u*95;
            const theta=arm*Math.PI/4+offset+u*4.8-t*.22+
              Math.sin(u*17+arm*2.3+filament*.7+t*.32)*(.025+.045*u);
            const ripple=1+Math.sin(u*26+filament*1.7+t*.45)*.018;
            const x=Math.cos(theta)*r*ripple,y=Math.sin(theta)*r*ripple;
            if(k===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
          }
          const alpha=(filament%3===0?.18:.07)*(1-Math.abs(filament-5)/18);
          ctx.strokeStyle='rgba('+color.join(',')+','+alpha+')';
          ctx.lineWidth=filament%4===0?2.6:.85;
          ctx.stroke();
        }
      }
      // A narrow, asymmetrically illuminated inner rim adds perceived depth.
      ctx.save();ctx.rotate(t*.12);
      const rim=ctx.createLinearGradient(-38,-35,45,35);
      rim.addColorStop(0,'rgba(97,187,238,.36)');
      rim.addColorStop(.45,'rgba(165,104,230,.12)');
      rim.addColorStop(1,'rgba(210,124,187,.32)');
      ctx.strokeStyle=rim;ctx.lineWidth=5;
      ctx.beginPath();ctx.ellipse(0,0,22,17,.22,0,Math.PI*2);ctx.stroke();
      ctx.restore();
      // The dark vanishing point is never a bright flat circle.
      const throat=ctx.createRadialGradient(-2,-2,1,0,0,29);
      throat.addColorStop(0,'rgba(0,1,8,1)');
      throat.addColorStop(.56,'rgba(2,3,15,.99)');
      throat.addColorStop(.85,'rgba(7,7,28,.65)');
      throat.addColorStop(1,'rgba(12,10,39,0)');
      ctx.fillStyle=throat;ctx.beginPath();ctx.arc(0,0,29,0,Math.PI*2);ctx.fill();
      for(const star of particles){
        const theta=star.angle-t*(.12+42/(star.radius+25));
        const r=star.radius*(.94+.06*Math.sin(t*.45+star.phase));
        const x=Math.cos(theta)*r,y=Math.sin(theta)*r;
        const alpha=(.12+.2*(.5+.5*Math.sin(t*.8+star.phase)))*(1-r/140);
        ctx.fillStyle=star.tint===0?'rgba(148,218,247,'+alpha+')':'rgba(206,176,247,'+alpha+')';
        ctx.beginPath();ctx.arc(x,y,star.size,0,Math.PI*2);ctx.fill();
      }
      ctx.restore();
      requestAnimationFrame(swirl);
    }
    requestAnimationFrame(swirl);
    hideTimer=setTimeout(()=>{p.classList.add('vanishing');setTimeout(()=>{if(portal===p){removePortal();schedule(3000+Math.random()*3000);}},650);},8000);
  }
  function start(){if(active||jumping)return;active=true;schedule(5000);}
  function jump(){
    if(jumping)return;jumping=true;stop();
    const overlay=document.createElement('div');overlay.className='starfall-jump';overlay.innerHTML='<canvas aria-hidden="true"></canvas><button type="button" class="starfall-skip">Skip →</button>';
    document.body.appendChild(overlay);
    const canvas=overlay.querySelector('canvas'),ctx=canvas.getContext('2d');
    const finish=()=>location.assign('starfall.html');
    overlay.querySelector('button').addEventListener('click',finish);
    const stars=Array.from({length:240},()=>({angle:Math.random()*Math.PI*2,depth:.02+Math.random()*.98,speed:.6+Math.random()*1.5}));
    const begin=performance.now();
    function draw(now){
      const elapsed=Math.max(0,now-begin-450),progress=Math.min(1,elapsed/4200),dpr=Math.min(devicePixelRatio||1,2);
      if(canvas.width!==Math.round(innerWidth*dpr)||canvas.height!==Math.round(innerHeight*dpr)){canvas.width=Math.round(innerWidth*dpr);canvas.height=Math.round(innerHeight*dpr);}
      ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle='#050912';ctx.fillRect(0,0,innerWidth,innerHeight);
      const cx=innerWidth/2,cy=innerHeight/2,max=Math.hypot(cx,cy)*1.4;
      for(const s of stars){
        const distance=((s.depth+progress*s.speed*2.8)%1),r=Math.pow(distance,2.2)*max;
        const x=cx+Math.cos(s.angle)*r,y=cy+Math.sin(s.angle)*r;
        const len=4+progress*90*distance;
        ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+Math.cos(s.angle)*len,y+Math.sin(s.angle)*len);
        ctx.strokeStyle='rgba(175,211,255,'+(.15+.8*distance)+')';ctx.lineWidth=1+distance*2;ctx.stroke();
      }
      const glow=ctx.createRadialGradient(cx,cy,2,cx,cy,Math.max(innerWidth,innerHeight)*.48);
      glow.addColorStop(0,'rgba(210,233,255,'+(.25+progress*.65)+')');glow.addColorStop(.12,'rgba(69,121,204,'+(.18+progress*.25)+')');glow.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=glow;ctx.fillRect(0,0,innerWidth,innerHeight);
      if(progress>.88){ctx.fillStyle='rgba(236,246,255,'+((progress-.88)/.12)+')';ctx.fillRect(0,0,innerWidth,innerHeight);}
      if(progress<1)requestAnimationFrame(draw);else finish();
    }
    requestAnimationFrame(draw);
  }
  document.addEventListener('pointermove',e=>{
    if(e.pointerType!=='mouse'||!portal||jumping)return;
    lastX=e.clientX;lastY=e.clientY;
    const b=portal.getBoundingClientRect(),cx=b.left+b.width/2,cy=b.top+b.height/2;
    const dist=Math.hypot(lastX-cx,lastY-cy);
    portal.classList.toggle('near',dist<65);
    if(dist<Math.min(b.width,b.height)*.39)jump();
  },{passive:true});
  toggle.addEventListener('click',()=>{if(enabled())start();else stop();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();else if(enabled())start();});
  window.addEventListener('pagehide',stop);
  if(enabled())start();
})();
