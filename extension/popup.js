import { all } from './core/db.js';
const $=id=>document.getElementById(id),[tab]=await chrome.tabs.query({active:true,lastFocusedWindow:true});
const format=await chrome.storage.local.get({format:'html'});$('format').value=format.format;
$('format').addEventListener('change',()=>chrome.storage.local.set({format:$('format').value}));
$('save').addEventListener('click',async()=>{
  $('save').disabled=true;$('status').textContent='Solicitando captura…';
  try{const res=await chrome.tabs.sendMessage(tab.id,{type:'SAVE_CURRENT'});$('status').textContent=res?.ok?'Salvamento iniciado. Acompanhe abaixo.':res?.error||'Não foi possível salvar. Abra o post no X.';}
  catch{$('status').textContent='Abra o post no X e aguarde a captura da página.';}
  finally{$('save').disabled=false;}
});
$('diagnostics').addEventListener('click',async()=>{const r=await chrome.runtime.sendMessage({type:'EXPORT_DIAGNOSTICS'});const blob=new Blob([JSON.stringify({generatedAt:new Date().toISOString(),items:r?.items||[]},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='x-html-diagnostics.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);$('status').textContent='Diagnóstico exportado sem cookies ou tokens.';});
const permission=await chrome.permissions.contains({origins:['https://*.video.pscp.tv/*']});$('pscp').hidden=permission;
$('pscp').addEventListener('click',async()=>{const ok=await chrome.permissions.request({origins:['https://*.video.pscp.tv/*']});$('pscp').hidden=ok;$('status').textContent=ok?'Permissão concedida para gravações de Spaces.':'Permissão não concedida.';});
async function refresh(){const jobs=(await all('jobs')).sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).slice(0,6);$('jobs').replaceChildren(...jobs.map(j=>{const wrap=document.createElement('div');const label=document.createElement('span');label.textContent=`${j.base} — ${j.status}${j.error?`: ${j.error}`:''}`;wrap.append(label);if(j.status==='capturing'||j.status==='saving'||j.status==='downloading'){const p=document.createElement('progress');p.max=100;p.value=j.progress||0;wrap.append(p);}return wrap;}));}
await refresh();setInterval(refresh,1200);
