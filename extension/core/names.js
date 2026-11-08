const invalid = /[<>:"/\\|?*\x00-\x1f]/g;
function slug(value) {
  return String(value ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/https?:\/\/\S+/gi, ' ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').replace(/-+/g, '-');
}

export function fileBase(post) {
  const author = slug(post?.author?.handle || 'x') || 'x';
  const article = slug(post?.article?.title || '');
  const body = slug((post?.text || '').replace(/https?:\/\/\S+/gi, ' '));
  const media = post?.media?.length ? (post.media.some(m => /gif/i.test(m.type)) ? 'gif' : post.media.some(m => /video/i.test(m.type)) ? 'video' : 'foto') : '';
  const prefix = article || body || media || 'post';
  const words=[]; let size=0;
  for(const word of prefix.split('-')){const next=size+(words.length?1:0)+word.length;if(next>60)break;words.push(word);size=next;}
  const truncated = words.join('-') || 'post';
  return `${author}_${truncated}`.replace(invalid, '-').replace(/[. ]+$/g, '') || 'x_post';
}

export function reserveBase(registry, stableId, candidate) {
  if (registry.has(stableId)) return registry.get(stableId);
  const used = new Set(registry.values());
  let name = candidate, n = 2;
  while (used.has(name)) name = `${candidate}-${n++}`;
  registry.set(stableId, name);
  return name;
}

export function outputPath(root, base, extension, folder = '') {
  const clean = String(base);
  if (!clean || clean === '.' || clean === '..' || /[<>:"/\\|?*\x00-\x1f]/.test(clean) || /[. ]$/.test(clean)) throw new Error('nome inválido');
  const ext = !extension ? '' : String(extension).startsWith('.') ? extension : `.${extension}`;
  const parts=String(folder).split(/[\\/]/).filter(Boolean);if(parts.some(p=>p==='.'||p==='..'||/[<>:"|?*\x00-\x1f]/.test(p)))throw new Error('nome inválido');
  const relative=['X',...parts,`${clean}${ext}`].join('/');
  const absolute = `${String(root).replace(/[\\/]+$/g, '')}\\${relative.replaceAll('/','\\')}`;
  if (absolute.length > 240) throw new Error('caminho excede o limite de 240 caracteres');
  return { absolute, relative };
}
