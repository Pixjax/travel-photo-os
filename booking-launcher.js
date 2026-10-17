// Travel Photo OS — contextual booking launcher
(function(){
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
  function inject(){
    const scroll=document.getElementById('uxVoyageScroll');if(!scroll||document.getElementById('uxBookingLauncher'))return;
    const sections=[...scroll.querySelectorAll('.uxVoyageSection')];
    const reservations=sections.find(s=>s.querySelector('h3')?.textContent.trim()==='Réservations');
    if(!reservations)return;
    const box=document.createElement('section');box.id='uxBookingLauncher';box.className='uxBookingLauncher';
    box.innerHTML=`<div class="uxBookingHead"><h3>Réserver maintenant</h3><span>Ouverture chez le prestataire<br>paiement hors de l’app</span></div><div class="uxBookingForm"><input id="uxBookingWhere" value="${esc(defaultWhere())}" placeholder="Ville, hôtel, activité ou destination"><div class="uxBookingGrid"><select id="uxBookingType"><option>Hôtel</option><option>Transport</option><option>Activité</option><option>Restaurant</option><option>Autre</option></select><input id="uxBookingDate" type="date"></div></div><div class="uxBookingProviders" id="uxBookingProviders"></div><span class="uxBookingHint">Travel Photo OS ouvre le site choisi avec ta recherche. La réservation et le paiement restent directement chez le prestataire.</span>`;
    reservations.parentNode.insertBefore(box,reservations);
    box.addEventListener('input',()=>renderProviders(box));
    box.addEventListener('change',()=>renderProviders(box));
    box.addEventListener('click',e=>{const b=e.target.closest('[data-book-url]');if(!b)return;const url=b.dataset.bookUrl;if(!url)return;try{window.open(url,'_blank','noopener,noreferrer')}catch(_){location.href=url}});
    renderProviders(box);
  }
  function install(){
    inject();
    const obs=new MutationObserver(()=>{if(!document.getElementById('uxBookingLauncher'))inject()});
    obs.observe(document.body,{childList:true,subtree:true});
    document.addEventListener('click',e=>{if(e.target.closest('#uxNav button[data-ux="trip"],#uxVoyageFab'))setTimeout(inject,120)},true);
    window.addEventListener('travel-photo-voyage-render',inject);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,800));else setTimeout(install,800);
})();