const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});
export async function onRequestPost({request,env}){
  try{
    const body=await request.json();
    const nombre=String(body.nombre||"").trim();
    const email=String(body.email||"").trim().toLowerCase();
    const curso=String(body.curso||"").trim();
    if(body.website) return json({message:"Solicitud recibida."});
    if(!nombre||nombre.length>100||!email||email.length>160||!curso||!body.consentimiento) return json({error:"Completa todos los campos obligatorios."},400);
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({error:"Ingresa un correo electrónico válido."},400);
    const details={nombre,email,curso,fecha:new Date().toISOString(),subject:"Información sobre certificación — KineCheck",replyHtml:`<div style="font-family:Arial,sans-serif;line-height:1.6;color:#102c33"><h1>Información sobre certificación</h1><p>Hola ${nombre},</p><p>Recibimos tu solicitud de información sobre certificación para <strong>${curso}</strong>.</p><p>Los recursos gratuitos de KineCheck no incluyen certificación. En cursos seleccionados, quienes adquieren la formación podrán acceder a certificación de sus horas de estudio a través de una OTEC, según las condiciones específicas del curso.</p><p>Las horas certificables, requisitos, entidad emisora y eventuales costos se informarán para cada curso antes de solicitar la certificación.</p><p>Este mensaje informativo no constituye por sí mismo la emisión de un certificado ni una inscripción.</p><p><strong>KineCheck</strong><br>Educación, evidencia científica y razonamiento clínico musculoesquelético.</p></div>`};
    if(env.CERT_REQUESTS) await env.CERT_REQUESTS.put("cert:"+Date.now()+":"+crypto.randomUUID(),JSON.stringify(details),{expirationTtl:7776000});
    if(env.CERT_EMAIL_SERVICE){
      await env.CERT_EMAIL_SERVICE.fetch("https://certificacion.kinecheck.internal/send",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(details)});
      return json({message:"Solicitud recibida. Te enviamos la información disponible a tu correo."});
    }
    return json({message:"Solicitud recibida correctamente. La información de certificación será enviada cuando el servicio de correo quede habilitado."});
  }catch(e){return json({error:"No fue posible procesar la solicitud. Inténtalo nuevamente."},500)}
}
export function onRequestGet(){return json({error:"Método no permitido."},405)}