import test from 'node:test';
import assert from 'node:assert/strict';
import {content} from './fixtures/synthetic.mjs';
import {articleBlocks} from '../extension/core/model.js';
import {renderHTML,renderMarkdown} from '../extension/core/render.js';
const article={title:'Artigo sintético',blocks:content.blocks,entityMap:Object.entries(content.entityMap).map(([key,value])=>({key,value})),mediaEntities:[]};
const post={id:'1002',text:'',author:{handle:'autor_exemplo'},article};
const decode=s=>s.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&amp;/g,'&');
const expected=Object.values(content.entityMap).filter(e=>e.type==='MARKDOWN').map(e=>e.data.markdown.replace(/^```[^\n]*\n/,'').replace(/\n```$/,''));

test('Artigo sintético classifica os 15 codigos e as 11 divisorias atomicas',()=>{
  const blocks=articleBlocks(article);
  assert.equal(blocks.filter(b=>b.type==='code').length,15);
  assert.equal(blocks.filter(b=>b.type==='divider').length,11);
  assert.equal(blocks.filter(b=>b.type==='unsupported').length,0);
});
test('tambem aceita entityMap indexado como objeto sem perder blocos',()=>{
  const mapped={...article,entityMap:content.entityMap};
  assert.equal(articleBlocks(mapped).filter(b=>b.type==='code').length,15);
  assert.equal((renderHTML({post:{...post,article:mapped}}).match(/<pre>/g)||[]).length,15);
});
test('HTML conserva cada caractere dos 15 codigos em ordem e as 11 divisorias',()=>{
  const html=renderHTML({post});
  const codes=[...html.matchAll(/<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/g)].map(m=>decode(m[1]));
  assert.deepEqual(codes,expected);assert.equal((html.match(/<hr>/g)||[]).length,11);
  assert.doesNotMatch(html,/class="unsupported"/);
  assert.match(html,/<a href="https:\/\/example.test\/">example.test<\/a>/);
  assert.match(html,/<a href="https:\/\/x.com\/autor_exemplo">@autor_exemplo<\/a>/);
});
test('Markdown conserva codigo e divisorias e usa delimitador que nao encerra no conteudo',()=>{
  const md=renderMarkdown({post});for(const code of expected)assert.ok(md.includes(code));
  assert.equal((md.match(/^---$/gm)||[]).length,13);
  const tricky={...post,article:{title:'Seguro',blocks:[{type:'atomic',entityRanges:[{key:0}]}],entityMap:[{key:0,value:{type:'MARKDOWN',data:{markdown:'````html\n<script>alert(1)</script>\n```\n````'}}}],mediaEntities:[]}};
  const rendered=renderHTML({post:tricky});assert.doesNotMatch(rendered,/<script>alert/);assert.match(rendered,/&lt;script&gt;/);
  assert.match(renderMarkdown({post:tricky}),/````html\n<script>alert\(1\)<\/script>\n```\n````/);
});
