import { get,all,put,updateJob,reserveName } from './core/db.js';
import { renderHTMLStream,renderMarkdown } from './core/render.js';
import { mediaUrl } from './core/security.js';
import { chooseVariant,articleBlocks,collectThread } from './core/model.js';
import { parseMasterPlaylist,parseMediaPlaylist } from './core/hls.js';
import { fileBase,outputPath } from './core/names.js';
import { htmlDocumentBlob } from './core/downloads.js';
import { FFmpeg } from './vendor/ffmpeg/package/dist/esm/index.js';

let active=false;
const activeJobs=new Set();
const objectUrls=new Map();
const report=(id,patch)=>chrome.runtime.sendMessage({type:'JOB_UPDATE',jobId:id,patch}).catch(()=>{});
async function requestDownload(job,blob,filename){
  const url=URL.createObjectURL(blob);
  try{const res=await chrome.runtime.sendMessage({type:'DOWNLOAD_REQUEST',jobId:job.id,url,filename,mime:blob.type});if(!res?.ok)throw new Error(res?.error||'Falha ao iniciar download');objectUrls.set(res.downloadId,url);}
  catch(e){URL.revokeObjectURL(url);throw e;}
}
async function fetchAsset(url,allowPscp=false){
  const u=mediaUrl(url,allowPscp);const response=await fetch(u.href,{credentials:'omit',redirect:'follow',referrerPolicy:'no-referrer',cache:'no-store'});if(!response.ok)throw new Error(`HTTP ${response.status}`);mediaUrl(response.url,allowPscp);return response.blob();
}
async function mergeHls(masterUrl,allowPscp){
  const master=await fetchAsset(masterUrl,allowPscp);const parsed=parseMasterPlaylist(await master.text(),masterUrl);
  const videoUrl=parsed.selected.url;const videoText=await (await fetchAsset(videoUrl,allowPscp)).text();const video=parseMediaPlaylist(videoText,videoUrl);
  const audioTrack=parsed.audio.find(a=>a.default)||parsed.audio[0];let audio=null;
  if(audioTrack?.url){const t=await (await fetchAsset(audioTrack.url,allowPscp)).text();audio=parseMediaPlaylist(t,audioTrack.url);}
  const ff=new FFmpeg();const root=chrome.runtime.getURL('vendor/core/package/dist/esm/');
  await ff.load({coreURL:root+'ffmpeg-core.js',wasmURL:root+'ffmpeg-core.wasm'});
  const writePlaylist=async(list,prefix)=>{let n=0;const lines=['#EXTM3U','#EXT-X-VERSION:7',`#EXT-X-TARGETDURATION:${Math.ceil(Math.max(...list.segments.map(s=>s.duration)))}`,'#EXT-X-MEDIA-SEQUENCE:0'];if(list.map){const b=await fetchAsset(list.map.url,allowPscp);await ff.writeFile(`${prefix}-init.mp4`,new Uint8Array(await b.arrayBuffer()));lines.push(`#EXT-X-MAP:URI="${prefix}-init.mp4"`);}
    for(const seg of list.segments){let response;if(seg.range){response=await fetch(seg.url,{headers:{Range:`bytes=${seg.range.offset}-${seg.range.offset+seg.range.length-1}`},credentials:'omit',redirect:'follow',referrerPolicy:'no-referrer'});if(!response.ok&&response.status!==206)throw new Error('Falha ao baixar byte range');mediaUrl(response.url,allowPscp);}else response=await fetchAsset(seg.url,allowPscp);
      const bytes=new Uint8Array(await response.arrayBuffer());const filename=`${prefix}-${String(n++).padStart(6,'0')}.m4s`;await ff.writeFile(filename,bytes);lines.push(`#EXTINF:${seg.duration.toFixed(3)},`,filename);}
    lines.push('#EXT-X-ENDLIST');const filename=`${prefix}.m3u8`;await ff.writeFile(filename,new TextEncoder().encode(lines.join('\n')));return filename;
  };
  const videoFile=await writePlaylist(video,'v');let audioFile;if(audio)audioFile=await writePlaylist(audio,'a');
  const args=['-allowed_extensions','ALL','-protocol_whitelist','file,crypto,data','-i',videoFile];if(audioFile)args.push('-allowed_extensions','ALL','-protocol_whitelist','file,crypto,data','-i',audioFile);
  if(audioFile)args.push('-map','0:v:0','-map','1:a:0?');args.push('-c','copy','-movflags','+faststart','out.mp4');const code=await ff.exec(args);if(code!==0)throw new Error(`ffmpeg remux falhou (${code})`);const out=await ff.readFile('out.mp4');ff.terminate();return new Blob([out],{type:'video/mp4'});
}
async function save(job){
  const post=await get('posts',String(job.postId));if(!post)throw new Error('Post não encontrado no armazenamento local.');
  const observed=await all('posts');const thread=collectThread(observed,post.id);const outputPosts=thread.length>1?thread:[post];post.isThread=thread.length>1;
  if(post.isThread){post.threadPostIds=outputPosts.map(p=>p.id);post.stableId=outputPosts[0].stableId;}
  const candidate=fileBase(outputPosts[0]);const base=await reserveName(post,candidate);await updateJob(job.id,{base,status:'capturing',progress:2});job.base=base;
  if(post.article){const embedded={};for(const b of articleBlocks(post.article))if(b.type==='embed'){const found=observed.find(x=>x.id===b.postId);if(found)embedded[b.postId]=found;}post.article.embeddedPosts=embedded;}
  const embeddedPosts=Object.values(post.article?.embeddedPosts||{});const media=[...outputPosts,...embeddedPosts].flatMap(p=>p.media||[]);
  for(const p of [...outputPosts,...embeddedPosts])for(const m of p.quote?.media||[])media.push({...m,quoted:true});
  if(post.article){const byId=new Map((post.article.mediaEntities||[]).map(m=>[String(m.mediaId||m.id),m]));for(const b of articleBlocks(post.article))if(b.type==='media'&&b.media)media.push({...b.media,...byId.get(String(b.media.id)),id:String(b.media.id),url:b.media.url||b.media.original_img_url||b.media.preview_image?.original_img_url||'',alt:b.media.alt_text||b.media.alt||''});}
  if(post.article?.cover?.url)media.unshift({id:`cover:${post.id}`,type:'photo',url:post.article.cover.url,alt:'Capa do artigo'});
  const uniqueMedia=[...new Map(media.map(m=>[m.id,m])).values()];
  const previous=await all('assets'),assets=new Map();for(const a of previous)if(a.id.startsWith(`${post.stableId}:`))assets.set(a.mediaId,{blob:a.blob,mime:a.mime});
  for(const p of [...outputPosts,...embeddedPosts]){const avatarKey=`avatar:${p.author?.id||''}`;if(p.author?.avatar&&!assets.has(avatarKey)){try{const avatar=await fetchAsset(p.author.avatar);await put('assets',{id:`${post.stableId}:${avatarKey}`,mediaId:avatarKey,stableId:post.stableId,blob:avatar,mime:avatar.type||'image/jpeg',size:avatar.size});assets.set(avatarKey,{blob:avatar,mime:avatar.type||'image/jpeg'});}catch{}}}
  let completed=0;const queue=uniqueMedia.filter(m=>!assets.has(m.id));let cursor=0;
  const worker=async()=>{while(cursor<queue.length){const m=queue[cursor++];try{let blob;
    if(m.failure)throw new Error(m.failure);
    const best=chooseVariant(m);if(m.type==='video'||m.type==='animated_gif'){if(best)blob=await fetchAsset(best.url,job.allowPscp);else if(m.variants?.some(v=>/\.m3u8(?:\?|$)/i.test(v.url))){const master=m.variants.find(v=>/\.m3u8(?:\?|$)/i.test(v.url));blob=await mergeHls(master.url,job.allowPscp);}else throw new Error('Variante de vídeo não disponível');}
    else blob=await fetchAsset(m.url);
    await put('assets',{id:`${post.stableId}:${m.id}`,mediaId:m.id,stableId:post.stableId,blob,mime:blob.type||'application/octet-stream',size:blob.size});assets.set(m.id,{blob,mime:blob.type||'application/octet-stream'});
  }catch(e){m.failure=`Falha ao obter mídia: ${e.message}`;const original=post.article?.mediaEntities?.find(x=>String(x.mediaId||x.id)===String(m.id));if(original)original.failure=m.failure;if(m.quoted)for(const p of [...outputPosts,...embeddedPosts]){const quoted=p.quote?.media?.find(x=>String(x.id)===String(m.id));if(quoted)quoted.failure=m.failure;}if(String(m.id).startsWith('cover:')&&post.article?.cover)post.article.cover.failure=m.failure;}completed++;await updateJob(job.id,{progress:Math.min(70,Math.round(5+65*completed/Math.max(1,queue.length))),completedMedia:completed,totalMedia:queue.length});}};
  await Promise.all([worker(),worker()]);
  const assetData=new Map();for(const [id,a] of assets)assetData.set(id,{blob:a.blob,mime:a.mime});
  const format=job.format||'html';let blob,filename,directDownloads=false;
  const checkedName=(stem,ext,folder='')=>outputPath('',stem,ext,folder).relative;
  if(format==='html'){const iterator=renderHTMLStream({post,posts:outputPosts,assets:assetData,capturedAt:new Date().toISOString()})[Symbol.asyncIterator]();const stream=new ReadableStream({async pull(controller){try{const item=await iterator.next();if(item.done)controller.close();else controller.enqueue(new TextEncoder().encode(item.value));}catch(error){controller.error(error);}}});blob=await htmlDocumentBlob(stream);filename=checkedName(base,'.html');}
  else if(format==='markdown'){for(let i=0;i<uniqueMedia.length;i++){const m=uniqueMedia[i],a=assets.get(m.id);if(a)assetData.get(m.id).filename=`${String(i+1).padStart(2,'0')}.${a.mime.includes('video')?'mp4':a.mime.includes('png')?'png':'jpg'}`;}const md=renderMarkdown({post,posts:outputPosts,assets:assetData,folder:base,capturedAt:new Date().toISOString()});blob=new Blob([md],{type:'text/markdown;charset=utf-8'});filename=checkedName(base,'.md');for(const m of uniqueMedia){const a=assets.get(m.id),n=assetData.get(m.id)?.filename;if(a&&n)await requestDownload(job,a.blob,checkedName(n,'',`${base}_midias`));}}
  else if(format==='media'){const ready=uniqueMedia.filter(m=>assets.has(m.id));if(!ready.length)throw new Error('Não há mídias disponíveis para baixar.');directDownloads=true;for(let i=0;i<ready.length;i++){const m=ready[i],a=assets.get(m.id),ext=a.mime.includes('video')?'.mp4':a.mime.includes('png')?'.png':'.jpg',stem=ready.length===1?base:`${base}_${String(i+1).padStart(2,'0')}`,target=checkedName(stem,ext);if(i===0)filename=target;await requestDownload(job,a.blob,target);}}
  else throw new Error('Formato de saída inválido');
  await updateJob(job.id,{status:'saving',progress:85,failures:uniqueMedia.filter(m=>m.failure).map(m=>({id:m.id,error:m.failure}))});
  if(!directDownloads)await requestDownload(job,blob,filename);
  await report(job.id,{progress:95,enqueueComplete:true});
}
async function runJob(job){
  if(active||activeJobs.has(job.id))return;
  active=true;activeJobs.add(job.id);
  const heartbeat=setInterval(()=>updateJob(job.id,{heartbeatAt:new Date().toISOString()}).catch(()=>{}),15_000);
  try{await save(job);}catch(e){await report(job.id,{status:'failed',error:e.message});}
  finally{clearInterval(heartbeat);activeJobs.delete(job.id);active=false;}
}
chrome.runtime.onMessage.addListener((message)=>{
  if(message?.target!=='offscreen')return;
  if(message.type==='DOWNLOAD_DONE'){const url=objectUrls.get(message.downloadId);if(url){URL.revokeObjectURL(url);objectUrls.delete(message.downloadId);}}
  if(message.type==='PROCESS_SAVE')runJob(message.job);
  if(message.type==='RESUME')get('jobs',message.jobId).then(job=>job&&runJob(job)).catch(()=>{});
});
