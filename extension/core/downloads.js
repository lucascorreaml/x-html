// Preserve the content type and filename when Chrome consumes an offscreen Blob URL.
export async function htmlDocumentBlob(stream) {
  return new Response(stream, {headers:{'Content-Type':'text/html;charset=utf-8'}}).blob();
}

const key = url => `x-arquivo-download:${url}`;
export function registerDownloadNames(api) {
  api.downloads.onDeterminingFilename.addListener((item,suggest)=>{
    api.storage.session.get(key(item.url)).then(value=>{
      const filename=value[key(item.url)];
      suggest(filename?{filename,conflictAction:'overwrite'}:{});
    }).catch(()=>suggest({}));
    return true;
  });
}
export async function startNamedDownload(api,options) {
  await api.storage.session.set({[key(options.url)]:options.filename});
  try{return await api.downloads.download({...options,saveAs:false,conflictAction:'overwrite'});}
  catch(error){await forgetDownloadName(api,options.url);throw error;}
}
export const forgetDownloadName=(api,url)=>api.storage.session.remove(key(url));

export function matchesDownloadPath(actual,expected) {
  if(!actual||!expected)return false;
  return actual.replaceAll('\\','/').toLowerCase().endsWith('/'+expected.toLowerCase());
}
