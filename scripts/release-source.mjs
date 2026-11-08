import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {deflateRawSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {auditPublic} from './audit-public.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const files=await auditPublic();
const pkg=JSON.parse(await readFile(path.join(root,'package.json'),'utf8'));
const crcTable=Array.from({length:256},(_,n)=>{for(let k=0;k<8;k++)n=(n&1)?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
const crc32=bytes=>{let crc=0xffffffff;for(const b of bytes)crc=crcTable[(crc^b)&255]^(crc>>>8);return (crc^0xffffffff)>>>0;};
let offset=0;const local=[],central=[];
for(const rel of files){
  if(rel.includes('..')||rel.startsWith('/'))throw new Error('Invalid archive path');
  const name=Buffer.from(rel),body=await readFile(path.join(root,rel)),packed=deflateRawSync(body),crc=crc32(body);
  const head=Buffer.alloc(30);head.writeUInt32LE(0x04034b50);head.writeUInt16LE(20,4);head.writeUInt16LE(0x800,6);head.writeUInt16LE(8,8);head.writeUInt16LE(0x2821,12);head.writeUInt32LE(crc,14);head.writeUInt32LE(packed.length,18);head.writeUInt32LE(body.length,22);head.writeUInt16LE(name.length,26);
  local.push(head,name,packed);
  const c=Buffer.alloc(46);c.writeUInt32LE(0x02014b50);c.writeUInt16LE(20,4);c.writeUInt16LE(20,6);c.writeUInt16LE(0x800,8);c.writeUInt16LE(8,10);c.writeUInt16LE(0x2821,14);c.writeUInt32LE(crc,16);c.writeUInt32LE(packed.length,20);c.writeUInt32LE(body.length,24);c.writeUInt16LE(name.length,28);c.writeUInt32LE(offset,42);central.push(c,name);offset+=head.length+name.length+packed.length;
}
const directory=Buffer.concat(central),end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50);end.writeUInt16LE(files.length,8);end.writeUInt16LE(files.length,10);end.writeUInt32LE(directory.length,12);end.writeUInt32LE(offset,16);
const zip=Buffer.concat([...local,directory,end]),name=`source-v${pkg.version}.zip`;await mkdir(path.join(root,'release'),{recursive:true});await writeFile(path.join(root,'release',name),zip);await writeFile(path.join(root,'release',name+'.sha256'),createHash('sha256').update(zip).digest('hex')+'  '+name+'\n');
console.log('Source archive: release/'+name+' ('+files.length+' files, '+zip.length+' bytes)');
