import test from 'node:test';
import assert from 'node:assert/strict';
import { parseMasterPlaylist, parseMediaPlaylist } from '../extension/core/hls.js';

test('master escolhe maior resolução, áudio associado e tracks locais de legenda', () => {
  const text='#EXTM3U\n#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="aud",NAME="pt",DEFAULT=YES,URI="audio.m3u8"\n#EXT-X-MEDIA:TYPE=SUBTITLES,GROUP-ID="subs",NAME="pt",URI="sub.vtt"\n#EXT-X-STREAM-INF:BANDWIDTH=5500000,RESOLUTION=1920x1080,CODECS="avc1,mp4a.40.2",AUDIO="aud",SUBTITLES="subs"\nv1080.m3u8\n#EXT-X-STREAM-INF:BANDWIDTH=16000000,RESOLUTION=3840x2160,CODECS="avc1,mp4a.40.2",AUDIO="aud",SUBTITLES="subs"\nv4k.m3u8';
  const p=parseMasterPlaylist(text,'https://video.twimg.com/master.m3u8');
  assert.equal(p.variants[0].resolution.width,3840);
  assert.equal(p.selected.url,'https://video.twimg.com/v4k.m3u8');
  assert.equal(p.audio[0].url,'https://video.twimg.com/audio.m3u8');
  assert.equal(p.subtitles[0].url,'https://video.twimg.com/sub.vtt');
});

test('media playlist valida VOD, segmentos, mapa e rejeita DRM, live e byterange ambíguo', () => {
  const p=parseMediaPlaylist('#EXTM3U\n#EXT-X-MAP:URI="init.mp4"\n#EXTINF:4.0,\na.m4s\n#EXTINF:5.0,\nb.m4s\n#EXT-X-ENDLIST','https://video.twimg.com/v.m3u8');
  assert.equal(p.complete,true); assert.equal(p.segments.length,2); assert.equal(p.map.url,'https://video.twimg.com/init.mp4');
  const ranged=parseMediaPlaylist('#EXTM3U\n#EXT-X-BYTERANGE:10@0\n#EXTINF:4,\na.mp4\n#EXT-X-ENDLIST','https://video.twimg.com/v.m3u8');
  assert.deepEqual(ranged.segments[0].range,{length:10,offset:0});
  assert.throws(()=>parseMediaPlaylist('#EXTM3U\n#EXTINF:4,\na.ts','https://video.twimg.com/live.m3u8'),/ao vivo|incompleta/i);
  assert.throws(()=>parseMediaPlaylist('#EXTM3U\n#EXT-X-KEY:METHOD=AES-128,URI="k"\n#EXTINF:4,\na.ts\n#EXT-X-ENDLIST','https://video.twimg.com/e.m3u8'),/criptografada|DRM/i);
  assert.throws(()=>parseMediaPlaylist('#EXTM3U\n#EXT-X-BYTERANGE:10\n#EXTINF:4,\na.mp4\n#EXT-X-ENDLIST','https://video.twimg.com/v.m3u8'),/byterange/i);
});
