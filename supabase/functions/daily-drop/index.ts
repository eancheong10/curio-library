import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const today = new Date().toISOString().slice(0, 10);

    // Return cached drop if it exists for today
    const { data: existing } = await admin
      .from("daily_drops")
      .select("*")
      .eq("drop_date", today)
      .maybeSingle();
    if (existing) {
      return new Response(JSON.stringify({ drop: existing }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate today's drop
    const dateObj = new Date();
    const monthDay = dateObj.toLocaleDateString("en-US", { month: "long", day: "numeric" });
    const fullDate = dateObj.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

    const systemPrompt = `You are a meticulous historian sharing "On This Day" facts.

CRITICAL ACCURACY RULES:
1. Only share events you are CERTAIN happened on the specified month/day in some past year.
2. Include the exact YEAR in the title and fact.
3. Prefer well-documented, widely-cited events (major historical milestones, famous birthdays/deaths, scientific firsts, cultural turning points).
4. If you are not certain a date is correct, choose a different, well-known event from the same date.
5. Never invent or guess dates. Better to pick a less-flashy but verified event than a flashy unverified one.
6. The fact field MUST contain the exact year and a verifiable factual claim.

Tone: warm, accessible for ages 12+. Return JSON only.`;

    const userPrompt = `Today is ${fullDate} (${monthDay}). Share ONE captivating, FACTUALLY VERIFIED "on this day" event that occurred on ${monthDay} in any past year. Prefer events with strong historical record. Include the year explicitly.`;

    const tools = [{
      type: "function",
      function: {
        name: "publish_drop",
        parameters: {
          type: "object",
          properties: {
            title: { type: "string", description: "Headline including the year, max 90 chars. Example: '1969: Apollo 11 Lifts Off'" },
            fact: { type: "string", description: "One-sentence verified fact, includes the year, max 180 chars" },
            body: { type: "string", description: "5-7 complete paragraphs (~700-1000 words) of accurate historical context. Separate paragraphs with double newlines. Always finish with a concluding paragraph — never end mid-sentence. Stick to verifiable facts." },
            emoji: { type: "string", description: "Single emoji" },
            topic: { type: "string", description: "Short topic label (1-3 words), e.g. 'Space', 'Politics'" },
          },
          required: ["title", "fact", "body", "emoji", "topic"],
        },
      },
    }];

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools,
        tool_choice: { type: "function", function: { name: "publish_drop" } },
      }),
    });

    if (!r.ok) {
      const errText = await r.text();
      if (r.status === 429) return new Response(JSON.stringify({ error: "Rate limited." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (r.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI gateway error ${r.status}: ${errText}`);
    }

    const data = await r.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call");
    const parsed = JSON.parse(toolCall.function.arguments);

    const drop = {
      drop_date: today,
      title: parsed.title,
      fact: parsed.fact,
      body: parsed.body,
      emoji: parsed.emoji || "📜",
      topic: parsed.topic || "On this day",
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
