const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});
const topics=new Set(["contenido","navegacion","diseno","descargas","nada"]);
export async function onRequestPost({request,env}){
 if(!env.CERT_REQUESTS?.put||!env.CERT_REQUESTS?.get)return json({error:"Servicio no configurado"},503);
 const origin=request.headers.get("origin");if(origin&&new URL(origin).host!==new URL(request.url).host)return json({error:"Origen inválido"},403);
 if(Number(request.headers.get("content-length")||0)>3000)return json({error:"Solicitud extensa"},413);
 let body;try{body=await request.json()}catch{return json({error:"Formato inválido"},400)}
 const rating=body?.rating,topic=body?.topic,comment=body?.comment||"",path=body?.path||"";
 if(!Number.isInteger(rating)||rating<1||rating>5||!topics.has(topic)||typeof comment!=="string"||comment.length>350||typeof path!=="string"||!/^\/gratis\/[a-z0-9/_-]*$/i.test(path))return json({error:"Campos inválidos"},400);
 const ip=request.headers.get("CF-Connecting-IP")||"unknown",day=new Date().toISOString().slice(0,10);
 const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode("kc-feedback:"+day+":"+ip));
 const key="ux:limit:"+Array.from(new Uint8Array(digest)).slice(0,12).map(b=>b.toString(16).padStart(2,"0")).join("");
 if(await env.CERT_REQUESTS.get(key))return json({error:"Una respuesta por día"},429);
 await env.CERT_REQUESTS.put("ux:item:"+Date.now()+":"+crypto.randomUUID(),JSON.stringify({date:new Date().toISOString(),rating,topic,comment:comment.trim(),path}),{expirationTtl:7776000});
 await env.CERT_REQUESTS.put(key,"1",{expirationTtl:86400});
 return json({ok:true},201)
}