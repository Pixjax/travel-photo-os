// FREE-FORM WORKSPACE V2
(function(){
  const KEY='travel-photo-os-window-layout-v2';
  const MIN_W=230,MIN_H=150,EDGE=8,ACTIVE_MIN=681;
  let z=120;
  const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
  const load=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'{}')}catch(e){return {}}};
  function snapshot(el){const r=el.getBoundingClientRect();return{left:r.left,top:r.top,width:r.width,height:r.height,minimized:el.classList.contains('is-minimized'),maximized:el.classList.contains('is-maximized')}}
  function save(){if(innerWidth<ACTIVE_MIN)return;const s={};document.querySelectorAll('[data-drag-window]').forEach(el=>s[el.dataset.dragWindow]=snapshot(el));localStorage.setItem(KEY,JSON.stringify(s))}
  function clampRect(el){const r=el.getBoundingClientRect();const w=Math.min(Math.max(MIN_W,r.width),innerWidth-EDGE*2);const h=Math.min(Math.max(MIN_H,r.height),innerHeight-EDGE*2);const l=clamp(r.left,EDGE,Math.max(EDGE,innerWidth-w-EDGE));const t=clamp(r.top,EDGE,Math.max(EDGE,innerHeight-h-EDGE));el.style.width=w+'px';el.style.height=h+'px';el.style.left=l+'px';el.style.top=t+'px';el.style.right='auto';el.style.bottom='auto'}
  function bringFront(el){z++;el.style.zIndex=String(z)}
  function restore(){if(innerWidth<ACTIVE_MIN)return;const s=load();document.querySelectorAll('[data-drag-window]').forEach(el=>{const d=s[el.dataset.dragWindow];if(!d)return;el.classList.toggle('is-minimized',!!d.minimized);el.classList.toggle('is-maximized',!!d.maximized);if(!d.maximized){el.style.left=d.left+'px';el.style.top=d.top+'px';el.style.width=d.width+'px';el.style.height=d.height+'px';el.style.right='auto';el.style.bottom='auto';clampRect(el)}})}
  function reset(){localStorage.removeItem(KEY);const left=document.querySelector('.left'),right=document.querySelector('.right');[left,right].forEach(el=>{if(!el)return;el.classList.remove('is-minimized','is-maximized');el.removeAttribute('style')});if(left){left.style.left='14px';left.style.top='92px';left.style.width='370px';left.style.height='calc(100vh - 106px)'}if(right){right.style.left=(innerWidth-424)+'px';right.style.top='92px';right.style.width='410px';right.style.height='calc(100vh - 106px)'}try{map?.resize()}catch(e){}}
  window.resetWindowLayout=reset;

  function addControls(el){
    const grip=document.createElement('div');grip.className='dragGrip';grip.title='Déplacer · double-clic pour maximiser';grip.textContent='•••';el.appendChild(grip);
    const ctr=document.createElement('div');ctr.className='winControls';ctr.innerHTML='<button type="button" data-act="min" title="Réduire">—</button><button type="button" data-act="max" title="Agrandir / restaurer">□</button>';el.appendChild(ctr);
    ['n','s','e','w','ne','nw','se','sw'].forEach(dir=>{const h=document.createElement('div');h.className='winResize '+dir;h.dataset.dir=dir;el.appendChild(h)});

    let drag=null;
    grip.addEventListener('pointerdown',e=>{if(innerWidth<ACTIVE_MIN||el.classList.contains('is-maximized'))return;bringFront(el);const r=el.getBoundingClientRect();drag={id:e.pointerId,x:e.clientX,y:e.clientY,l:r.left,t:r.top,w:r.width,h:r.height};grip.setPointerCapture(e.pointerId);el.classList.add('dragging');e.preventDefault()});
    grip.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;const nl=clamp(drag.l+e.clientX-drag.x,EDGE,Math.max(EDGE,innerWidth-drag.w-EDGE));const nt=clamp(drag.t+e.clientY-drag.y,EDGE,Math.max(EDGE,innerHeight-MIN_H-EDGE));el.style.left=nl+'px';el.style.top=nt+'px';el.style.right='auto';el.style.bottom='auto'});
    const endDrag=e=>{if(!drag||drag.id!==e.pointerId)return;try{grip.releasePointerCapture(e.pointerId)}catch(_){}drag=null;el.classList.remove('dragging');save()};grip.addEventListener('pointerup',endDrag);grip.addEventListener('pointercancel',endDrag);
    grip.addEventListener('dblclick',()=>toggleMax(el));

    ctr.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;bringFront(el);if(b.dataset.act==='min'){if(el.classList.contains('is-maximized'))toggleMax(el);el.classList.toggle('is-minimized');save()}else if(b.dataset.act==='max')toggleMax(el)});

    el.querySelectorAll('.winResize').forEach(handle=>{
      let rs=null;
      handle.addEventListener('pointerdown',e=>{if(innerWidth<ACTIVE_MIN||el.classList.contains('is-maximized'))return;bringFront(el);const r=el.getBoundingClientRect();rs={id:e.pointerId,dir:handle.dataset.dir,x:e.clientX,y:e.clientY,l:r.left,t:r.top,w:r.width,h:r.height};handle.setPointerCapture(e.pointerId);el.classList.remove('is-minimized');el.classList.add('resizing');e.preventDefault();e.stopPropagation()});
      handle.addEventListener('pointermove',e=>{if(!rs||rs.id!==e.pointerId)return;let l=rs.l,t=rs.t,w=rs.w,h=rs.h,dx=e.clientX-rs.x,dy=e.clientY-rs.y;const d=rs.dir;if(d.includes('e'))w=rs.w+dx;if(d.includes('s'))h=rs.h+dy;if(d.includes('w')){w=rs.w-dx;l=rs.l+dx}if(d.includes('n')){h=rs.h-dy;t=rs.t+dy}if(w<MIN_W){if(d.includes('w'))l-=MIN_W-w;w=MIN_W}if(h<MIN_H){if(d.includes('n'))t-=MIN_H-h;h=MIN_H}if(l<EDGE){if(d.includes('w'))w+=l-EDGE;l=EDGE}if(t<EDGE){if(d.includes('n'))h+=t-EDGE;t=EDGE}if(l+w>innerWidth-EDGE)w=innerWidth-EDGE-l;if(t+h>innerHeight-EDGE)h=innerHeight-EDGE-t;el.style.left=l+'px';el.style.top=t+'px';el.style.width=w+'px';el.style.height=h+'px';el.style.right='auto';el.style.bottom='auto'});
      const end=e=>{if(!rs||rs.id!==e.pointerId)return;try{handle.releasePointerCapture(e.pointerId)}catch(_){}rs=null;el.classList.remove('resizing');save()};handle.addEventListener('pointerup',end);handle.addEventListener('pointercancel',end)
    });
    el.addEventListener('pointerdown',()=>bringFront(el));
  }
  function toggleMax(el){
    if(el.classList.contains('is-maximized')){const prev=el.dataset.restoreRect;el.classList.remove('is-maximized');if(prev){try{const r=JSON.parse(prev);el.style.left=r.left+'px';el.style.top=r.top+'px';el.style.width=r.width+'px';el.style.height=r.height+'px'}catch(e){}}}
    else{const r=snapshot(el);el.dataset.restoreRect=JSON.stringify(r);el.classList.remove('is-minimized');el.classList.add('is-maximized')}
    bringFront(el);save();try{map?.resize()}catch(e){}
  }
  function init(){document.body.classList.add('draggableWorkspace');[['.left','left'],['.right','right']].forEach(([sel,name])=>{const el=document.querySelector(sel);if(!el||el.dataset.dragReady)return;el.dataset.dragReady='1';el.dataset.dragWindow=name;addControls(el)});if(!document.querySelector('.layoutResetBtn')){const b=document.createElement('button');b.className='layoutResetBtn';b.textContent='↺ Réinitialiser fenêtres';b.onclick=reset;document.body.appendChild(b)}restore();window.addEventListener('resize',()=>{if(innerWidth>=ACTIVE_MIN){document.querySelectorAll('[data-drag-window]:not(.is-maximized)').forEach(clampRect);save()}try{map?.resize()}catch(e){}})}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,250));else setTimeout(init,250);
})();
