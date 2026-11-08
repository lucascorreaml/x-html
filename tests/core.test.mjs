import test from 'node:test';
import assert from 'node:assert/strict';
import { fixtures } from './fixtures/synthetic.mjs';
import { parseResponse, normalizeTweet, articleBlocks, chooseVariant, collectThread } from '../extension/core/model.js';
import { fileBase, reserveBase, outputPath } from '../extension/core/names.js';
import { safeLink, mediaUrl, redact, escapeHTML } from '../extension/core/security.js';

const fixture = async name => structuredClone(fixtures[name]);

test('artigo sintético conserva 12 vídeos, capa/diagrama e ordem das referências', async () => {
  const result = parseResponse(await fixture('article.json'), { operation: 'TweetResultByRestId' });
  const post = result.posts.find(p => p.id === '1002');
  assert.equal(post.article.title, 'Artigo demonstrativo');
  const blocks = articleBlocks(post.article);
  assert.equal(blocks.filter(b => b.type === 'media' && b.media.type === 'video').length, 12);
  assert.equal(blocks.filter(b => b.type === 'media' && b.media.type === 'photo').length, 1);
  assert.equal(post.article.cover.width, 3812);
  const videos = blocks.filter(b => b.type === 'media' && b.media.type === 'video');
  assert.equal(videos[0].media.id, 'video-1');
  assert.equal(videos[11].media.id, 'video-12');
  assert.equal(chooseVariant(videos[0].media).bitrate, 10368000);
  assert.match(chooseVariant(videos[0].media).url, /1440x810/);
});

test('incorporado é preservado no ponto do corpo e pode ser complementado', async () => {
  const { posts } = parseResponse(await fixture('embed-article.json'));
  const blocks = articleBlocks(posts.find(p => p.article)?.article);
  const idx = blocks.findIndex(b => b.type === 'embed');
  assert.ok(idx > 0);
  assert.equal(blocks[idx].postId, '1005');
  const embedded = parseResponse(await fixture('embed-post.json'));
  assert.ok(embedded.posts.some(p => p.id === '1005'));
});

test('post longo usa texto integral e mantém entidades separadas do texto cortado', async () => {
  const { posts } = parseResponse(await fixture('long-post.json'));
  const p = posts.find(p => p.id === '1006');
  assert.ok(p.text.length > 280);
  assert.match(p.text, /guardrails/);
  assert.equal(p.author.handle, 'autor_exemplo');
  assert.equal(p.author.badge, 'blue');
  assert.equal(p.metrics.bookmarks, 14);
});

test('wrapper de visibilidade conserva conteúdo e restrições; tombstone não some', async () => {
  const r = parseResponse(await fixture('restricted.json'));
  assert.ok(r.unavailable.some(p => p.id === '1012' && /withheld/.test(p.reason)));
  const w = parseResponse(await fixture('wrapped.json'));
  assert.ok(w.posts.some(p => p.id === '1013'));
});

test('edições recentes compartilham identidade estável com o post inicial', async () => {
  const { posts } = parseResponse(await fixture('restricted.json'));
  const p = posts.find(p => p.id === '1008');
  assert.equal(p.stableId, '1007');
  assert.equal(p.edited, true);
  assert.equal(p.revisionIds.length, 2);
});

test('enquete conserva votos finais e Nota da Comunidade conserva texto e fontes', async () => {
  const q = parseResponse(await fixture('poll.json')).posts[0];
  assert.deepEqual(q.poll.choices.map(c => c.votes), [54, 3]);
  assert.equal(q.poll.final, true);
  const n = parseResponse(await fixture('note.json')).posts[0];
  assert.match(n.communityNote.text, /54 chamadas/);
  assert.ok(n.communityNote.entities.some(e => e.expandedUrl.includes('example.test')));
});

test('GIF em MP4 conserva tipo e texto alternativo', async () => {
  const p = parseResponse(await fixture('gif.json')).posts[0];
  assert.equal(p.media[0].type, 'animated_gif');
  assert.match(p.media[0].alt, /demonstrativa/);
  assert.match(chooseVariant(p.media[0]).url, /tweet_video/);
});

test('thread exclui terceiros e ordena continuação pela cadeia de pais', () => {
  const author = { id: 'u', handle: 'autor' };
  const ps = [{ id: '1', author, createdAt: '2026-01-01', conversationId: '1' },
    { id: '3', author, replyToId: '2', createdAt: '2026-01-03', conversationId: '1' },
    { id: '2', author, replyToId: '1', createdAt: '2026-01-02', conversationId: '1' },
    { id: '4', author: { id: 'other' }, replyToId: '1', conversationId: '1' }];
  assert.deepEqual(collectThread(ps, '2').map(p => p.id), ['1', '2', '3']);
});

test('nomes eliminam links, emojis e acentos, mantêm palavras de menções e hashtags', () => {
  assert.equal(fileBase({ author: { handle: 'Autor_exemplo' }, text: '', article: { title: 'Artigo demonstrativo' } }), 'autor-exemplo_artigo-demonstrativo');
  assert.equal(fileBase({ author: { handle: 'A' }, text: 'Olá @Exemplo! #Ação 😀 https://x.com/abc', media: [] }), 'a_ola-exemplo-acao');
  assert.equal(fileBase({ author: { handle: 'A' }, text: 'https://t.co/abc', media: [{ type: 'video' }] }), 'a_video');
  const long = fileBase({ author: { handle: 'A' }, text: 'palavra '.repeat(30) });
  assert.ok(long.split('_')[1].length <= 60);
  assert.ok(!long.endsWith('-'));
});

test('registro de nomes resolve colisão e mantém o nome ao salvar de novo', () => {
  const names = new Map();
  assert.equal(reserveBase(names, '1', 'autor_titulo'), 'autor_titulo');
  assert.equal(reserveBase(names, '2', 'autor_titulo'), 'autor_titulo-2');
  assert.equal(reserveBase(names, '2', 'autor_novo-titulo'), 'autor_titulo-2');
  assert.equal(reserveBase(names, '3', 'autor_titulo'), 'autor_titulo-3');
});

test('caminho valida raiz completa, travessia e nomes Windows', () => {
  const p = outputPath('D:\\Downloads', 'autor_titulo', '.html');
  assert.equal(p.relative, 'X/autor_titulo.html');
  assert.ok(p.absolute.length <= 240);
  assert.throws(() => outputPath('C:\\' + 'x'.repeat(230), 'autor_titulo', '.html'), /240/);
  assert.throws(() => outputPath('C:\\Downloads', '../escape', '.html'), /inválido/);
  assert.equal(outputPath('D:\\Downloads','01.jpg','','autor_midias').relative,'X/autor_midias/01.jpg');
});

test('URLs e diagnóstico não aceitam esquemas ativos, credenciais ou hosts parecidos', () => {
  assert.equal(safeLink('javascript:alert(1)'), '');
  assert.equal(safeLink('data:text/html,<script>'), '');
  assert.throws(() => mediaUrl('https://video.twimg.com.evil.test/a.mp4'), /permitido/);
  assert.throws(() => mediaUrl('https://u:pass@video.twimg.com/a.mp4'), /credenciais/);
  assert.throws(() => mediaUrl('https://prod.video.pscp.tv/a.m3u8'), /permissão/);
  assert.equal(mediaUrl('https://prod.video.pscp.tv/a.m3u8', true).hostname, 'prod.video.pscp.tv');
  const d = redact({ chatToken: 'secret', source: { url: 'https://a/b?token=secret' }, authorization: 'Bearer secret' });
  assert.ok(!JSON.stringify(d).includes('secret'));
  assert.equal(escapeHTML('<script>"&'), '&lt;script&gt;&quot;&amp;');
});
