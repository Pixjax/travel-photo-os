(()=>{'use strict';
const $=id=>document.getElementById(id);let client=null,me=null,current=null,sub=null,tick=null,threadChannel=null,sharePost=null,previewUrl=null;
const list=$('dmList'),messages=$('dmMessages'),title=$('dmTitle'),pane=$('dmPane'),composer=$('dmComposer'),status=$('dmStatus');
function notice(s){status.textContent=s||''}
function button(label,fn){const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=fn;return b}
function clearSubscription(){if(sub&&client)client.removeChannel(sub);sub=null;if(tick)clearInterval(tick);tick=null}
function watchThreads(){if(threadChannel&&client)client.removeChannel(threadChannel);threadChannel=client.channel('nomia-dm-conversations').on('postgres_changes',{event:'*',schema:'public',table:'social_dm_threads'},()=>refreshList().catch(()=>{})).subscribe()}

async function peers(){const r=await client.from('social_dm_threads').select('id,user_low,user_high,initiated_by,status,last_activity').order('last_activity',{ascending:false}).limit(100);if(r.error)throw r.error;return r.data||[]}
async function refreshList(){
 if(!me)return;
 const rows=await peers();list.textContent='';
 const menu=document.querySelector('[data-view="messages"]');
 if(!rows.length){list.textContent='Aucune conversation pour le moment.';if(menu)menu.textContent='Messages';return}
 const ids=[...new Set(rows.map(t=>t.user_low===me.id?t.user_high:t.user_low))],threadIds=rows.map(x=>x.id);
 const [result,reads,last]=await Promise.all([
  client.from('social_profiles').select('id,username,display_name').in('id',ids),
  client.from('social_dm_reads').select('thread_id,read_at').eq('user_id',me.id).in('thread_id',threadIds),
  client.from('social_dm_messages').select('thread_id,sender_id,created_at').in('thread_id',threadIds).order('created_at',{ascending:false}).limit(250)
 ]);
 const profiles=new Map((result.data||[]).map(p=>[p.id,p]));
 const readAt=new Map((reads.data||[]).map(x=>[x.thread_id,new Date(x.read_at).getTime()]));
 const latest=new Map();
 for(const row of last.data||[])if(!latest.has(row.thread_id))latest.set(row.thread_id,row);
 let unread=0;
 for(const row of rows){
  const other=row.user_low===me.id?row.user_high:row.user_low,p=profiles.get(other);
  const lastMsg=latest.get(row.id),request=row.status==='pending'&&row.initiated_by!==me.id;
  const pending=!!(lastMsg&&lastMsg.sender_id!==me.id&&new Date(lastMsg.created_at).getTime()>(readAt.get(row.id)||0));
  if(request||pending)unread++;
  const b=button((request||pending?'●  ':'')+(p?.display_name||p?.username||'Membre')+(request?' · Invitation':row.status==='pending'?' · En attente':''),()=>open(row,p));
  b.className='dm-thread'+(current?.id===row.id?' selected':'');list.append(b);
 }
 if(menu)menu.textContent='Messages'+(unread?' ('+unread+')':'');
}
async function open(row,person){clearSubscription();current=row;title.textContent=person?.display_name||person?.username||'Conversation';pane.hidden=false;list.parentElement.classList.add('dm-mobile-open');notice('');
const incoming=row.status==='pending'&&row.initiated_by!==me.id;
$('dmRequest').hidden=!incoming;$('dmPending').hidden=row.status!=='pending'||incoming;composer.hidden=row.status!=='accepted';
if(row.status==='pending'&&!incoming)$('dmPending').textContent='Demande envoyée. Les messages seront disponibles après acceptation.';
await loadMessages();
if(row.status==='accepted'){await client.rpc('social_dm_read',{p_thread:row.id});subscribe(row.id)}refreshList().catch(()=>{})}
async function loadMessages(){if(!current)return;const key=current.id;const r=await client.from('social_dm_messages').select('id,body,sender_id,media_path,post_id,created_at').eq('thread_id',key).order('created_at',{ascending:false}).limit(80);if(r.error){notice(r.error.message);return}if(!current||current.id!==key)return;
const readResult=await client.from('social_dm_reads').select('user_id,read_at').eq('thread_id',key);
const otherRead=(readResult.data||[]).find(x=>x.user_id!==me.id)?.read_at||null;
messages.textContent='';const fragment=document.createDocumentFragment();
for(const msg of (r.data||[]).reverse()){const item=document.createElement('div');item.className='dm-bubble'+(msg.sender_id===me.id?' mine':'');if(msg.body){const p=document.createElement('p');p.textContent=msg.body;item.append(p)}
if(msg.media_path){
 const thumb=document.createElement('img');thumb.className='dm-photo';thumb.alt='Photo privée';
 const signed=await client.storage.from('nomia-messages').createSignedUrl(msg.media_path,1200);
 if(signed.data?.signedUrl)thumb.src=signed.data.signedUrl;
 thumb.onclick=async()=>{const u=await client.storage.from('nomia-messages').createSignedUrl(msg.media_path,120);if(u.error)notice(u.error.message);else window.open(u.data.signedUrl,'_blank','noopener')};
 item.append(thumb);
}
if(msg.post_id){const a=document.createElement('a');a.href='./?post='+encodeURIComponent(msg.post_id);a.textContent='Voir la publication ↗';item.append(a)}
if(msg.sender_id===me.id)item.append(button('Supprimer',async()=>{if(!confirm('Supprimer ce message ?'))return;const r=await client.rpc('social_dm_delete',{p_message:msg.id});if(r.error)notice(r.error.message);else{if(msg.media_path){const d=await client.storage.from('nomia-messages').remove([msg.media_path]);if(d.error)notice('Message supprimé, mais le fichier doit encore être nettoyé.')}loadMessages()}}));
const time=document.createElement('small');time.textContent=new Date(msg.created_at).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})+(msg.sender_id===me.id?(otherRead&&new Date(otherRead)>=new Date(msg.created_at)?' · Lu':' · Envoyé'):'');item.append(time);fragment.append(item)}messages.append(fragment);messages.scrollTop=messages.scrollHeight}
function subscribe(id){clearSubscription();sub=client.channel('nomia-dm-'+id).on('postgres_changes',{event:'INSERT',schema:'public',table:'social_dm_messages',filter:'thread_id=eq.'+id},()=>{loadMessages();client.rpc('social_dm_read',{p_thread:id});refreshList()}).subscribe();
tick=setInterval(()=>{if(document.visibilityState==='visible'){loadMessages();refreshList()}},12000)}
async function start(id){if(!me)return;const r=await client.rpc('social_dm_start',{other_user:id});if(r.error){notice(r.error.message);return}await refreshList();const t=await client.from('social_dm_threads').select('*').eq('id',r.data).single();if(t.error)return notice(t.error.message);const p=await client.from('social_profiles').select('id,username,display_name').eq('id',id).single();await open(t.data,p.data);$('dmScreen').hidden=false}
async function send(e){
 e.preventDefault();if(!current)return;
 const field=$('dmText'),text=field.value.trim(),file=$('dmFile').files[0],post=sharePost;
 if(!text&&!file&&!post)return;
 const submit=$('dmSend');submit.disabled=true;notice('Envoi en cours…');
 let path=null;
 try{
  if(file){
   if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>10485760)throw Error('Image invalide (10 Mo maximum).');
   const url=URL.createObjectURL(file);
   let blob;
   try{
    const img=new Image();img.src=url;await img.decode();
    const ratio=Math.min(1,3500/Math.max(img.naturalWidth,img.naturalHeight)),canvas=document.createElement('canvas');
    canvas.width=Math.max(1,Math.round(img.naturalWidth*ratio));canvas.height=Math.max(1,Math.round(img.naturalHeight*ratio));
    canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);
    blob=await new Promise((ok,bad)=>canvas.toBlob(b=>b?ok(b):bad(Error('Image impossible à préparer')),'image/jpeg',.92));
   }finally{URL.revokeObjectURL(url)}
   if(blob.size>10485760)throw Error('Image trop volumineuse après optimisation.');
   path=me.id+'/'+crypto.randomUUID()+'.jpg';
   const upload=await client.storage.from('nomia-messages').upload(path,blob,{contentType:'image/jpeg',upsert:false});
   if(upload.error)throw upload.error;
  }
  const r=await client.rpc('social_dm_send',{p_thread:current.id,p_body:text||null,p_media:path,p_post:post});
  if(r.error)throw r.error;
  field.value='';$('dmFile').value='';if(previewUrl){URL.revokeObjectURL(previewUrl);previewUrl=null}$('dmPreview').hidden=true;$('dmPreview').textContent='';sharePost=null;$('dmClearShare').hidden=true;notice('');
  await loadMessages();await refreshList();
 }catch(err){notice(err.message||'Envoi impossible');if(path)await client.storage.from('nomia-messages').remove([path])}
 finally{submit.disabled=false}
}
async function respond(accept){if(!current)return;const r=await client.rpc('social_dm_respond',{p_thread:current.id,p_accept:accept});if(r.error)return notice(r.error.message);const t=await client.from('social_dm_threads').select('*').eq('id',current.id).single();if(t.data)await open(t.data,null)}
async function find(){const query=$('dmSearch').value.trim();const results=$('dmResults');results.textContent='';if(query.length<2)return;const r=await client.from('social_profiles').select('id,display_name,username').ilike('username','%'+query.replace(/[%_]/g,'')+'%').limit(12);if(r.error)return notice(r.error.message);for(const p of r.data||[]){if(p.id===me.id)continue;results.append(button('@'+p.username+' · '+p.display_name,()=>start(p.id)))}}
document.addEventListener('click',e=>{if(e.target.closest('#dmAccept'))respond(true);if(e.target.closest('#dmDecline'))respond(false);if(e.target.closest('#dmBack'))list.parentElement.classList.remove('dm-mobile-open')});
$('dmComposer').onsubmit=send;$('dmSearch').oninput=()=>{find().catch(e=>notice(e.message))};
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&me){refreshList();loadMessages()}});
$('dmClearShare').onclick=()=>{sharePost=null;$('dmClearShare').hidden=true};
$('dmFile').onchange=()=>{
 const file=$('dmFile').files[0],container=$('dmPreview');
 container.textContent='';if(previewUrl){URL.revokeObjectURL(previewUrl);previewUrl=null}
 if(!file){container.hidden=true;return}
 previewUrl=URL.createObjectURL(file);
 const img=document.createElement('img');img.alt='Aperçu de la photo avant envoi';img.src=previewUrl;img.className='dm-photo-preview';
 container.append(img,button('Retirer la photo',()=>{$('dmFile').value='';$('dmFile').dispatchEvent(new Event('change'))}));container.hidden=false;
};
async function loadPrivacy(){const r=await client.from('social_dm_preferences').select('allow_requests').eq('user_id',me.id).maybeSingle();if(r.error){notice(r.error.message);return}$('dmAllowRequests').checked=r.data?.allow_requests!==false}
$('dmAllowRequests').onchange=async()=>{const enabled=$('dmAllowRequests').checked;const r=await client.from('social_dm_preferences').upsert({user_id:me.id,allow_requests:enabled},{onConflict:'user_id'});if(r.error){notice(r.error.message);$('dmAllowRequests').checked=!enabled}else notice('Préférence enregistrée.')};
window.NomiaMessages={mount:async(c,user)=>{client=c;me=user;await Promise.all([refreshList(),loadPrivacy()]);watchThreads()},start,share:async(post)=>{sharePost=post;$('dmClearShare').hidden=false;$('dmClearShare').textContent='Publication sélectionnée · Retirer';$('dmScreen').hidden=false;notice('Sélectionne un membre ou une conversation pour partager cette publication.');await refreshList()},show:()=>{$('dmScreen').hidden=false;refreshList()},dispose:()=>{clearSubscription();if(threadChannel&&client)client.removeChannel(threadChannel);threadChannel=null;me=null;current=null;$('dmScreen').hidden=true}};
})();