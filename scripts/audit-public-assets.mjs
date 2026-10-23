#!/usr/bin/env node
import {execFileSync} from 'node:child_process';
import {readFileSync,existsSync} from 'node:fs';
import {extname} from 'node:path';
const terms=['chat'+'gpt','open'+'ai','chat.'+'open'+'ai.com'];
const paths=execFileSync('git',['ls-files','-z'],{encoding:'utf8'}).split('\0').filter(Boolean);
const assets=paths.filter(p=>/\.(pdf|png|jpe?g|webp|gif|svg)$/i.test(p));
let findings=[];let skipped=[];
function check(p,value,method){const v=String(value).toLowerCase();for(const t of terms)if(v.includes(t))findings.push({path:p,method,term:t});}
for(const path of assets){
  check(path,path,'filename');
  if(!existsSync(path)){skipped.push(path);continue;}
  const ext=extname(path).toLowerCase();
  if(ext==='.svg'){check(path,readFileSync(path,'utf8'),'svg-source');continue;}
  const bytes=readFileSync(path);
  check(path,bytes.toString('latin1').slice(0,2000000),'binary-strings');
  if(ext==='.pdf'){
    try{const result=execFileSync('pdftotext',['-layout',path,'-'],{encoding:'utf8',maxBuffer:15*1024*1024});check(path,result,'pdf-text');
    try{const result=execFileSync('pdftoppm',['-f','1','-l','100','-r','120','-png',path,'/tmp/kinecheck-pdf-audit'],{maxBuffer:5*1024*1024}); const pageNames=execFileSync('find',['/tmp','-maxdepth','1','-name','kinecheck-pdf-audit-*.png'],{encoding:'utf8'}).trim().split('\n').filter(Boolean);for(const name of pageNames){const ocr=execFileSync('tesseract',[name,'stdout','-l','spa+eng'],{encoding:'utf8',maxBuffer:10*1024*1024,stdio:['ignore','pipe','ignore']});check(path,ocr,'pdf-rendered-page-ocr')} }catch(e){skipped.push(path+' (PDF page visual text scan unavailable)')}}
    catch(e){skipped.push(path+' (PDF extract failed)');}
  }else if(/\.(png|jpe?g|webp|gif)$/.test(ext)){
    try{const info=execFileSync('exiftool',['-s','-s','-s','-all',path],{encoding:'utf8',maxBuffer:5*1024*1024});check(path,info,'image-metadata');
      try{const ocr=execFileSync('tesseract',[path,'stdout','-l','spa+eng'],{encoding:'utf8',maxBuffer:10*1024*1024,stdio:['ignore','pipe','ignore']});check(path,ocr,'raster-render-ocr');}catch(ocrError){try{execFileSync('python3',['-c','from PIL import Image; import sys; im=Image.open(sys.argv[1]); im.thumbnail((2400,2400)); im.convert("RGB").save("/tmp/kc-ocr-raster.png")',path],{stdio:'ignore'});const ocr=execFileSync('tesseract',['/tmp/kc-ocr-raster.png','stdout','-l','spa+eng'],{encoding:'utf8',maxBuffer:10*1024*1024,stdio:['ignore','pipe','ignore']});check(path,ocr,'raster-converted-ocr');}catch(e){skipped.push(path+' (image OCR failed after conversion)')}}}
    catch(e){skipped.push(path+' (image metadata scan unavailable)');}
  }
}
console.log(JSON.stringify({assetCount:assets.length,findings,skipped,pixelTextReview:'Required separately for raster images; automated metadata scan cannot certify embedded pixels'},null,2));
if(findings.length||skipped.length)process.exitCode=1;

// Brand audit covers metadata and extractable text; raster pixel inspection remains a separate visual review.
