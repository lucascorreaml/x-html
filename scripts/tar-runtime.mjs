import {gunzipSync} from 'node:zlib';
export function extractRuntime(tgz,requested){
  const tar=gunzipSync(tgz,{maxOutputLength:128*1024*1024}),out=new Map();
  for(let offset=0;offset+512<=tar.length;){
    const head=tar.subarray(offset,offset+512);if(head.every(x=>x===0))break;
    const field=(a,b)=>head.subarray(a,b).toString('utf8').replace(/\0.*$/s,'');
    const name=field(345,500)?field(345,500)+'/'+field(0,100):field(0,100);
    const rawSize=field(124,136).trim();if(!/^[0-7]+$/.test(rawSize))throw new Error('Invalid TAR size');
    const size=parseInt(rawSize,8),type=field(156,157),start=offset+512;
    if(!name.startsWith('package/')||name.split('/').includes('..')||name.includes('\\')||name.includes(':'))throw new Error('Unsafe archive path');
    if(!Number.isSafeInteger(size)||start+size>tar.length)throw new Error('Truncated archive');
    if(type!==''&&type!=='0'&&type!=='5')throw new Error('Unsupported archive entry');
    if(requested.includes(name)){
      if(type==='5'||out.has(name))throw new Error('Invalid runtime entry');
      out.set(name,tar.subarray(start,start+size));
    }
    offset=start+Math.ceil(size/512)*512;
  }
  for(const name of requested)if(!out.has(name))throw new Error('Missing runtime file: '+name);
  return out;
}
