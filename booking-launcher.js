// Travel Photo OS — contextual booking launcher
(function(){
  if(window.__travelPhotoBookingLauncherLoaded)return;
  window.__travelPhotoBookingLauncherLoaded=true;

  const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  function defaultWhere(){
    try{
      const d=typeof tripTodayDate==='function'?tripTodayDate():null;
      const p=d&&d!=='Tous'&&typeof activeSpots==='function'?activeSpots().find(x=>x.date===d):null;
      return p?.city||activeTrip?.startCity||activeTrip?.country||'';
    }catch(e){return activeTrip?.startCity||activeTrip?.country||''}
  }
  function nextDate(v){if(!/^\d{4}-\d{2}-\d{2}$/.test(v||''))return'';const d=new Date(v+'T12:00:00');d.setDate(d.getDate()+1);return d.toISOString().slice(0,10)}
  function q(v){return encodeURIComponent(String(v||'').trim())}
  function providers(type,where,date){
    const place=String(where||activeTrip?.country||'').trim();
    const full=[place,activeTrip?.country].filter(Boolean).filter((v,i,a)=>a.indexOf(v)===i).join(' ');
    if(type==='Hôtel')return [
      ['Booking',`https://www.booking.com/searchresults.html?ss=${q(full)}${date?`&checkin=${q(date)}&checkout=${q(nextDate(date))}`:''}`,1],
      ['Agoda',`https://www.agoda.com/search?textToSearch=${q(full)}`,0],
      ['Google Hotels',`https://www.google.com/travel/hotels?q=${q(full+' hotels')}`,0]
    ];
    if(type==='Activité')return [
      ['Klook',`https://www.klook.com/en-AU/search/result/?query=${q(full)}`,1],
      ['GetYourGuide',`https://www.getyourguide.com/s/?q=${q(full)}`,0],
      ['Google',`https://www.google.com/search?q=${q(full+' activities tickets')}`,0]
    ];
    if(type==='Transport'){
      const out=[
        ['Google Maps',`https://www.google.com/maps/dir/?api=1&destination=${q(place)}&travelmode=transit`,1],
        ['Klook Transport',`https://www.klook.com/en-AU/search/result/?query=${q(full+' transport')}`,0]
      ];
      if(/japon|japan/i.test(String(activeTrip?.country||''))){
        out.push(['SmartEX','https://smart-ex.jp/en/index.php',0],['JR East','https://www.eki-net.com/en/jreast-train-reservation/Top/Index',0]);
      }else out.push(['Rome2Rio',`https://www.rome2rio.com/map/${q(place).replace(/%20/g,'-')}`,0]);
      return out;
    }
    if(type==='Restaurant')return [
      ['Google Maps',`https://www.google.com/maps/search/?api=1&query=${q(place+' restaurant')}`,1],
      ['TableCheck',`https://www.tablecheck.com/en/shops?keyword=${q(place)}`,0],
      ['Google',`https://www.google.com/search?q=${q(place+' restaurant reservation')}`,0]
    ];
    return [
      ['Google',`https://www.google.com/search?q=${q(full)}`,1],
      ['Google Maps',`https://www.google.com/maps/search/?api=1&query=${q(full)}`,0]
    ];
  }
  function renderProviders(root){
    const type=root.querySelector('#uxBookingType')?.value||'Hôtel';
    const where=root.querySelector('#uxBookingWhere')?.value.trim()||defaultWhere();
    const date=root.querySelector('#uxBookingDate')?.value||'';
    const w=root.querySelector('#uxBookingProviders');if(!w)return;
    w.innerHTML=providers(type,where,date).map(([name,url,primary])=>`<button class="uxBookingProvider ${primary?'primary':''}" data-book-url="${esc(url)}">${esc(name)}</button>`).join('');
  }
  function build(){
    const box=document.createElement('section');
    box.id='uxBookingLauncher';box.className='uxBookingLauncher';
    box.innerHTML=`<div class="uxBookingHead"><h3>Réserver maintenant</h3><span>Ouverture chez le prestataire<br>paiement hors de l’app</span></div><div class="uxBookingForm"><input id="uxBookingWhere" value="${esc(defaultWhere())}" placeholder="Ville, hôtel, activité ou destination"><div class="uxBookingGrid"><select id="uxBookingType"><option>Hôtel</option><option>Transport</option><option>Activité</option><option>Restaurant</option><option>Autre</option></select><input id="uxBookingDate" type="date"></div></div><div class="uxBookingProviders" id="uxBookingProviders"></div><span class="uxBookingHint">Travel Photo OS ouvre le site choisi avec ta recherche. La réservation et le paiement restent directement chez le prestataire.</span>`;
    box.addEventListener('input',()=>renderProviders(box));
    box.addEventListener('change',()=>renderProviders(box));
    box.addEventListener('click',e=>{const b=e.target.closest('[data-book-url]');if(!b)return;const url=b.dataset.bookUrl;if(!url)return;const win=window.open(url,'_blank','noopener,noreferrer');if(!win)location.href=url});
    renderProviders(box);
    return box;
  }
  function inject(force=false){
    const panel=document.getElementById('uxVoyagePanel');
    const scroll=document.getElementById('uxVoyageScroll');
    if(!panel||!scroll)return false;
    if(!panel.classList.contains('show')&&!force)return false;
    const old=document.getElementById('uxBookingLauncher');
    if(old&&scroll.contains(old))return true;
    if(old)old.remove();
    const box=build();
    const hero=scroll.querySelector('.uxVoyageHero');
    const sections=scroll.querySelectorAll('.uxVoyageSection');
    if(sections.length>=3)scroll.insertBefore(box,sections[2]);
    else if(hero)hero.insertAdjacentElement('afterend',box);
    else scroll.prepend(box);
    return true;
  }
  function install(){
    const tryInject=()=>inject(false);
    setTimeout(tryInject,200);
    setInterval(tryInject,500);
    const obs=new MutationObserver(()=>{if(document.getElementById('uxVoyagePanel')?.classList.contains('show'))setTimeout(tryInject,0)});
    obs.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
    document.addEventListener('click',e=>{if(e.target.closest('#uxNav button[data-ux="trip"],#uxVoyageFab'))setTimeout(()=>inject(true),80)},true);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,700));else setTimeout(install,700);
})();