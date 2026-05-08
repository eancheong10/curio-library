import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

interface Body {
  topic?: string;
  title?: string;
  body?: string;
  count?: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    let body: Body = {};
    try { body = await req.json(); } catch { /* ignore */ }

    const topic = (body.topic || "general knowledge").slice(0, 120);
    const title = (body.title || "").slice(0, 200);
    const article = (body.body || "").slice(0, 4500);
    const count = Math.max(3, Math.min(10, body.count || 5));

    const systemPrompt = `You are a friendly trivia writer. Write punchy, fair multiple-choice questions for readers aged 12+. Each question must have exactly 4 options, only one clearly correct. Avoid trick wording. Keep questions concise.`;

    const userPrompt = article
      ? `Create ${count} multiple-choice questions about the following article on "${topic}". Base them strictly on the content provided.\n\nTitle: ${title}\n\nArticle:\n${article}`
      : `Create ${count} multiple-choice general-knowledge questions about "${topic}". Mix easy and medium difficulty.`;

    const tools = [{
      type: "function",
      function: {
        name: "publish_quiz",
        parameters: {
          type: "object",
          properties: {
            questions: {
              type: "array",
              minItems: 3,
              maxItems: 10,
              items: {
                type: "object",
                properties: {
                  question: { type: "string" },
                  options: {
                    type: "array",
                    minItems: 4,
                    maxItems: 4,
                    items: { type: "string" },
                  },
                  correct_index: { type: "integer", minimum: 0, maximum: 3 },
                  explanation: { type: "string", description: "1-2 sentence explanation" },
                },
                required: ["question", "options", "correct_index", "explanation"],
              },
            },
          },
          required: ["questions"],
        },
      },
    }];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools,
        tool_choice: { type: "function", function: { name: "publish_quiz" } },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Too many requests, please wait a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error ${response.status}: ${errText}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call");
    const quiz = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({ topic, title, ...quiz }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("generate-quiz error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
