#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
const terms = ['chat'+'gpt','open'+'ai','chat.'+'open'+'ai.com','utm_source=chat'+'gpt.com','powered by chat'+'gpt'];
const names=execFileSync('git',['ls-files','-z'],{encoding:'utf8'}).split('\0').filter(Boolean);
const textExtensions=/\.(html?|m?js|cjs|tsx?|jsx?|css|scss|json|md|markdown|txt|svg|xml|ya?ml|toml|webmanifest|php|py|sh|sql)$/i;
const matches=[];
for(const path of names){
 if(!textExtensions.test(path) && !/(^|\/)(robots\.txt|_redirects|_headers|Dockerfile)$/i.test(path))continue;
 let source;try{source=readFileSync(path,'utf8')}catch{continue}
 const lines=source.split(/\r?\n/);
 for(let i=0;i<lines.length;i++){
  const line=lines[i].toLowerCase();
  const term=terms.find(t=>line.includes(t));
  if(term)matches.push({path,line:i+1,term});
 }
}
if(matches.length){
 console.error('External AI branding references detected ('+matches.length+'):');
 for(const row of matches)console.error(row.path+':'+row.line+' ['+row.term+']');
 process.exitCode=1;
}else console.log('PASS: '+names.length+' tracked paths checked; no external AI branding in textual source files.');
