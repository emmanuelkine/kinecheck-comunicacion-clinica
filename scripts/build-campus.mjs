import { readFile, writeFile, readdir } from 'node:fs/promises';
import { publicCatalog, cases, VERSION } from '../functions/_shared/campus-content.mjs';
const quote=value=>`'${String(value).replaceAll("'","''")}'`;
const schema=await readFile(new URL('../supabase/schema/campus.sql',import.meta.url),'utf8');
const seed=cases.map(c=>`insert into private.campus_case_keys(id,level,version,questions) values(${quote(c.id)},${c.level},${quote(VERSION)},${quote(JSON.stringify(c.questions))}::jsonb);`).join('\n');
const operator=`\n-- Bootstrap only the existing verified owner account; no new auth identity.\ninsert into private.campus_operators(user_id) select id from auth.users where lower(email)='emmanuelkine@gmail.com' and email_confirmed_at is not null on conflict do nothing;\n`;
const migration=schema+'\n'+seed+operator;
const paths=(await readdir(new URL('../supabase/migrations/',import.meta.url))).filter(f=>f.endsWith('_campus_institutional_platform.sql'));
if(paths.length!==1)throw new Error('Expected exactly one CLI-created Campus migration.');
if(process.argv.includes('--check')){
 const actual=await readFile(new URL('../campus/catalog.json',import.meta.url),'utf8');
 const sql=await readFile(new URL(`../supabase/migrations/${paths[0]}`,import.meta.url),'utf8');
 if(actual!==JSON.stringify(publicCatalog(),null,2)+'\n'||sql!==migration)throw new Error('Campus generated files are out of date.');
}else{
 await writeFile(new URL('../campus/catalog.json',import.meta.url),JSON.stringify(publicCatalog(),null,2)+'\n');
 await writeFile(new URL(`../supabase/migrations/${paths[0]}`,import.meta.url),migration);
}
