import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {publicFiles} from './public-files.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export async function auditPublic(){
  const files=await publicFiles(root),errors=[];
  const sensitive=[[/C:[\\/]+Users[\\/]+[^\s"']+/i,'personal filesystem path'],[/https:\/\/x\.com\/[^\s"']+\/status\/\d{15,}/i,'captured post URL'],[/["'](?:auth_token|ct0|guest_token)["']\s*:\s*["'][^"']+["']/i,'authentication value'],[/-----BEGIN (?:RSA |OPENSSH |EC )?PRIVATE KEY-----/,'private key']];
  for(const name of files){
    if(/\.(png|jpg|jpeg|wasm|zip)$/.test(name))continue;
    const content=await readFile(path.join(root,name),'utf8');
    // This scanner contains only the patterns themselves, not private values.
    if(name==='scripts/audit-public.mjs')continue;
    for(const [pattern,reason] of sensitive)if(pattern.test(content))errors.push(name+': '+reason);
    if(/(?:evidencias|recuperados)\//.test(content)&&!name.endsWith('.md')&&name!=='.gitignore')errors.push(name+': private fixture dependency');
  }
  if(errors.length)throw new Error(errors.join('\n'));
  return files;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
  const files=await auditPublic();console.log('Public source audit passed: '+files.length+' files.');
}
