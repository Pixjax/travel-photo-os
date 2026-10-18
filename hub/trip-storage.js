/* NØMIA shared trip storage v1.
 * Exact legacy keys; non-destructive reads. No automatic migration or writes.
 */
(()=>{'use strict';
const TRIPS_KEY='travel_photo_os_pro_max_trips_v1';
const DATA_PREFIX='travel_photo_os_pro_max_data_';
const safeId=id=>typeof id==='string'&&id.length>0&&id.length<=180&&!/[\\\u0000-\u001f]/.test(id);
function parse(raw){if(raw==null)return null;try{return JSON.parse(raw)}catch(e){return null}}
function readTrips(){const value=parse(localStorage.getItem(TRIPS_KEY));return Array.isArray(value)?value:null}
function readTrip(id){if(!safeId(id))return null;const data=parse(localStorage.getItem(DATA_PREFIX+id));return data&&typeof data==='object'&&!Array.isArray(data)?data:null}
function readSnapshot(){const trips=readTrips();return {trips,source:trips?'legacy-local':'legacy-defaults',storedTripCount:trips?.length??0}}
function exportBackup(){const trips=readTrips(),data={};if(trips)for(const trip of trips){if(safeId(trip?.id)){const stored=readTrip(trip.id);if(stored)data[trip.id]=stored}}return {format:'nomia-legacy-backup',version:1,exportedAt:new Date().toISOString(),trips,data}}
function saveTrips(trips){if(!Array.isArray(trips))throw Error('Invalid trip list');localStorage.setItem(TRIPS_KEY,JSON.stringify(trips));return true}
function saveTrip(id,data,{confirmOverwrite=false}={}){
 if(!safeId(id)||!data||typeof data!=='object'||Array.isArray(data))throw Error('Données de voyage invalides');
 const key=DATA_PREFIX+id;
 if(localStorage.getItem(key)!==null&&!confirmOverwrite)throw Error('Confirmation requise avant remplacement');
 localStorage.setItem(key,JSON.stringify(data));return true
}
window.NomiaTripStorage=Object.freeze({version:'1.0',TRIPS_KEY,DATA_PREFIX,readTrips,readTrip,readSnapshot,exportBackup,saveTrips,saveTrip});
})();