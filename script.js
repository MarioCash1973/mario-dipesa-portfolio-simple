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
  let shipMode=false;
  let shipHeading=0; // degrees; ship SVG points upward at zero
  const brand=document.querySelector('header .brand');
  if(brand){
    const toggle=document.createElement('button');
    toggle.type='button';
    toggle.className='cursor-ship-toggle';
    toggle.setAttribute('aria-label','Toggle spaceship cursor');
    toggle.setAttribute('aria-pressed','false');
    toggle.title='Switch to spaceship cursor';
    toggle.innerHTML=shipMarkup;
    brand.insertAdjacentElement('afterend',toggle);
    toggle.addEventListener('click',()=>{
      shipMode=!shipMode;
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
