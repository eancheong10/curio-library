import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

interface Article {
  id: string;
  title: string;
  summary: string;
  body: string;
  topic: string;
  source_name: string;
  source_url: string;
  emoji: string;
  published_at: string;
}

const COUNTRY_LABEL: Record<string, string> = {
  global: "global / international",
  us: "United States",
  uk: "United Kingdom",
  ca: "Canada",
  au: "Australia",
  in: "India",
  sg: "Singapore",
  my: "Malaysia",
  jp: "Japan",
  cn: "China (mainland and Hong Kong)",
  fr: "France",
  de: "Germany",
  br: "Brazil",
  za: "South Africa",
  ng: "Nigeria",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    let body: { country?: string } = {};
    try { body = await req.json(); } catch { /* empty */ }
    const country = (body.country || "global").toLowerCase();
    const countryLabel = COUNTRY_LABEL[country] || "global";

    const today = new Date().toISOString().slice(0, 10);
    const fullDate = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

    const systemPrompt = `You are a friendly librarian curating today's most interesting and important news from verified, mainstream sources (Reuters, AP, BBC, NPR, The Guardian, NYT, Al Jazeera, etc.). Write in a warm, accessible tone for readers aged 12+. Always cite real, currently-published stories with real publication dates within the last 2 days.

CRITICAL — source_url rules:
- source_url MUST be a deep link to the SPECIFIC article page, never the publisher's homepage or a section index.
- The URL path MUST contain the article slug or ID (e.g. /world/europe/2026/04/29/specific-headline-slug or /news/articles/abc12345). It MUST NOT be just https://www.bbc.com/ or https://www.reuters.com/world/.
- If you cannot recall a confirmed article URL with a slug/ID for a story, choose a different story you DO know the URL for.
- Prefer canonical URLs from these reliable outlets: reuters.com, apnews.com, bbc.com/news, npr.org, theguardian.com, nytimes.com, aljazeera.com, ft.com.`;

    const userPrompt = `Today is ${fullDate}. Curate 6 of today's most important and intriguing news stories with a focus on **${countryLabel}** (mix in 1-2 international stories if country is not 'global'). Mix categories: politics, world, economics, science, tech, culture. Provide a working source_url and publication date (YYYY-MM-DD). The article body MUST be 5-7 complete paragraphs (~600-900 words) — never end mid-sentence, always close out the story with a clear concluding paragraph. Return ONLY valid JSON.`;

    const tools = [{
      type: "function",
      function: {
        name: "publish_news",
        description: "Publish curated news articles",
        parameters: {
          type: "object",
          properties: {
            articles: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string", description: "Headline (max 90 chars)" },
                  summary: { type: "string", description: "1-sentence hook (max 140 chars)" },
                  body: { type: "string", description: "5-7 complete paragraphs (~600-900 words) in warm, clear language for ages 12+. Always finish with a concluding paragraph — never end mid-sentence." },
                  topic: { type: "string", description: "One short topic label e.g. Politics, Economics, Science, World, Tech, Culture" },
                  source_name: { type: "string", description: "Real outlet name e.g. Reuters" },
                  source_url: { type: "string", description: "Deep link to the SPECIFIC article page (must include slug or article id; never just the publisher's homepage)" },
                  emoji: { type: "string", description: "A single emoji representing the article" },
                  published_at: { type: "string", description: "Publication date YYYY-MM-DD" },
                },
                required: ["title", "summary", "body", "topic", "source_name", "source_url", "emoji", "published_at"]
              }
            }
          },
          required: ["articles"]
        }
      }
    }];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools,
        tool_choice: { type: "function", function: { name: "publish_news" } },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits in Settings." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error ${response.status}: ${errText}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in response");
    const parsed = JSON.parse(toolCall.function.arguments);

    // Keep articles whose URL is at least not a bare homepage.
    function isUsableUrl(u: string): boolean {
      try {
        const url = new URL(u);
        if (!/^https?:$/.test(url.protocol)) return false;
        const path = url.pathname.replace(/\/+$/, "");
        // Reject only completely bare homepages — anything with a path is acceptable
        return path.length > 1;
      } catch { return false; }
    }

    const rawArticles: Article[] = parsed.articles || [];
    console.log(`fetch-news: model returned ${rawArticles.length} articles for ${country}`);

    const articles: Article[] = rawArticles
      .map((a: Article, i: number) => ({
        ...a,
        source_url: a?.source_url && isUsableUrl(a.source_url) ? a.source_url : "",
        id: `${today}-${country}-${i}`,
        published_at: a.published_at || today,
      }))
      .filter((a: Article) => a.title && a.body);

    console.log(`fetch-news: returning ${articles.length} articles after filtering`);

    return new Response(JSON.stringify({ articles, date: today, country }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("fetch-news error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
