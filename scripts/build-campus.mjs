import { readFile, writeFile, readdir } from 'node:fs/promises';
import { publicCatalog, cases, VERSION } from '../functions/_shared/campus-content.mjs';
const quote=value=>`'${String(value).replaceAll("'","''")}'`;
const schema=await readFile(new URL('../supabase/schema/campus.sql',import.meta.url),'utf8');
const seed=cases.map(c=>`insert into private.campus_case_keys(id,level,version,questions) values(${quote(c.id)},${c.level},${quote(VERSION)},${quote(JSON.stringify(c.questions))}::jsonb);`).join('\n');
const operator=`\n-- Bootstrap only the existing verified owner account; no new auth identity.\ninsert into private.campus_operators(user_id) select id from auth.users where lower(email)='emmanuelkine@gmail.com' and email_confirmed_at is not null on conflict do nothing;\n`;
const migration=schema+'\n'+seed+operator;
// Upgrade for the staging prototype. A fresh install already uses the isolated
// namespace, so this also replays safely after the initial migration.
const upgradeHeader=`create schema if not exists campus_internal;
do $$ begin
 if to_regprocedure('private.campus_dispatch(text,jsonb)') is not null
 and to_regprocedure('campus_internal.campus_dispatch(text,jsonb)') is null then
  alter function private.campus_actor() set schema campus_internal;
  alter function private.campus_dispatch(text,jsonb) set schema campus_internal;
  -- Restore the pre-Campus schema ACL in the staging prototype only. The
  -- fresh-production path does not alter the shared private schema ACL.
  revoke usage on schema private from authenticated;
 end if;
end $$;
`;
const upgrade=upgradeHeader+schema.slice(schema.indexOf('create function campus_internal.campus_actor'),schema.indexOf('-- Private tables')).replaceAll('create function ','create or replace function ');
const paths=(await readdir(new URL('../supabase/migrations/',import.meta.url))).filter(f=>f.endsWith('_campus_institutional_platform.sql'));
const upgrades=(await readdir(new URL('../supabase/migrations/',import.meta.url))).filter(f=>f.endsWith('_campus_isolated_function_namespace.sql'));
if(paths.length!==1)throw new Error('Expected exactly one CLI-created Campus migration.');
if(upgrades.length!==1)throw new Error('Expected exactly one CLI-created Campus namespace migration.');
if(process.argv.includes('--check')){
 const actual=await readFile(new URL('../campus/catalog.json',import.meta.url),'utf8');
 const sql=await readFile(new URL(`../supabase/migrations/${paths[0]}`,import.meta.url),'utf8');
 const upgradeSql=await readFile(new URL(`../supabase/migrations/${upgrades[0]}`,import.meta.url),'utf8');
 if(actual!==JSON.stringify(publicCatalog(),null,2)+'\n'||sql!==migration||upgradeSql!==upgrade)throw new Error('Campus generated files are out of date.');
}else{
 await writeFile(new URL('../campus/catalog.json',import.meta.url),JSON.stringify(publicCatalog(),null,2)+'\n');
 await writeFile(new URL(`../supabase/migrations/${paths[0]}`,import.meta.url),migration);
 await writeFile(new URL(`../supabase/migrations/${upgrades[0]}`,import.meta.url),upgrade);
}
