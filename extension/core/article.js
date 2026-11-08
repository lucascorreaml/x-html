export const entityEntries = map => Array.isArray(map) ? map : Object.entries(map||{}).map(([key,value])=>({key,value}));

export function atomicContent(entity) {
  if(entity?.type==='DIVIDER')return {type:'divider'};
  if(entity?.type!=='MARKDOWN'||typeof entity.data?.markdown!=='string')return null;
  const source=entity.data.markdown;
  const lines=source.split('\n'),first=lines[0].replace(/\r$/,''),open=first.match(/^(`{3,}|~{3,})([^\r\n]*)$/);
  let last=lines.length-1;if(lines[last]==='')last--;
  if(open&&last>0&&new RegExp('^'+open[1][0]+'{'+open[1].length+',}[ \\t]*$').test(lines[last].replace(/\r$/,''))){
    return {type:'code',text:lines.slice(1,last).join('\n'),language:open[2].trim().split(/\s/)[0].replace(/[^a-zA-Z0-9_+-]/g,'')};
  }
  // Unknown Markdown remains readable as literal source; never execute embedded HTML.
  return {type:'code',text:source,language:'markdown'};
}

export function fencedCode(text,language='') {
  const longest=Math.max(0,...[...text.matchAll(/`+/g)].map(m=>m[0].length));
  const fence='`'.repeat(Math.max(3,longest+1));
  return `${fence}${language}\n${text}\n${fence}`;
}

export function inferredLinks(text) {
  const ranges=[];
  const pattern=/(^|[\s(])(@[a-zA-Z0-9_]{1,15}\b|(?:https?:\/\/)?(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}(?:\/[^\s<>]*)?)/g;
  for(const m of text.matchAll(pattern)){
    const label=m[2].replace(/[.,;:!?)]*$/,'');
    ranges.push({offset:m.index+m[1].length,length:label.length,url:label.startsWith('@')?`https://x.com/${label.slice(1)}`:/^https?:/.test(label)?label:`https://${label}`});
  }
  return ranges;
}
