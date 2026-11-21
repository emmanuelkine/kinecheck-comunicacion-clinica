export async function onRequestGet({request,env}) {
  if(!env.CARDIO_RESULTS||!env.CARDIO_ADMIN_TOKEN) return Response.json({error:'Panel no configurado.'},{status:503});
  const auth=request.headers.get('Authorization')||'';
  if(!auth.startsWith('Bearer ')||auth.slice(7)!==env.CARDIO_ADMIN_TOKEN) return Response.json({error:'Acceso no autorizado.'},{status:401});
  let cursor,records=[],pages=0;
  do {
    const page=await env.CARDIO_RESULTS.list({prefix:'cardio:',limit:1000,...(cursor?{cursor}:{})});
    const items=await Promise.all(page.keys.map(k=>env.CARDIO_RESULTS.get(k.name,'json')));
    records.push(...items.filter(Boolean));
    cursor=page.list_complete?undefined:page.cursor;
    pages++;
  } while(cursor&&pages<10);
  records.sort((a,b)=>b.date.localeCompare(a.date));
  return Response.json({records,hasMore:Boolean(cursor)},{headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
}
