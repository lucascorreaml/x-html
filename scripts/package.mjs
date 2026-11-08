import {cp,mkdir,readdir,readFile,rm,stat,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source=path.join(root,'extension'),target=path.join(root,'dist','extension');
if(path.resolve(target)!==path.resolve(root,'dist','extension'))throw new Error('Invalid build target');
await rm(target,{recursive:true,force:true});await mkdir(target,{recursive:true});
async function copyRuntime(from,to){
  await mkdir(to,{recursive:true});
  for(const entry of await readdir(from,{withFileTypes:true})){
    if(entry.isSymbolicLink())throw new Error('No symlinks in build');
    if(entry.name==='package.json'||entry.name.endsWith('.d.ts')||entry.name.endsWith('.map')||entry.name==='umd')continue;
    const src=path.join(from,entry.name),dest=path.join(to,entry.name);
    if(entry.isDirectory())await copyRuntime(src,dest);else await cp(src,dest);
  }
}
await copyRuntime(source,target);
const manifest=JSON.parse(await readFile(path.join(target,'manifest.json'),'utf8'));
const pkg=JSON.parse(await readFile(path.join(root,'package.json'),'utf8'));
if(manifest.manifest_version!==3||manifest.version!==pkg.version)throw new Error('Manifest/version mismatch');
if((await stat(path.join(target,'vendor/core/package/dist/esm/ffmpeg-core.wasm'))).size<1_000_000)throw new Error('Run npm run vendor before building');
await cp(path.join(root,'licenses'),path.join(target,'licenses'),{recursive:true});
await cp(path.join(root,'LICENSE'),path.join(target,'LICENSE'));
await cp(path.join(root,'THIRD_PARTY.md'),path.join(target,'THIRD_PARTY.md'));
await cp(path.join(root,'PRIVACY.md'),path.join(target,'PRIVACY.md'));
await writeFile(path.join(target,'INSTALL.txt'),`Local export extension ${manifest.version}\n\nOpen chrome://extensions, enable Developer mode and choose Load unpacked.\nSelect the dist/extension folder. Reload the X tab after installing/updating.\nSelect a format in the popup and use Save on an open post.\nExports use your configured Downloads folder, inside X/.\nNo absolute user path is stored in this package.\n\nThis local build includes third-party FFmpeg components. See licenses/ and\nTHIRD-PARTY-NOTICES.txt. Public binary distribution is a separate release step.\n`,'utf8');
console.log('Built dist/extension ('+manifest.version+')');
