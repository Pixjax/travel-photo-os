// Travel Photo OS — iPhone navigation self-heal
(function(){
  if(window.__travelPhotoIphoneNavFixLoaded)return;
  window.__travelPhotoIphoneNavFixLoaded=true;

  const mobile=()=>window.matchMedia('(max-width:760px)').matches;

  function removeFloating(){
    document.getElementById('nav2MobileFab')?.remove();
  }

  function ensureNavButton(){
    if(!mobile())return;
    const nav=document.getElementById('uxNav');
    if(!nav)return;
    nav.style.gridTemplateColumns='repeat(6,minmax(0,1fr))';
    nav.style.left='6px';
    nav.style.right='6px';
    nav.style.gap='2px';

    let btn=nav.querySelector('button[data-ux="nav"]');
    if(!btn){
      btn=document.createElement('button');
      btn.dataset.ux='nav';
      btn.innerHTML='<span class="uxIcon">🧭</span><span class="uxLabel">Navigation</span>';
      const trip=nav.querySelector('button[data-ux="trip"]');
      if(trip)nav.insertBefore(btn,trip);else nav.appendChild(btn);
    }
    btn.style.minWidth='0';
    const label=btn.querySelector('.uxLabel');
    if(label){label.style.fontSize='7px';label.style.whiteSpace='nowrap';label.style.overflow='hidden';label.style.textOverflow='ellipsis'}
  }

  function heal(){
    removeFloating();
    ensureNavButton();
  }

  document.addEventListener('click',e=>{
    const b=e.target.closest('#uxNav button[data-ux="nav"]');
    if(!b)return;
    e.preventDefault();
    e.stopImmediatePropagation();
    document.querySelectorAll('#uxNav button').forEach(x=>x.classList.toggle('on',x===b));
    try{
      if(typeof window.openNavigationV2==='function')window.openNavigationV2();
      else if(typeof window.openNavigationMode==='function')window.openNavigationMode();
    }catch(err){console.warn('Navigation mobile',err)}
  },true);

  const obs=new MutationObserver(heal);
  if(document.body)obs.observe(document.body,{childList:true,subtree:true});
  else document.addEventListener('DOMContentLoaded',()=>obs.observe(document.body,{childList:true,subtree:true}),{once:true});

  setInterval(heal,800);
  window.addEventListener('resize',heal);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(heal,250));
  else setTimeout(heal,250);
})();
