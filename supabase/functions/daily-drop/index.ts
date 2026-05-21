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

    // 3) If today has no curated entry, find the NEAREST upcoming/recent calendar date
    //    that does. Never invent an event for a date it didn't happen on.
    if (!seed) {
      const { data: all } = await admin
        .from("library_daily_drops")
        .select("*")
        .order("month_day", { ascending: true });
      if (all && all.length) {
        const toNum = (md: string) => parseInt(md.slice(0,2)) * 31 + parseInt(md.slice(3,5));
        const todayN = toNum(monthDay);
        let best = all[0]; let bestDist = 999;
        for (const row of all) {
          const d = Math.abs(toNum(row.month_day) - todayN);
          if (d < bestDist) { bestDist = d; best = row; }
        }
        seed = best;
        // Mark as "from nearby date" so UI can be honest
        seed.title = `${seed.title}`;
        seed.fact = `(Nearest date on file — ${seed.month_day}.) ${seed.fact}`;
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
