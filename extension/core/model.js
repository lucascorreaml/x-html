import { entityEntries,atomicContent } from './article.js';
const obj = v => v && typeof v === 'object' ? v : {};
const arr = v => Array.isArray(v) ? v : [];
const textOf = x => x?.note_tweet?.note_tweet_results?.result?.text || x?.legacy?.full_text || '';

function unwrap(x) {
  while (x && typeof x === 'object') {
    if (x.__typename === 'TweetWithVisibilityResults' && x.tweet) { x = x.tweet; continue; }
    if (x.result && !x.rest_id && !x.legacy) { x = x.result; continue; }
    break;
  }
  return x;
}

function collectTweetObjects(root, out = []) {
  if (!root || typeof root !== 'object') return out;
  if (Array.isArray(root)) { for (const v of root) collectTweetObjects(v, out); return out; }
  if (root.rest_id && root.legacy && root.core) out.push(root);
  for (const [k,v] of Object.entries(root)) {
    if (['user_results','quoted_status_result','card_platform','media_entities'].includes(k)) continue;
    collectTweetObjects(v, out);
  }
  return out;
}

function authorOf(x) {
  const u = obj(x?.core?.user_results?.result);
  const c = obj(u.core);
  const badge = u.verified_type === 'Government' ? 'government' : u.verified_type === 'Business' ? 'business' : (u.is_blue_verified ? 'blue' : '');
  return { id: String(u.rest_id || u.id || x.legacy?.user_id_str || ''), name: c.name || '', handle: c.screen_name || '', avatar: u.avatar?.image_url || '', badge };
}

function variantsFrom(v) {
  return arr(v).filter(x => x?.url).map(x => ({ url:x.url, bitrate:Number(x.bitrate ?? x.bit_rate ?? 0), contentType:x.content_type || '' })).sort((a,b) => b.bitrate-a.bitrate);
}

function mediaFrom(x) {
  const legacy = x.legacy || {};
  const raw = arr(legacy.extended_entities?.media || legacy.entities?.media);
  return raw.map(m => ({ id:String(m.id_str || m.id || ''), type:m.type || 'unknown', url:(()=>{try{const u=new URL(m.media_url_https||'');if(u.hostname==='pbs.twimg.com'&&m.type==='photo')u.searchParams.set('name','orig');return u.href;}catch{return m.media_url_https||'';}})(), alt:m.ext_alt_text || '', width:m.original_info?.width || m.sizes?.large?.w || 0, height:m.original_info?.height || m.sizes?.large?.h || 0,
    variants:variantsFrom(m.video_info?.variants), durationMs:m.video_info?.duration_millis || 0, source:'legacy.extended_entities.media' }));
}

function articleFrom(x) {
  const a = x.article?.article_results?.result;
  if (!a) return null;
  const entities = arr(a.media_entities).map(e => ({ id:String(e.media_id || ''), mediaId:String(e.media_id || ''), type:e.media_info?.__typename === 'ApiVideo' ? 'video' : 'photo', ...obj(e.media_info), variants:variantsFrom(e.media_info?.variants), kind:e.media_info?.__typename || 'media' }));
  const cover = a.cover_media?.media_info;
  return { id:String(a.rest_id || a.id || ''), title:a.title || '', preview:a.preview_text || '', summary:a.summary_text || '', state:a.lifecycle_state || '', blocks:arr(a.content_state?.blocks), entityMap:entityEntries(a.content_state?.entityMap), mediaEntities:entities, cover:cover ? { ...cover, url:cover.original_img_url || cover.preview_image?.original_img_url || '', width:cover.original_img_width || cover.original_info?.width || 0, height:cover.original_img_height || cover.original_info?.height || 0 } : null };
}

export function normalizeTweet(input) {
  const x = unwrap(input);
  const l = obj(x?.legacy);
  if (!x?.rest_id || !x?.legacy) return null;
  const ids = arr(x.edit_control?.edit_control_initial?.edit_tweet_ids || x.edit_control?.edit_tweet_ids).map(String);
  const id = String(x.rest_id);
  const stableId = ids[0] || id;
  const entities = arr(l.entities?.urls).map(e => ({ url:e.url || '', expandedUrl:e.expanded_url || e.expandedUrl || '', displayUrl:e.display_url || '' }));
  const videoLike = arr(l.extended_entities?.media).find(m => m.type === 'animated_gif');
  const poll = (() => {
    const values = arr(x.card?.legacy?.binding_values);
    const get = k => { const v=values.find(v => v.key === k)?.value; return v?.string_value ?? (v?.boolean_value === undefined ? undefined : String(v.boolean_value)); };
    const choices = [];
    for (let i=1;i<=4;i++) { const label=get(`choice${i}_label`), votes=get(`choice${i}_count`); if (label != null) choices.push({label,votes:Number(votes||0)}); }
    return choices.length ? { choices, endAt:get('end_datetime_utc') || '', final:get('counts_are_final') === 'true' } : null;
  })();
  const quoteRaw=unwrap(x.quoted_status_result?.result);
  const quote=quoteRaw?.legacy?{id:String(quoteRaw.rest_id),text:textOf(quoteRaw),author:authorOf(quoteRaw),media:mediaFrom(quoteRaw)}:null;
  const cardValues=arr(x.card?.legacy?.binding_values);
  const cardValue=key=>cardValues.find(v=>v.key===key)?.value?.string_value||'';
  const card=cardValues.length?{url:cardValue('card_url')||cardValue('vanity_url'),title:cardValue('title'),description:cardValue('description'),domain:cardValue('domain')||cardValue('vanity_url'),image:cardValue('thumbnail_image_large')||cardValue('thumbnail_image_original')}:null;
  const pivot = x.birdwatch_pivot;
  const noteText = pivot?.subtitle?.text || '';
  return { id, stableId, revisionIds:ids.length ? ids : [id], edited:ids.length > 1 && id !== stableId, text:textOf(x), createdAt:l.created_at || '', conversationId:String(l.conversation_id_str || id), replyToId:String(l.in_reply_to_status_id_str || ''), author:authorOf(x), entities, media:mediaFrom(x).map(m => videoLike && m.type === 'video' ? {...m,type:'animated_gif'} : m), quote, card, article:articleFrom(x), poll, communityNote:pivot ? { text:noteText, entities:arr(pivot.subtitle?.entities).map(e => ({ expandedUrl:e.ref?.expandedUrl || e.ref?.expanded_url || e.ref?.url || '', text:e.ref?.title || e.ref?.url || '' })), title:pivot.title?.text || '' } : null, metrics:{ replies:Number(l.reply_count||0), retweets:Number(l.retweet_count||0), likes:Number(l.favorite_count||0), views:Number(x.views?.count||0) }, sensitive:Boolean(l.possibly_sensitive), provenance:{ typename:x.__typename || '', legacyText:Boolean(l.full_text), noteText:Boolean(x.note_tweet?.note_tweet_results?.result?.text) } };
}

export function parseResponse(response, {operation=''} = {}) {
  const root = typeof response === 'string' ? JSON.parse(response) : response;
  const posts = [], unavailable = [], seen = new Set();
  for (const raw of collectTweetObjects(root)) {
    const p = normalizeTweet(raw);
    if (p && !seen.has(p.id)) { seen.add(p.id); posts.push(p); }
  }
  const visit = (x, inheritedId = '') => {
    if (!x || typeof x !== 'object') return;
    if (Array.isArray(x)) return x.forEach(v => visit(v, inheritedId));
    const ownEntry = typeof x.entryId === 'string' ? x.entryId.match(/(?:tweet-|tombstone-)?(\d{10,})/)?.[1] : '';
    const currentId = ownEntry || inheritedId;
    if (x.__typename === 'TweetTombstone' || x.__typename === 'TweetUnavailable') unavailable.push({id:String(x.rest_id||x.tweet_id||currentId),reason:x.tombstone?.text?.text || x.reason || 'conteúdo indisponível'});
    for (const [k,v] of Object.entries(x)) {
      if ((k === 'tweet_results' || k === 'itemContent') && v && typeof v === 'object' && v.result?.__typename === 'TweetTombstone') {
        const id = String(v.result.rest_id || v.result.tweet_id || currentId);
        const reason = v.result.tombstone?.text?.text || 'conteúdo indisponível';
        if (!unavailable.some(p => p.id === id && p.reason === reason)) unavailable.push({id,reason});
      }
      visit(v, currentId);
    }
  };
  visit(root);
  return { posts, unavailable, operation };
}

export function articleBlocks(article) {
  const byId = new Map((article?.mediaEntities || []).map(m => [String(m.mediaId || m.id), m]));
  const entityByKey = new Map(entityEntries(article?.entityMap).map(e => [String(e.key), e.value]));
  return (article?.blocks || []).map(b => {
    if (b.type !== 'atomic') return { type:b.type || 'unstyled', text:b.text || '', data:b.data || {}, inlineStyleRanges:b.inlineStyleRanges || [], entityRanges:b.entityRanges || [] };
    const ref = (b.entityRanges || []).map(r => entityByKey.get(String(r.key))).find(Boolean);
    const decoded=atomicContent(ref);if(decoded)return decoded;
    const item = ref?.data?.mediaItems?.[0];
    if (item?.mediaId) return { type:'media', media:byId.get(String(item.mediaId)) || { id:String(item.mediaId), type:/video/i.test(item.mediaCategory||'')?'video':'photo' } };
    if (ref?.data?.tweetId) return {type:'embed',postId:String(ref.data.tweetId)};
    return {type:'unsupported',data:ref?.data || {}};
  });
}

export function chooseVariant(media) {
  const vs = arr(media?.variants).filter(v => v.url && !/\.m3u8(?:\?|$)/i.test(v.url));
  if (!vs.length) return null;
  return [...vs].sort((a,b) => Number(b.bitrate||0)-Number(a.bitrate||0))[0];
}

export function collectThread(posts, focalId) {
  const focal = posts.find(p => p.id === focalId);
  if (!focal) return [];
  const same = posts.filter(p => p.conversationId === focal.conversationId && p.author?.id && p.author.id === focal.author.id);
  const map = new Map(same.map(p => [p.id,p]));
  let root = focal;
  const seen = new Set();
  while (root.replyToId && map.has(root.replyToId) && !seen.has(root.id)) { seen.add(root.id); root = map.get(root.replyToId); }
  const ordered = [], used = new Set();
  while (root && !used.has(root.id)) {
    used.add(root.id); ordered.push(root);
    root = same.find(p => p.replyToId === root.id && !used.has(p.id));
  }
  return ordered;
}
