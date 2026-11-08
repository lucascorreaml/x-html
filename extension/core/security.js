const mediaHosts = new Set(['pbs.twimg.com', 'video.twimg.com']);

export function escapeHTML(value = '') {
  return String(value).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]);
}

export function safeLink(value) {
  try {
    const u = new URL(String(value));
    return ['https:', 'http:'].includes(u.protocol) && !u.username && !u.password ? u.href : '';
  } catch { return ''; }
}

export function mediaUrl(value, allowPscp = false) {
  let u;
  try { u = new URL(String(value)); } catch { throw new Error('URL de mídia inválida'); }
  if (u.protocol !== 'https:') throw new Error('URL de mídia deve usar HTTPS');
  if (u.username || u.password) throw new Error('URL com credenciais não permitida');
  const host = u.hostname.toLowerCase();
  const allowed = [...mediaHosts].some(h => host === h || host.endsWith(`.${h}`));
  const pscp = host === 'video.pscp.tv' || host.endsWith('.video.pscp.tv');
  if (!allowed && !(pscp && allowPscp)) throw new Error(pscp ? 'requer permissão opcional' : 'host de mídia não permitido');
  return u;
}

const secretKey = /(?:token|authorization|cookie|secret|signature|password|credential|chat.?key|jwt)/i;
export function redact(value) {
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k,v]) => [k, secretKey.test(k) ? '[REDACTED]' : redact(v)]));
  }
  if (typeof value === 'string') {
    try {
      const u = new URL(value);
      for (const k of [...u.searchParams.keys()]) if (secretKey.test(k)) u.searchParams.set(k, '[REDACTED]');
      return u.href;
    } catch { return value.replace(/\bBearer\s+\S+/gi, 'Bearer [REDACTED]').replace(/\beyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\b/g, '[REDACTED]'); }
  }
  return value;
}
