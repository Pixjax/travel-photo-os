import assert from 'node:assert/strict';
import {createClient} from '@supabase/supabase-js';
const E=process.env, keys=['SOCIAL_URL','SOCIAL_ANON_KEY','SOCIAL_TEST_A_EMAIL','SOCIAL_TEST_A_PASSWORD','SOCIAL_TEST_B_EMAIL','SOCIAL_TEST_B_PASSWORD'];
for(const k of keys)if(!E[k])throw Error('Missing '+k+' — use an isolated test Supabase project');
const make=()=>createClient(E.SOCIAL_URL,E.SOCIAL_ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const a=make(),b=make();
async function ok(p){const r=await p;if(r.error)throw r.error;return r.data}
let post=null,path=null,owner=null,visitor=null;
try{
 const A=await ok(a.auth.signInWithPassword({email:E.SOCIAL_TEST_A_EMAIL,password:E.SOCIAL_TEST_A_PASSWORD}));
 const B=await ok(b.auth.signInWithPassword({email:E.SOCIAL_TEST_B_EMAIL,password:E.SOCIAL_TEST_B_PASSWORD}));
 owner=A.user.id;visitor=B.user.id;assert.notEqual(owner,visitor);
 const people=await ok(a.from('social_profiles').select('id').in('id',[owner,visitor]));assert.equal(people.length,2);
 path=owner+'/'+crypto.randomUUID()+'.png';
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/nwAAAABJRU5ErkJggg==','base64');
 await ok(a.storage.from('nomia-social').upload(path,png,{contentType:'image/png'}));
 const created=await ok(a.from('social_posts').insert({author_id:owner,image_path:path,caption:'E2E test',visibility:'public'}).select('id').single());post=created.id;
 assert.equal((await ok(b.from('social_posts').select('id').eq('id',post).single())).id,post);
 await b.from('social_posts').delete().eq('id',post);
 assert.equal((await ok(a.from('social_posts').select('id').eq('id',post).single())).id,post,'Other user cannot delete post');
 await ok(b.from('social_likes').insert({user_id:visitor,post_id:post}));
 await ok(b.from('social_comments').insert({author_id:visitor,post_id:post,body:'Cross-account test'}));
 assert((await ok(a.from('social_likes').select('user_id').eq('post_id',post))).some(x=>x.user_id===visitor));
 assert((await ok(a.from('social_comments').select('body').eq('post_id',post))).some(x=>x.body==='Cross-account test'));
 const notifications=await ok(a.from('social_notifications').select('kind').eq('post_id',post));
 assert(notifications.some(x=>x.kind==='like')&&notifications.some(x=>x.kind==='comment'));
 const image=await ok(b.storage.from('nomia-social').createSignedUrl(path,60));assert(image.signedUrl);
 console.log('PASS: A post visible to B; B cannot delete; likes/comments/notifications/media available');
}finally{
 if(post&&owner)await a.from('social_posts').delete().eq('id',post).eq('author_id',owner);
 if(path)await a.storage.from('nomia-social').remove([path]);
 await Promise.all([a.auth.signOut(),b.auth.signOut()]);
}
