// HOME CLOUD JOIN FIX — allows joining before any local trip/store exists
(function(){
  function cfg(){
    const c=window.TRAVEL_PHOTO_CLOUD_CONFIG||{};
    return {url:(c.url||'').trim(),anon:(c.anon||'').trim()};
  }

  async function connectFromHome(){
    const c=cfg();
    if(!c.url||!c.anon)throw new Error('Configuration Cloud absente');
    if(!window.supabase?.createClient)throw new Error('Bibliothèque Supabase indisponible');

    sbClient=window.supabase.createClient(c.url,c.anon,{
      auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}
    });

    let sessionResult=await sbClient.auth.getSession();
    let session=sessionResult?.data?.session||null;
    if(!session){
      const signIn=await sbClient.auth.signInAnonymously();
      if(signIn.error)throw signIn.error;
      session=signIn.data?.session||null;
    }
    sbSessionUser=session?.user||null;
    if(!sbSessionUser)throw new Error('Session utilisateur introuvable');
    return true;
  }

  async function joinFromHome(){
    const code=(document.getElementById('homeJoinCode')?.value||'').trim().toUpperCase();
    if(!code){try{toast('Entre le code reçu')}catch(e){}return}

    try{
      await connectFromHome();
      const displayName=(prompt('Ton prénom / pseudo ?')||'Voyageur').trim()||'Voyageur';
      const {data,error}=await sbClient.rpc('join_trip_by_code',{
        p_invite_code:code,
        p_display_name:displayName
      });
      if(error)throw error;

      const row=Array.isArray(data)?data[0]:data;
      if(!row?.trip_id)throw new Error('Voyage introuvable');

      const payload=row.payload||null;
      const meta=payload?.trip||{};
      let local=trips.find(t=>t.cloudTripId===row.trip_id);

      if(!local){
        const id=uid('trip');
        local={
          id,
          name:meta.name||row.trip_name||'Voyage partagé',
          country:meta.country||row.country||'',
          start:meta.start||'',
          end:meta.end||'',
          currency:meta.currency||'EUR',
          emoji:meta.emoji||'👥',
          description:meta.description||'Voyage collaboratif',
          builtIn:false,
          cloudTripId:row.trip_id,
          inviteCode:row.invite_code||code
        };
        trips.push(local);
      }else{
        local.inviteCode=row.invite_code||code;
      }

      if(payload?.store){
        localStorage.setItem(DATA_PREFIX+local.id,JSON.stringify(payload.store));
      }else if(!localStorage.getItem(DATA_PREFIX+local.id)){
        localStorage.setItem(DATA_PREFIX+local.id,JSON.stringify(defaults()));
      }

      saveTrips();
      openTrip(local.id);
      try{setupCollabChannel()}catch(e){}
      try{toast('Voyage rejoint')}catch(e){}
    }catch(e){
      console.warn('Home cloud join failed',e);
      const msg=e?.message||e?.details||String(e);
      try{toast('Erreur : '+msg)}catch(_){}
    }
  }

  function install(){window.simpleJoinFromHome=joinFromHome}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
