// NØMIA cloud synchronization contract, isolated in two VM "devices".
// No network requests, no production Supabase, no personal trips.
const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const src=fs.readFileSync(path.join(__dirname,'..','cloud-sync.js'),'utf8');
const shared={payload:null,updated_at:null,updates:0};
const clone=x=>JSON.parse(JSON.stringify(x));
function device(user){
 const disk=new Map(),listeners={},status=[];
 const client={
  auth:{getSession:async()=>({data:{session:{user:{id:user}}}})},
  from(table){return {
   update(v){return {eq:async()=>{if(table==='trips'){shared.payload=clone(v.payload);shared.updated_at=v.updated_at;shared.updates++}return {error:null}}}},
   select(){return {eq(){return {single:async()=>({data:{id:'qa-cloud',payload:clone(shared.payload),updated_at:shared.updated_at},error:null})}}}}
  }},
  channel(){return {on(){return this},subscribe(){return this}}},
  removeChannel:async()=>{}
 };
 const ctx={console,Date,JSON,Math,Promise,CustomEvent:class{constructor(type,opts){this.type=type;this.detail=opts.detail}},setTimeout,clearTimeout,setInterval:()=>0,clearInterval:()=>{},navigator:{onLine:true},window:{TRAVEL_PHOTO_CLOUD_CONFIG:{url:'https://mock.invalid',anon:'fake'},supabase:{createClient:()=>client},addEventListener:(k,fn)=>{listeners[k]=fn},dispatchEvent:e=>status.push(e.detail)},document:{readyState:'complete',getElementById:()=>null},localStorage:{getItem:k=>disk.get(k)||null,setItem:(k,v)=>disk.set(k,v),removeItem:k=>disk.delete(k)},activeTrip:{id:'qa-local',cloudTripId:'qa-cloud',name:'Test'},activeTripId:'qa-local',store:{notes:{},expenses:[],collab:{},geo:{}},sbClient:null,sbSessionUser:null,defaults:()=>({notes:{},expenses:[],collab:{},geo:{}}),saveData(){},saveTrips(){},openTrip(){},showHome(){}};
 ctx.window.window=ctx.window;
 vm.createContext(ctx);vm.runInContext(src,ctx,{filename:'cloud-sync.js'});
 return {ctx,disk,listeners,status};
}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const a=device('alice'),b=device('bob');
 await sleep(350);
 // Local write on A schedules a push
 a.ctx.store.notes.spot='A';
 a.ctx.saveData();
 assert.equal(a.ctx.window.travelPhotoHasPendingSync(),true,'pending marker should be set immediately');
 await a.ctx.window.travelPhotoForceSync();
 assert.equal(shared.payload.store.notes.spot,'A');
 assert.equal(a.ctx.window.travelPhotoHasPendingSync(),false,'successful push clears pending');
 // A second device can push its own update.
 b.ctx.store.notes.spot='B';
 b.ctx.saveData();
 await b.ctx.window.travelPhotoForceSync();
 assert.equal(shared.payload.store.notes.spot,'B','second device write reaches server');
 // Offline edit on A must not be discarded by a remote update.
 a.ctx.navigator.onLine=false;
 a.listeners.offline?.();
 a.ctx.store.notes.spot='A offline';
 a.ctx.saveData();
 assert.equal(a.ctx.window.travelPhotoHasPendingSync(),true);
 a.ctx.navigator.onLine=true;
 a.listeners.online?.();
 await a.ctx.window.travelPhotoForceSync();
 assert.equal(shared.payload.store.notes.spot,'A offline','queued local change uploaded on reconnect');
 assert.equal(a.ctx.window.travelPhotoHasPendingSync(),false);
 // This is LAST WRITE WINS, not conflict-free merging. Explicit limitation.
 assert.equal(shared.payload.store.notes.spot,'A offline','latest full-payload write replaces prior value');
 console.log('PASS isolated two-device write / offline queue / reconnect / last-write-wins contract');
 console.log('LIMITATION concurrent edits to different fields may overwrite each other: requires architectural work');
})().catch(e=>{console.error(e);process.exitCode=1});
