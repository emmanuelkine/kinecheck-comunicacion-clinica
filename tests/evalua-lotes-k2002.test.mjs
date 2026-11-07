import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
const html=readFileSync(new URL('../evalua/kin2002/index.html',import.meta.url),'utf8');
const js=readFileSync(new URL('../evalua/kin2002/lotes.js',import.meta.url),'utf8');
test('Full section upload accepts ZIP and multiple PDFs for S1 and S2',()=>{
 for(const id of ['lot-s1','lot-s2','lot-process','lot-reset','lot-export','lot-table-body'])assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(html,/accept="\.zip,\.pdf" multiple/);
 assert.match(html,/\.\/lotes\.js/);
});
test('No academic documents are transmitted or retained by batch importer',()=>{
 assert.doesNotMatch(js,/\b(?:fetch|XMLHttpRequest|sendBeacon|localStorage|sessionStorage|indexedDB|WebSocket)\b/);
 assert.match(js,/URL\.createObjectURL/);
 assert.match(html,/sin subirlos al servidor ni guardarlos/);
 assert.match(html,/todavía no corrige automáticamente/);
});
test('Bulk archive imposes limits, rejects malformed PDF and duplicate names',()=>{
 assert.match(js,/maxArchive = 120\*1024\*1024/);
 assert.match(js,/maxPDF = 25\*1024\*1024/);
 assert.match(js,/maxFiles = 200/);
 assert.match(js,/maxInflated = 450\*1024\*1024/);
 assert.match(js,/pdfHeader\(bytes\)/);
 assert.match(js,/Duplicado: verificar/);
 assert.match(js,/SHA-256/);
});
