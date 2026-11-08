import { escapeHTML, safeLink } from './security.js';
import { postCss, articleCss } from './styles.js';
import { entityEntries,atomicContent,fencedCode,inferredLinks } from './article.js';

// Os arquivos de estilo são cópias byte a byte do CSS dos gabaritos entregues.
const titleOf = p => p.article?.title || (p.text || '').split(/\s+/).slice(0,12).join(' ') || 'Post no X';
const date = value => { const d=new Date(value); return Number.isNaN(d.getTime()) ? '' : new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:'short'}).format(d); };
const articleExtras='pre{max-width:100%;overflow-x:auto;white-space:pre;padding:16px;border:1px solid var(--line);border-radius:10px;background:var(--bg);color:var(--fg);font:14px/1.5 Consolas,monospace;tab-size:4}pre code{font:inherit;white-space:inherit}';

function author(p, assets=new Map(), showAvatar=true) {
  const a=p.author||{};
  const avatarAsset=assets.get(`avatar:${a.id}`);
  const avatarData=avatarAsset?.data;
  const avatarSrc=Array.isArray(avatarData)?avatarData.join(''):avatarData;
  const avatar=showAvatar&&avatarSrc ? `<img class="av" alt="Foto de ${escapeHTML(a.name||a.handle)}" src="data:${escapeHTML(avatarAsset.mime||'image/jpeg')};base64,${avatarSrc}">` : '';
  const color=a.badge==='business'?'#f4b400':a.badge==='government'?'#829aab':'#1d9bf0';
  const badge=a.badge ? `<svg class="badge" viewBox="0 0 24 24" aria-label="Conta verificada"><path d="M12 1.5l2.6 1.9 3.2.2 1 3 2.6 1.9-1 3.1 1 3.1-2.6 1.9-1 3-3.2.2L12 22.5l-2.6-1.9-3.2-.2-1-3L2.6 15.5l1-3.1-1-3.1 2.6-1.9 1-3 3.2-.2z" fill="${color}"/><path d="M7.8 12.4l2.8 2.8 5.6-5.8" stroke="#fff" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>` : '';
  return `<div class="author">${avatar}<div class="who"><span class="name">${escapeHTML(a.name||a.handle||'Autor')}${badge}</span><br><span class="handle">@${escapeHTML(a.handle||'')}</span></div></div>`;
}

function postHTML(p, assets, index, markers=false, thread=false) {
  const link=safeLink(p.url || `https://x.com/${encodeURIComponent(p.author?.handle||'i')}/status/${encodeURIComponent(p.id)}`);
  let text=escapeHTML(p.text||'').replace(/\n/g,'<br>');
  for(const e of p.entities||[]){const short=escapeHTML(e.url||''),href=safeLink(e.expandedUrl);if(short&&href)text=text.replaceAll(short,`<a href="${escapeHTML(href)}">${escapeHTML(e.displayUrl||e.expandedUrl)}</a>`);}
  const media=(p.media||[]).map(m=>{
    const asset=assets.get(m.id); const alt=escapeHTML(m.alt||'');
    if (asset?.data && m.type==='photo') return `<figure><img alt="${alt}" src="data:${escapeHTML(asset.mime||'image/jpeg')};base64,${Array.isArray(asset.data)?asset.data.join(''):asset.data}"></figure>`;
    if (m.failure || !asset?.data) return `<figure class="unavailable"><div role="status">${escapeHTML(m.failure||'Mídia ainda não capturada')}${alt?` · ${alt}`:''}</div></figure>`;
    const videoId=`v-${index}-${escapeHTML(m.id).replace(/[^a-zA-Z0-9_-]/g,'')}`;
    const chunks=Array.isArray(asset.data)?asset.data:[asset.data];
    return `<figure class="video"><video id="${videoId}" data-media-id="${escapeHTML(m.id)}" controls preload="none" playsinline></video><figcaption>${alt||'Vídeo'}${m.durationMs?` · ${Math.round(m.durationMs/1000)} s`:''}</figcaption></figure>${chunks.map((chunk,i)=>`<script type="text/plain" id="${videoId}-data-${i}">${markers?`%%XASSET_${chunk}%%`:chunk}</script>`).join('')}`;
  }).join('');
  const poll=p.poll ? (()=>{const choices=p.poll.choices.map(c=>({...c,votes:Math.max(0,Number(c.votes)||0)})),total=choices.reduce((n,c)=>n+c.votes,0),top=Math.max(0,...choices.map(c=>c.votes));return `<section class="poll">${choices.map(c=>{const percent=total?Math.round(c.votes*100/total):0;return `<div class="opt${c.votes===top?' win':''}"><div class="bar" style="width:${percent}%"></div><span>${escapeHTML(c.label)}</span><span>${percent}%</span></div>`;}).join('')}<div class="pollfoot">${total.toLocaleString('pt-BR')} votos · ${p.poll.final?'Resultados finais':'Na data da captura'}</div></section>`;})() : '';
  const note=p.communityNote?`<aside class="note"><strong>Nota da Comunidade</strong><p>${escapeHTML(p.communityNote.text)}</p>${p.communityNote.entities.map(e=>{const u=safeLink(e.expandedUrl);return u?`<a href="${escapeHTML(u)}">${escapeHTML(e.text||u)}</a>`:''}).join(' ')}</aside>`:'';
  const quote=p.quote?`<blockquote class="quote"><div class="qhead">${escapeHTML(p.quote.author?.name||p.quote.author?.handle||'Post citado')}</div><div class="qtext">${escapeHTML(p.quote.text||'')}</div>${(p.quote.media||[]).map((q,qi)=>{const a=assets.get(q.id);if(!a?.data)return `<span role="status">${escapeHTML(q.failure||'Mídia citada não capturada')}</span>`;if(q.type==='photo')return `<img class="qmedia" alt="${escapeHTML(q.alt||'Imagem do post citado')}" src="data:${escapeHTML(a.mime||'image/jpeg')};base64,${Array.isArray(a.data)?a.data.join(''):a.data}">`;const id=`quote-${p.quote.id||index}-${escapeHTML(q.id).replace(/[^a-zA-Z0-9_-]/g,'')}`,chunks=Array.isArray(a.data)?a.data:[a.data];return `<video class="qmedia" id="${id}" data-media-id="${escapeHTML(q.id)}" controls preload="none" playsinline></video>${chunks.map((chunk,n)=>`<script type="text/plain" id="${id}-data-${n}">${chunk}</script>`).join('')}`;}).join('')}</blockquote>`:'';
  const card=p.card?`<a class="card" href="${escapeHTML(safeLink(p.card.url)||'#')}">${assets.get(`card:${p.id}`)?.data?`<img alt="${escapeHTML(p.card.title||'Imagem do link')}" src="data:${escapeHTML(assets.get(`card:${p.id}`).mime||'image/jpeg')};base64,${assets.get(`card:${p.id}`).data}">`:''}<div class="cbody"><span class="dom">${escapeHTML(p.card.domain||'')}</span><br><span class="ttl">${escapeHTML(p.card.title||p.card.url||'Link')}</span></div></a>`:'';
  const metrics=p.metrics||{};
  const avatarAsset=assets.get(`avatar:${p.author?.id}`),avatarData=avatarAsset?.data;
  const avatar=Array.isArray(avatarData)?avatarData.join(''):avatarData;
  const content=`${author(p,assets,false)}<div class="handle">${escapeHTML(date(p.createdAt))}${p.edited?' · editado':''}</div><p>${text}</p>${quote}${media}${poll}${card}${note}<div class="metrics">Respostas ${Number(metrics.replies||0)} · Reposts ${Number(metrics.retweets||0)} · Curtidas ${Number(metrics.likes||0)} · Itens salvos ${Number(metrics.bookmarks||0)} · Visualizações ${Number(metrics.views||0)} <span>(na data da captura)</span></div><p>Original: ${link?`<a href="${escapeHTML(link)}">${escapeHTML(link)}</a>`:'link indisponível'}</p>`;
  return `<article class="post${thread?' thread':''}"><div class="rail">${avatar?`<img alt="Foto de perfil" src="data:${escapeHTML(avatarAsset.mime||'image/jpeg')};base64,${avatar}">`:''}</div><div>${content}</div></article>`;
}

function articleText(b,byKey,markdown=false) {
  const source=b.text||'',explicit=b.entityRanges||[],styles=b.inlineStyleRanges||[];
  const automatic=inferredLinks(source).filter(r=>![...explicit,...styles.filter(s=>s.style==='Code')].some(e=>r.offset<e.offset+e.length&&r.offset+r.length>e.offset));
  const points=new Set([0,source.length]);
  for(const r of [...styles,...explicit,...automatic]){points.add(r.offset);points.add(r.offset+r.length);}
  const sorted=[...points].filter(n=>Number.isInteger(n)&&n>=0&&n<=source.length).sort((x,y)=>x-y);let result='';
  for(let i=0;i<sorted.length-1;i++){
    const start=sorted[i],end=sorted[i+1];if(start===end)continue;
    const raw=source.slice(start,end);let part=markdown?markdownText(raw):escapeHTML(raw);
    const er=explicit.find(r=>r.offset<=start&&r.offset+r.length>=end),entity=er&&byKey.get(String(er.key));
    const inferred=automatic.find(r=>r.offset<=start&&r.offset+r.length>=end);
    const href=safeLink(entity?.data?.url||entity?.data?.expandedUrl||entity?.data?.expanded_url||inferred?.url||'');
    if(href)part=markdown?`[${part.replace(/[\[\]\\]/g,'\\$&')}](${href.replace(/[()]/g,c=>encodeURIComponent(c))})`:`<a href="${escapeHTML(href)}">${part}</a>`;
    for(const r of styles.filter(r=>r.offset<=start&&r.offset+r.length>=end)){
      if(markdown){const mark={Bold:'**',Italic:'*',Strikethrough:'~~'}[r.style];if(mark)part=mark+part+mark;if(r.style==='Code'){const ticks='`'.repeat(Math.max(1,...[...raw.matchAll(/`+/g)].map(m=>m[0].length+1)));part=ticks+' '+raw.replace(/[<>]/g,c=>c==='<'?'&lt;':'&gt;')+' '+ticks;}}
      else {const tag={Bold:'strong',Italic:'em',Strikethrough:'s',Code:'code'}[r.style];if(tag)part=`<${tag}>${part}</${tag}>`;}
    }
    result+=part;
  }
  return markdown?result:result.replace(/\n/g,'<br>');
}

function articleBody(p, assets) {
  const a=p.article;
  const mediaById=new Map((a.mediaEntities||[]).map(m=>[String(m.mediaId||m.id),m]));
  const ids=entityEntries(a.entityMap).map(e=>[String(e.key),e.value]);
  const byKey=new Map(ids);
  const blocks=(a.blocks||[]).map((b,i)=>{
    const type=b.type||'unstyled', html=articleText(b,byKey);
    if(type==='atomic'){
      const ent=byKey.get(String(b.entityRanges?.[0]?.key)); const item=ent?.data?.mediaItems?.[0];
      const decoded=atomicContent(ent);
      if(decoded?.type==='divider')return '<hr>';
      if(decoded?.type==='code')return `<pre><code class="language-${escapeHTML(decoded.language)}">${escapeHTML(decoded.text)}</code></pre>`;
      if(item?.mediaId){
        const m=mediaById.get(String(item.mediaId)); const asset=assets.get(String(item.mediaId));
        if(!asset?.data)return `<figure class="unavailable" data-media-id="${escapeHTML(item.mediaId)}" data-media-type="${m?.type==='video'?'video':'photo'}">${escapeHTML(m?.failure||`${m?.type==='video'?'Vídeo':'Imagem'} não capturado`)}</figure>`;
        if(m?.type==='video'){const id=`article-${escapeHTML(item.mediaId)}`;const chunks=Array.isArray(asset.data)?asset.data:[asset.data];return `<figure><video id="${id}" controls preload="none" playsinline data-media-id="${escapeHTML(item.mediaId)}" data-media-type="video"></video><figcaption>${i+1} · ${Math.round((m.duration_millis||0)/1000)} s</figcaption></figure>${chunks.map((c,n)=>`<script type="text/plain" id="${id}-data-${n}">${c}</script>`).join('')}`;}
        return `<figure><img data-media-type="photo" alt="${escapeHTML(m?.alt_text||'Imagem do artigo')}" src="data:${escapeHTML(asset.mime||'image/jpeg')};base64,${Array.isArray(asset.data)?asset.data.join(''):asset.data}"></figure>`;
      }
      if(ent?.data?.tweetId){const embedded=a.embeddedPosts?.[String(ent.data.tweetId)];return embedded?`<section class="embed">${postHTML(embedded,assets,`embed-${i}`)}</section>`:`<blockquote class="embed">Post incorporado ainda não capturado: <a href="https://x.com/i/status/${encodeURIComponent(ent.data.tweetId)}">abrir post ${escapeHTML(ent.data.tweetId)}</a></blockquote>`;}
      return '<p class="unsupported">Bloco incorporado não reconhecido</p>';
    }
    if(type==='header-one')return `<h1>${html}</h1>`; if(type==='header-two')return `<h2>${html}</h2>`; if(type==='header-three')return `<h3>${html}</h3>`;
    if(type==='blockquote')return `<blockquote>${html}</blockquote>`; if(type==='divider')return '<hr>';
    if(type==='unordered-list-item')return `<li data-list="ul">${html}</li>`; if(type==='ordered-list-item')return `<li data-list="ol">${html}</li>`;
    return `<p>${html}</p>`;
  });
  const cover=assets.get(`cover:${p.id}`);
  const grouped=[];for(let i=0;i<blocks.length;i++){if(blocks[i].startsWith('<li data-list="')){const kind=blocks[i].match(/data-list="(ul|ol)"/)?.[1]||'ul',items=[];while(i<blocks.length&&blocks[i].startsWith(`<li data-list="${kind}">`)){items.push(blocks[i].replace(`<li data-list="${kind}">`,'<li>'));i++;}i--;grouped.push(`<${kind}>${items.join('')}</${kind}>`);}else grouped.push(blocks[i]);}
  const coverHtml=cover?.data?`<figure class="cover"><img alt="Capa do artigo" src="data:${escapeHTML(cover.mime||'image/jpeg')};base64,${Array.isArray(cover.data)?cover.data.join(''):cover.data}"></figure>`:p.article.cover?.url?'<p class="unavailable" role="status">Capa do artigo não foi capturada.</p>':'';
  return `${coverHtml}${grouped.join('\n')}`;
}

function documentShell({title, css, body, capturedAt, script=''}) {
  // The fixed loader is authorized by its computed CSP hash; no external code or connections.
  let policy="default-src 'none'; img-src data: blob:; media-src data: blob:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; connect-src 'none'; object-src 'none';";
  if(script){
    // A fresh nonce allows only this fixed, packaged loader to run in the offline file.
    const nonce=globalThis.crypto?.randomUUID?.().replace(/-/g,'') || Math.random().toString(36).slice(2);
    script=script.replace('%%NONCE%%',nonce);
    policy += ` script-src 'nonce-${nonce}';`;
  }
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="${policy}"><title>${escapeHTML(title)}</title><style>${css}</style></head><body><main>${body}<footer class="foot">Capturado em ${escapeHTML(date(capturedAt)||capturedAt||'')}</footer></main>${script}</body></html>`;
}

export function renderHTML({post, posts, assets=new Map(), capturedAt=new Date().toISOString()}) {
  const list=posts?.length?posts:[post];
  const isArticle=Boolean(post?.article);
  let body;
  if(isArticle) body=`<h1>${escapeHTML(post.article.title||'Artigo no X')}</h1><div class="meta">${author(post,assets)}${escapeHTML(date(post.createdAt))}</div><p>Original: <a href="https://x.com/${encodeURIComponent(post.author?.handle||'i')}/status/${encodeURIComponent(post.id)}">X</a></p>${articleBody(post,assets)}`;
  else body=`${list.length>1?'<p class="thread-warning" role="status">Os posts abaixo seguem a cadeia de respostas carregada pelo X. O fim da thread não foi comprovado.</p>':''}${list.map((p,i)=>postHTML(p,assets,i,false,list.length>1)).join('\n')}`;
  let script='';
  if(list.some(p=>p.media?.some(m=>m.type==='video'||m.type==='animated_gif')||p.quote?.media?.some(m=>m.type==='video'||m.type==='animated_gif'))||isArticle) script=`<script nonce="%%NONCE%%">document.querySelectorAll('video[data-media-id]').forEach(v=>{const ds=[...document.querySelectorAll('[id^="'+v.id+'-data-"]')];if(!ds.length)return;const load=()=>{if(v.dataset.loaded)return;v.dataset.loaded='1';const parts=ds.map(d=>{const raw=atob(d.textContent.trim()),bytes=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);return bytes;});v.src=URL.createObjectURL(new Blob(parts,{type:'video/mp4'}));};v.addEventListener('click',()=>{load();if(v.paused)v.play().catch(()=>{});});v.addEventListener('pointerdown',load,{once:true});v.addEventListener('play',load);});</script>`;
  return documentShell({title:titleOf(isArticle?post:(posts?.[0]||post)),css:isArticle?articleCss+articleExtras:postCss,body,capturedAt,script});
}

export function renderHTMLParts(options) {
  const markers=new Map();let n=0;const source=options.assets||new Map(),assets=new Map();
  for(const [id,value] of source){const data=value?.data;if(Array.isArray(data)){const mapped=data.map(chunk=>{const marker=`XCHUNK${n++}END`;markers.set(marker,chunk);return marker;});assets.set(id,{...value,data:mapped});}else assets.set(id,value);}
  const html=renderHTML({...options,assets});const parts=[];let offset=0;
  const re=/XCHUNK\d+END/g;for(const match of html.matchAll(re)){if(match.index>offset)parts.push(html.slice(offset,match.index));parts.push(markers.get(match[0]));offset=match.index+match[0].length;}if(offset<html.length)parts.push(html.slice(offset));
  return parts;
}

export async function* renderHTMLStream(options) {
  const source=options.assets||new Map(),assets=new Map(),replacements=new Map();let seq=0;
  const chunkBytes=1024*1024-((1024*1024)%3);
  for(const [id,value] of source){
    if(!value?.blob){assets.set(id,value);continue;}
    const count=Math.max(1,Math.ceil(value.blob.size/chunkBytes)),chunks=[];
    for(let i=0;i<count;i++){const marker=`XSTREAM${seq++}END`;chunks.push(marker);replacements.set(marker,{blob:value.blob,start:i*chunkBytes,end:Math.min(value.blob.size,(i+1)*chunkBytes)});}
    assets.set(id,{...value,data:chunks});
  }
  const html=renderHTML({...options,assets});let cursor=0;
  for(const match of html.matchAll(/XSTREAM\d+END/g)){
    if(match.index>cursor)yield html.slice(cursor,match.index);
    const {blob,start,end}=replacements.get(match[0]);const bytes=new Uint8Array(await blob.slice(start,end).arrayBuffer());let binary='';for(let i=0;i<bytes.length;i+=0x8000)binary+=String.fromCharCode(...bytes.subarray(i,Math.min(i+0x8000,bytes.length)));yield btoa(binary);cursor=match.index+match[0].length;
  }
  if(cursor<html.length)yield html.slice(cursor);
}

function yaml(value){return `"${String(value??'').replace(/\\/g,'\\\\').replace(/"/g,'\\"').replace(/\r?\n/g,'\\n')}"`;}
const markdownText=value=>String(value??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const assetName=value=>typeof value==='string'?value:value?.filename||'';
export function renderMarkdown({post,posts,assets=new Map(),folder='post',capturedAt=new Date().toISOString()}) {
  const entries=posts?.length?posts:[post],kind=post.article?'artigo':entries.length>1?'thread':'post';
  const first=entries[0]||post;
  const fields=[`autor: ${yaml(first.author?.name||'')}`,`handle: ${yaml(first.author?.handle||'')}`,`data: ${yaml(first.createdAt||'')}`,`link: ${yaml(`https://x.com/${first.author?.handle||'i'}/status/${first.id}`)}`,`tipo: ${kind}`,`pasta: ${yaml(folder)}`,`salvo_em: ${yaml(capturedAt)}`];
  const expandText=p=>{let value=markdownText(p.text||'');for(const e of p.entities||[]){const short=markdownText(e.url||''),href=safeLink(e.expandedUrl);if(short&&href)value=value.replaceAll(short,`[${markdownText(e.displayUrl||e.expandedUrl)}](${href.replace(/[()]/g,c=>encodeURIComponent(c))})`);}return value;};
  let out=`---\n${fields.join('\n')}\n---\n\n# ${markdownText(titleOf(post.article?post:first))}\n\n`;
  for(const entry of entries){if(entries.length>1)out+=`\n### @${markdownText(entry.author?.handle||'')} · ${markdownText(entry.createdAt||'')}\n\n`;out+=`${expandText(entry)}\n`;
    if(entry.quote){out+=`\n> ${markdownText(entry.quote.author?.name||entry.quote.author?.handle||'Post citado')}: ${markdownText(entry.quote.text||'').replace(/\n/g,'\n> ')}\n`;for(const m of entry.quote.media||[]){const name=assetName(assets.get(m.id));if(name)out+=`\n![${markdownText(m.alt||'Mídia citada').replace(/\]/g,'\\]')}](${folder}_midias/${name})\n`;else out+=`\n> Mídia citada não capturada: ${markdownText(m.failure||m.id)}\n`;}}
    for(const m of entry.media||[]){const name=assetName(assets.get(m.id));if(name)out+=`\n![${markdownText(m.alt||'').replace(/\]/g,'\\]')}](${folder}_midias/${name})\n`;else out+=`\n> Mídia não disponível: ${markdownText(m.failure||'não capturada')}\n`;}
  }
  if(post.article){const coverName=assetName(assets.get(`cover:${post.id}`));if(coverName)out+=`\n![Capa do artigo](${folder}_midias/${coverName})\n`;const map=new Map(entityEntries(post.article.entityMap).map(x=>[String(x.key),x.value]));for(const b of post.article.blocks||[]){const type=b.type||'unstyled';if(type==='atomic'){const entity=map.get(String(b.entityRanges?.[0]?.key)),item=entity?.data?.mediaItems?.[0];const decoded=atomicContent(entity);if(decoded?.type==='divider'){out+='\n---\n';continue;}if(decoded?.type==='code'){out+='\n'+fencedCode(decoded.text,decoded.language)+'\n';continue;}if(item?.mediaId){const m=post.article.mediaEntities.find(x=>String(x.mediaId||x.id)===String(item.mediaId)),name=assetName(assets.get(String(item.mediaId)));if(name)out+=`\n![${markdownText(m?.alt_text||'Mídia do artigo').replace(/\]/g,'\\]')}](${folder}_midias/${name})\n`;else out+=`\n> Mídia do artigo não capturada (${item.mediaId})\n`;}else if(entity?.data?.tweetId){const embedded=post.article.embeddedPosts?.[String(entity.data.tweetId)];if(embedded)out+=`\n> **Post incorporado @${markdownText(embedded.author?.handle||'')}:** ${markdownText(embedded.text||'')}\n`;else out+=`\n> Post incorporado ainda não capturado: https://x.com/i/status/${encodeURIComponent(entity.data.tweetId)}\n`;}continue;}const prefix={'header-one':'# ','header-two':'## ','header-three':'### ',blockquote:'> ','unordered-list-item':'- ','ordered-list-item':'1. ',divider:'\n---\n'}[type]??'';const text=articleText(b,map,true);out+=`\n${prefix}${text}\n`;}}
  for(const entry of entries){if(entry.poll){const total=entry.poll.choices.reduce((n,c)=>n+(Number(c.votes)||0),0);out+='\n**Enquete**\n'+entry.poll.choices.map(c=>`- ${markdownText(c.label)}: ${Number(c.votes)||0} votos`).join('\n')+`\n\n${total} votos · ${entry.poll.final?'resultados finais':'na captura'}\n`;}if(entry.card)out+=`\n**Card:** ${markdownText(entry.card.title||'')} · ${markdownText(entry.card.domain||'')} · ${markdownText(safeLink(entry.card.url)||'')}\n`;if(entry.communityNote)out+=`\n> **Nota da Comunidade:** ${markdownText(entry.communityNote.text)}\n`;if(entry.edited)out+='\n> Versão editada mais recente.\n';}
  return out;
}
