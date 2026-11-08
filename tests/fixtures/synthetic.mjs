// Entirely fictional data, authored for these tests. No captured responses or profiles.
export function rawPost(id='1001') {
  return {__typename:'Tweet',rest_id:id,legacy:{full_text:'Post demonstrativo',created_at:'2026-01-02T12:00:00Z',conversation_id_str:id,user_id_str:'u1'},core:{user_results:{result:{rest_id:'u1',core:{name:'Autor de exemplo',screen_name:'autor_exemplo'},avatar:{image_url:'https://pbs.twimg.com/profile_images/example.jpg'},is_blue_verified:true}}}};
}
const video=(n)=>({media_id:`video-${n}`,media_info:{__typename:'ApiVideo',variants:[{url:`https://video.twimg.com/example/1440x810/${n}.mp4`,bit_rate:10368000,content_type:'video/mp4'}]}});
const articlePost=rawPost('1002');
articlePost.article={article_results:{result:{rest_id:'article-1',title:'Artigo demonstrativo',cover_media:{media_info:{original_img_url:'https://pbs.twimg.com/media/cover.jpg',original_img_width:3812}},media_entities:[...Array.from({length:12},(_,i)=>video(i+1)),{media_id:'photo-1',media_info:{__typename:'ApiImage',original_img_url:'https://pbs.twimg.com/media/example.jpg'}}],content_state:{blocks:[{type:'header-one',text:'Visão Geral'},{type:'unstyled',text:'Texto demonstrativo.'},...Array.from({length:13},(_,i)=>({type:'atomic',entityRanges:[{key:i}]})),{type:'header-two',text:'Da IA à IA Generativa'}],entityMap:Array.from({length:13},(_,i)=>({key:i,value:{type:'MEDIA',data:{mediaItems:[{mediaId:i<12?`video-${i+1}`:'photo-1'}]}}}))}}}};
const embedded=rawPost('1005');
const embedArticle=rawPost('1004');
embedArticle.article={article_results:{result:{title:'Artigo com post',content_state:{blocks:[{type:'unstyled',text:'Antes do post'},{type:'atomic',entityRanges:[{key:0}]},{type:'unstyled',text:'Depois do post'}],entityMap:[{key:0,value:{type:'TWEET',data:{tweetId:'1005'}}}]}}}};
const long=rawPost('1006');long.note_tweet={note_tweet_results:{result:{text:'Exemplo de guardrails e texto longo. '.repeat(20)}}};long.legacy.bookmark_count=14;
const edited=rawPost('1008');edited.edit_control={edit_tweet_ids:['1007','1008']};
const poll=rawPost('1009');poll.card={legacy:{binding_values:[...['A','B'].flatMap((label,i)=>[{key:`choice${i+1}_label`,value:{string_value:label}},{key:`choice${i+1}_count`,value:{string_value:String([54,3][i])}}]),{key:'counts_are_final',value:{boolean_value:true}}]}};
const note=rawPost('1010');note.birdwatch_pivot={subtitle:{text:'Nota demonstrativa: 54 chamadas de exemplo.',entities:[{ref:{expandedUrl:'https://example.test/reference',title:'Fonte fictícia'}}]}};
const gif=rawPost('1011');gif.legacy.extended_entities={media:[{id_str:'gif-1',type:'animated_gif',ext_alt_text:'Animação demonstrativa',video_info:{variants:[{url:'https://video.twimg.com/tweet_video/example.mp4',content_type:'video/mp4'}]}}]};
export const fixtures={
  'article.json':{data:{tweet:articlePost}},'embed-article.json':{data:{tweet:embedArticle}},'embed-post.json':{data:{tweet:embedded}},'long-post.json':{data:{tweet:long}},
  'restricted.json':{data:{edited,tombstone:{__typename:'TweetTombstone',rest_id:'1012',tombstone:{text:{text:'withheld in fictional region'}}}}},
  'wrapped.json':{data:{result:{__typename:'TweetWithVisibilityResults',tweet:rawPost('1013')}}},'poll.json':{data:{tweet:poll}},'note.json':{data:{tweet:note}},'gif.json':{data:{tweet:gif}}
};
export const content={blocks:[],entityMap:{}};
let key=0;
function atomic(type,data={}){const n=key++;content.entityMap[n]={type,data};content.blocks.push({key:`block-${n}`,type:'atomic',text:' ',entityRanges:[{key:n,offset:0,length:1}]});}
for(let n=1;n<=15;n++)atomic('MARKDOWN',{markdown:'```javascript\n'+`// Exemplo fictício ${n}\nconst value = ${n};\n    console.log("<exemplo> & dados", value);`+'\n```'});
for(let n=0;n<11;n++)atomic('DIVIDER');
for(let n=0;n<7;n++)atomic('MEDIA',{mediaItems:[{mediaId:`photo-${n}`} ]});
for(let n=0;n<5;n++)atomic('TWEET',{tweetId:String(1100+n)});
for(let n=0;n<164;n++)content.blocks.push({key:`text-${n}`,type:'unstyled',text:n===0?'Link example.test e perfil @autor_exemplo.':`Parágrafo fictício ${n}.`,entityRanges:[],inlineStyleRanges:[]});
