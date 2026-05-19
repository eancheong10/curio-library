import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

interface Body {
  topic?: string;
  title?: string;
  body?: string;
  count?: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    let body: Body = {};
    try { body = await req.json(); } catch { /* ignore */ }

    const topic = (body.topic || "").slice(0, 120);
    const title = (body.title || "").slice(0, 200);
    const count = Math.max(3, Math.min(10, body.count || 5));

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // 1) Prefer exact title match — guarantees the quiz fits the article the user just read.
    let row: { topic: string; title: string; questions: unknown[] } | null = null;
    if (title) {
      const { data } = await admin
        .from("library_articles")
        .select("topic, title, questions")
        .ilike("title", title)
        .maybeSingle();
      if (data) row = data as typeof row;
    }
    // 2) Otherwise pick any article on that topic.
    if (!row && topic) {
      const { data } = await admin
        .from("library_articles")
        .select("topic, title, questions")
        .ilike("topic", topic);
      if (data && data.length) row = data[Math.floor(Math.random() * data.length)] as typeof row;
    }
    // 3) Otherwise a random article from the library.
    if (!row) {
      const { data } = await admin.from("library_articles").select("topic, title, questions");
      if (data && data.length) row = data[Math.floor(Math.random() * data.length)] as typeof row;
    }

    if (!row) {
      return new Response(JSON.stringify({ error: "No quiz available." }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const questions = (row.questions as unknown[]).slice(0, count);

    return new Response(JSON.stringify({
      topic: row.topic,
      title: row.title,
      questions,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("generate-quiz error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
