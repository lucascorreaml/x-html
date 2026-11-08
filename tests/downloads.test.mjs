import test from 'node:test';
import assert from 'node:assert/strict';
import { htmlDocumentBlob,registerDownloadNames,startNamedDownload,matchesDownloadPath } from '../extension/core/downloads.js';

test('HTML exportado chega ao Chrome como text/html e conserva o corpo integral',async()=>{
  const html='<!doctype html><title>Artigo</title><p>Corpo integral</p>';
  const stream=new ReadableStream({start(c){c.enqueue(new TextEncoder().encode(html));c.close();}});
  const blob=await htmlDocumentBlob(stream);
  assert.equal(blob.type,'text/html;charset=utf-8');
  assert.equal(await blob.text(),html);
});

test('nome aleatorio fora da pasta esperada nao conta como sucesso',()=>{
  assert.equal(matchesDownloadPath('D:\\Downloads\\random.txt','X/autor_artigo.html'),false);
  assert.equal(matchesDownloadPath('D:\\Downloads\\X\\autor_artigo.html','X/autor_artigo.html'),true);
});

test('download usa nome solicitado tambem no evento de determinacao do Chrome',async()=>{
  const data={};let listener,suggestion,called;
  const api={storage:{session:{set:async v=>Object.assign(data,v),get:async k=>({[k]:data[k]}),remove:async k=>delete data[k]}},downloads:{onDeterminingFilename:{addListener:f=>listener=f},download:async options=>{called=options;await new Promise(resolve=>{assert.equal(listener({url:options.url},value=>{suggestion=value;resolve();}),true);});return 12;}}};
  registerDownloadNames(api);
  const id=await startNamedDownload(api,{url:'blob:extension/test',filename:'X/autor_artigo.html'});
  assert.equal(id,12);assert.equal(called.filename,'X/autor_artigo.html');
  assert.deepEqual(suggestion,{filename:'X/autor_artigo.html',conflictAction:'overwrite'});
  await new Promise(resolve=>listener({url:'https://unrelated.example/file'},value=>{assert.deepEqual(value,{});resolve();}));
});
