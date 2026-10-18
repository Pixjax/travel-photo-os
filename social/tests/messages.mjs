import assert from 'node:assert/strict';
import {createClient} from '@supabase/supabase-js';
const E=process.env;
for(const key of ['SOCIAL_URL','SOCIAL_ANON_KEY',...['A','B','C'].flatMap(x=>['DM_TEST_'+x+'_EMAIL','DM_TEST_'+x+'_PASSWORD'])])if(!E[key])throw Error('Missing '+key);
const client=()=>createClient(E.SOCIAL_URL,E.SOCIAL_ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const [a,b,c]=[client(),client(),client()],ids=[];
for(const [i,x] of [a,b,c].entries()){const r=await x.auth.signInWithPassword({email:E['DM_TEST_'+['A','B','C'][i]+'_EMAIL'],password:E['DM_TEST_'+['A','B','C'][i]+'_PASSWORD']});if(r.error)throw r.error;ids.push(r.data.user.id)}
assert.equal(new Set(ids).size,3,'Three distinct users required');
let thread=null,msg=null;
try{
 let r=await a.rpc('social_dm_start',{other_user:ids[1]});if(r.error)throw r.error;thread=r.data;
 const before=await c.from('social_dm_threads').select('id').eq('id',thread);assert.equal(before.data?.length,0,'C cannot read A-B thread');
 const t=await b.from('social_dm_threads').select('id,status').eq('id',thread).single();if(t.error)throw t.error;
 if(t.data.status==='pending'){const v=await b.rpc('social_dm_respond',{p_thread:thread,p_accept:true});if(v.error)throw v.error}
 r=await a.rpc('social_dm_send',{p_thread:thread,p_body:'E2E private message'});if(r.error)throw r.error;msg=r.data;
 const readable=await b.from('social_dm_messages').select('id').eq('id',msg).single();assert.equal(readable.data?.id,msg);
 const hidden=await c.from('social_dm_messages').select('id').eq('id',msg);assert.equal(hidden.data?.length,0,'C cannot read message');
 const forbidden=await c.rpc('social_dm_send',{p_thread:thread,p_body:'Unauthorized'});assert(forbidden.error,'C cannot post in thread');
 await b.rpc('social_dm_read',{p_thread:thread});
 const read=await a.from('social_dm_reads').select('read_at').eq('thread_id',thread).eq('user_id',ids[1]);assert(read.data?.length===1);
 console.log('PASS: third-party privacy, realtime persistence, read state, blocked outsider send');
}finally{
 if(msg)await a.rpc('social_dm_delete',{p_message:msg});
 await Promise.all([a.auth.signOut(),b.auth.signOut(),c.auth.signOut()]);
 // Thread is intentionally retained for audit: no destructive cleanup.
}
