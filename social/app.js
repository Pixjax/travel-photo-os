(()=>{'use strict';
const $=id=>document.getElementById(id), supa=window.supabase;
const URL='https://svfknuvlpxikzqvpksux.supabase.co', KEY='sb_publishable_pm5NiLhMirB8zD0yiYFWXg_6a6R8U1D';
const S=supa?.createClient?.(URL,KEY,{auth:{persistSession:true,autoRefreshToken:true}});
const REGISTRATION_OPEN=true; // Enable only after two-account permission tests and moderation readiness.
let user=null,profile=null,view='feed',offset=0,activePost=null,activeParent=null,busy=false,more=true,feedMode='global',backendReady=false;
const show=(id,yes)=>$(id).hidden=!yes;
function note(message){$('banner').textContent=message;$('banner').hidden=false;setTimeout(()=>$('banner').hidden=true,5500)}
function fail(error){note(error?.message||String(error||'Une erreur est survenue'))}
function empty(text){const e=document.createElement('div');e.className='empty';e.textContent=text;return e}
function el(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text!=null)e.textContent=text;return e}
function btn(label,click,pressed){const b=el('button','',label);b.type='button';b.onclick=click;if(pressed!==undefined)b.setAttribute('aria-pressed',String(pressed));return b}
function closeDialogs(){document.querySelectorAll('dialog[open]').forEach(d=>d.close())}
function openView(name){$('composeBtn').hidden=name==='messages'||name==='notifications';view=name;show('feedView',name==='feed');show('exploreView',name==='explore');show('profileView',name==='profile');show('notificationsView',name==='notifications');show('dmScreen',name==='messages');document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===name));$('viewTitle').textContent={feed:'Explorer le monde.',explore:'Découvrir.',profile:'Mon profil.',notifications:'Notifications.',messages:'Messages privés.'}[name];if(name==='feed')loadFeed(true);if(name==='profile')loadProfile();if(name==='notifications')loadNotifications();if(name==='messages')window.NomiaMessages?.show();if(name==='explore')search()}
function signedIn(){show('auth',!user||!profile);show('app',!!user&&!!profile);$('account').textContent=user?'Déconnexion':'Connexion';if(user&&profile){window.NomiaMessages?.mount(S,user).catch(fail);openView('feed')}}
async function ensureProfile(){if(!user)return;let q=await S.from('social_profiles').select('*').eq('id',user.id).maybeSingle();if(q.error)throw q.error;profile=q.data;if(!profile){show('auth',true);show('app',false);$('usernameField').hidden=false;$('username').required=true;note('Choisis un identifiant et clique sur Créer un compte pour terminer ton profil.');$('signup').textContent='Terminer mon profil'}else $('usernameField').hidden=true}
async function signin(e){e.preventDefault();if(!backendReady)return note('La base Social n’est pas encore configurée.');if(!S){note('Service de connexion indisponible.');return}const email=$('email').value.trim(),password=$('password').value;const r=await S.auth.signInWithPassword({email,password});if(r.error)return fail(r.error);user=r.data.user;try{await ensureProfile()}catch(e){return fail(e)}signedIn()}
async function register(){if(!REGISTRATION_OPEN)return note('Les inscriptions publiques ne sont pas encore ouvertes.');if(!S||!backendReady)return note('La base Social n’est pas encore configurée.');const username=$('username').value.trim().toLowerCase(),email=$('email').value.trim(),password=$('password').value;
if(!username){$('usernameField').hidden=false;$('username').required=true;note('Choisis ton identifiant puis clique à nouveau sur Créer un compte.');return}
if(!/^[a-z0-9_]{3,24}$/.test(username))return note('Identifiant de 3 à 24 lettres minuscules, chiffres ou _');
let result;if(!user){result=await S.auth.signUp({email,password,options:{emailRedirectTo:location.origin+location.pathname}});if(result.error)return fail(result.error);user=result.data.user;if(!result.data.session){note('Consulte ton e-mail pour confirmer ton compte, puis connecte-toi.');return}}
const check=await S.from('social_profiles').insert({id:user.id,username,display_name:username}).select().single();if(check.error)return fail(check.error);profile=check.data;signedIn()}
async function reset(){const email=$('email').value.trim();if(!email)return note('Indique ton adresse e-mail.');const r=await S.auth.resetPasswordForEmail(email,{redirectTo:location.origin+location.pathname});if(r.error)fail(r.error);else note('E-mail de récupération demandé.')}
async function getSignedUrl(path){const r=await S.storage.from('nomia-social').createSignedUrl(path,3600);return r.data?.signedUrl||null}
async function loadFeed(reset=false){if(!user||!profile||busy)return;if(reset){offset=0;more=true;$('feed').textContent=''}if(!more)return;busy=true;$('more').disabled=true;try{
let query=S.from('social_posts').select('id,author_id,image_path,caption,place_name,created_at,visibility,social_profiles!social_posts_author_id_fkey(username,display_name)').order('created_at',{ascending:false});
if(feedMode==='following'){
 const relations=await S.from('social_follows').select('following_id').eq('follower_id',user.id);
 if(relations.error)throw relations.error;
 const ids=(relations.data||[]).map(x=>x.following_id);
 if(!ids.length){$('feed').append(empty('Tu ne suis personne pour le moment. Découvre des photographes dans Explorer.'));more=false;$('more').hidden=true;return}
 query=query.in('author_id',ids);
}
const {data,error}=await query.range(offset,offset+9);
if(error)throw error;more=(data||[]).length===10;offset+=(data||[]).length;
if(reset&&!data?.length)$('feed').append(empty(feedMode==='following'?'Aucune publication de tes abonnements pour le moment.':'Aucune publication pour le moment. Sois le premier à partager une photographie.'));
const deepId=new URLSearchParams(location.search).get('post');
if(reset&&deepId&&/^[a-f0-9-]{36}$/i.test(deepId)){
 const target=await S.from('social_posts').select('id,author_id,image_path,caption,place_name,created_at,visibility,social_profiles!social_posts_author_id_fkey(username,display_name)').eq('id',deepId).maybeSingle();
 if(target.data)await addPost(target.data);
}
for(const post of data||[]){if(reset&&deepId===post.id)continue;await addPost(post)}
$('more').hidden=!more
}catch(e){fail(e)}finally{busy=false;$('more').disabled=false}}
async function addPost(post){const card=el('article','post');const header=el('div','post-head');const left=el('div');const name=btn(post.social_profiles?.display_name||post.social_profiles?.username||'Photographe',()=>openMemberProfile(post.author_id));name.className='profile-link';const meta=el('div','subline',(post.place_name?post.place_name+' · ':'')+new Date(post.created_at).toLocaleDateString('fr-FR'));left.append(name,meta);header.append(left);if(post.author_id!==user.id)header.append(btn('Suivre',()=>follow(post.author_id)));
const img=el('img');img.alt=post.caption||'Photographie publiée sur NØMIA';img.loading='lazy';img.src=await getSignedUrl(post.image_path)||'';const foot=el('div','post-foot');const controls=el('div','controls');
const [likes,ownLike,saved]=await Promise.all([
 S.from('social_likes').select('post_id',{count:'exact',head:true}).eq('post_id',post.id),
 S.from('social_likes').select('user_id').eq('post_id',post.id).eq('user_id',user.id).maybeSingle(),
 S.from('social_saved').select('post_id').eq('post_id',post.id).eq('user_id',user.id)
]);
let liked=!!ownLike.data,savedOn=(saved.data||[]).length>0,likeCount=likes.count||0;
const likeButton=btn('♡ '+likeCount,async()=>{
 const r=liked?await S.from('social_likes').delete().eq('post_id',post.id).eq('user_id',user.id):await S.from('social_likes').insert({post_id:post.id,user_id:user.id});
 if(r.error)return fail(r.error);
 likeCount=Math.max(0,likeCount+(liked?-1:1));liked=!liked;
 likeButton.setAttribute('aria-pressed',String(liked));likeButton.textContent=(liked?'♥ ':'♡ ')+likeCount;
},liked);
const saveButton=btn('Enregistrer',async()=>{const r=savedOn?await S.from('social_saved').delete().eq('post_id',post.id).eq('user_id',user.id):await S.from('social_saved').insert({post_id:post.id,user_id:user.id});if(r.error)return fail(r.error);savedOn=!savedOn;saveButton.setAttribute('aria-pressed',String(savedOn));saveButton.textContent=savedOn?'Enregistré':'Enregistrer'},savedOn);
controls.append(likeButton,btn('Commenter',()=>comments(post.id)),saveButton,btn('Partager le lien',()=>share(post.id)),btn('Envoyer en message',()=>{openView('messages');window.NomiaMessages?.share(post.id)}));
if(post.author_id===user.id)controls.append(btn('Supprimer',()=>remove(post)));else {controls.append(btn('Signaler',()=>report(post)));controls.append(btn('Bloquer',()=>blockUser(post.author_id)))}
foot.append(controls);if(post.caption)foot.append(el('p','caption',post.caption));card.append(header,img,foot);$('feed').append(card)}
async function follow(target){const check=await S.from('social_follows').select('following_id').eq('follower_id',user.id).eq('following_id',target).maybeSingle();if(check.error)return fail(check.error);const r=check.data?await S.from('social_follows').delete().eq('follower_id',user.id).eq('following_id',target):await S.from('social_follows').insert({follower_id:user.id,following_id:target});if(r.error)fail(r.error);else note(check.data?'Abonnement retiré':'Abonnement enregistré')}
async function comments(id){activePost=id;activeParent=null;const result=await S.from('social_comments').select('id,body,author_id,created_at,social_profiles!social_comments_author_id_fkey(username),parent_id').eq('post_id',id).order('created_at',{ascending:true}).limit(80);if(result.error)return fail(result.error);$('comments').textContent='';if(!result.data?.length)$('comments').append(empty('Aucun commentaire.'));for(const row of result.data||[]){const item=el('article');if(row.parent_id)item.style.paddingLeft='23px';item.append(el('strong','',row.social_profiles?.username||'Utilisateur'),el('p','',row.body));
item.append(btn('Répondre',()=>{activeParent=row.id;$('commentText').placeholder='Réponse à '+(row.social_profiles?.username||'ce membre');$('commentText').focus()}));if(row.author_id===user.id)item.append(btn('Supprimer',async()=>{const r=await S.from('social_comments').delete().eq('id',row.id);if(r.error)fail(r.error);else comments(id)}));$('comments').append(item)}$('commentsDialog').showModal()}
async function share(id){const url=location.origin+location.pathname+'?post='+encodeURIComponent(id);try{if(navigator.share)await navigator.share({title:'NØMIA Social',url});else{await navigator.clipboard.writeText(url);note('Lien copié')}}catch(e){if(e.name!=='AbortError')fail(e)}}
async function remove(post){if(!confirm('Supprimer cette publication ?'))return;const r=await S.from('social_posts').delete().eq('id',post.id).eq('author_id',user.id);if(r.error)return fail(r.error);await S.storage.from('nomia-social').remove([post.image_path]);loadFeed(true)}
async function blockUser(id){
 if(!confirm('Bloquer ce membre ? Ses publications disparaîtront de ton fil.'))return;
 const r=await S.from('social_blocks').insert({blocker_id:user.id,blocked_id:id});
 if(r.error)return fail(r.error);note('Membre bloqué');loadFeed(true);
}
async function report(post){const reason=prompt('Motif du signalement (minimum 5 caractères)');if(!reason)return;if(reason.trim().length<5)return note('Motif trop court');const r=await S.from('social_reports').insert({reporter_id:user.id,post_id:post.id,reason:reason.trim().slice(0,500)});if(r.error)fail(r.error);else note('Signalement transmis.')}
async function search(){if(!user)return;const query=$('search').value.trim().toLowerCase();$('results').textContent='';if(query.length<2){$('results').append(empty('Saisis au moins deux caractères.'));return}const result=await S.from('social_profiles').select('id,username,display_name,bio').ilike('username','%'+query.replace(/[%_]/g,'')+'%').limit(25);if(result.error)return fail(result.error);for(const p of result.data||[]){const item=el('div','person'),left=el('div');left.append(el('strong','',p.display_name),el('p','small','@'+p.username));item.append(left);item.append(btn('Voir le profil',()=>openMemberProfile(p.id)));if(p.id!==user.id)item.append(btn('Suivre / ne plus suivre',()=>follow(p.id)));$('results').append(item)}if(!result.data?.length)$('results').append(empty('Aucun utilisateur trouvé.'))}
async function openMemberProfile(id){
 if(id===user.id){openView('profile');return}
 view='profile';
 for(const name of ['feed','explore','profile','notifications'])show(name+'View',name==='profile');
 document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view==='profile'));
 $('viewTitle').textContent='Photographe.';
 const root=$('profile');root.textContent='';
 const r=await S.from('social_profiles').select('id,username,display_name,bio,website,is_private').eq('id',id).maybeSingle();
 if(r.error)return fail(r.error);
 if(!r.data){root.append(empty('Ce profil est indisponible.'));return}
 const p=r.data,card=el('div','profile');
 card.append(el('div','eyebrow','@'+p.username),el('h2','',p.display_name),el('p','',p.bio||''));
 card.append(btn('Suivre / ne plus suivre',()=>follow(p.id)));card.append(btn('Message',()=>{openView('messages');window.NomiaMessages?.start(p.id)}));
 root.append(card);
 const posts=await S.from('social_posts').select('image_path,caption').eq('author_id',id).order('created_at',{ascending:false}).limit(36);
 if(posts.error)return fail(posts.error);
 if(posts.data?.length){const gallery=el('div','profile-grid');for(const post of posts.data){const image=el('img');image.loading='lazy';image.alt=post.caption||'Photographie';image.src=await getSignedUrl(post.image_path)||'';gallery.append(image)}root.append(gallery)}
 else root.append(empty('Aucune publication visible.'));
}
async function loadNotifications(){
const target=$('notifications');target.textContent='';
const r=await S.from('social_notifications').select('id,kind,read_at,created_at,actor_id,post_id').eq('recipient_id',user.id).order('created_at',{ascending:false}).limit(60);
if(r.error)return fail(r.error);
if(!r.data?.length){target.append(empty('Aucune notification pour le moment.'));return}
const ids=[...new Set(r.data.map(x=>x.actor_id))];
const profiles=await S.from('social_profiles').select('id,username').in('id',ids);
const names=new Map((profiles.data||[]).map(x=>[x.id,x.username]));
for(const row of r.data){
const item=el('div','person'),textBox=el('div');const who=names.get(row.actor_id)||'Un membre';
const sentence={like:'a aimé ta publication',comment:'a commenté ta publication',follow:'suit maintenant ton compte'}[row.kind]||'a interagi';
textBox.append(el('strong','',who+' '+sentence),el('p','small',new Date(row.created_at).toLocaleString('fr-FR')));
item.append(textBox);
if(!row.read_at)item.append(btn('Marquer comme lu',async()=>{const q=await S.from('social_notifications').update({read_at:new Date().toISOString()}).eq('id',row.id);if(q.error)fail(q.error);else loadNotifications()}));
target.append(item)}
}
async function loadProfile(){if(!profile)return;const root=$('profile');root.textContent='';const panel=el('div','profile');panel.append(el('div','eyebrow','@'+profile.username),el('h2','',profile.display_name),el('p','',profile.bio||'Aucune biographie'));panel.append(btn('Modifier mon profil',()=>{$('handleEdit').value=profile.username;$('nameEdit').value=profile.display_name;$('bioEdit').value=profile.bio;$('websiteEdit').value=profile.website||'';$('profileEditor').showModal()}));const posts=await S.from('social_posts').select('id,image_path,caption').eq('author_id',user.id).order('created_at',{ascending:false}).limit(36);if(posts.error)return fail(posts.error);if(profile.website&&/^https:\/\/[^\s]+$/i.test(profile.website)){const a=el('a');a.href=profile.website;a.target='_blank';a.rel='noopener noreferrer';a.textContent='Site internet ↗';panel.append(a)}panel.append(el('p','count',(posts.data?.length||0)+' publications'));root.append(panel);
if(posts.data?.length){const gallery=el('div','profile-grid');for(const post of posts.data){const image=el('img');image.loading='lazy';image.alt=post.caption||'Publication photo';image.src=await getSignedUrl(post.image_path)||'';gallery.append(image)}root.append(gallery)}
}
async function prepareImage(file){
 const url=URL.createObjectURL(file);
 try{
  const image=new Image();image.src=url;await image.decode();
  const scale=Math.min(1,4000/Math.max(image.naturalWidth,image.naturalHeight));
  const canvas=document.createElement('canvas');
  canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
  const ctx=canvas.getContext('2d');
  if(!ctx)throw Error('Conversion image indisponible');
  ctx.drawImage(image,0,0,canvas.width,canvas.height);
  const mime=file.type==='image/png'?'image/png':'image/jpeg';
  const blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('Conversion impossible')),mime,.94));
  if(blob.size>10485760)throw Error('Image encore trop volumineuse après optimisation.');
  return {blob,mime};
 }finally{URL.revokeObjectURL(url)}
}
async function upload(e){e.preventDefault();if(!user||!profile)return note('Complète ton profil avant de publier.');const file=$('image').files[0];if(!file||!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>10485760)return note('Image JPEG, PNG ou WebP de 10 Mo maximum.');$('publish').disabled=true;let path;try{
const prepared=await prepareImage(file);
const ext=prepared.mime==='image/png'?'png':'jpg';path=user.id+'/'+crypto.randomUUID()+'.'+ext;
const result=await S.storage.from('nomia-social').upload(path,prepared.blob,{contentType:prepared.mime,upsert:false});if(result.error)throw result.error;
const post=await S.from('social_posts').insert({author_id:user.id,image_path:path,caption:$('caption').value.trim(),place_name:$('place').value.trim()||null,visibility:$('visibility').value}).select().single();if(post.error)throw post.error;
$('postForm').reset();closeDialogs();openView('feed');note('Publication créée.');
}catch(error){if(path)await S.storage.from('nomia-social').remove([path]);fail(error)}finally{$('publish').disabled=false}}
async function init(){if(!S){note('Impossible de charger le service.');$('authForm').hidden=true;return}
backendReady=true; // Anonymous SQL access is deliberately revoked. Schema is validated separately.
const session=await S.auth.getSession();if(session.error)fail(session.error);user=session.data.session?.user||null;if(user)try{await ensureProfile()}catch(e){fail(e)}signedIn();S.auth.onAuthStateChange(async(event,session)=>{if(event==='SIGNED_OUT'){window.NomiaMessages?.dispose();user=null;profile=null;signedIn()}else if(event==='PASSWORD_RECOVERY'){$('passwordDialog').showModal()}})}
$('passwordForm').addEventListener('submit',async event=>{
 event.preventDefault();
 const password=$('newPassword').value;
 const r=await S.auth.updateUser({password});
 if(r.error)return fail(r.error);
 $('passwordDialog').close();$('passwordForm').reset();
 note('Ton mot de passe a été modifié.');
});
$('authForm').addEventListener('submit',signin);$('signup').onclick=register;$('reset').onclick=reset;
$('account').onclick=async()=>{if(user){await S.auth.signOut();user=null;profile=null;signedIn()}else show('auth',true)};
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{if(user)openView(b.dataset.view)});
for(const [id,mode] of [['globalFeed','global'],['followingFeed','following']]){$(id).onclick=()=>{feedMode=mode;$('globalFeed').setAttribute('aria-pressed',String(mode==='global'));$('followingFeed').setAttribute('aria-pressed',String(mode==='following'));loadFeed(true)}};
$('composeBtn').onclick=()=>{if(!profile)return note('Complète ton profil avant de publier');$('compose').showModal()};
document.querySelectorAll('[data-close]').forEach(b=>b.onclick=closeDialogs);
$('postForm').addEventListener('submit',upload);$('more').onclick=()=>loadFeed(false);$('search').oninput=()=>{clearTimeout(window.__socialSearchTimer);window.__socialSearchTimer=setTimeout(search,350)};
$('commentForm').onsubmit=async e=>{e.preventDefault();const r=await S.from('social_comments').insert({post_id:activePost,parent_id:activeParent,author_id:user.id,body:$('commentText').value.trim()});if(r.error)return fail(r.error);$('commentText').value='';activeParent=null;comments(activePost)};
$('profileForm').onsubmit=async e=>{e.preventDefault();const site=$('websiteEdit').value.trim();if(site&&!/^https:\/\/[^\s]+$/i.test(site))return note('Le site internet doit commencer par https://');const r=await S.from('social_profiles').update({username:$('handleEdit').value.trim().toLowerCase(),display_name:$('nameEdit').value.trim(),bio:$('bioEdit').value.trim(),website:$('websiteEdit').value.trim()||null}).eq('id',user.id).select().single();if(r.error)return fail(r.error);profile=r.data;closeDialogs();loadProfile();note('Profil mis à jour')};
init();
})();