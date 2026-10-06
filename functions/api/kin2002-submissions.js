const json=(d,s=200)=>new Response(JSON.stringify(d),{status:s,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});
const H="4c359877fed4a6cbcf9600adf9e6a79108e7dbd8c86741f68c0e249afe35ef4e";
const hex=b=>[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("");
async function auth(r){const a=r.headers.get("authorization")||"",t=a.startsWith("Bearer ")?a.slice(7):"";return !!t&&hex(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(t)))===H}
export async function onRequestGet({request,env}){if(!(await auth(request)))return json({error:"No autorizado."},401);if(!env.CERT_REQUESTS)return json({error:"Registro no disponible."},503);const l=await env.CERT_REQUESTS.list({prefix:"kin2002:",limit:500}),records=[];for(const k of l.keys){const v=await env.CERT_REQUESTS.get(k.name,"json");if(v)records.push(v)}records.sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)));return json({count:records.length,records});}
