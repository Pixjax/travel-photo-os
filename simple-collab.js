// SIMPLE COLLABORATION UX — end users only need Create / Join
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

  window.simpleCreateCloud=async function(){
    if(!ensureConfig())return;
    notice('Connexion…');
    try{
      const ok=typeof connectCloud==='function'?await connectCloud():false;
      if(!ok){notice('Connexion impossible. Vérifie la configuration propriétaire.','warn');return}
      notice('Création du partage…');
      await publishTripToCloud();
      notice('Voyage partagé. Envoie simplement le code aux autres.','ok');
    }catch(e){notice('Erreur : '+(e.message||e),'warn')}
  };

  window.simpleJoinCloud=async function(){
    const code=(document.getElementById('joinCode')?.value||'').trim();
    if(!code){try{toast('Entre le code du voyage')}catch(e){}return}
    if(!ensureConfig())return;
    notice('Connexion au voyage…');
    try{
      const ok=typeof connectCloud==='function'?await connectCloud():false;
      if(!ok){notice('Connexion impossible.','warn');return}
      await joinByCode();
      notice('Voyage rejoint. La synchronisation est active.','ok');
    }catch(e){notice('Erreur : '+(e.message||e),'warn')}
  };

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
            <input id="sbAnon" placeholder="Clé publique anon">
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
          <div class="simpleCloudAction"><h4>Créer le partage</h4><p>Synchronise le voyage et active le GPS live.</p><button class="btn primary" onclick="simpleCreateCloud()">Créer le partage</button></div>
          <div class="simpleCloudAction"><h4>Partager le code</h4><p>Envoie le code aux autres voyageurs.</p><button class="btn" onclick="copyCloudInvite()">Copier le code</button></div>
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
    simplify();
    const old=window.openCollab;
    if(typeof old==='function'&&!old.__simpleWrapped){
      const wrapped=function(){const r=old.apply(this,arguments);setTimeout(simplify,0);setTimeout(()=>{if(builtReady())applyBuiltInConfig()},80);return r};
      wrapped.__simpleWrapped=true;window.openCollab=wrapped;
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,120));else setTimeout(init,120);
})();
