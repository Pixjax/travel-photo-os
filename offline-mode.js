// Travel Photo OS — offline status & recovery UI
(function(){
  if(window.__travelPhotoOfflineUiLoaded)return;
  window.__travelPhotoOfflineUiLoaded=true;
  let lastState='';
  let lastMessage='';

  function ensure(){
    if(document.getElementById('offlineStatusPill'))return document.getElementById('offlineStatusPill');
    const b=document.createElement('button');
    b.id='offlineStatusPill';
    b.className='offlineStatusPill';
    b.type='button';
    b.innerHTML='<i></i><span>Connexion</span>';
    b.addEventListener('click',()=>{
      if(navigator.onLine!==false&&typeof window.travelPhotoForceSync==='function'){
        b.classList.add('busy');
        Promise.resolve(window.travelPhotoForceSync()).finally(()=>setTimeout(()=>b.classList.remove('busy'),500));
      }
    });
    document.body.appendChild(b);
    return b;
  }
  function pending(){try{return !!window.travelPhotoHasPendingSync?.()}catch(e){return false}}
  function render(state,message){
    const b=ensure();
    const online=navigator.onLine!==false;
    const hasPending=pending();
    lastState=state||lastState;lastMessage=message||lastMessage;
    b.classList.toggle('offline',!online);
    b.classList.toggle('pending',!!hasPending);
    b.classList.toggle('ok',online&&!hasPending&&(state==='ok'||state==='online'));
    let text;
    if(!online)text=hasPending?'Hors ligne · à synchroniser':'Hors ligne';
    else if(hasPending)text='Sync en attente';
    else if(state==='ok')text='Synchronisé';
    else text='En ligne';
    b.querySelector('span').textContent=text;
    b.title=!online?'Les modifications restent sur cet appareil et seront synchronisées au retour du réseau.':hasPending?'Clique pour tenter la synchronisation maintenant.':'Connexion active.';
  }
  function install(){
    ensure();render(navigator.onLine===false?'offline':'online','');
    window.addEventListener('online',()=>render('online','Connexion retrouvée'));
    window.addEventListener('offline',()=>render('offline','Mode hors ligne'));
    window.addEventListener('travel-photo-sync-status',e=>render(e.detail?.state,e.detail?.message));
    window.addEventListener('travel-photo-remote-applied',()=>render('ok','Synchronisé'));
    setInterval(()=>render(lastState,lastMessage),4000);
    if('serviceWorker' in navigator){
      navigator.serviceWorker.addEventListener('controllerchange',()=>render(navigator.onLine===false?'offline':'online','PWA mise à jour'));
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
