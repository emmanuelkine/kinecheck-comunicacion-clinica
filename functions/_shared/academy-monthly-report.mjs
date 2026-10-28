const fields=['student_id','course','approved_at','issued_at','certificate_id','external_id','issuer','reconciliation_status'];
const monthInChile=date=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Santiago',year:'numeric',month:'2-digit'}).format(date);
export function normalizeMonthlyReport(input) {
 if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(input?.month)||input?.timezone!=='America/Santiago'||!Array.isArray(input.rows))throw new Error('Reporte mensual autorizado requerido.');
 const seen=new Set(),external=new Set();
 const rows=input.rows.map(row=>{
  if(fields.some(k=>typeof row[k]!=='string'||!row[k].trim()))throw new Error('Faltan campos de un certificado emitido.');
  if(seen.has(row.certificate_id)||external.has(JSON.stringify([row.issuer,row.external_id])))throw new Error('Certificado duplicado.');
  seen.add(row.certificate_id);external.add(JSON.stringify([row.issuer,row.external_id]));
  const approved=new Date(row.approved_at),issued=new Date(row.issued_at),revoked=row.revoked_at?new Date(row.revoked_at):null;
  if(!Number.isFinite(+approved)||!Number.isFinite(+issued)||approved>issued||monthInChile(issued)!==input.month||revoked&&(!Number.isFinite(+revoked)||revoked<issued))throw new Error('Fechas incompatibles con emisión o mes.');
  if(row.unit_cost===null||row.unit_cost===''||!Number.isFinite(Number(row.unit_cost))||Number(row.unit_cost)<0||row.currency!=='CLP')throw new Error('Costo unitario válido en CLP requerido.');
  if(!['pending','reconciled','credit_required','credited'].includes(row.reconciliation_status))throw new Error('Conciliación inválida.');
  if(Boolean(revoked)!==['credit_required','credited'].includes(row.reconciliation_status))throw new Error('Anulación y conciliación no coinciden.');
  return {...row,unit_cost:Number(row.unit_cost),approved,issued,revoked};
 });
 return {month:input.month,timezone:input.timezone,rows};
}
