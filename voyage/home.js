(()=>{'use strict';const stage=document.getElementById('voyage-stage'),frame=document.getElementById('module-app'),back=document.getElementById('voyage-return'),notice=document.getElementById('voyage-notice');let ready=false,timeout;
function info(s){notice.textContent=s;notice.hidden=false;clearTimeout(timeout);timeout=setTimeout(()=>notice.hidden=true,4200)}
function show(){stage.hidden=false;back.hidden=true;stage.scrollTop=0}
function enter(){stage.hidden=true;back.hidden=false}
function tool(k){if(!ready){info('Le moteur Voyage se charge…');return}const w=frame.contentWindow,d=frame.contentDocument;try{if(k==='list'){w.showHome();enter();return}if(k==='map'){d.getElementById('uxVoyagePanel')?.classList.remove('show');d.body.classList.remove('uxVoyageOpen');d.getElementById('home')?.classList.add('hide');enter();return}
if(k==='dashboard'){w.openVoyageHub();if(d.getElementById('uxVoyagePanel')?.classList.contains('show'))enter();else{w.showHome();enter();info('Choisis un voyage pour ouvrir son tableau de bord.')}return}

}catch(e){info('Cet outil est momentanément indisponible.')}}
stage.addEventListener('click',e=>{const b=e.target.closest('[data-voyage-tool]');if(b)tool(b.dataset.voyageTool)});
back.addEventListener('click',show);
frame.addEventListener('load',()=>{ready=false;show()});
frame.addEventListener('nomia-module-ready',()=>{ready=true});
if(window.NomiaVoyageEngine?.ready)ready=true;
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&stage.hidden)show()});
show();
})();