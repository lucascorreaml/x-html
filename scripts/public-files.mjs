import {readdir,lstat} from 'node:fs/promises';
import path from 'node:path';
export const publicRoots=['README.md','CHANGELOG.md','LICENSE','PRIVACY.md','SECURITY.md','CONTRIBUTING.md','THIRD_PARTY.md','.gitignore','.gitattributes','package.json','package-lock.json','.github','docs','assets','extension','gabaritos','scripts','tests','licenses'];
export async function publicFiles(root) {
  const out=[];
  async function visit(rel){
    if(rel==='extension/vendor')return;
    const abs=path.join(root,rel);let info;try{info=await lstat(abs);}catch(e){if(e.code==='ENOENT')return;throw e;}
    if(info.isSymbolicLink())throw new Error('Symlinks are not allowed in public artifacts: '+rel);
    if(info.isDirectory())for(const name of (await readdir(abs)).sort())await visit(rel+'/'+name);
    else out.push(rel);
  }
  for(const rel of publicRoots)await visit(rel);
  return out.sort();
}
