const videoDialog=document.getElementById('video-lightbox');
const videoPlayer=document.getElementById('cinematic-player');
const videoTitle=document.getElementById('video-title');
const videoClose=document.getElementById('video-close');
const videoActions=document.getElementById('video-actions');
const videoNext=document.getElementById('video-next');
if(videoDialog&&videoPlayer){
  const clips=[...document.querySelectorAll('.cinematic-play[data-video]')];
  let currentIndex=-1;
  function playClip(index){
    const button=clips[index];
    if(!button)return;
    currentIndex=index;
    videoPlayer.pause();
    videoActions.hidden=true;
    videoTitle.textContent=button.dataset.title||'Cinematic';
    videoPlayer.src=button.dataset.video;
    videoPlayer.load();
    if(!videoDialog.open)videoDialog.showModal();
    videoPlayer.play().catch(()=>{});
  }
  clips.forEach((button,index)=>button.addEventListener('click',()=>playClip(index)));
  videoPlayer.addEventListener('ended',()=>{
    videoNext.textContent=currentIndex===clips.length-1?'↻ Replay video':'Next video →';
    videoActions.hidden=false;
  });
  videoNext.addEventListener('click',()=>playClip(currentIndex===clips.length-1?currentIndex:currentIndex+1));
  videoDialog.addEventListener('close',()=>{
    videoPlayer.pause();
    videoPlayer.removeAttribute('src');
    videoPlayer.load();
    videoActions.hidden=true;
    currentIndex=-1;
  });
  videoClose.addEventListener('click',()=>videoDialog.close());
  videoDialog.addEventListener('click',event=>{if(event.target===videoDialog)videoDialog.close();});
}
