// SIMPLE COLLABORATION UX + CLOUD ACCESS GATE
(function(){
  const BUILT=()=>window.TRAVEL_PHOTO_CLOUD_CONFIG||{};
  const valid=v=>typeof v==='string'&&v.trim().length>8;
  const builtReady=()=>valid(BUILT().url)&&valid(BUILT().anon);

  function notice(msg,type){
    const el=document.getElementById('simpleCloudNotice');
    if(!el)return;
    el.textContent=msg;
    el.className='simpleCloudNotice'+(type?' '+type:'');
  }
  function ownerDetails(open){const d=document.getElementById('simpleOwnerSetup');if(d)d.open=!!open}

  function applyBuiltInConfig(){
    if(!builtReady())return false;
    const u=document.getElementById('sbUrl'),a=document.getElementById('sbAnon');
    if(u)u.value=BUILT().url.trim();
    if(a)a.value=BUILT().anon.trim();
    try{if(typeof saveCloudConfig==='function')saveCloudConfig()}catch(e){}
    const d=document.getElementById('simpleOwnerSetup');if(d)d.style.display='none';
    notice('Prêt. Le partage en ligne est configuré.','ok');
    return true;
  }

  function currentConfigReady(){
    try{const c=typeof cloudConfig==='function'?cloudConfig():null;return !!(c&&valid(c.url)&&valid(c.anon))}catch(e){return false}
  }
  function ensureConfig(){
    if(builtReady()){applyBuiltInConfig();return true}
    if(currentConfigReady()){notice('Prêt. Le partage en ligne est configuré.','ok');return true}
    ownerDetails(true);
    notice('Configuration propriétaire requise une seule fois pour activer le partage entre plusieurs téléphones.','warn');
    try{toast('Configuration propriétaire à faire une seule fois')}catch(e){}
    return false;
  }

  function deepClone(v){try{return JSON.parse(JSON.stringify(v))}catch(e){return v}}

  async function syncActiveTripPayload(){
    try{
      if(!activeTrip?.cloudTripId||!sbClient||!store)return false;
      const cloudStore=deepClone(store)||{};
      if(activeTrip.id==='japan-2026'&&typeof BUILTIN_JAPAN_SPOTS!=='undefined'){
        const built=(BUILTIN_JAPAN_SPOTS||[]).map(p=>{const x=deepClone(p);delete x._builtin;return x});
        cloudStore.customSpots=[...built,...(cloudStore.customSpots||[])];
      }
      const payload={
        version:2,
        trip:{
          name:activeTrip.name||'Voyage partagé',
          country:activeTrip.country||'',
          start:activeTrip.start||'',
          end:activeTrip.end||'',
          currency:activeTrip.currency||'EUR',
          emoji:activeTrip.emoji||'👥',
          description:activeTrip.description||''
        },
        store:cloudStore
      };
      const {error}=await sbClient.from('trips').update({payload,updated_at:new Date().toISOString()}).eq('id',activeTrip.cloudTripId);
      if(error)throw error;
      return true;
    }catch(e){
      console.warn('Cloud payload sync failed',e);
      return false;
    }
  }
  window.syncActiveTripPayload=syncActiveTripPayload;

  window.simpleCreateCloud=async function(){
    if(!ensureConfig())return;
    notice('Connexion…');
    try{
      const ok=typeof connectCloud==='function'?await connectCloud():false;
      if(!ok){notice('Connexion impossible. Vérifie la configuration propriétaire.','warn');return}
      notice('Synchronisation du voyage…');
      await publishTripToCloud();
      await syncActiveTripPayload();
      notice('Voyage partagé. Seules les personnes avec le code peuvent le rejoindre.','ok');
    }catch(e){notice('Erreur : '+(e.message||e),'warn')}
  };

  async function joinCloudTrip(code){
    const displayName=(store?.collab?.members?.[0]?.name||prompt('Ton prénom / pseudo ?')||'Voyageur').trim();
    const {data,error}=await sbClient.rpc('join_trip_by_code',{p_invite_code:code.toUpperCase(),p_display_name:displayName});
    if(error)throw error;
    const row=Array.isArray(data)?data[0]:data;
    if(!row?.trip_id)throw new Error('Voyage introuvable');

    const remote={
      id:row.trip_id,
      invite_code:row.invite_code||code.toUpperCase(),
      name:row.trip_name||'Voyage partagé',
      country:row.country||'',
      payload:row.payload||null
    };

    let local=trips.find(t=>t.cloudTripId===row.trip_id);
    if(!local){
      const id=uid('trip');
      const meta=remote?.payload?.trip||{};
      local={
        id,
        name:meta.name||remote.name||'Voyage partagé',
        country:meta.country||remote.country||'',
        start:meta.start||'',end:meta.end||'',currency:meta.currency||'EUR',
        emoji:meta.emoji||'👥',description:meta.description||'Voyage collaboratif',
        builtIn:false,cloudTripId:row.trip_id,inviteCode:remote.invite_code
      };
      trips.push(local);
    }else{
      local.inviteCode=remote.invite_code;
    }

    if(remote?.payload?.store){
      localStorage.setItem(DATA_PREFIX+local.id,JSON.stringify(remote.payload.store));
    }else if(!localStorage.getItem(DATA_PREFIX+local.id)){
      localStorage.setItem(DATA_PREFIX+local.id,JSON.stringify(defaults()));
    }
    saveTrips();
    openTrip(local.id);
    try{setupCollabChannel()}catch(e){}
    return local;
  }

  window.simpleJoinCloud=async function(){
    const code=(document.getElementById('joinCode')?.value||'').trim();
    if(!code){try{toast('Entre le code du voyage')}catch(e){}return}
    if(!ensureConfig())return;
    notice('Connexion au voyage…');
    try{
      const ok=typeof connectCloud==='function'?await connectCloud():false;
      if(!ok){notice('Connexion impossible.','warn');return}
      await joinCloudTrip(code);
      notice('Voyage rejoint. La synchronisation est active.','ok');
      try{closeOverlay('collabOverlay')}catch(e){}
    }catch(e){notice('Erreur : '+(e.message||e),'warn');try{toast('Impossible de rejoindre : '+(e.message||e))}catch(_){} }
  };

  window.simpleJoinFromHome=async function(){
    const code=(document.getElementById('homeJoinCode')?.value||'').trim();
    if(!code){try{toast('Entre le code reçu')}catch(e){}return}
    if(!ensureConfig()){
      try{toast('Le serveur de partage doit encore être configuré dans l’app')}catch(e){}
      return;
    }
    try{
      const ok=typeof connectCloud==='function'?await connectCloud():false;
      if(!ok)throw new Error('Connexion Cloud impossible');
      await joinCloudTrip(code);
      try{toast('Voyage rejoint')}catch(e){}
    }catch(e){
      console.warn('Join from home failed',e);
      try{toast('Erreur : '+(e?.message||String(e)))}catch(_){}
    }
  };

  function addHomeJoinCard(){
    const g=document.getElementById('tripGrid');
    if(!g||document.getElementById('cloudJoinHomeCard'))return;
    const card=document.createElement('div');
    card.className='addTrip';
    card.id='cloudJoinHomeCard';
    card.innerHTML=`<div class="addInner" style="width:min(310px,90%);padding:22px">
      <div class="plus">👥</div>
      <b>Rejoindre un voyage</b>
      <span>Entre le code envoyé par l'organisateur</span>
      <input id="homeJoinCode" autocomplete="off" autocapitalize="characters" placeholder="JAP-XXXXX" style="width:100%;margin-top:14px;padding:11px 12px;border-radius:12px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.07);color:#fff;text-transform:uppercase;outline:none">
      <button class="btn primary" style="width:100%;margin-top:8px" onclick="simpleJoinFromHome()">Rejoindre avec le code</button>
    </div>`;
    g.prepend(card);
  }

  function gateBuiltInJapan(){
    try{
      if(typeof trips==='undefined'||!Array.isArray(trips))return;
      const japan=trips.find(t=>t.id==='japan-2026');
      const hasLocalCloudAccess=!!japan?.cloudTripId;
      if(hasLocalCloudAccess)return;
      trips=trips.filter(t=>t.id!=='japan-2026');
      if(activeTripId==='japan-2026'){
        activeTripId=null;activeTrip=null;store=null;
        try{showHome()}catch(e){const h=document.getElementById('home');if(h)h.classList.remove('hide')}
      }
      try{renderHome()}catch(e){}
      addHomeJoinCard();
    }catch(e){console.warn('Access gate',e)}
  }

  function wrapHomeRenderer(){
    try{
      if(typeof renderHome!=='function'||renderHome.__cloudGateWrapped)return;
      const old=renderHome;
      const wrapped=function(){const r=old.apply(this,arguments);setTimeout(addHomeJoinCard,0);return r};
      wrapped.__cloudGateWrapped=true;
      renderHome=wrapped;
      window.renderHome=wrapped;
    }catch(e){}
  }

  function simplify(){
    const overlay=document.getElementById('collabOverlay');
    if(!overlay||overlay.dataset.simpleCollab==='1')return;
    const cards=[...overlay.querySelectorAll('.collabCard')];
    const cloudCard=cards.find(c=>c.querySelector('h3')?.textContent.trim()==='Cloud temps réel');
    const publishCard=cards.find(c=>c.querySelector('h3')?.textContent.trim()==='Voyage Cloud');
    const joinCard=cards.find(c=>c.querySelector('h3')?.textContent.includes('Rejoindre avec un code'));

    if(cloudCard){
      cloudCard.innerHTML=`
        <h3>Partage en ligne</h3>
        <p>La connexion est automatique. Les voyageurs n'ont aucune configuration technique à faire.</p>
        <div class="liveCloudBadge" id="liveCloudBadge"><i></i><span>Prêt à se connecter</span></div>
        <div class="simpleCloudNotice" id="simpleCloudNotice">Crée un partage ou rejoins un voyage avec son code.</div>
        <details class="simpleOwnerSetup" id="simpleOwnerSetup">
          <summary>⚙ Configuration propriétaire · une seule fois</summary>
          <div class="simpleOwnerGrid">
            <input id="sbUrl" placeholder="URL du serveur Supabase">
            <input id="sbAnon" placeholder="Clé publique">
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px">
            <button class="btn" onclick="saveCloudConfig();document.getElementById('simpleOwnerSetup').open=false;document.getElementById('simpleCloudNotice').textContent='Configuration enregistrée.'">Enregistrer</button>
            <button class="btn primary" onclick="connectCloud()">Tester</button>
          </div>
        </details>`;
    }
    if(publishCard){
      publishCard.innerHTML=`
        <h3>Créer un voyage collaboratif</h3>
        <p>Appuie une fois, puis partage le code affiché. C'est tout.</p>
        <div class="inviteCode" id="cloudInviteCode">—</div>
        <div class="simpleCloudIntro">
          <div class="simpleCloudAction"><h4>Créer / synchroniser</h4><p>Envoie le contenu actuel du voyage dans le Cloud.</p><button class="btn primary" onclick="simpleCreateCloud()">Créer / synchroniser</button></div>
          <div class="simpleCloudAction"><h4>Partager le code</h4><p>Seules les personnes avec ce code rejoignent le voyage.</p><button class="btn" onclick="copyCloudInvite()">Copier le code</button></div>
        </div>
        <div class="cloudStatusBox" id="cloudTripStatus">Voyage non partagé.</div>`;
    }
    if(joinCard){
      const p=joinCard.querySelector('p');if(p)p.textContent='Entre simplement le code reçu. Aucune autre configuration n’est nécessaire.';
      const b=joinCard.querySelector('button');if(b){b.textContent='Rejoindre le voyage';b.setAttribute('onclick','simpleJoinCloud()')}
      const h=joinCard.querySelector('h3');if(h)h.textContent='Rejoindre un voyage';
    }
    overlay.dataset.simpleCollab='1';
    setTimeout(()=>{
      try{if(typeof renderCloud==='function')renderCloud()}catch(e){}
      if(builtReady())applyBuiltInConfig();
      else if(currentConfigReady())notice('Prêt. Le partage en ligne est configuré.','ok');
    },50);
  }

  function init(){
    wrapHomeRenderer();
    gateBuiltInJapan();
    simplify();
    addHomeJoinCard();
    const old=window.openCollab;
    if(typeof old==='function'&&!old.__simpleWrapped){
      const wrapped=function(){const r=old.apply(this,arguments);setTimeout(simplify,0);setTimeout(()=>{if(builtReady())applyBuiltInConfig()},80);return r};
      wrapped.__simpleWrapped=true;window.openCollab=wrapped;
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,180));else setTimeout(init,180);
})();
