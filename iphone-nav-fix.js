// Travel Photo OS — iPhone navigation self-heal
(function(){
  if(window.__travelPhotoIphoneNavFixLoaded)return;
  window.__travelPhotoIphoneNavFixLoaded=true;

  const mobile=()=>window.matchMedia('(max-width:760px)').matches;
  let healing=false;

  function ensureGuardStyle(){
    if(document.getElementById('iphoneNavFixStyle'))return;
    const s=document.createElement('style');
    s.id='iphoneNavFixStyle';
    s.textContent=`
      #nav2MobileFab{display:none!important;visibility:hidden!important;pointer-events:none!important}
      @media(max-width:760px){
        #uxNav{grid-template-columns:repeat(6,minmax(0,1fr))!important;left:6px!important;right:6px!important;gap:2px!important}
        #uxNav button{min-width:0!important}
        #uxNav .uxLabel{font-size:7px!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}
      }
    `;
    document.head?.appendChild(s);
  }

  function removeFloating(){
    document.querySelectorAll('#nav2MobileFab,.nav2MobileFab').forEach(el=>el.remove());
  }

  function ensureNavButton(){
    if(!mobile())return;
    const nav=document.getElementById('uxNav');
    if(!nav)return;

    const buttons=[...nav.querySelectorAll('button[data-ux="nav"]')];
    let btn=buttons.shift()||null;
    buttons.forEach(x=>x.remove());

    if(!btn){
      btn=document.createElement('button');
      btn.dataset.ux='nav';
      btn.innerHTML='<span class="uxIcon">🧭</span><span class="uxLabel">Navigation</span>';
    }

    const trip=nav.querySelector('button[data-ux="trip"]');
    if(trip&&btn.nextElementSibling!==trip)nav.insertBefore(btn,trip);
    else if(!btn.isConnected)nav.appendChild(btn);

    nav.style.setProperty('grid-template-columns','repeat(6,minmax(0,1fr))','important');
    nav.style.setProperty('left','6px','important');
    nav.style.setProperty('right','6px','important');
    nav.style.setProperty('gap','2px','important');
    btn.style.minWidth='0';
  }

  function heal(){
    if(healing)return;
    healing=true;
    try{
      ensureGuardStyle();
      removeFloating();
      ensureNavButton();
    }finally{
      healing=false;
    }
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

  function observe(){
    if(!document.body)return;
    const obs=new MutationObserver(mutations=>{
      if(!mobile())return;
      const relevant=mutations.some(m=>[...m.addedNodes,...m.removedNodes].some(n=>
        n.nodeType===1&&(
          n.id==='uxNav'||n.id==='nav2MobileFab'||
          n.querySelector?.('#uxNav,#nav2MobileFab,.nav2MobileFab')
        )
      ));
      if(relevant)requestAnimationFrame(heal);
    });
    obs.observe(document.body,{childList:true,subtree:true});
  }

  window.addEventListener('pageshow',()=>requestAnimationFrame(heal));
  window.addEventListener('resize',()=>requestAnimationFrame(heal));
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)requestAnimationFrame(heal)});

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',()=>{
      heal();
      observe();
      setTimeout(heal,300);
      setTimeout(heal,1200);
    },{once:true});
  }else{
    heal();
    observe();
    setTimeout(heal,300);
    setTimeout(heal,1200);
  }
})();
