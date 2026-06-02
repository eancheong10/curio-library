import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

// Topic pools surfaced to the UI (Spin wheel, category pickers).
const CATEGORIES = {
  history: ["Ancient Egypt","Roman Empire","Vikings","WWII Codebreakers","Mongol Empire","Silk Road Secrets","The Black Death","The French Revolution","Apollo Program","Civil Rights Movement"],
  science: ["Volcanoes","Black Holes","Dinosaurs","CRISPR","Octopus Intelligence","Exoplanets","Gravitational Waves","Human Evolution","Sleep Science","Whale Songs"],
  philosophy: ["Stoicism","Existentialism","The Trolley Problem","Simulation Hypothesis","Buddhist Philosophy","Free Will Debate","Utilitarianism"],
  politics: ["Geopolitics","Universal Basic Income","Ranked Choice Voting","The European Union","NATO Explained","Central Banks","Tax Havens"],
  arts: ["Impressionism","Jazz Origins","Bauhaus Design","Studio Ghibli","Hip-Hop Origins","Frida Kahlo","Gothic Cathedrals"],
  games: ["Esports","Chess Grandmasters","Nintendo's Origins","Speedrunning Culture","Dungeons & Dragons","Poker Mathematics","AlphaGo vs Lee Sedol"],
  mysteries: ["Bermuda Triangle","The Voynich Manuscript","The Antikythera Mechanism","Dyatlov Pass Mystery","The Wow! Signal","The Mary Celeste","Roanoke Colony","Göbekli Tepe","The Nazca Lines","Easter Island Moai"],
  nature: ["Bioluminescence","Deep Sea Creatures","Coral Bleaching","Ant Superorganisms","Old-Growth Forests","Tornado Formation","Hurricane Anatomy"],
  tech: ["Cryptocurrency","Quantum Computing","ARPANET Origins","mRNA Vaccines","Fusion Power","Self-Driving Cars","Large Language Models"],
  words: ["Untranslatable Words","The Rosetta Stone","Esperanto","Endangered Languages","Whistled Languages","Hieroglyphs Decoded","Sign Languages"],
} as const;

type CategoryKey = keyof typeof CATEGORIES;

const SAFE_TOPICS = [...CATEGORIES.history, ...CATEGORIES.nature, ...CATEGORIES.arts, ...CATEGORIES.games];
const RISK_TOPICS = [...CATEGORIES.philosophy, ...CATEGORIES.politics, ...CATEGORIES.tech, ...CATEGORIES.words];
const JACKPOT_TOPICS = [...CATEGORIES.mysteries];
const ALL_POOL = [...new Set([...SAFE_TOPICS, ...RISK_TOPICS, ...JACKPOT_TOPICS])];

interface Body {
  topic?: string;
  previousTitle?: string;
  poolOnly?: boolean;
  mode?: "safe" | "risk" | "jackpot";
  category?: CategoryKey | "any";
  direction?: "cause" | "impact" | "opposite" | "related" | "random";
  fromTopic?: string;
}

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

const EMOJI_BY_CAT: Record<string, string> = {
  history: "📜", science: "🔬", philosophy: "🧠", politics: "🏛️",
  arts: "🎨", games: "🎲", mysteries: "🕵️", nature: "🌿", tech: "💻", words: "🔤",
};

function guessEmoji(topic: string): string {
  for (const [cat, list] of Object.entries(CATEGORIES)) {
    if ((list as readonly string[]).some(t => t.toLowerCase() === topic.toLowerCase())) {
      return EMOJI_BY_CAT[cat] || "📖";
    }
  }
  return "📖";
}

async function generateWithAI(topic: string, direction?: string, previousTitle?: string) {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) throw new Error("AI not configured");

  const directionHint = direction
    ? `The reader just finished an article titled "${previousTitle ?? topic}" and chose the "${direction}" path — angle this piece accordingly (cause = what led up to it; impact = what came after; opposite = a contrasting perspective; related = a sibling topic; random = a surprising tangent).`
    : "";

  const system = `You are a curator for "Curio Library", a cozy, library-themed curiosity app. Write an engaging article (450-650 words) for a curious general reader. Tone: warm, witty, vivid — like an enthusiastic librarian. Use 4-6 paragraphs separated by blank lines. No headings, no markdown, no lists — plain flowing prose. Be factually concrete (dates, names, places, numbers when relevant).`;

  const userPrompt = `Topic: ${topic}\n${directionHint}\n\nReturn a structured article via the publish_article tool.`;

  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash-lite",
      messages: [
        { role: "system", content: system },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 2000,
      tools: [{
        type: "function",
        function: {
          name: "publish_article",
          description: "Publish a curiosity article.",
          parameters: {
            type: "object",
            properties: {
              title: { type: "string", description: "Catchy, specific title (max 90 chars)." },
              summary: { type: "string", description: "One-sentence teaser (max 200 chars)." },
              body: { type: "string", description: "A 450-650 word article body. Paragraphs separated by blank lines. No markdown." },
              emoji: { type: "string", description: "A single emoji that captures the vibe." },
              related_topics: {
                type: "array", items: { type: "string" },
                description: "4-6 short related topic names a reader might jump to next.",
              },
            },
            required: ["title", "summary", "body", "emoji", "related_topics"],
            additionalProperties: false,
          },
        },
      }],
      tool_choice: { type: "function", function: { name: "publish_article" } },
    }),
  });

  if (!resp.ok) {
    const t = await resp.text();
    throw new Error(`AI gateway ${resp.status}: ${t.slice(0, 200)}`);
  }
  const data = await resp.json();
  const call = data?.choices?.[0]?.message?.tool_calls?.[0];
  if (!call) throw new Error("No tool call in AI response");
  const args = JSON.parse(call.function.arguments);
  return {
    title: args.title,
    summary: args.summary,
    body: args.body,
    topic,
    emoji: args.emoji || guessEmoji(topic),
    related_topics: args.related_topics || [],
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    let body: Body = {};
    try { body = await req.json(); } catch { /* empty */ }

    if (body.poolOnly) {
      return new Response(JSON.stringify({
        pool: ALL_POOL, safe: SAFE_TOPICS, risk: RISK_TOPICS, jackpot: JACKPOT_TOPICS, categories: CATEGORIES,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Decide the topic
    let requested: string | null = null;
    if (body.topic) requested = body.topic.slice(0, 120);
    else if (body.fromTopic && body.direction) requested = body.fromTopic;
    else if (body.category && body.category !== "any" && CATEGORIES[body.category]) requested = pick([...CATEGORIES[body.category]]);
    else if (body.mode === "jackpot") requested = pick(JACKPOT_TOPICS);
    else if (body.mode === "risk") requested = pick(RISK_TOPICS);
    else requested = pick(SAFE_TOPICS);

    const pickedTopic = requested!;

    // 1) Try AI first — gives long, fresh articles every spin.
    try {
      const shaped = await generateWithAI(pickedTopic, body.direction, body.previousTitle);

      // Cache to library for future reuse / offline fallback (best effort)
      admin.from("library_articles").insert({
        title: shaped.title,
        summary: shaped.summary,
        body: shaped.body,
        topic: pickedTopic,
        emoji: shaped.emoji,
        related_topics: shaped.related_topics,
      }).then(() => {}, () => {});

      return new Response(JSON.stringify({
        article: shaped, pickedTopic, mode: body.mode || "safe",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    } catch (aiErr) {
      console.warn("AI generation failed, falling back to library:", aiErr instanceof Error ? aiErr.message : aiErr);
    }

    // 2) Fallback: library lookup (so spins keep working even if AI is rate-limited / out of credits).
    let article: Record<string, unknown> | null = null;
    let resolvedTopic = pickedTopic;
    const { data } = await admin.from("library_articles").select("*").ilike("topic", pickedTopic);
    const candidates = (data || []).filter((a) => a.title !== body.previousTitle);
    if (candidates.length) {
      article = candidates[Math.floor(Math.random() * candidates.length)];
      resolvedTopic = (article!.topic as string) ?? pickedTopic;
    }

    if (!article) {
      const { data: any } = await admin.from("library_articles").select("*");
      const all = (any || []).filter((a) => a.title !== body.previousTitle);
      if (!all.length) {
        return new Response(JSON.stringify({ error: "Could not generate or find an article." }), {
          status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      article = all[Math.floor(Math.random() * all.length)];
      resolvedTopic = article!.topic as string;
    }

    const shaped = {
      title: article!.title,
      summary: article!.summary,
      body: article!.body,
      topic: article!.topic,
      emoji: article!.emoji,
      related_topics: article!.related_topics ?? [],
    };

    return new Response(JSON.stringify({
      article: shaped, pickedTopic: resolvedTopic, mode: body.mode || "safe",
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("spin-article error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
