import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

// Topic pools surfaced to the UI (Spin wheel, category pickers). The actual
// articles returned come from the library_articles table — this is just the
// menu of topics readers can choose between.
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

    // Decide the topic the reader is asking for
    let requested: string | null = null;
    if (body.topic) requested = body.topic.slice(0, 120);
    else if (body.fromTopic && body.direction) requested = body.fromTopic; // rabbit hole — try same topic family
    else if (body.category && body.category !== "any" && CATEGORIES[body.category]) requested = pick([...CATEGORIES[body.category]]);
    else if (body.mode === "jackpot") requested = pick(JACKPOT_TOPICS);
    else if (body.mode === "risk") requested = pick(RISK_TOPICS);
    else requested = pick(SAFE_TOPICS);

    // 1) Try exact-topic match (case-insensitive). Pick a random one that isn't the previous title.
    let article: Record<string, unknown> | null = null;
    let pickedTopic = requested!;
    if (requested) {
      const { data } = await admin
        .from("library_articles")
        .select("*")
        .ilike("topic", requested);
      const candidates = (data || []).filter((a) => a.title !== body.previousTitle);
      if (candidates.length) {
        article = candidates[Math.floor(Math.random() * candidates.length)];
        pickedTopic = (article!.topic as string) ?? requested;
      }
    }

    // 2) Rabbit-hole fallback: if no direct match, find an article whose related_topics list contains the requested topic
    if (!article && body.fromTopic) {
      const { data } = await admin
        .from("library_articles")
        .select("*")
        .contains("related_topics", JSON.stringify([body.fromTopic]));
      const candidates = (data || []).filter((a) => a.title !== body.previousTitle);
      if (candidates.length) {
        article = candidates[Math.floor(Math.random() * candidates.length)];
        pickedTopic = article!.topic as string;
      }
    }

    // 3) Last resort: random article from the library (still respect previousTitle)
    if (!article) {
      const { data } = await admin.from("library_articles").select("*");
      const candidates = (data || []).filter((a) => a.title !== body.previousTitle);
      if (!candidates.length) {
        return new Response(JSON.stringify({ error: "Library is empty." }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      article = candidates[Math.floor(Math.random() * candidates.length)];
      pickedTopic = article!.topic as string;
    }

    // Shape the response to match what the frontend expects (article + pickedTopic + mode)
    const shaped = {
      title: article!.title,
      summary: article!.summary,
      body: article!.body,
      topic: article!.topic,
      emoji: article!.emoji,
      related_topics: article!.related_topics ?? [],
    };

    return new Response(JSON.stringify({
      article: shaped,
      pickedTopic,
      mode: body.mode || "safe",
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("spin-article error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
