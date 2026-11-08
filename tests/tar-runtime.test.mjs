import test from 'node:test';
import assert from 'node:assert/strict';
import {gzipSync} from 'node:zlib';
import {extractRuntime} from '../scripts/tar-runtime.mjs';

function archiveEntry(name, body = '', type = '0') {
  const header = Buffer.alloc(512);
  header.write(name, 0, 100, 'utf8');
  header.write((body.length).toString(8).padStart(11, '0') + '\0', 124, 12, 'ascii');
  header.write(type, 156, 1, 'ascii');
  return Buffer.concat([header, Buffer.from(body), Buffer.alloc((512 - body.length % 512) % 512)]);
}

const gzipTar = (...entries) => gzipSync(Buffer.concat([...entries, Buffer.alloc(1024)]));

test('extracts an explicitly requested regular package file', () => {
  const files = extractRuntime(gzipTar(archiveEntry('package/dist/esm/worker.js', 'export {};')), ['package/dist/esm/worker.js']);
  assert.equal(files.get('package/dist/esm/worker.js').toString(), 'export {};');
});

test('rejects traversal paths and non-file runtime entries', () => {
  assert.throws(() => extractRuntime(gzipTar(archiveEntry('package/../escape.js', 'x')), ['package/../escape.js']), /Unsafe archive path/);
  assert.throws(() => extractRuntime(gzipTar(archiveEntry('package/link.js', 'target', '2')), ['package/link.js']), /Unsupported archive entry/);
});

test('rejects missing and truncated requested entries', () => {
  assert.throws(() => extractRuntime(gzipTar(archiveEntry('package/other.js', 'x')), ['package/missing.js']), /Missing runtime file/);
  const header = archiveEntry('package/truncated.js', 'x').subarray(0, 512);
  header.write('00000000010\0', 124, 12, 'ascii');
  assert.throws(() => extractRuntime(gzipSync(header), ['package/truncated.js']), /Truncated archive/);
});
