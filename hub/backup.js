/* NØMIA backup — opt-in JSON download, never changes stored data. */
(()=>{'use strict';
function download(){
 try{
  const store=window.NomiaTripStorage;
  if(!store)throw Error('Stockage non chargé');
  const snapshot=store.exportBackup();
  if(!snapshot.trips){if(!confirm('Aucun voyage personnalisé enregistré localement dans ce navigateur. Exporter malgré tout ?'))return}
  const blob=new Blob([JSON.stringify(snapshot,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const link=document.createElement('a');
  const day=new Date().toISOString().slice(0,10);
  link.href=url;link.download='nomia-sauvegarde-'+day+'.json';
  document.body.append(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),60000);
 }catch(e){alert('Sauvegarde impossible : '+e.message)}
}
document.addEventListener('click',event=>{if(event.target.closest('[data-backup-download]'))download()});
})();