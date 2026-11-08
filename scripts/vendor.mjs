import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {extractRuntime} from './tar-runtime.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const lock=JSON.parse(await readFile(path.join(root,'extension/vendor-lock.json'),'utf8'));
const wrapper=['classes.js','const.js','empty.mjs','errors.js','index.js','types.js','utils.js','worker.js'];
for(const [name,pkg] of Object.entries(lock)){
  const res=await fetch(pkg.source);if(!res.ok)throw new Error('Download failed: '+res.status);
  const bytes=Buffer.from(await res.arrayBuffer());
  if('sha512-'+createHash('sha512').update(bytes).digest('base64')!==pkg.integrity)throw new Error('Integrity mismatch: '+name);
  const names=(name==='core'?['ffmpeg-core.js','ffmpeg-core.wasm']:wrapper).map(n=>'package/dist/esm/'+n);
  const entries=extractRuntime(bytes,names);
  const dest=path.join(root,'extension/vendor',name,'package/dist/esm');await mkdir(dest,{recursive:true});
  for(const [file,body] of entries)await writeFile(path.join(dest,path.basename(file)),body);
  console.log('Verified '+pkg.package+'@'+pkg.version);
}
