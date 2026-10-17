// DRAGGABLE WINDOWS WORKSPACE
(function(){
  const KEY='travel-photo-os-window-layout-v1';
  const MIN_W=230, MIN_H=150, EDGE=8;

  function clamp(v,min,max){return Math.max(min,Math.min(max,v))}
  function load(){try{return JSON.parse(localStorage.getItem(KEY)||'{}')}catch(e){return {}}}
  function save(){
    if(window.innerWidth<=760)return;
    const state={};
    document.querySelectorAll('[data-drag-window]').forEach(el=>{
      const r=el.getBoundingClientRect();
      state[el.dataset.dragWindow]={left:r.left,top:r.top,width:r.width,height:r.height};
    });
    localStorage.setItem(KEY,JSON.stringify(state));
  }
  function restore(){
    if(window.innerWidth<=760)return;
    const state=load();
    document.querySelectorAll('[data-drag-window]').forEach(el=>{
      const s=state[el.dataset.dragWindow];
      if(!s)return;
      const maxL=Math.max(EDGE,window.innerWidth-MIN_W-EDGE);
      const maxT=Math.max(EDGE,window.innerHeight-MIN_H-EDGE);
      el.style.left=clamp(s.left,EDGE,maxL)+'px';
      el.style.top=clamp(s.top,EDGE,maxT)+'px';
      el.style.right='auto';el.style.bottom='auto';
      if(s.width)el.style.width=Math.min(s.width,window.innerWidth-EDGE*2)+'px';
      if(s.height)el.style.height=Math.min(s.height,window.innerHeight-EDGE*2)+'px';
    });
  }
  function reset(){
    localStorage.removeItem(KEY);
    const left=document.querySelector('.left'),right=document.querySelector('.right');
    [left,right].forEach(el=>{if(!el)return;el.removeAttribute('style')});
    if(left){left.style.left='14px';left.style.top='92px';left.style.width='370px';left.style.height='calc(100vh - 106px)'}
    if(right){right.style.right='14px';right.style.left='auto';right.style.top='92px';right.style.width='410px';right.style.height='calc(100vh - 106px)'}
    try{map?.resize()}catch(e){}
  }
  window.resetWindowLayout=reset;

  function makeDraggable(el,name){
    if(!el||el.dataset.dragReady)return;
    el.dataset.dragReady='1';el.dataset.dragWindow=name;
    const grip=document.createElement('div');
    grip.className='dragGrip';grip.title='Déplacer cette fenêtre';grip.textContent='•••';
    el.appendChild(grip);
    let sx=0,sy=0,sl=0,st=0,pid=null;
    grip.addEventListener('pointerdown',e=>{
      if(window.innerWidth<=760)return;
      pid=e.pointerId;grip.setPointerCapture(pid);
      const r=el.getBoundingClientRect();
      sx=e.clientX;sy=e.clientY;sl=r.left;st=r.top;
      el.style.left=r.left+'px';el.style.top=r.top+'px';el.style.right='auto';el.style.bottom='auto';
      el.classList.add('dragging');e.preventDefault();e.stopPropagation();
    });
    grip.addEventListener('pointermove',e=>{
      if(pid!==e.pointerId)return;
      const r=el.getBoundingClientRect();
      const nl=clamp(sl+e.clientX-sx,EDGE,Math.max(EDGE,window.innerWidth-r.width-EDGE));
      const nt=clamp(st+e.clientY-sy,EDGE,Math.max(EDGE,window.innerHeight-r.height-EDGE));
      el.style.left=nl+'px';el.style.top=nt+'px';
    });
    function end(e){
      if(pid!==e.pointerId)return;
      try{grip.releasePointerCapture(pid)}catch(_){}
      pid=null;el.classList.remove('dragging');save();
    }
    grip.addEventListener('pointerup',end);grip.addEventListener('pointercancel',end);
  }

  function init(){
    document.body.classList.add('draggableWorkspace');
    makeDraggable(document.querySelector('.left'),'left');
    makeDraggable(document.querySelector('.right'),'right');
    if(!document.querySelector('.layoutResetBtn')){
      const b=document.createElement('button');
      b.className='layoutResetBtn';b.textContent='↺ Réinitialiser fenêtres';
      b.onclick=reset;document.body.appendChild(b);
    }
    restore();
    window.addEventListener('resize',()=>{if(window.innerWidth>760)restore()});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,250));
  else setTimeout(init,250);
})();
