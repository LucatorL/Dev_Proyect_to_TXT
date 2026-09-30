import { createExtractorFromData } from 'node-unrar-js/esm/index.esm';
import { ALL_SUPPORTED_EXTENSIONS, getFileExtension, MAX_FILE_SIZE } from '@/lib/file-types';
import type { ImportIssue } from '@/lib/file-processor';

type RarRequest = { archive: ArrayBuffer; archiveName: string; remainingFiles: number };
type ExtractedEntry = { name: string; path: string; bytes: ArrayBuffer };

self.onmessage = async ({ data }: MessageEvent<RarRequest>) => {
  const issues: ImportIssue[] = [];
  try {
    const response = await fetch('/unrar.wasm');
    if (!response.ok) throw new Error('RAR extractor unavailable');
    const extractor = await createExtractorFromData({ data: data.archive, wasmBinary: await response.arrayBuffer() });
    const listing = extractor.getFileList();
    if (listing.arcHeader.flags.volume) {
      self.postMessage({ entries: [], issues: [{ path: data.archiveName, reason: 'archiveVolume' }] });
      return;
    }
    const selected: string[] = [];
    for (const header of listing.fileHeaders) {
      if (header.flags.directory) continue;
      const path = `${data.archiveName}/${header.name}`;
      const name = header.name.replace(/\\/g, '/').split('/').pop() || header.name;
      if (!ALL_SUPPORTED_EXTENSIONS.includes(getFileExtension(name))) issues.push({ path, reason: 'unsupported' });
      else if (selected.length >= data.remainingFiles) issues.push({ path, reason: 'limit' });
      else if (!Number.isSafeInteger(header.unpSize) || header.unpSize < 0 || header.unpSize > MAX_FILE_SIZE) issues.push({ path, reason: 'size' });
      else if (header.flags.encrypted) issues.push({ path, reason: 'archivePassword' });
      else selected.push(header.name);
    }
    const entries: ExtractedEntry[] = [];
    if (selected.length) {
      for (const extracted of extractor.extract({ files: selected }).files) {
        const path = extracted.fileHeader.name;
        const bytes = extracted.extraction;
        if (!bytes) issues.push({ path: `${data.archiveName}/${path}`, reason: 'read' });
        else if (bytes.byteLength > MAX_FILE_SIZE) issues.push({ path: `${data.archiveName}/${path}`, reason: 'size' });
        else entries.push({ name: path.replace(/\\/g, '/').split('/').pop() || path, path, bytes: bytes.slice().buffer });
      }
    }
    self.postMessage({ entries, issues }, { transfer: entries.map(entry => entry.bytes) });
  } catch (error) {
    const reason = error && typeof error === 'object' && 'reason' in error &&
      (error.reason === 'ERAR_MISSING_PASSWORD' || error.reason === 'ERAR_BAD_PASSWORD')
      ? 'archivePassword' : 'archive';
    self.postMessage({ entries: [], issues: [{ path: data.archiveName, reason }] });
  }
};
