import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response(JSON.stringify({ message: "Método no permitido" }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Sesión no válida");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) throw new Error("Sesión no válida");

    const body = await req.json();
    const rating = Number(body.rating);
    const courseSlug = String(body.courseSlug || "").trim();
    if (!courseSlug || !Number.isInteger(rating) || rating < 1 || rating > 5) throw new Error("Evaluación inválida");

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const { error } = await admin.from("course_reviews").upsert({
      user_id: userData.user.id,
      course_slug: courseSlug,
      rating,
      recommends: Boolean(body.recommends),
      best_part: String(body.bestPart || "").trim().slice(0, 800) || null,
      improvement: String(body.improvement || "").trim().slice(0, 800) || null,
      public_comment: Boolean(body.publicComment),
      approved: false,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id,course_slug" });

    if (error) throw error;
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({ message: error instanceof Error ? error.message : "No fue posible registrar la evaluación" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});