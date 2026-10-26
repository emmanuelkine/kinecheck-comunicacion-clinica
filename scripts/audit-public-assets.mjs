#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { extname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const terms = ['chat' + 'gpt', 'open' + 'ai', 'chat.' + 'open' + 'ai.com'];
export function brandTerms(value) {
  const text = String(value).toLowerCase();
  return terms.filter(term => text.includes(term));
}

// A decoder fallback cannot restore missing compressed data. Check the container
// first so a truncated WebP produces an actionable error instead of a silent skip.
export function inspectWebP(bytes) {
  if (bytes.length < 12 || bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WEBP') {
    throw new Error('Invalid WebP RIFF signature');
  }
  const declaredBytes = bytes.readUInt32LE(4) + 8;
  if (declaredBytes !== bytes.length) {
    throw new Error(`WebP RIFF length mismatch: declared ${declaredBytes}, actual ${bytes.length}`);
  }
  const chunks = [];
  for (let offset = 12; offset < bytes.length;) {
    if (offset + 8 > bytes.length) throw new Error('Truncated WebP chunk header');
    const type = bytes.toString('ascii', offset, offset + 4);
    const size = bytes.readUInt32LE(offset + 4);
    const end = offset + 8 + size + (size % 2);
    if (end > bytes.length) throw new Error(`Truncated WebP ${type} chunk`);
    chunks.push(type);
    offset = end;
  }
  if (!chunks.some(type => ['VP8 ', 'VP8L', 'ANMF'].includes(type))) throw new Error('WebP has no image data chunk');
  return { declaredBytes, chunks };
}

function command(program, args) {
  return execFileSync(program, args, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, timeout: 120000, stdio: ['ignore', 'pipe', 'pipe'] });
}

export function auditAssets(paths) {
  const findings = [], errors = [], results = [];
  const temporary = mkdtempSync(join(tmpdir(), 'kinecheck-assets-'));
  const check = (path, value, method) => {
    for (const term of brandTerms(value)) findings.push({ path, method, term });
  };
  try {
    for (const [index, path] of paths.entries()) {
      const result = { path, methods: [], errors: [] };
      results.push(result);
      const attempt = (method, operation) => {
        try { const value = operation(); result.methods.push(method); return value; }
        catch (error) {
          const detail = { path, method, error: String(error.stderr || error.message).trim().slice(0, 2000) };
          result.errors.push(detail); errors.push(detail); return undefined;
        }
      };
      check(path, path, 'filename');
      const bytes = attempt('read', () => readFileSync(path));
      if (!bytes) continue;
      result.bytes = bytes.length;
      result.sha256 = createHash('sha256').update(bytes).digest('hex');
      check(path, bytes.toString('latin1'), 'binary-strings');
      const extension = extname(path).toLowerCase();
      if (extension === '.svg') {
        check(path, bytes.toString('utf8'), 'svg-source');
        result.methods.push('svg-source');
        continue;
      }
      attempt('metadata', () => check(path, command('exiftool', ['-s', '-s', '-s', '-all', path]), 'metadata'));
      const directory = join(temporary, String(index));
      if (extension === '.pdf') {
        attempt('pdf-text', () => check(path, command('pdftotext', ['-layout', path, '-']), 'pdf-text'));
        attempt('pdf-rendered-page-ocr', () => {
          const info = command('pdfinfo', [path]);
          const count = Number(info.match(/^Pages:\s+(\d+)/m)?.[1]);
          if (!count) throw new Error('PDF page count unavailable');
          command('pdftoppm', ['-r', '150', '-png', path, directory]);
          const pages = readdirSync(temporary).filter(name => name.startsWith(String(index) + '-') && name.endsWith('.png')).sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
          if (pages.length !== count) throw new Error(`Rendered ${pages.length}/${count} PDF pages`);
          result.pages = count;
          for (const page of pages) check(path, command('tesseract', [join(temporary, page), 'stdout', '-l', 'spa+eng']), `pdf-rendered-page-ocr:${page}`);
        });
      } else {
        if (extension === '.webp') attempt('webp-container', () => { result.container = inspectWebP(bytes); });
        attempt('raster-decoded-ocr', () => {
          // Decode at native resolution. Only temporary PNGs are created; source
          // pixels and metadata are never rewritten by an audit.
          const info = JSON.parse(command('python3', ['-c', [
            'from PIL import Image', 'import sys,json',
            'im=Image.open(sys.argv[1])', 'frames=getattr(im,"n_frames",1)',
            'for i in range(frames):',
            ' im.seek(i)', ' frame=im.convert("RGBA")',
            ' bg=Image.new("RGBA",frame.size,"white")',
            ' bg.alpha_composite(frame)',
            ' bg.convert("RGB").save(sys.argv[2]+"-"+str(i)+".png")',
            'print(json.dumps({"width":im.width,"height":im.height,"frames":frames}))',
          ].join('\n'), path, directory]));
          Object.assign(result, info);
          for (let frame = 0; frame < info.frames; frame++) check(path, command('tesseract', [`${directory}-${frame}.png`, 'stdout', '-l', 'spa+eng']), `raster-decoded-ocr:${frame}`);
        });
      }
    }
  } finally { rmSync(temporary, { recursive: true, force: true }); }
  return {
    assetCount: paths.length, results, findings, errors,
    skipped: [],
    automatedChecksPassed: findings.length === 0 && errors.length === 0,
    limitations: 'OCR can miss stylized, small or low-contrast lettering. SVG source inspection and rendered raster/PDF OCR do not replace manual visual review or certify clinical correctness.',
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const paths = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' }).split('\0').filter(path => /\.(pdf|png|jpe?g|webp|gif|svg)$/i.test(path));
  const report = auditAssets(paths);
  const json = JSON.stringify(report, null, 2) + '\n';
  if (process.env.ASSET_AUDIT_REPORT) writeFileSync(process.env.ASSET_AUDIT_REPORT, json);
  console.log(json);
  if (!report.automatedChecksPassed) process.exitCode = 1;
}
