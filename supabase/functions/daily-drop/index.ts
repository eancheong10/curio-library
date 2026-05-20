import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const now = new Date();
    const today = now.toISOString().slice(0, 10);                 // YYYY-MM-DD
    const monthDay = today.slice(5);                              // MM-DD

    // 1) Cached daily drop already published today?
    const { data: cached } = await admin
      .from("daily_drops")
      .select("*")
      .eq("drop_date", today)
      .maybeSingle();
    if (cached) {
      return new Response(JSON.stringify({ drop: cached }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2) Look up a hand-curated seed for this calendar date.
    let { data: seed } = await admin
      .from("library_daily_drops")
      .select("*")
      .eq("month_day", monthDay)
      .maybeSingle();

    // 3) If no seed exists for today's exact date, pick deterministically by day-of-year
    //    so the same date always shows the same "on this day" entry (not random per refresh).
    if (!seed) {
      const { data: all } = await admin
        .from("library_daily_drops")
        .select("*")
        .order("month_day", { ascending: true });
      if (all && all.length) {
        const start = new Date(Date.UTC(now.getUTCFullYear(), 0, 0));
        const dayOfYear = Math.floor((now.getTime() - start.getTime()) / 86400000);
        seed = all[dayOfYear % all.length];
      }
    }

    if (!seed) {
      return new Response(JSON.stringify({ error: "No daily drop available." }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const drop = {
      drop_date: today,
      title: seed.title,
      fact: seed.fact,
      body: seed.body,
      emoji: seed.emoji || "📜",
      topic: seed.topic || "On this day",
    };

    await admin.from("daily_drops").upsert(drop, { onConflict: "drop_date" });

    return new Response(JSON.stringify({ drop }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("daily-drop error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
