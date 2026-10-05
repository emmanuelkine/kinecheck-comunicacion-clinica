const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});
const esc=v=>String(v||"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
export async function onRequestPost({request,env}){
 let b;try{b=await request.json()}catch{return json({error:"Solicitud inválida."},400)}
 if(!b||typeof b!=="object"||Array.isArray(b))return json({error:"Solicitud inválida."},400);
 if(b.website)return json({message:"Respuesta recibida.",id:"OK"});
 const station=Number(b.station),section=String(b.section||"").trim(),group=String(b.group||"").trim().slice(0,20),members=String(b.members||"").trim().slice(0,500),conclusion=String(b.conclusion||"").trim().slice(0,2000);
 const answers=Array.isArray(b.answers)?b.answers.slice(0,8).map(x=>({question:String(x.question||"").slice(0,160),answer:String(x.answer||"").trim().slice(0,2000)})):[];
 if(!(station>=1&&station<=6)||!["S1","S2"].includes(section)||!group||!members||!conclusion||!answers.length||answers.some(x=>!x.answer))return json({error:"Completa todos los campos antes de enviar."},400);
 const id="NK-"+new Date().toISOString().slice(0,10).replaceAll("-","")+"-"+crypto.randomUUID().slice(0,8).toUpperCase();
 const record={id,station,title:String(b.title||""),section,group,members,answers,conclusion,createdAt:new Date().toISOString()};
 if(env.CERT_REQUESTS){try{await env.CERT_REQUESTS.put("activity:"+record.createdAt+":"+id,JSON.stringify(record),{expirationTtl:15552000})}catch(e){console.error("Activity KV unavailable",e)}}
 if(!env.RESEND_API_KEY)return json({error:"El servicio de envío aún no está configurado."},503);
 const rows=answers.map(x=>'<tr><td style="padding:8px;border:1px solid #d8e2e6;font-weight:bold">'+esc(x.question)+'</td><td style="padding:8px;border:1px solid #d8e2e6">'+esc(x.answer).replaceAll("\n","<br>")+'</td></tr>').join("");
 const html='<div style="font-family:Arial,sans-serif;color:#102c33;line-height:1.5"><h2>Actividad Neurokinésica — Estación '+station+'</h2><p><b>Código:</b> '+id+'<br><b>Sección:</b> '+esc(section)+' · <b>Grupo:</b> '+esc(group)+'</p><p><b>Integrantes:</b><br>'+esc(members).replaceAll("\n","<br>")+'</p><table style="border-collapse:collapse;width:100%">'+rows+'</table><h3>Conclusión</h3><p>'+esc(conclusion).replaceAll("\n","<br>")+'</p></div>';
 const recipient=env.ACTIVITY_RECIPIENT||"emmanuelkine@gmail.com";
 try{const r=await fetch("https://api.resend.com/emails",{method:"POST",headers:{authorization:"Bearer "+env.RESEND_API_KEY,"content-type":"application/json"},body:JSON.stringify({from:"KineCheck <certificacion@kinecheck.cl>",to:[recipient],subject:"[Neurokinésica] "+section+" · Grupo "+group+" · Estación "+station,html})});if(!r.ok){console.error("Resend rejected",r.status);return json({error:"La respuesta fue registrada, pero no se pudo enviar la notificación."},502)}}catch(e){console.error("Resend unavailable",e);return json({error:"La respuesta fue registrada, pero no se pudo enviar la notificación."},502)}
 return json({message:"Respuesta enviada correctamente al docente.",id});
}
export function onRequestGet(){return json({error:"Método no permitido."},405)}