import test from 'node:test';
import assert from 'node:assert/strict';
import { fixtures } from './fixtures/synthetic.mjs';
import { parseResponse } from '../extension/core/model.js';
import { renderHTML, renderHTMLStream, renderMarkdown } from '../extension/core/render.js';

const fixture = async name => structuredClone(fixtures[name]);

test('HTML de artigo mantém sequência de seções, 12 mídias e embed sem recursos remotos', async () => {
  const {posts} = parseResponse(await fixture('article.json'));
  const post = posts[0];
  const html = renderHTML({post, assets:new Map(), capturedAt:'2026-11-07T12:00:00Z'});
  assert.match(html, /Artigo demonstrativo/);
  assert.equal((html.match(/data-media-type="video"/g)||[]).length, 12);
  assert.ok(html.indexOf('Visão Geral') < html.indexOf('Da IA à IA Generativa'));
  assert.match(html, /1002/);
  assert.doesNotMatch(html, /<script[^>]+src=|<link[^>]+href=|@import|https:\/\/[^" ]+\.(?:css|js)(?:["?])/i);
  assert.match(html, /Content-Security-Policy/);
});

test('HTML de post escapa texto externo, registra captura e falha de mídia', () => {
  const post={id:'1',stableId:'1',text:'<img src=x onerror=alert(1)>',author:{name:'A',handle:'a'},media:[{id:'m',type:'video',alt:'alvo',failure:'HLS criptografado'}]};
  const html=renderHTML({post,assets:new Map(),capturedAt:'2026-11-07T12:00:00Z'});
  assert.match(html,/&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.match(html,/HLS criptografado/);
  assert.doesNotMatch(html,/<img src=x onerror/);
});

test('HTML nunca usa avatar ou recursos de mídia remotos', () => {
  const post={id:'1',text:'texto',author:{id:'u',name:'A',handle:'a',avatar:'https://pbs.twimg.com/profile_images/a.jpg'}};
  const html=renderHTML({post,assets:new Map(),capturedAt:'2026-11-07T12:00:00Z'});
  assert.doesNotMatch(html,/<(?:img|video|audio)[^>]+(?:src|poster)="https?:/i);
  assert.match(html,/connect-src 'none'/);
});

test('stream monta HTML em partes base64 sem concatenar o vídeo numa única string', async () => {
  const bytes=new Uint8Array(1_100_000);bytes[0]=0;bytes[bytes.length-1]=255;
  const post={id:'1',text:'vídeo',author:{id:'u',handle:'a'},media:[{id:'v',type:'video'}]};
  const pieces=[];for await(const part of renderHTMLStream({post,assets:new Map([['v',{blob:new Blob([bytes],{type:'video/mp4'}),mime:'video/mp4'}]])}))pieces.push(part);
  assert.ok(pieces.length>=4);
  const html=await new Blob(pieces).text();
  assert.equal((html.match(/id="v-0-v-data-\d+"/g)||[]).length,2);
  assert.match(html,/script-src 'nonce-/);
});

test('Markdown tem frontmatter YAML escapado, conteúdo e caminhos de mídia relativos', () => {
  const post={id:'42',text:'linha 1\nlinha 2',author:{name:'Autor: Exemplo',handle:'exemplo'},createdAt:'2026-01-02T00:00:00Z',entities:[{expandedUrl:'https://x.com/a'}],media:[{id:'m1',type:'photo',alt:'capa'}]};
  const md=renderMarkdown({post,assets:new Map([['m1','01.jpg']]),folder:'post',capturedAt:'2026-11-07T12:00:00Z'});
  assert.match(md,/^---\nautor: "Autor: Exemplo"/);
  assert.match(md,/texto:|tipo: post/);
  assert.match(md,/\!\[capa\]\(post_midias\/01.jpg\)/);
  assert.match(md,/linha 1\nlinha 2/);
});

test('Markdown neutraliza HTML ativo escrito no post e no Article',()=>{
  const post={id:'99',text:'<script>alert(1)</script>',author:{handle:'a'},article:{title:'Título',blocks:[{type:'unstyled',text:'<img src=x onerror=1>'}],entityMap:[],mediaEntities:[]}};
  const md=renderMarkdown({post,assets:new Map(),folder:'post'});
  assert.doesNotMatch(md,/<\/?(?:script|img)\b/i);
  assert.match(md,/&lt;script&gt;/);
});



test('HTML preserva vídeo citado quando o asset está disponível',()=>{
  const post={id:'10',text:'cita',author:{id:'a',handle:'autor'},quote:{id:'9',text:'post citado',author:{handle:'outro'},media:[{id:'qv',type:'video',alt:'vídeo citado'}]}};
  const html=renderHTML({post,assets:new Map([['qv',{data:['QUJD'],mime:'video/mp4'}]])});
  assert.match(html,/<video[^>]+data-media-id="qv"/);
  assert.match(html,/id="quote-9-qv-data-0"/);
});

test('Markdown preserva os textos e as mídias de todos os posts da thread',()=>{
  const posts=[{id:'1',text:'primeira parte',author:{handle:'a'}},{id:'2',text:'segunda parte',author:{handle:'a'},media:[{id:'v',type:'video',alt:'clipe'}]}];
  const md=renderMarkdown({post:{...posts[1],isThread:true},posts,assets:new Map([['v',{filename:'02.mp4'}]]),folder:'a_thread'});
  assert.match(md,/tipo: thread/);assert.ok(md.includes('primeira parte'));assert.ok(md.indexOf('primeira parte')<md.indexOf('segunda parte'));assert.match(md,/\!\[clipe\]\(a_thread_midias\/02\.mp4\)/);
});
