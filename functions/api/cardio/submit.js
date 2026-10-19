const correct = [1,2,0,1,2,0,1,0,2,1];
function grade(p) { return Number((p <= 24 ? 1 + (3*p/24) : 4 + (3*(p-24)/16)).toFixed(1)); }
export async function onRequestPost({ request, env }) {
  if (!env.CARDIO_RESULTS) return Response.json({ error:'Almacenamiento docente no configurado.' },{status:503});
  let body;
  try { body=await request.json(); } catch { return Response.json({error:'JSON inválido.'},{status:400}); }
  const tidy=v=>typeof v==='string'?v.trim().slice(0,100):'';
  const students=[tidy(body.student1),tidy(body.student2)];
  const course=tidy(body.course);
  const a=body.answers;
  if(students.some(s=>s.length<3)||!course||!Array.isArray(a)||a.length!==10||a.some(x=>!Number.isInteger(x)||x<0||x>3)) return Response.json({error:'Datos o respuestas inválidos.'},{status:400});
  const points=a.map((x,i)=>x===correct[i]?4:0);
  const score1=points.slice(0,5).reduce((a,b)=>a+b,0),score2=points.slice(5).reduce((a,b)=>a+b,0),total=score1+score2;
  const id=crypto.randomUUID(),date=new Date().toISOString();
  const record={id,date,student1:students[0],student2:students[1],course,answers:a,points,score1,score2,total,percentage:Math.round(total/40*100),grade:grade(total)};
  await env.CARDIO_RESULTS.put('cardio:'+id,JSON.stringify(record));
  return Response.json({id,date,score1,score2,total,percentage:record.percentage,grade:record.grade},{headers:{'Cache-Control':'no-store'}});
}
