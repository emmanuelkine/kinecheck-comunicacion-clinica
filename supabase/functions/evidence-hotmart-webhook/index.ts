import { createClient } from "npm:@supabase/supabase-js@2.117.3";

const EXPECTED_PRODUCT_ID = 8208817;
const HOTMART_TEST_UCODE = "fb056612-bcc6-4217-9e6d-2a5d1110ac2f";
const HOTMART_TEST_PRODUCT_NAME = "Produto test postback2";
const ACTIVE_EVENTS = new Set(["PURCHASE_APPROVED","PURCHASE_COMPLETE"]);
const REVOKE_EVENTS = new Set(["PURCHASE_CANCELED","PURCHASE_CHARGEBACK","PURCHASE_EXPIRED","PURCHASE_REFUNDED","PURCHASE_DELAYED","PURCHASE_PROTEST"]);
function text(v: unknown){return v==null?"":String(v).trim()}
function eventDate(v: unknown){const raw=v??Date.now();const n=Number(raw);const d=Number.isFinite(n)?new Date(n<10_000_000_000?n*1000:n):new Date(String(raw));return Number.isNaN(d.getTime())?new Date().toISOString():d.toISOString()}
Deno.serve(async(request)=>{
  if(request.method!=="POST") return Response.json({message:"Método no permitido."},{status:405});
  const expectedHotTok=Deno.env.get("EVIDENCE_HOTMART_HOTTOK")?.trim()||"";
  const supabaseUrl=Deno.env.get("SUPABASE_URL");
  const serviceRoleKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if(!expectedHotTok||!supabaseUrl||!serviceRoleKey) return Response.json({message:"Webhook incompleto."},{status:503});
  const receivedHotTok=request.headers.get("x-hotmart-hottok")?.trim()||"";
  if(receivedHotTok!==expectedHotTok) return Response.json({message:"Webhook no autorizado."},{status:401});
  const payload=await request.json().catch(()=>null);
  if(!payload||typeof payload!=="object"||Array.isArray(payload)) return Response.json({message:"JSON no válido."},{status:400});
  const body=payload as Record<string,any>,data=body.data||{},purchase=data.purchase||body.purchase||{},buyer=data.buyer||body.buyer||purchase.buyer||{},product=data.product||body.product||purchase.product||{};
  const event=text(body.event||body.event_name||body.status||purchase.status).toUpperCase();
  const productId=Number(product.id??product.product_id??data.product_id??body.product_id??-1);
  const productUcode=text(product.ucode||product.product_ucode||data.product_ucode||body.product_ucode);
  const productName=text(product.name||product.product_name);
  const email=text(buyer.email||purchase.buyer_email||data.email||body.email).toLowerCase();
  const buyerName=text(buyer.name||purchase.buyer_name||data.name||body.name);
  const transactionId=text(purchase.transaction||purchase.transaction_id||data.transaction||body.transaction||body.transaction_id);
  const incomingEventId=text(body.id||body.event_id||body.eventId);
  const occurredAt=eventDate(body.creation_date||body.creationDate||body.event_date||purchase.approved_date||purchase.order_date);
  const purchasedAt=purchase.approved_date||purchase.order_date||purchase.purchase_date||body.purchase_date||null;
  const test=productId===0&&productName===HOTMART_TEST_PRODUCT_NAME&&productUcode===HOTMART_TEST_UCODE&&email.endsWith("@example.com");
  if(test) return Response.json({ok:true,status:"test",event});
  if(productId!==EXPECTED_PRODUCT_ID) return Response.json({ok:true,ignored:"different_product"});
  if(!event||!transactionId||!email) return Response.json({message:"Evento incompleto."},{status:422});
  const status=ACTIVE_EVENTS.has(event)?"active":REVOKE_EVENTS.has(event)?"revoked":"";
  if(!status) return Response.json({ok:true,status:"ignored",event});
  const eventId=incomingEventId||[event,transactionId,productId,occurredAt].join(":");
  const admin=createClient(supabaseUrl,serviceRoleKey,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:result,error}=await admin.rpc("process_hotmart_event",{p_event_id:eventId,p_event_name:event,p_transaction_id:transactionId,p_product_id:productId,p_buyer_email:email,p_buyer_name:buyerName,p_status:status,p_purchased_at:purchasedAt,p_event_at:occurredAt});
  if(error){console.error("evidence-hotmart-webhook",error);return Response.json({message:"No fue posible actualizar el acceso."},{status:500})}
  return Response.json({ok:true,status,event,productId,courseSlug:"evidencia-aplicada",duplicate:result==="duplicate"});
});
