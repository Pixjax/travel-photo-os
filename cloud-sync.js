// TRAVEL PHOTO OS — persistent multi-user cloud sync
(function(){
  if(window.__travelPhotoCloudSyncLoaded)return;
  window.__travelPhotoCloudSyncLoaded=true;

  const BUILT=()=>window.TRAVEL_PHOTO_CLOUD_CONFIG||{};
  const PENDING_PREFIX='travel_photo_os_pending_sync_';
  let channel=null;
  let pollTimer=null;
  let pushTimer=null;
  let applyingRemote=false;
  let dirty=false;
  let lastRemoteStamp=0;
  let baseSaveData=null;
  let baseSaveTrips=null;
  let baseOpenTrip=null;
  let baseShowHome=null;

  const clone=v=>{try{return JSON.parse(JSON.stringify(v))}catch(e){return v}};
  const cfg=()=>({url:(BUILT().url||'').trim(),anon:(BUILT().anon||'').trim()});
  const pendingKey=id=>PENDING_PREFIX+String(id||'');
  const isOnline=()=>navigator.onLine!==false;

  function emitSync(state,message){
    try{window.dispatchEvent(new CustomEvent('travel-photo-sync-status',{detail:{state,message,online:isOnline(),dirty}}))}catch(e){}
  }
  function setNotice(state,message){
    const st=document.getElementById('simpleCloudNotice');
    if(st){st.textContent=message;st.className='simpleCloudNotice '+(state==='ok'?'ok':state==='warn'?'warn':'')}
    emitSync(state,message);
  }
  function hasPending(id){
    if(!id)return false;
    try{return localStorage.getItem(pendingKey(id))==='1'}catch(e){return false}
  }
  function markPending(id){
    if(!id)return;
    try{localStorage.setItem(pendingKey(id),'1')}catch(e){}
  }
  function clearPending(id){
    if(!id)return;
    try{localStorage.removeItem(pendingKey(id))}catch(e){}
  }

  async function ensureClient(){
    if(!isOnline())throw new Error('Hors ligne');
    const c=cfg();
    if(!c.url||!c.anon)throw new Error('Configuration Cloud absente');
    if(!window.supabase?.createClient)throw new Error('Supabase indisponible');
    if(!sbClient){
      sbClient=window.supabase.createClient(c.url,c.anon,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
    }
    let {data:{session}}=await sbClient.auth.getSession();
    if(!session){
      const {data,error}=await sbClient.auth.signInAnonymously();
      if(error)throw error;
      session=data.session;
    }
    sbSessionUser=session?.user||null;
    if(!sbSessionUser)throw new Error('Session Cloud introuvable');
    return sbClient;
  }

  function currentCloudTripId(){return activeTrip?.cloudTripId||null}

  function cleanStore(){
    const out=clone(store)||{};
    if(out.collab){delete out.collab.members;delete out.collab.cloud}
    if(out.geo)delete out.geo.sharedMembers;
    return out;
  }

  function buildPayload(){
    return {
      version:4,
      sync:{by:sbSessionUser?.id||null,at:new Date().toISOString()},
      trip:{
        name:activeTrip?.name||'Voyage partagé',country:activeTrip?.country||'',
        start:activeTrip?.start||'',end:activeTrip?.end||'',currency:activeTrip?.currency||'EUR',
        emoji:activeTrip?.emoji||'👥',description:activeTrip?.description||''
      },
      store:cleanStore()
    };
  }

  async function pushNow(){
    clearTimeout(pushTimer);pushTimer=null;
    const tripId=currentCloudTripId();
    if(applyingRemote||!dirty||!tripId||!store)return;
    if(!isOnline()){
      markPending(tripId);
      setNotice('warn','Hors ligne · modifications enregistrées sur cet appareil');
      return;
    }
    try{
      setNotice('','Synchronisation…');
      await ensureClient();
      const payload=buildPayload();
      const {error}=await sbClient.from('trips').update({
        payload,updated_at:payload.sync.at,
        name:activeTrip.name||'Voyage partagé',country:activeTrip.country||''
      }).eq('id',tripId);
      if(error)throw error;
      dirty=false;
      clearPending(tripId);
      lastRemoteStamp=Math.max(lastRemoteStamp,new Date(payload.sync.at).getTime());
      setNotice('ok','Synchronisé en ligne');
    }catch(e){
      dirty=true;
      markPending(tripId);
      console.warn('Cloud push failed',e);
      setNotice('warn',isOnline()?'Synchronisation en attente · '+(e.message||e):'Hors ligne · modifications enregistrées sur cet appareil');
    }
  }

  function schedulePush(){
    const tripId=currentCloudTripId();
    if(applyingRemote||!tripId)return;
    dirty=true;
    markPending(tripId);
    clearTimeout(pushTimer);
    if(!isOnline()){
      setNotice('warn','Hors ligne · modifications enregistrées sur cet appareil');
      return;
    }
    pushTimer=setTimeout(pushNow,350);
  }

  async function fetchMembers(){
    if(!currentCloudTripId()||!store||!isOnline())return;
    try{
      await ensureClient();
      const {data,error}=await sbClient.from('trip_members').select('user_id,display_name,role,joined_at').eq('trip_id',currentCloudTripId());
      if(error)throw error;
      const rows=(data||[]).map(r=>({id:r.user_id,name:r.display_name||'Voyageur',role:r.role==='owner'?'Propriétaire':'Membre',online:true,joinedAt:r.joined_at}));
      rows.sort((a,b)=>(a.id===sbSessionUser?.id?-1:b.id===sbSessionUser?.id?1:0));
      if(!store.collab)store.collab={};
      store.collab.members=rows.length?rows:store.collab.members||[];
      applyingRemote=true;
      try{baseSaveData?.()}finally{applyingRemote=false}
      try{renderMembers?.();renderSharedSelectors?.();renderSharedExpenses?.();renderVotes?.()}catch(e){}
    }catch(e){console.warn('Member sync failed',e)}
  }

  function mergeRemote(remoteStore){
    if(!remoteStore||!store)return;
    const keepMembers=clone(store.collab?.members||[]);
    const keepCloud=clone(store.collab?.cloud||{});
    const keepShared=clone(store.geo?.sharedMembers||{});
    const next=Object.assign(defaults(),clone(remoteStore));
    if(!next.collab)next.collab={};
    next.collab.members=keepMembers;
    next.collab.cloud=keepCloud;
    if(!next.geo)next.geo={};
    next.geo.sharedMembers=keepShared;
    store=next;
  }

  function rerenderAll(){
    try{refreshStats?.()}catch(e){}
    try{render?.()}catch(e){}
    try{renderList?.()}catch(e){}
    try{renderExpenses?.()}catch(e){}
    try{renderChecklist?.()}catch(e){}
    try{renderCollabAll?.()}catch(e){}
    try{renderUltimate?.()}catch(e){}
    try{updateGeoJSON?.()}catch(e){}
    try{updateLiveLocationSource?.()}catch(e){}
    try{window.dispatchEvent(new CustomEvent('travel-photo-remote-applied'))}catch(e){}
  }

  async function applyRemoteRow(row){
    if(!row?.payload?.store||!store)return;
    const stamp=new Date(row.updated_at||row.payload?.sync?.at||0).getTime()||0;
    if(row.payload?.sync?.by===sbSessionUser?.id)return;
    if(stamp&&stamp<=lastRemoteStamp)return;
    if(dirty||hasPending(currentCloudTripId()))return;
    lastRemoteStamp=stamp;
    applyingRemote=true;
    try{
      mergeRemote(row.payload.store);
      if(row.payload.trip){
        const m=row.payload.trip;
        Object.assign(activeTrip,{name:m.name||activeTrip.name,country:m.country??activeTrip.country,start:m.start??activeTrip.start,end:m.end??activeTrip.end,currency:m.currency||activeTrip.currency,emoji:m.emoji||activeTrip.emoji,description:m.description??activeTrip.description});
      }
      baseSaveData?.();
      baseSaveTrips?.();
      rerenderAll();
    }finally{applyingRemote=false}
  }

  async function fetchRemote(){
    if(!currentCloudTripId()||dirty||hasPending(currentCloudTripId())||!isOnline())return;
    try{
      await ensureClient();
      const {data,error}=await sbClient.from('trips').select('id,payload,updated_at').eq('id',currentCloudTripId()).single();
      if(error)throw error;
      await applyRemoteRow(data);
    }catch(e){console.warn('Cloud pull failed',e)}
  }

  async function stop(){
    clearInterval(pollTimer);pollTimer=null;
    clearTimeout(pushTimer);pushTimer=null;
    if(channel&&sbClient){try{await sbClient.removeChannel(channel)}catch(e){}}
    channel=null;
  }

  async function subscribe(){
    await stop();
    const tripId=currentCloudTripId();
    if(!tripId||!store)return;
    dirty=hasPending(tripId);
    if(!isOnline()){
      if(dirty)setNotice('warn','Hors ligne · modifications en attente');
      else emitSync('offline','Mode hors ligne');
      return;
    }
    try{
      await ensureClient();
      if(dirty)await pushNow();
      await fetchMembers();
      await fetchRemote();
      channel=sbClient.channel('trip-sync-'+tripId)
        .on('postgres_changes',{event:'UPDATE',schema:'public',table:'trips',filter:'id=eq.'+tripId},p=>applyRemoteRow(p.new))
        .on('postgres_changes',{event:'*',schema:'public',table:'trip_members',filter:'trip_id=eq.'+tripId},()=>fetchMembers())
        .subscribe();
      pollTimer=setInterval(()=>{if(isOnline()){fetchRemote();fetchMembers();if(dirty)pushNow()}},5000);
      try{ensureCloudSubscription?.()}catch(e){}
      if(!dirty)setNotice('ok','Synchronisé en ligne');
    }catch(e){console.warn('Cloud subscribe failed',e);setNotice('warn','Cloud indisponible · données locales conservées')}
  }

  function installIdentityOverrides(){
    try{currentMemberId=function(){return sbSessionUser?.id||store?.collab?.members?.[0]?.id||'owner'}}catch(e){}
    try{
      renderMembers=function(){
        const w=document.getElementById('memberList');if(!w||!store)return;w.innerHTML='';
        (store.collab?.members||[]).forEach(m=>{
          const mine=m.id===sbSessionUser?.id;
          const e=document.createElement('div');e.className='member';
          e.innerHTML=`<div class="avatar">${escapeHtml((m.name||'?').slice(0,2).toUpperCase())}</div><div><b><span class="presenceDot"></span>${escapeHtml(m.name)}${mine?' · Vous':''}</b><small>${m.role==='Propriétaire'?'Créateur du voyage':'Membre du voyage'}</small></div><div><span class="role">${escapeHtml(m.role||'Membre')}</span></div>`;
          w.appendChild(e);
        });
        try{renderSharedSelectors?.()}catch(e){}
      };
    }catch(e){}
  }

  function install(){
    baseSaveData=saveData;
    baseSaveTrips=saveTrips;
    baseOpenTrip=openTrip;
    baseShowHome=showHome;

    saveData=function(){const r=baseSaveData.apply(this,arguments);schedulePush();return r};
    saveTrips=function(){const r=baseSaveTrips.apply(this,arguments);if(activeTrip?.cloudTripId)schedulePush();return r};
    openTrip=function(){const r=baseOpenTrip.apply(this,arguments);setTimeout(subscribe,300);return r};
    showHome=function(){stop();dirty=false;return baseShowHome.apply(this,arguments)};

    installIdentityOverrides();

    const oldCreate=window.simpleCreateCloud;
    if(typeof oldCreate==='function')window.simpleCreateCloud=async function(){const r=await oldCreate.apply(this,arguments);setTimeout(subscribe,300);return r};

    window.addEventListener('online',()=>{
      emitSync('online','Connexion retrouvée');
      if(activeTrip?.cloudTripId&&store){dirty=dirty||hasPending(currentCloudTripId());setTimeout(subscribe,150)}
    });
    window.addEventListener('offline',()=>{
      clearTimeout(pushTimer);pushTimer=null;
      if(activeTrip?.cloudTripId&&dirty)markPending(currentCloudTripId());
      setNotice('warn',dirty?'Hors ligne · modifications enregistrées sur cet appareil':'Mode hors ligne · données locales disponibles');
    });

    window.travelPhotoForceSync=()=>{dirty=dirty||hasPending(currentCloudTripId());return pushNow()};
    window.travelPhotoHasPendingSync=()=>dirty||hasPending(currentCloudTripId());

    if(activeTrip?.cloudTripId&&store)setTimeout(subscribe,500);
    else emitSync(isOnline()?'local':'offline',isOnline()?'Données locales':'Mode hors ligne');
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,250));else setTimeout(install,250);
})();
