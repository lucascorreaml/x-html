function attrs(source){const out={};for(const m of source.matchAll(/([A-Z0-9-]+)=(?:"([^"]*)"|([^,]*))/g))out[m[1]]=m[2]??m[3];return out;}
function resolve(uri,base){try{return new URL(uri,base).href}catch{throw new Error('URL HLS inválida');}}
function checked(url){const u=new URL(url);if(u.protocol!=='https:'||u.username||u.password)throw new Error('URL HLS não permitida');const h=u.hostname.toLowerCase();if(!(h==='video.twimg.com'||h.endsWith('.video.twimg.com')||h==='video.pscp.tv'||h.endsWith('.video.pscp.tv')))throw new Error('host HLS não permitido');return u.href;}
export function parseMasterPlaylist(text,baseUrl){
  const lines=String(text).split(/\r?\n/).map(x=>x.trim()).filter(Boolean);if(lines[0]!=='#EXTM3U')throw new Error('playlist HLS inválida');
  if(lines.some(x=>/^#EXT-X-SESSION-KEY:/i.test(x)&&!/^#EXT-X-SESSION-KEY:METHOD=NONE(?:,|$)/i.test(x)))throw new Error('playlist HLS criptografada/DRM não suportada');
  const audio=[],subtitles=[],variants=[];let pending=null;
  for(const line of lines){
    if(line.startsWith('#EXT-X-MEDIA:')){const a=attrs(line.slice(line.indexOf(':')+1));const item={type:a.TYPE,name:a.NAME||'',groupId:a['GROUP-ID']||'',default:a.DEFAULT==='YES',url:a.URI?checked(resolve(a.URI,baseUrl)):''};if(a.TYPE==='AUDIO')audio.push(item);if(a.TYPE==='SUBTITLES')subtitles.push(item);}
    else if(line.startsWith('#EXT-X-STREAM-INF:'))pending=attrs(line.slice(line.indexOf(':')+1));
    else if(pending&&!line.startsWith('#')){const r=(pending.RESOLUTION||'0x0').split('x').map(Number);variants.push({url:checked(resolve(line,baseUrl)),bandwidth:Number(pending.BANDWIDTH||0),resolution:{width:r[0]||0,height:r[1]||0},codecs:pending.CODECS||'',audioGroup:pending.AUDIO||'',subtitleGroup:pending.SUBTITLES||''});pending=null;}
  }
  variants.sort((a,b)=>(b.resolution.width*b.resolution.height-a.resolution.width*a.resolution.height)||b.bandwidth-a.bandwidth);
  if(!variants.length)throw new Error('master HLS sem variantes');
  const selected=variants[0];return {variants,selected,audio:audio.filter(a=>!selected.audioGroup||a.groupId===selected.audioGroup),subtitles:subtitles.filter(s=>!selected.subtitleGroup||s.groupId===selected.subtitleGroup)};
}
export function parseMediaPlaylist(text,baseUrl){
  const lines=String(text).split(/\r?\n/).map(x=>x.trim());if(lines[0]!=='#EXTM3U')throw new Error('playlist HLS inválida');
  if(lines.some(x=>/^#EXT-X-KEY:/i.test(x)&&!/^#EXT-X-KEY:METHOD=NONE(?:,|$)/i.test(x)))throw new Error('playlist criptografada/DRM não suportada');
  let map=null,duration=0,pendingRange=null,pendingDuration=null,complete=false;const segments=[];
  for(let i=1;i<lines.length;i++){const line=lines[i];if(!line)continue;
    if(line==='#EXT-X-ENDLIST')complete=true;
    else if(line==='#EXT-X-GAP'||line==='#EXT-X-DISCONTINUITY')throw new Error('segmento HLS com lacuna ou descontinuidade não suportado');
    else if(line.startsWith('#EXT-X-MAP:')){const a=attrs(line.slice(line.indexOf(':')+1));map={url:checked(resolve(a.URI,baseUrl)),range:a.BYTERANGE||''};if(map.range)throw new Error('byterange em mapa HLS não suportado nesta versão');}
    else if(line.startsWith('#EXT-X-BYTERANGE:'))pendingRange=line.slice(line.indexOf(':')+1);
    else if(line.startsWith('#EXTINF:'))pendingDuration=parseFloat(line.slice(8));
    else if(line.startsWith('#EXT-X-PART:')||line.startsWith('#EXT-X-PRELOAD-HINT:'))throw new Error('playlist live/LL-HLS não suportada');
    else if(!line.startsWith('#')){
      const url=checked(resolve(line,baseUrl));let range=null;
      if(pendingRange){const pieces=pendingRange.split('@');const len=Number(pieces[0]),offset=Number(pieces[1]);if(pieces.length!==2||!Number.isFinite(len)||!Number.isFinite(offset)||len<1||offset<0)throw new Error('byterange implícito não suportado');range={length:len,offset};}
      if(!Number.isFinite(pendingDuration))throw new Error('segmento sem duração');
      segments.push({url,duration:pendingDuration,range});duration+=pendingDuration;pendingRange=null;pendingDuration=null;
    }
  }
  if(!complete)throw new Error('playlist ao vivo ou incompleta (sem ENDLIST)');
  if(!segments.length)throw new Error('playlist VOD vazia');
  return {complete,duration,segments,map};
}
