const DB_NAME='x-arquivo-v1';
import { reserveBase } from './names.js';
const DB_VERSION=1;
const STORES=['posts','jobs','assets','names','settings','rates','diagnostics','downloads'];
let opening;

export function openDB(){
  if(opening)return opening;
  opening=new Promise((resolve,reject)=>{
    const req=indexedDB.open(DB_NAME,DB_VERSION);
    req.onupgradeneeded=()=>{const db=req.result;for(const name of STORES)if(!db.objectStoreNames.contains(name))db.createObjectStore(name,{keyPath:name==='names'?'stableId':'id'});};
    req.onsuccess=()=>{req.result.onversionchange=()=>req.result.close();resolve(req.result);};
    req.onerror=()=>{opening=null;reject(req.error);};
    req.onblocked=()=>reject(new Error('Banco local bloqueado por outra janela da extensão'));
  });return opening;
}
export async function request(store,mode,operation){const db=await openDB();return new Promise((resolve,reject)=>{const tx=db.transaction(store,mode);let value;try{value=operation(tx.objectStore(store));}catch(e){reject(e);return;}tx.oncomplete=()=>resolve(value?.result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||new Error('Transação IndexedDB abortada'));});}
export const get=(s,id)=>request(s,'readonly',st=>st.get(id));
export const all=s=>request(s,'readonly',st=>st.getAll());
export const put=(s,v)=>request(s,'readwrite',st=>st.put(v));
export const remove=(s,id)=>request(s,'readwrite',st=>st.delete(id));

export async function storeCaptured(posts,meta={}){
  const db=await openDB();return new Promise((resolve,reject)=>{const tx=db.transaction(['posts','rates','diagnostics'],'readwrite');const ps=tx.objectStore('posts');for(const p of posts)ps.put({...p,id:p.id,observedAt:meta.observedAt||new Date().toISOString(),operation:meta.operation||''});if(meta.rate)tx.objectStore('rates').put({...meta.rate,id:meta.rate.operation||meta.operation||'unknown',observedAt:meta.observedAt||new Date().toISOString()});if(meta.diagnostic)tx.objectStore('diagnostics').put({...meta.diagnostic,id:crypto.randomUUID(),at:new Date().toISOString()});const allPosts=ps.getAll();allPosts.onsuccess=()=>{const candidates=allPosts.result.sort((a,b)=>Date.parse(a.observedAt||0)-Date.parse(b.observedAt||0));for(const old of candidates.slice(0,Math.max(0,candidates.length-2000)))ps.delete(old.id);};tx.oncomplete=()=>resolve(posts.length);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});
}

export async function reserveName(post,candidate){
  const db=await openDB();return new Promise((resolve,reject)=>{const tx=db.transaction('names','readwrite'),st=tx.objectStore('names');let result;const req=st.getAll();req.onsuccess=()=>{const registry=new Map(req.result.map(v=>[v.stableId,v.base]));result=reserveBase(registry,post.stableId,candidate);st.put({stableId:post.stableId,base:result,aliases:post.revisionIds||[post.id]});};tx.oncomplete=()=>resolve(result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});
}

export async function setJob(job){return put('jobs',job);}
export async function updateJob(id,patch){const db=await openDB();return new Promise((resolve,reject)=>{const tx=db.transaction('jobs','readwrite'),st=tx.objectStore('jobs'),r=st.get(id);r.onsuccess=()=>st.put({...r.result,...patch,updatedAt:new Date().toISOString()});tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);});}
