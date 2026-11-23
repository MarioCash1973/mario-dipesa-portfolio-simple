(()=>{'use strict';
const N=28,S=30,C=12,LOCK=1500,MAX_RESETS=8,MAX_LIVES=5;
const shapes=[[[0,0],[1,0],[2,0],[3,0]],[[0,0],[1,0],[0,1],[1,1]],[[0,0],[1,0],[2,0],[1,1]],[[0,0],[0,1],[1,1],[2,1]],[[2,0],[0,1],[1,1],[2,1]],[[1,0],[2,0],[0,1],[1,1]],[[0,0],[1,0],[1,1],[2,1]]];
const colors=['#36c5f0','#f6c65b','#a78bfa','#f78c55','#6fa8ff','#62d9a0','#f472b6'];
// Fixed palette for the ten concentric rings, from the core outward.
const ringColors=['#ff6b6b','#ffad5a','#ffe066','#9fe870','#41d9ae','#45c9f5','#718cff','#b38aff','#f37dd0','#d6e6f5','#ef7b63','#8dd3cb'];
const ringAt=(x,y)=>Math.max(C-x,x-(C+3),C-y,y-(C+3),0);

const $=id=>document.getElementById(id),ctx=$('board').getContext('2d');
let grid,active=null,dir=0,lastDir=-1,score=0,rings=0,lives=3,playing=false,paused=false,over=false,acc=0,prev=0,interval=650;
let grounded=false,lockElapsed=0,resets=0,particles=[],shake=0,flash=0;
let charges=0,chargeElapsed=0,chargeDuration=60000,detonations=0,corePulse=0;
let gravityCollapse=true;
const vec=()=>[[0,1],[-1,0],[0,-1],[1,0]][dir];
const core=(x,y)=>x>=C&&x<C+4&&y>=C&&y<C+4;
const inside=(x,y)=>x>=0&&x<N&&y>=0&&y<N;
function valid(p){return p.cells.every(([dx,dy])=>{const x=p.x+dx,y=p.y+dy;return inside(x,y)&&!core(x,y)&&!grid[y][x]})}
function rotated(c){const m=Math.max(...c.map(p=>p[1]));return c.map(([x,y])=>[m-y,x])}
function blocked(p=active){const [dx,dy]=vec();return !valid({...p,x:p.x+dx,y:p.y+dy})}
function boundaryHit(p=active){const [dx,dy]=vec();return p.cells.some(([cx,cy])=>!inside(p.x+cx+dx,p.y+cy+dy))}
function refreshContact(was,manual){
 if(!blocked()){grounded=false;lockElapsed=0}
 else if(!was){grounded=true;lockElapsed=0}
 else if(manual&&resets<MAX_RESETS){resets++;lockElapsed=0}
 else grounded=true;
}
function update(){
 $('score').textContent=score;$('rings').textContent=rings;
 $('lives').textContent='♥ '.repeat(lives)+'♡ '.repeat(MAX_LIVES-lives);
 $('timer').textContent=grounded&&playing?(Math.max(0,LOCK-lockElapsed)/1000).toFixed(1)+'s':'—';
 $('charge').textContent=charges+'/4';
 $('chargeTime').textContent=Math.ceil(Math.max(0,chargeDuration-chargeElapsed)/1000)+'s';
 $('detonate').disabled=!playing||paused||charges===0;
}
function spawn(){
 const choices=[0,1,2,3].filter(d=>d!==lastDir);
 dir=choices[Math.floor(Math.random()*choices.length)];lastDir=dir;
 const type=Math.floor(Math.random()*shapes.length);let cells=shapes[type].map(p=>p.slice());
 if(dir===1||dir===3)cells=rotated(cells);
 const w=Math.max(...cells.map(p=>p[0]))+1,h=Math.max(...cells.map(p=>p[1]))+1;
 let x=Math.floor((N-w)/2),y=Math.floor((N-h)/2);
 if(dir===0)y=0;if(dir===2)y=N-h;if(dir===3)x=0;if(dir===1)x=N-w;
 active={x,y,cells,color:colors[type]};grounded=false;lockElapsed=0;resets=0;acc=0;
 $('side').textContent=['TOP','RIGHT','BOTTOM','LEFT'][dir];
 if(!valid(active))entryCollision();
 else refreshContact(false,false);
 update();
}
function move(dx,dy,manual=false){
 if(!playing||paused||over)return false;
 const p={...active,x:active.x+dx,y:active.y+dy};
 if(!valid(p))return false;
 const was=grounded;active=p;refreshContact(was,manual);return true;
}
function step(){
 if(!playing||paused||over)return;
 const [dx,dy]=vec();
 if(move(dx,dy))return;
 if(boundaryHit())breach();
 else if(!grounded){grounded=true;lockElapsed=0}
}
function directional(dx,dy){
 if(!playing||paused||over)return;
 const [vx,vy]=vec(),dot=dx*vx+dy*vy;
 if(dot<0)return;
 if(dot>0){step();return}
 move(dx,dy,true);
}
function rotate(clockwise=true){
 if(!playing||paused||over)return;
 const cells=clockwise?rotated(active.cells):rotated(rotated(rotated(active.cells))),minX=Math.min(...cells.map(p=>p[0])),minY=Math.min(...cells.map(p=>p[1]));
 const norm=cells.map(([x,y])=>[x-minX,y-minY]);
 for(const [ox,oy] of [[0,0],[-1,0],[1,0],[0,-1],[0,1]]){
  const p={...active,x:active.x+ox,y:active.y+oy,cells:norm};
  if(valid(p)){const was=grounded;active=p;refreshContact(was,true);return}
 }
}
function ringCells(r){const a=C-r,b=C+3+r,out=[];for(let y=a;y<=b;y++)for(let x=a;x<=b;x++)if(x===a||x===b||y===a||y===b)out.push([x,y]);return out}
function clearRings(){
 let count=0;
 for(let r=1;r<=C;r++){const cells=ringCells(r);if(cells.every(([x,y])=>grid[y][x])){cells.forEach(([x,y])=>grid[y][x]=null);count++}}
 if(count){const gained=Math.min(count,MAX_LIVES-lives);rings+=count;score+=count*100*(count+1);lives+=gained;interval=Math.max(170,650-rings*12);$('status').textContent='RING CLEARED! +'+gained+' '+(gained===1?'life':'lives')+' (max 5)'}
}
// Experimental ring compression. Preserve all surviving blocks by using
// nearest angular slots, spilling excess blocks to the next outer ring.
function collapseOuterRings(removed){
 const old=grid,next=Array.from({length:N},()=>Array(N).fill(null));
 const reserved=new Set(active?active.cells.map(([dx,dy])=>(active.x+dx)+','+(active.y+dy)):[]);
 const blocks=[];
 for(let y=0;y<N;y++)for(let x=0;x<N;x++)if(old[y][x])blocks.push({x,y,ring:ringAt(x,y)});
 blocks.sort((a,b)=>a.ring-b.ring);
 const center=(N-1)/2;
 const angle=(x,y)=>Math.atan2(y-center,x-center);
 const delta=(a,b)=>Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)));
 for(const b of blocks){
  const target=Math.max(1,b.ring-removed),bearing=angle(b.x,b.y);
  let placed=false;
  for(let r=target;r<=C;r++){
   const slots=ringCells(r).filter(([x,y])=>!next[y][x]&&!reserved.has(x+','+y));
   if(!slots.length)continue;
   slots.sort((p,q)=>delta(angle(p[0],p[1]),bearing)-delta(angle(q[0],q[1]),bearing)||Math.hypot(p[0]-b.x,p[1]-b.y)-Math.hypot(q[0]-b.x,q[1]-b.y));
   const [x,y]=slots[0];next[y][x]=ringColors[r-1];placed=true;break;
  }
  if(!placed)throw Error('No available slot for ring collapse');
 }
 grid=next;return blocks.length;
}
function detonate(overload=false){
 if(!playing||paused||charges===0)return;
 const used=charges;
 let destroyed=0;
 for(let r=1;r<=used;r++)for(const [x,y] of ringCells(r)){
  if(!grid[y][x])continue;
  const color=grid[y][x];grid[y][x]=null;destroyed++;
  for(let i=0;i<5;i++){
   const a=Math.random()*Math.PI*2,v=1+Math.random()*4;
   particles.push({x:(x+.5)*S,y:(y+.5)*S,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:1,color,size:2+Math.random()*2});
  }
 }
 const pulled=gravityCollapse?collapseOuterRings(used):0;
 charges=0;chargeElapsed=0;chargeDuration+=10000;detonations++;corePulse=1;shake=overload?16:9;flash=overload?.48:.23;
 // A detonation destroys blocks, not completed rings: no bonus lives.
 score+=destroyed*2;
 $('status').textContent=(overload?'CORE OVERLOAD! ':'CORE DETONATED! ')+used+' inner '+(used===1?'ring':'rings')+' cleared · '+Math.round(chargeDuration/1000)+'s per charge'+(gravityCollapse?' · '+pulled+' outer blocks pulled inward':'');
 if(active)refreshContact(false,false);
 update();
}
function lock(){
 if(!active||!playing)return;
 for(const [dx,dy] of active.cells)grid[active.y+dy][active.x+dx]=ringColors[ringAt(active.x+dx,active.y+dy)-1];
 score+=4;clearRings();spawn();update();
}
function burst(){
 if(!active)return;
 for(const [dx,dy] of active.cells){
  const x=(active.x+dx+.5)*S,y=(active.y+dy+.5)*S;
  for(let i=0;i<12;i++){const a=Math.random()*Math.PI*2,s=1.5+Math.random()*5;
   particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:1,color:active.color,size:1.5+Math.random()*3})}
 }
 shake=10;flash=.3;
}
function entryCollision(){
 // Destroy the arriving tetromino and every settled cell it overlaps.
 // This is one collision event, costing exactly one life.
 const incoming=active;
 const hit=[];
 for(const [dx,dy] of incoming.cells){
  const x=incoming.x+dx,y=incoming.y+dy;
  if(inside(x,y)&&grid[y][x]){hit.push({x,y,color:grid[y][x]});grid[y][x]=null}
 }
 burst();
 for(const cell of hit){
  for(let i=0;i<12;i++){
   const a=Math.random()*Math.PI*2,s=1.5+Math.random()*5;
   particles.push({x:(cell.x+.5)*S,y:(cell.y+.5)*S,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:1,color:cell.color,size:1.5+Math.random()*3});
  }
 }
 lives--;active=null;grounded=false;
 if(lives<=0){playing=false;over=true;$('status').textContent='GAME OVER · Entry collision'}
 else{$('status').textContent='ENTRY COLLISION! One life lost';spawn()}
 update();
}
function breach(){
 burst();lives--;active=null;grounded=false;
 if(lives<=0){playing=false;over=true;$('status').textContent='GAME OVER · No lives remaining'}
 else{$('status').textContent='BREACH! One life lost';spawn()}
 update();
}
function hardDrop(){
 if(!playing||paused||over)return;
 const [dx,dy]=vec();
 while(valid({...active,x:active.x+dx,y:active.y+dy}))active={...active,x:active.x+dx,y:active.y+dy};
 if(boundaryHit())breach();else lock();
}
function block(x,y,c){
 const px=x*S,py=y*S;ctx.fillStyle=c;ctx.fillRect(px+2,py+2,S-4,S-4);
 ctx.fillStyle='rgba(255,255,255,.22)';ctx.fillRect(px+3,py+3,S-6,4);
 ctx.strokeStyle='rgba(255,255,255,.30)';ctx.strokeRect(px+2,py+2,S-4,S-4);
}
function draw(){
 ctx.save();ctx.clearRect(0,0,N*S,N*S);
 if(shake>0)ctx.translate((Math.random()-.5)*shake,(Math.random()-.5)*shake);
 ctx.fillStyle='#0b1020';ctx.fillRect(-15,-15,N*S+30,N*S+30);
 for(let y=0;y<N;y++)for(let x=0;x<N;x++){
  const px=x*S,py=y*S;
  ctx.strokeStyle='rgba(140,165,220,.10)';ctx.strokeRect(px+.5,py+.5,S-1,S-1);
  if(core(x,y)){ctx.fillStyle='#263449';ctx.fillRect(px+1,py+1,S-2,S-2)}
  if(grid&&grid[y][x])block(x,y,grid[y][x]);
 }
 for(let r=1;r<=C;r++){
  const a=(C-r)*S,b=(C+4+r)*S;
  ctx.strokeStyle=ringColors[r-1];
  ctx.globalAlpha=.36;ctx.lineWidth=2;ctx.strokeRect(a+1,a+1,b-a-2,b-a-2);ctx.globalAlpha=1;
 }
 if(active)for(const [dx,dy] of active.cells){
  if(grounded&&playing&&!paused)ctx.globalAlpha=.72+.28*(.5+.5*Math.sin(performance.now()*.014));
  block(active.x+dx,active.y+dy,active.color);ctx.globalAlpha=1;
 }
 // Four nested red squares fill from the center outward as charge builds.
 const mid=(C+2)*S;
 for(let i=3;i>=0;i--){
  const size=24+i*24;
  ctx.fillStyle=i<charges?'rgba(255,55,67,'+(.8+corePulse*.2)+')':'rgba(115,35,48,.20)';
  ctx.fillRect(mid-size/2,mid-size/2,size,size);
  ctx.strokeStyle=i<charges?'#ffd1d1':'rgba(220,110,120,.30)';ctx.lineWidth=1.5;
  ctx.strokeRect(mid-size/2+.5,mid-size/2+.5,size-1,size-1);
 }
 if(charges===4){ctx.strokeStyle='rgba(255,75,75,'+(.5+.5*Math.sin(performance.now()*.013))+')';ctx.lineWidth=4;ctx.strokeRect(C*S+1,C*S+1,S*4-2,S*4-2)}
 if(grounded&&playing&&!paused){
  const pct=Math.max(0,1-lockElapsed/LOCK);
  ctx.strokeStyle=pct<.3?'#fb7185':'#6ee7f9';ctx.lineWidth=4;
  ctx.beginPath();ctx.arc((C+2)*S,(C+2)*S,58,-Math.PI/2,-Math.PI/2+Math.PI*2*pct);ctx.stroke();
 }
 for(const p of particles){ctx.globalAlpha=Math.max(0,p.life);ctx.fillStyle=p.color;ctx.fillRect(p.x,p.y,p.size,p.size)}
 ctx.globalAlpha=1;
 if(flash>0){ctx.fillStyle='rgba(255,85,110,'+flash+')';ctx.fillRect(0,0,N*S,N*S)}
 ctx.restore();
 if(!playing||paused){
  ctx.fillStyle='rgba(5,10,24,.56)';ctx.fillRect(0,0,N*S,N*S);
  ctx.fillStyle='#fff';ctx.textAlign='center';ctx.font='bold 28px sans-serif';
  ctx.fillText(over?'GAME OVER':paused?'PAUSED':'FOURFOLD',(C+2)*S,(C+2)*S-10);
 }
 update();
}
function start(){
 grid=Array.from({length:N},()=>Array(N).fill(null));
 active=null;lastDir=-1;score=0;rings=0;lives=3;interval=650;acc=0;over=false;paused=false;playing=true;
 particles=[];shake=0;flash=0;charges=0;chargeElapsed=0;chargeDuration=60000;detonations=0;corePulse=0;spawn();$('status').textContent='Complete square rings around the core';draw();
}
function tick(t){
 if(prev){
  const dt=Math.min(t-prev,100);
  if(playing&&!paused){
   acc+=dt;
   if(acc>=interval){acc-=interval;step()}
   if(grounded&&playing){lockElapsed+=dt;if(lockElapsed>=LOCK)lock()}
   if(playing){
    chargeElapsed+=dt;
    if(chargeElapsed>=chargeDuration){chargeElapsed-=chargeDuration;if(charges===4)detonate(true);else charges++}
   }
  }
  if(!paused){
   particles=particles.filter(p=>p.life>0);
   for(const p of particles){p.x+=p.vx*dt/16;p.y+=p.vy*dt/16;p.vx*=.98;p.vy*=.98;p.life-=dt/650}
   shake=Math.max(0,shake-dt*.07);flash=Math.max(0,flash-dt/400);corePulse=Math.max(0,corePulse-dt/700);
  }
  draw();
 }
 prev=t;requestAnimationFrame(tick);
}
$('start').onclick=start;
$('pause').onclick=()=>{if(!playing||over)return;paused=!paused;$('status').textContent=paused?'Paused':'Complete square rings around the core'};
$('rotate').onclick=rotate;$('drop').onclick=hardDrop;$('detonate').onclick=()=>detonate(false);
$('collapseToggle').checked=gravityCollapse;
$('collapseToggle').onchange=e=>{gravityCollapse=e.target.checked;$('status').textContent=gravityCollapse?'Experimental ring pull ON':'Classic detonation ON';};
function fullscreen(){const el=$('app');if(document.fullscreenElement===el)document.exitFullscreen();else if(el.requestFullscreen)el.requestFullscreen().catch(()=>$('status').textContent='Fullscreen unavailable')}
$('fullscreen').onclick=fullscreen;
document.addEventListener('fullscreenchange',()=>$('fullscreen').textContent=document.fullscreenElement?'⛶ Exit Fullscreen':'⛶ Fullscreen');
document.addEventListener('keydown',e=>{
 if(e.target.matches('input,textarea,select'))return;
 const key=e.key.toLowerCase();
 if(key==='f'&&!e.repeat){e.preventDefault();fullscreen();return}
 if(!playing)return;
 if(['arrowup','arrowdown','arrowleft','arrowright',' ','z','x','p','c','v'].includes(key))e.preventDefault();
 if(key==='arrowup')directional(0,-1);
 if(key==='arrowdown')directional(0,1);
 if(key==='arrowleft')directional(-1,0);
 if(key==='arrowright')directional(1,0);
 if(key===' ')hardDrop();
 if(key==='z')rotate(false);
 if(key==='x')rotate(true);
 if(key==='p'&&!e.repeat)$('pause').click();
 if(key==='c'&&!e.repeat)detonate(false);
 if(key==='v'&&!e.repeat){$('collapseToggle').checked=!$('collapseToggle').checked;$('collapseToggle').onchange({target:$('collapseToggle')})}
});
grid=Array.from({length:N},()=>Array(N).fill(null));draw();requestAnimationFrame(tick);
})();