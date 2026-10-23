function coverError(el){el.hidden=true}const lightbox=document.getElementById('lightbox');if(lightbox){const photos=[...document.querySelectorAll('.shot img')];let current=0;const large=document.getElementById('large-photo'),counter=document.getElementById('counter');function show(i){current=(i+photos.length)%photos.length;large.src=photos[current].src;large.alt=photos[current].alt;counter.textContent=(current+1)+' / '+photos.length}document.querySelectorAll('.shot').forEach((b,i)=>b.addEventListener('click',()=>{show(i);lightbox.showModal()}));document.getElementById('prev').addEventListener('click',()=>show(current-1));document.getElementById('next').addEventListener('click',()=>show(current+1));document.getElementById('close').addEventListener('click',()=>lightbox.close());document.addEventListener('keydown',e=>{if(!lightbox.open)return;if(e.key==='ArrowLeft')show(current-1);if(e.key==='ArrowRight')show(current+1)})}
/* Featured artwork hover/focus previews; restores the original on exit. */
document.querySelectorAll('.feature-composition').forEach(card=>{
 const img=card.querySelector('.feature-primary-image');if(!img)return;
 const original={src:img.dataset.originalSrc,alt:img.dataset.originalAlt};
 const previews=[...card.querySelectorAll('.expansion-art[data-preview]')];
 const show=(link)=>{img.src=link.dataset.preview;img.alt=link.dataset.previewAlt||'Expansion artwork';};
 const restore=()=>{img.src=original.src;img.alt=original.alt;};
 previews.forEach(link=>{link.addEventListener('mouseenter',()=>show(link));link.addEventListener('focus',()=>show(link));link.addEventListener('mouseleave',restore);link.addEventListener('blur',restore);
  link.addEventListener('click',e=>{if(window.matchMedia('(hover: none)').matches&&!link.dataset.selected){e.preventDefault();previews.forEach(p=>delete p.dataset.selected);link.dataset.selected='true';show(link);}});
 });
 card.addEventListener('mouseleave',restore);
});
