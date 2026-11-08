import { registerDownloadNames,startNamedDownload,forgetDownloadName,matchesDownloadPath } from './core/downloads.js';
import { parseResponse } from './core/model.js';
import { fileBase } from './core/names.js';
import { redact } from './core/security.js';
import { shouldFinishJob,shouldResumeJob } from './core/jobs.js';
import { get,put,remove,storeCaptured,setJob,updateJob } from './core/db.js';

registerDownloadNames(chrome);
const OFFSCREEN='offscreen.html';
let openingOffscreen;
async function ensureOffscreen(){
  if(openingOffscreen)return openingOffscreen;
  openingOffscreen=(async()=>{if(await chrome.offscreen.hasDocument())return;await chrome.offscreen.createDocument({url:OFFSCREEN,reasons:['BLOBS','WORKERS'],justification:'Baixar e montar localmente arquivos HTML, Markdown e mídias enquanto o popup está fechado.'});})();
  try{await openingOffscreen;}finally{openingOffscreen=null;}
}
const sendOffscreen=async message=>{await ensureOffscreen();return chrome.runtime.sendMessage({...message,target:'offscreen'}).catch(()=>undefined);};

chrome.runtime.onInstalled.addListener(async()=>{
  await chrome.contextMenus.removeAll();
  chrome.contextMenus.create({id:'x-arquivo-save',title:'Salvar post no X-HTML',contexts:['link'],targetUrlPatterns:['https://x.com/*/status/*']});
  chrome.alarms.create('resume-jobs',{periodInMinutes:1});
});
chrome.contextMenus.onClicked.addListener((info)=>{if(info.menuItemId==='x-arquivo-save'){const id=info.linkUrl?.match(/\/status\/(\d+)/)?.[1];if(id)saveById(id,'contextmenu');}});
chrome.commands.onCommand.addListener(async command=>{if(command!=='save-current-post')return;const [tab]=await chrome.tabs.query({active:true,lastFocusedWindow:true});if(tab?.id)chrome.tabs.sendMessage(tab.id,{type:'SAVE_CURRENT'}).catch(()=>{});});
chrome.alarms.onAlarm.addListener(async alarm=>{if(alarm.name!=='resume-jobs')return;const jobs=await chrome.storage.local.get('pendingJobs');for(const id of jobs.pendingJobs||[]){const job=await get('jobs',id);if(!shouldResumeJob(job))continue;if(job.downloadIds?.length){const downloads=await Promise.all(job.downloadIds.map(downloadId=>chrome.downloads.search({id:downloadId})));if(downloads.flat().some(d=>d.state==='in_progress'))continue;}sendOffscreen({type:'RESUME',jobId:id}).catch(()=>{});}});

async function reconcileJob(jobId){
  const job=await get('jobs',jobId);if(!job?.enqueueComplete||!job.downloadIds?.length)return;
  const states=(await Promise.all(job.downloadIds.map(id=>chrome.downloads.search({id})))).flat();
  if(!shouldFinishJob(job,states))return;
  const mismatched=states.find(d=>job.expectedFilenames?.[d.id]&&!matchesDownloadPath(d.filename,job.expectedFilenames[d.id]));
  if(mismatched){await updateJob(jobId,{status:'failed',error:'O Chrome alterou o nome ou destino do arquivo: '+mismatched.filename});return;}
  await updateJob(jobId,{status:'complete',progress:100,completedAt:new Date().toISOString()});
  const pending=(await chrome.storage.local.get('pendingJobs')).pendingJobs||[];await chrome.storage.local.set({pendingJobs:pending.filter(id=>id!==jobId)});
}

async function saveById(postId,source='popup'){
  const post=await get('posts',String(postId));if(!post)return {ok:false,error:'O X ainda não entregou os dados deste post. Abra o post no X e tente novamente.'};
  const selected=(await chrome.storage.local.get({format:'html'})).format;
  const allowPscp=await chrome.permissions.contains({origins:['https://*.video.pscp.tv/*']});
  const id=crypto.randomUUID(),base=fileBase(post),job={id,postId:post.id,stableId:post.stableId,base,format:selected,source,allowPscp,status:'queued',createdAt:new Date().toISOString(),progress:0};
  await setJob(job);const pending=(await chrome.storage.local.get('pendingJobs')).pendingJobs||[];await chrome.storage.local.set({pendingJobs:[...new Set([...pending,id])]});
  await sendOffscreen({type:'PROCESS_SAVE',job});return {ok:true,jobId:id};
}
chrome.runtime.onMessage.addListener((message,sender,respond)=>{
  if(message?.target==='offscreen')return false;
  if(message?.type==='CAPTURE'){
    const p=message.payload;if(!sender.url?.startsWith('https://x.com/')){respond({ok:false});return;}
    try{const parsed=parseResponse(p.data,{operation:p.operation});const rate=Object.keys(p.rate||{}).length?{operation:p.operation,...p.rate}:null;storeCaptured(parsed.posts,{operation:p.operation,rate,observedAt:new Date().toISOString(),diagnostic:parsed.posts.length?null:{operation:p.operation,reason:'Nenhum post reconhecido',path:p.url}}).then(count=>respond({ok:true,count})).catch(e=>respond({ok:false,error:e.name||'CaptureError'}));}catch(e){storeCaptured([],{diagnostic:{operation:p.operation,error:e.name||'CaptureError'}}).finally(()=>respond({ok:false}));}return true;
  }
  if(message?.type==='SAVE'){saveById(String(message.postId),message.source).then(respond).catch(e=>respond({ok:false,error:e.message}));return true;}
  if(message?.type==='EXPORT_DIAGNOSTICS'){import('./core/db.js').then(({all})=>all('diagnostics')).then(items=>respond({ok:true,items:redact(items)})).catch(()=>respond({ok:false,items:[]}));return true;}
  if(message?.type==='DOWNLOAD_REQUEST'){
    const {jobId,url,filename,mime}=message;startNamedDownload(chrome,{url,filename}).then(async downloadId=>{const job=await get('jobs',jobId);const downloadIds=[...new Set([...(job?.downloadIds||[]),downloadId])];const patch={downloadId,downloadIds,filename,mime,expectedFilenames:{...job?.expectedFilenames,[downloadId]:filename}};if(!['failed','interrupted'].includes(job?.status))patch.status='downloading';await Promise.all([put('downloads',{id:String(downloadId),downloadId,url,filename,jobId,createdAt:new Date().toISOString()}),updateJob(jobId,patch)]);respond({ok:true,downloadId});}).catch(async e=>{await updateJob(jobId,{status:'failed',error:e.message});respond({ok:false,error:e.message});});return true;
  }
  if(message?.type==='JOB_UPDATE')updateJob(message.jobId,message.patch).then(async()=>{if(message.patch?.status==='failed'){const pending=(await chrome.storage.local.get('pendingJobs')).pendingJobs||[];await chrome.storage.local.set({pendingJobs:pending.filter(id=>id!==message.jobId)});}if(message.patch?.enqueueComplete)await reconcileJob(message.jobId);respond({ok:true});}).catch(()=>respond({ok:false}));
  return message?.type==='JOB_UPDATE';
});

chrome.downloads.onChanged.addListener(async delta=>{
  if(!delta.state&&!delta.filename&&!delta.error)return;
  const download=await get('downloads',String(delta.id));if(download&&(delta.state?.current==='complete'||delta.error?.current)){await sendOffscreen({type:'DOWNLOAD_DONE',downloadId:delta.id}).catch(()=>{});await forgetDownloadName(chrome,download.url);await remove('downloads',String(delta.id));}
  const allPending=await chrome.storage.local.get('pendingJobs');for(const jobId of allPending.pendingJobs||[]){const job=await get('jobs',jobId);if(!job||!(job.downloadIds||[job.downloadId]).includes(delta.id))continue;
    if(delta.filename?.current){if(delta.filename.current.length>240){await updateJob(jobId,{status:'failed',error:'O caminho real excedeu 240 caracteres.'});const p=(await chrome.storage.local.get('pendingJobs')).pendingJobs||[];await chrome.storage.local.set({pendingJobs:p.filter(id=>id!==jobId)});continue;}await updateJob(jobId,{actualFilename:delta.filename.current});}
    if(delta.error?.current){await updateJob(jobId,{status:'failed',error:delta.error.current});const p=(await chrome.storage.local.get('pendingJobs')).pendingJobs||[];await chrome.storage.local.set({pendingJobs:p.filter(id=>id!==jobId)});}
    if(delta.state?.current==='complete')await reconcileJob(jobId);
    if(delta.state?.current==='interrupted')await updateJob(jobId,{status:'interrupted',error:'Download interrompido pelo Chrome; reprocessamento manual disponível.'});
  }
});
