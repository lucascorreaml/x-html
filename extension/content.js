(() => {
  const channel='x-arquivo-v1';
  window.addEventListener('message',event=>{
    if(event.source!==window||event.origin!==location.origin||event.data?.channel!==channel||event.data.type!=='CAPTURE')return;
    const p=event.data.payload;if(!p||typeof p.operation!=='string'||!p.data||JSON.stringify(p).length>5_100_000)return;
    chrome.runtime.sendMessage({type:'CAPTURE',payload:p}).catch(()=>{});
  });
  const idFromArticle=el=>{const a=el.querySelector('a[href*="/status/"]');const m=a?.href.match(/\/status\/(\d+)/);return m?.[1]||'';};
  const addButtons=()=>{
    for(const article of document.querySelectorAll('article[data-testid="tweet"]')){
      if(article.querySelector('.x-arquivo-save'))continue;
      const id=idFromArticle(article);if(!id)continue;
      const btn=document.createElement('button');btn.className='x-arquivo-save';btn.type='button';btn.textContent='Salvar';btn.setAttribute('aria-label','Salvar post em arquivo');
      btn.addEventListener('click',async()=>{btn.disabled=true;btn.textContent='Salvando…';try{const result=await chrome.runtime.sendMessage({type:'SAVE',postId:id,source:'timeline'});btn.textContent=result?.ok?'Iniciado ✓':(result?.error||'Abra o post e tente novamente');}catch{btn.textContent='Extensão indisponível';}finally{setTimeout(()=>{btn.disabled=false;if(btn.textContent==='Iniciado ✓')btn.textContent='Salvar';},1800);}});
      (article.querySelector('[role="group"]')||article).append(btn);
    }
  };
  let scheduled=false;const observer=new MutationObserver(()=>{if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;addButtons();});});observer.observe(document.documentElement,{childList:true,subtree:true});addButtons();
  chrome.runtime.onMessage.addListener((message,_sender,respond)=>{if(message?.type==='SAVE_CURRENT'){const m=location.pathname.match(/\/status\/(\d+)/);if(!m){respond({ok:false,error:'Abra um post do X.'});return;}chrome.runtime.sendMessage({type:'SAVE',postId:m[1],source:'popup'}).then(respond);return true;}});
})();
