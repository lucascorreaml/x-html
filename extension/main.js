(() => {
  if (window.__xArquivoObserver) return;
  Object.defineProperty(window,'__xArquivoObserver',{value:true,configurable:false});
  const allowed=new Set(['TweetDetail','TweetResultByRestId','TweetResultsByRestIds','TweetResultsById','TweetResultById','TweetResultByRestId','ArticleResultByRestId','AudioSpaceById','BroadcastQuery']);
  const emit=(body,url,headers,status)=>{
    if(typeof body!=='string'||body.length>5_000_000)return;
    let data;try{data=JSON.parse(body);}catch{return;}
    const pathname=new URL(url,location.href).pathname;
    const operation=[...allowed].find(op=>new RegExp(`/`+op+`(?:/|$)`).test(pathname));
    if(!operation)return;
    const rate={};for(const name of ['x-rate-limit-remaining','x-rate-limit-reset']){const v=headers?.get?.(name);if(v)rate[name]=v;}
    window.postMessage({channel:'x-arquivo-v1',type:'CAPTURE',payload:{operation,status,rate,url:new URL(url,location.href).pathname,data}},location.origin);
  };
  const originalFetch=window.fetch;
  window.fetch=async function(...args){const response=await originalFetch.apply(this,args);try{const url=String(args[0]?.url||args[0]||'');if(url.includes('/i/api/graphql/'))response.clone().text().then(t=>emit(t,url,response.headers,response.status)).catch(()=>{});}catch{}return response;};
  const open=XMLHttpRequest.prototype.open,send=XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open=function(method,url,...rest){this.__xArquivoUrl=String(url);return open.call(this,method,url,...rest);};
  XMLHttpRequest.prototype.send=function(...args){this.addEventListener('load',()=>{try{if(this.__xArquivoUrl?.includes('/i/api/graphql/'))emit(this.responseText,this.__xArquivoUrl,this.getAllResponseHeaders()?new Headers(this.getAllResponseHeaders().split(/\r?\n/).filter(Boolean).map(x=>{const i=x.indexOf(':');return [x.slice(0,i),x.slice(i+1).trim()]})):null,this.status);}catch{}},{once:true});return send.apply(this,args);};
})();
