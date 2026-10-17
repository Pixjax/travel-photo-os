// Travel Photo OS — Premium UX controller
(function(){
  let baseOpenTrip,baseShowHome,baseSelectPlace,baseSaveData,baseSetMode,baseCloseDetail;

  const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const homeVisible=()=>{const h=document.querySelector('.home');return !!h&&!h.classList.contains('hide')};
  const mobile=()=>window.matchMedia('(max-width:760px)').matches;

  function hav(a,b,c,d){
    const R=6371,toRad=x=>x*Math.PI/180;
    const dLat=toRad(c-a),dLon=toRad(d-b);
    const q=Math.sin(dLat/2)**2+Math.cos(toRad(a))*Math.cos(toRad(c))*Math.sin(dLon/2)**2;
    return R*2*Math.atan2(Math.sqrt(q),Math.sqrt(1-q));
  }
  function distLabel(p){
    if(typeof myGeo==='undefined'||!myGeo||!Number.isFinite(Number(p?.lat))||!Number.isFinite(Number(p?.lon)))return null;
    const km=hav(Number(myGeo.lat),Number(myGeo.lon),Number(p.lat),Number(p.lon));
    return km<1?Math.round(km*1000)+' m':km.toFixed(km<10?1:0)+' km';
  }
  function dateForSpot(p){
    if(p?.date&&/^\d{4}-\d{2}-\d{2}$/.test(p.date))return new Date(p.date+'T12:00:00');
    try{return typeof parseDateForSun==='function'?parseDateForSun(p?.date):new Date()}catch(e){return new Date()}
  }
  function sunInfo(p){
    try{
      if(!window.SunCalc||!p)return null;
      const t=SunCalc.getTimes(dateForSpot(p),Number(p.lat),Number(p.lon));
      const f=d=>d&&Number.isFinite(d.getTime())?d.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}):'—';
      return {rise:f(t.sunrise),set:f(t.sunset)};
    }catch(e){return null}
  }
  function daySpots(){
    if(typeof activeSpots!=='function'||!activeTrip)return [];
    let day='Tous';try{day=typeof tripTodayDate==='function'?tripTodayDate():'Tous'}catch(e){}
    const arr=activeSpots().filter(p=>day==='Tous'||p.date===day).slice();
    arr.sort((a,b)=>(Number(a.step)||999)-(Number(b.step)||999));
    return arr;
  }
  function nextSpot(){
    const arr=daySpots();if(!arr.length)return null;
    const undone=arr.filter(p=>{try{return typeof isDone==='function'?!isDone(p):true}catch(e){return true}});
    if(typeof myGeo!=='undefined'&&myGeo&&undone.length){
      return undone.slice().sort((a,b)=>(Number(a.step)||999)-(Number(b.step)||999))[0];
    }
    return undone[0]||arr[0];
  }

  function ensureUI(){
    if(!document.getElementById('uxTodayCard')){
      const card=document.createElement('div');card.id='uxTodayCard';card.className='uxTodayCard hidden uxOff';
      card.innerHTML='<div class="uxTodayTop"><span class="uxEyebrow">Aujourd’hui · prochain spot</span><span class="uxNowPill" id="uxDayPill">—</span></div><div class="uxTodayMain"><div class="uxTodayText"><b id="uxNextName">Aucun spot</b><span id="uxNextSub">Ouvre une journée pour commencer</span></div><button class="uxGo" id="uxGo">Y aller</button></div><div class="uxTodayMeta" id="uxTodayMeta"></div>';
      document.body.appendChild(card);
      card.addEventListener('click',e=>{if(e.target.closest('#uxGo'))return;const p=nextSpot();if(p&&typeof selectPlace==='function')selectPlace(p,true)});
      card.querySelector('#uxGo').addEventListener('click',e=>{e.stopPropagation();const p=nextSpot();if(!p)return;if(typeof selectPlace==='function')selectPlace(p,true);setTimeout(()=>{if(typeof openNavigationMode==='function')openNavigationMode()},120)});
    }
    if(!document.getElementById('uxNav')){
      const nav=document.createElement('nav');nav.id='uxNav';nav.className='uxNav uxOff';nav.setAttribute('aria-label','Navigation principale');
      nav.innerHTML=[
        ['map','⌖','Carte'],['day','◷','Journée'],['spots','●','Spots'],['photo','✦','Photo'],['trip','•••','Voyage']
      ].map(([id,ic,tx])=>`<button data-ux="${id}"><span class="uxIcon">${ic}</span><span class="uxLabel">${tx}</span></button>`).join('');
      document.body.appendChild(nav);
      nav.addEventListener('click',e=>{const b=e.target.closest('button[data-ux]');if(!b)return;navAction(b.dataset.ux)});
    }
  }

  function setNavOn(id){document.querySelectorAll('#uxNav button').forEach(b=>b.classList.toggle('on',b.dataset.ux===id))}
  function navAction(id){
    if(id==='map'){
      try{if(typeof closeDetail==='function')closeDetail()}catch(e){}
      try{if(typeof toggleLeft==='function')toggleLeft(false)}catch(e){}
      setNavOn('map');
    }else if(id==='day'){
      try{if(typeof setMode==='function')setMode('today');if(typeof toggleLeft==='function')toggleLeft(true)}catch(e){}
      setNavOn('day');
    }else if(id==='spots'){
      try{if(typeof setMode==='function')setMode('explore');if(typeof toggleLeft==='function')toggleLeft(true)}catch(e){}
      setNavOn('spots');
    }else if(id==='photo'){
      try{if(typeof setMode==='function')setMode('photo');if(typeof toggleLeft==='function')toggleLeft(true)}catch(e){}
      setNavOn('photo');
    }else if(id==='trip'){
      try{if(typeof showHome==='function')showHome()}catch(e){}
      setNavOn('trip');
    }
  }

  function refreshToday(){
    ensureUI();
    const card=document.getElementById('uxTodayCard'),nav=document.getElementById('uxNav');
    const off=!mobile()||!activeTrip||homeVisible();
    card?.classList.toggle('uxOff',off);nav?.classList.toggle('uxOff',off);
    if(off)return;
    const p=nextSpot(),name=document.getElementById('uxNextName'),sub=document.getElementById('uxNextSub'),meta=document.getElementById('uxTodayMeta'),pill=document.getElementById('uxDayPill');
    if(!p){name.textContent='Journée libre';sub.textContent='Aucun spot prévu aujourd’hui';meta.innerHTML='';card.classList.remove('hidden');return}
    name.textContent=p.name||'Prochain spot';
    const d=distLabel(p),s=sunInfo(p);
    sub.textContent=[p.city,p.category].filter(Boolean).join(' · ')||'Spot photo';
    let day;try{day=typeof prettyDay==='function'?prettyDay(p.date):p.date}catch(e){day=p.date}
    pill.textContent=day||'Aujourd’hui';
    const items=[];
    if(d)items.push(`<span class="uxMetric"><strong>${esc(d)}</strong> de toi</span>`);
    if(s?.set&&s.set!=='—')items.push(`<span class="uxMetric">Coucher <strong>${esc(s.set)}</strong></span>`);
    if(p.top)items.push('<span class="uxMetric"><strong>★</strong> spot photo</span>');
    try{if(typeof isFav==='function'&&isFav(p))items.push('<span class="uxMetric"><strong>★</strong> favori</span>')}catch(e){}
    meta.innerHTML=items.join('');
    card.classList.remove('hidden');
  }

  function enrichSpot(){
    if(!mobile()||!selected)return;
    const body=document.querySelector('.detail .detailBody');if(!body)return;
    body.querySelectorAll('.uxSpotQuick,.uxSpotCTA').forEach(x=>x.remove());
    const s=sunInfo(selected);let fav=false,done=false;
    try{fav=typeof isFav==='function'&&isFav(selected);done=typeof isDone==='function'&&isDone(selected)}catch(e){}
    const quick=document.createElement('div');quick.className='uxSpotQuick';
    quick.innerHTML=`<div><small>Lever</small><b>${esc(s?.rise||'—')}</b></div><div><small>Coucher</small><b>${esc(s?.set||'—')}</b></div><div><small>Statut</small><b>${fav?'★ Favori':done?'✓ Fait':selected.top?'✦ Photo':'À voir'}</b></div>`;
    const cta=document.createElement('div');cta.className='uxSpotCTA';
    cta.innerHTML=`<button data-a="go">Y aller</button><button data-a="fav">${fav?'★ Favori':'☆ Favori'}</button><button data-a="done">${done?'✓ Fait':'Marquer fait'}</button>`;
    cta.addEventListener('click',e=>{const a=e.target.closest('button')?.dataset.a;if(!a)return;if(a==='go'){if(typeof openNavigationMode==='function')openNavigationMode()}if(a==='fav'){if(typeof toggleFav==='function')toggleFav()}if(a==='done'){if(typeof toggleDone==='function')toggleDone()}setTimeout(()=>{enrichSpot();refreshToday()},80)});
    body.prepend(cta);body.prepend(quick);
  }

  function install(){
    ensureUI();
    try{baseOpenTrip=openTrip;openTrip=function(){const r=baseOpenTrip.apply(this,arguments);setTimeout(()=>{refreshToday();setNavOn('map')},120);return r}}catch(e){}
    try{baseShowHome=showHome;showHome=function(){const r=baseShowHome.apply(this,arguments);setTimeout(refreshToday,60);return r}}catch(e){}
    try{baseSelectPlace=selectPlace;selectPlace=function(){const r=baseSelectPlace.apply(this,arguments);setTimeout(()=>{enrichSpot();refreshToday()},30);return r}}catch(e){}
    try{baseSaveData=saveData;saveData=function(){const r=baseSaveData.apply(this,arguments);setTimeout(()=>{refreshToday();if(selected)enrichSpot()},60);return r}}catch(e){}
    try{baseSetMode=setMode;setMode=function(m){const r=baseSetMode.apply(this,arguments);if(m==='today')setNavOn('day');else if(m==='photo')setNavOn('photo');else if(m==='explore')setNavOn('spots');return r}}catch(e){}
    try{baseCloseDetail=closeDetail;closeDetail=function(){const r=baseCloseDetail.apply(this,arguments);setNavOn('map');return r}}catch(e){}
    refreshToday();
    setInterval(refreshToday,15000);
    window.addEventListener('resize',refreshToday);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,450));else setTimeout(install,450);
})();
