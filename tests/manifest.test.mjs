import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { readFile as readText } from 'node:fs/promises';
import vm from 'node:vm';
import { postCss,articleCss } from '../extension/core/styles.js';

test('manifest limita domínios, mantém host de gravações opcional e não declara API de bookmarks', async()=>{
  const m=JSON.parse(await readFile(new URL('../extension/manifest.json',import.meta.url),'utf8'));
  assert.equal(m.manifest_version,3);
  assert.ok(m.host_permissions.includes('https://x.com/*'));
  assert.ok(m.host_permissions.includes('https://pbs.twimg.com/*'));
  assert.ok(m.host_permissions.includes('https://video.twimg.com/*'));
  assert.ok(m.optional_host_permissions.includes('https://*.video.pscp.tv/*'));
  assert.ok(!m.permissions.includes('bookmarks'));
  assert.ok(!JSON.stringify(m).match(/https?:\/\/(?!x\.com|pbs\.twimg\.com|video\.twimg\.com|\*\.video\.pscp\.tv)/));
});

test('CSS dos dois gabaritos foi copiado integralmente sem alteração',async()=>{
  const [p,a]=await Promise.all(['modelo_post_x.html','modelo_artigo_x.html'].map(async f=>{const s=await readFile(new URL(`../gabaritos/${f}`,import.meta.url),'utf8');return s.match(/<style>([\s\S]*?)<\/style>/i)[1].replace(/\r\n/g,'\n');}));
  assert.equal(createHash('sha256').update(postCss).digest('hex'),createHash('sha256').update(p).digest('hex'));
  assert.equal(createHash('sha256').update(articleCss).digest('hex'),createHash('sha256').update(a).digest('hex'));
});

test('script de conteúdo não duplica botões ao observar mutations no próprio artigo',async()=>{
  const source=await readFile(new URL('../extension/content.js',import.meta.url),'utf8');
  assert.match(source,/article\.querySelector\('\.x-arquivo-save'\)/);
  assert.doesNotMatch(source,/:scope\s*>\s*\.x-arquivo-save/);
});

test('interceptador reconhece GraphQL quando o nome da operação encerra o pathname',async()=>{
  const source=await readText(new URL('../extension/main.js',import.meta.url),'utf8');let posted;
  const page={__xArquivoObserver:false,postMessage:value=>{posted=value;},fetch:async()=>new Response('{"data":{"ok":true}}',{status:200,headers:{'x-rate-limit-remaining':'19'}})};
  class FakeXHR{open(){}send(){}addEventListener(){}}
  const context={window:page,location:{origin:'https://x.com',href:'https://x.com/home'},URL,Headers,Response,XMLHttpRequest:FakeXHR,setTimeout,clearTimeout};
  vm.runInNewContext(source,context);await page.fetch('https://x.com/i/api/graphql/hash/TweetDetail?variables=%7B%7D');await new Promise(r=>setTimeout(r,0));
  assert.equal(posted?.payload?.operation,'TweetDetail');
  assert.equal(posted?.payload?.rate?.['x-rate-limit-remaining'],'19');
});
