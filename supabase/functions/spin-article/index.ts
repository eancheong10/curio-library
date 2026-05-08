import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

// Categorized topic pools — greatly expanded
const CATEGORIES = {
  history: [
    "Ancient Egypt", "Roman Empire", "Vikings", "Renaissance Art", "Suffragette Movement",
    "Cold War Spies", "WWII Codebreakers", "Ottoman Sultans", "Mongol Empire",
    "Berlin Wall Stories", "Industrial Revolution", "Forgotten Queens", "Pirate Republics",
    "Samurai Code", "Eunuch Admiral Zheng He", "The Library of Alexandria",
    "The Bone Wars", "Operation Mincemeat", "The Great Emu War",
    "The Bronze Age Collapse", "Silk Road Secrets", "Medieval Medicine", "Lost Roman Concrete",
    "The Aztec Empire", "The Inca Road System", "Mesopotamian Cities", "Hammurabi's Code",
    "The Plague of Justinian", "The Black Death", "The Crusades", "The Magna Carta",
    "The Hundred Years' War", "The Spanish Armada", "The Tulip Mania", "The Salem Witch Trials",
    "The French Revolution", "Napoleonic Wars", "The Opium Wars", "The Meiji Restoration",
    "The Boxer Rebellion", "The Russo-Japanese War", "The Russian Revolution", "Spanish Civil War",
    "The Manhattan Project", "The Marshall Plan", "Apollo Program", "The Space Race",
    "Stonewall Riots", "Civil Rights Movement", "Apartheid in South Africa", "The Fall of Saigon",
    "The Cuban Missile Crisis", "The Watergate Scandal", "The Fall of Constantinople",
    "Hanseatic League", "Polynesian Wayfinders", "Mansa Musa's Pilgrimage", "The Kingdom of Aksum",
    "Great Zimbabwe", "The Ghana Empire", "Tang Dynasty Poets", "Heian Japan",
  ],
  science: [
    "Volcanoes", "Ocean Mysteries", "Bioluminescence", "Deep Sea Creatures",
    "Black Holes", "Dinosaurs", "Quantum Physics", "Particle Physics", "Dark Matter",
    "CRISPR", "Neuroscience", "Plate Tectonics", "Climate Science", "Twin Studies",
    "Octopus Intelligence", "Tardigrades in Space", "Animal Cognition",
    "Microbiome Mysteries", "The Science of Awe", "Memory Palaces", "Solar Storms",
    "Exoplanets", "The Fermi Paradox", "Neutron Stars", "Gravitational Waves",
    "The Higgs Boson", "Antimatter", "String Theory", "Wormholes", "The Multiverse",
    "Mitochondrial Eve", "Human Evolution", "Neanderthal DNA", "Epigenetics",
    "The Human Brain", "Sleep Science", "The Placebo Effect", "Pain Science",
    "Mushroom Networks", "Slime Mold Intelligence", "Whale Songs", "Crow Cognition",
    "Mantis Shrimp Vision", "Dolphin Communication", "Bee Democracy", "Migrating Monarchs",
    "Coral Reef Ecosystems", "The Mariana Trench", "Hydrothermal Vents", "Antarctic Ice Cores",
    "Auroras Explained", "Solar Eclipses", "Meteor Showers", "Comets and Asteroids",
    "The Voyager Probes", "Mars Rovers", "James Webb Discoveries", "Pulsars",
  ],
  philosophy: [
    "Stoicism", "Existentialism", "Metaphysics", "Philosophy of Mind",
    "Ethics of AI", "Game Theory", "Boltzmann Brains", "The Fermi Paradox",
    "Epicureanism", "Cynicism", "Daoism", "Confucian Ethics", "Buddhist Philosophy",
    "Phenomenology", "Absurdism", "Nihilism", "Pragmatism", "Utilitarianism",
    "Kant's Categorical Imperative", "The Trolley Problem", "Free Will Debate",
    "The Hard Problem of Consciousness", "Simulation Hypothesis", "Solipsism",
    "Moral Luck", "Virtue Ethics", "Effective Altruism", "Philosophy of Time",
  ],
  politics: [
    "Geopolitics", "Sanctions Explained", "Trade Wars", "Hyperinflation",
    "Behavioral Economics", "Universal Basic Income", "Election Systems",
    "Press Freedom", "Refugee Crises", "Soft Power",
    "Gerrymandering", "Ranked Choice Voting", "Federalism", "Direct Democracy",
    "The European Union", "NATO Explained", "United Nations Origins", "Veto Power",
    "OPEC", "Petrodollar System", "Currency Pegs", "Central Banks",
    "Sovereign Wealth Funds", "Tax Havens", "Lobbying", "Surveillance States",
    "Digital Authoritarianism", "Information Warfare", "Color Revolutions",
  ],
  arts: [
    "Renaissance Art", "Jazz Origins", "Film Noir", "Architectural Wonders",
    "Street Art", "Fashion History", "Surfing Culture",
    "Impressionism", "Cubism", "Surrealism", "Dadaism", "Bauhaus Design",
    "Art Deco", "Brutalist Architecture", "Gothic Cathedrals", "Japanese Ukiyo-e",
    "Persian Miniatures", "African Mask Traditions", "Aboriginal Dot Painting",
    "The Sistine Chapel", "The Mona Lisa Mystery", "Banksy", "Frida Kahlo",
    "Hip-Hop Origins", "Punk Rock", "Motown Records", "Bossa Nova",
    "K-Pop Industry", "Bollywood", "Studio Ghibli", "Pixar Storytelling",
    "The Hollywood Golden Age", "French New Wave", "Italian Neorealism",
  ],
  games: [
    "Esports", "Video Game History", "Chess Grandmasters", "Olympic Scandals",
    "Game Theory", "The Atari Crash", "Nintendo's Origins", "The Console Wars",
    "Speedrunning Culture", "Modding Communities", "MMO Economies",
    "The Magic: The Gathering Phenomenon", "Dungeons & Dragons", "Go Strategy",
    "Mahjong History", "Backgammon", "Poker Mathematics", "Scrabble Champions",
    "Rubik's Cube Records", "Pinball History", "Arcade Era", "Speedcubing",
    "Bobby Fischer", "Magnus Carlsen", "AlphaGo vs Lee Sedol",
  ],
  mysteries: [
    "Bermuda Triangle", "The Voynich Manuscript", "The Antikythera Mechanism",
    "Dyatlov Pass Mystery", "The Phaistos Disc", "Tunguska Event", "Lake Vostok",
    "The Dancing Plague of 1518", "The Wow! Signal", "Operation Paperclip",
    "The Mary Celeste", "Project Stargate (CIA)", "The Tomb of Qin Shi Huang",
    "Roanoke Colony", "Crop Circles", "Lost Civilizations", "The Codex Seraphinianus",
    "Sealand: The Tiny Nation", "The Taos Hum", "Oak Island Treasure",
    "The Beale Ciphers", "D.B. Cooper Hijacking", "The Zodiac Killer",
    "The Hum of the Earth", "The Bloop", "Skinwalker Ranch", "Hessdalen Lights",
    "The Nazca Lines", "Easter Island Moai", "Göbekli Tepe", "The Sea Peoples",
    "Atlantis Theories", "El Dorado", "Shangri-La", "The Hollow Earth Theory",
  ],
  nature: [
    "Volcanoes", "Ocean Mysteries", "Bioluminescence", "Deep Sea Creatures",
    "Plate Tectonics", "Climate Science", "Animal Cognition", "Octopus Intelligence",
    "Tardigrades in Space", "Rainforest Canopies", "Desert Adaptations",
    "Coral Bleaching", "Migrating Whales", "Murmurations", "Wolf Pack Dynamics",
    "Beaver Engineering", "Ant Superorganisms", "Termite Skyscrapers",
    "Carnivorous Plants", "Old-Growth Forests", "Mycorrhizal Networks",
    "Glacial Calving", "Geysers", "Tornado Formation", "Hurricane Anatomy",
    "Lightning Science", "Rainbows Explained", "Bioluminescent Bays",
  ],
  tech: [
    "Cryptocurrency", "Cybersecurity", "AI Alignment", "Quantum Computing",
    "Internet History", "Hacker Culture", "Open Source", "Renewable Energy",
    "Sodium-Cooled Reactors", "Forgotten Inventions", "The Dyson Sphere Idea",
    "Brain-Computer Interfaces", "Deepfake Detection", "Space Elevators", "Swarm Robotics",
    "The Turing Test", "ARPANET Origins", "The Browser Wars", "Y2K Bug",
    "The Dot-Com Bubble", "Bitcoin's Origin", "Ethereum Smart Contracts",
    "Generative AI", "Large Language Models", "Diffusion Models", "Self-Driving Cars",
    "Lidar Technology", "Solid-State Batteries", "Hydrogen Fuel", "Fusion Power",
    "ITER Reactor", "Vertical Farming", "Lab-Grown Meat", "Gene Drives",
    "mRNA Vaccines", "Optical Computing", "Photonic Chips", "Neuromorphic Hardware",
  ],
  words: [
    "Linguistics", "Dead Languages", "Etymology of English", "Constructed Languages",
    "Untranslatable Words", "Ancient Scripts", "Sign Languages", "Onomatopoeia Across Languages",
    "The Great Vowel Shift", "Esperanto", "Klingon and Conlangs", "Pidgin Languages",
    "Creole Origins", "Endangered Languages", "Whistled Languages", "Cuneiform",
    "Hieroglyphs Decoded", "The Rosetta Stone", "Linear B", "Proto-Indo-European",
    "Sapir-Whorf Hypothesis", "Color Words Across Cultures", "Numbers Around the World",
  ],
} as const;

type CategoryKey = keyof typeof CATEGORIES;

const SAFE_TOPICS = [
  ...CATEGORIES.history, ...CATEGORIES.nature, ...CATEGORIES.arts, ...CATEGORIES.games,
  "Mythology", "Norse Gods", "Greek Tragedies", "Egyptian Mythology", "Hindu Epics",
  "Fermented Foods", "Memory Tricks", "Dreams and Sleep", "Synesthesia",
  "Coffee History", "Chocolate History", "Tea Routes", "Spice Trade",
];
const RISK_TOPICS = [
  ...CATEGORIES.philosophy, ...CATEGORIES.politics, ...CATEGORIES.tech, ...CATEGORIES.words,
  "Conspiracy Debunked", "Paranormal Studies", "Twin Studies",
];
const JACKPOT_TOPICS = [
  ...CATEGORIES.mysteries,
  "The Chernobyl Liquidators", "The 1859 Carrington Event",
  "The Dyatlov Pass Reopened", "The Hum Mystery", "The Mary Celeste Reexamined",
];

const ALL_POOL = [...new Set([...SAFE_TOPICS, ...RISK_TOPICS, ...JACKPOT_TOPICS])];

const RABBIT_DIRECTIONS = ["cause", "impact", "opposite", "related", "random"] as const;
type RabbitDir = typeof RABBIT_DIRECTIONS[number];

interface Body {
  topic?: string;
  previousTitle?: string;
  poolOnly?: boolean;
  mode?: "safe" | "risk" | "jackpot";
  category?: CategoryKey | "any";
  direction?: RabbitDir;
  fromTopic?: string;
}

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    let body: Body = {};
    try { body = await req.json(); } catch { /* empty */ }

    if (body.poolOnly) {
      return new Response(JSON.stringify({
        pool: ALL_POOL,
        safe: SAFE_TOPICS,
        risk: RISK_TOPICS,
        jackpot: JACKPOT_TOPICS,
        categories: CATEGORIES,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Decide topic — category filter takes precedence over mode
    let pickedTopic: string;
    if (body.topic && typeof body.topic === "string") {
      pickedTopic = body.topic.slice(0, 120);
    } else if (body.category && body.category !== "any" && CATEGORIES[body.category]) {
      pickedTopic = pick([...CATEGORIES[body.category]]);
    } else if (body.mode === "jackpot") {
      pickedTopic = pick(JACKPOT_TOPICS);
    } else if (body.mode === "risk") {
      pickedTopic = pick(RISK_TOPICS);
    } else {
      pickedTopic = pick(SAFE_TOPICS);
    }

    // Build directional prompt (Rabbit Hole Mode)
    let directionInstruction = "";
    if (body.direction && body.fromTopic) {
      switch (body.direction) {
        case "cause":
          directionInstruction = `The reader just read about "${body.fromTopic}" and asks: "What led to this?" Write an article exploring the CAUSES, origins, or background that made "${body.fromTopic}" possible. The topic should be the cause itself.`;
          break;
        case "impact":
          directionInstruction = `The reader just read about "${body.fromTopic}" and asks: "What happened after?" Write an article about the IMPACT, consequences, aftermath, or modern legacy of "${body.fromTopic}".`;
          break;
        case "opposite":
          directionInstruction = `The reader just read about "${body.fromTopic}" and asks: "Show me a different perspective." Write an article that presents a CONTRASTING viewpoint, counter-argument, or opposing tradition to "${body.fromTopic}".`;
          break;
        case "related":
          directionInstruction = `The reader just read about "${body.fromTopic}" and wants something RELATED — a sibling subject in the same family of ideas. Write an article on a closely related topic, not the same thing.`;
          break;
        case "random":
          directionInstruction = `The reader just read about "${body.fromTopic}" and wants a RANDOM ESCAPE — something delightfully unrelated. Pick a wildly different fascinating topic.`;
          break;
      }
      pickedTopic = body.fromTopic; // placeholder — real topic comes back from the model
    } else if (body.previousTitle) {
      directionInstruction = `The reader just finished an article titled "${body.previousTitle}" and wants to go deeper. Write a NEW related article that builds on the same theme but reveals something new. The topic must remain "${pickedTopic}".`;
    } else {
      directionInstruction = `Write a fascinating standalone article on the topic "${pickedTopic}". The article's "topic" field MUST be exactly "${pickedTopic}".`;
    }

    const modeFlavor =
      body.mode === "jackpot"
        ? "This is a JACKPOT spin — make it feel rare, mysterious, and unforgettable."
        : body.mode === "risk"
        ? "This is a RISK spin — embrace complexity, but stay clear and approachable."
        : "";

    const systemPrompt = `You are a curious, warm storyteller writing for readers aged 12+. Your articles are engaging, factually accurate, and feel like a friendly expert sharing something amazing. Start with an intriguing hook, use vivid examples and surprising details, avoid jargon, and be honest about what is established fact vs theory.`;

    const ANGLES = [
      "tell a single specific human story inside this topic",
      "focus on a strange, lesser-known fact most people miss",
      "explain it through a vivid metaphor",
      "trace the timeline of how it changed across history",
      "compare it across two different cultures",
      "highlight a recent discovery or controversy",
      "frame it as a mystery slowly being solved",
      "follow one expert's lifelong obsession with it",
    ];
    const angle = ANGLES[Math.floor(Math.random() * ANGLES.length)];

    const userPrompt = `${directionInstruction} ${modeFlavor} The reader has about 4 minutes. Make it captivating. ANGLE FOR THIS ARTICLE: ${angle}. Include 4 short related rabbit-hole topics they might want to explore next. CRITICAL: The body MUST be a COMPLETE 5-6 paragraph article between 500 and 750 words with a clear concluding paragraph. Do NOT exceed 750 words. Do NOT trail off mid-sentence. Finish every sentence and end with a satisfying final thought.`;

    const tools = [{
      type: "function",
      function: {
        name: "publish_article",
        parameters: {
          type: "object",
          properties: {
            title: { type: "string", description: "Catchy title (max 90 chars)" },
            summary: { type: "string", description: "One-sentence hook (max 160 chars)" },
            body: { type: "string", description: "COMPLETE 5-6 paragraph article, 500-750 words, conversational, with a real concluding paragraph. Separate paragraphs with double newlines. Never trail off." },
            topic: { type: "string", description: "Short topic label (1-4 words)" },
            emoji: { type: "string", description: "A single emoji representing the article" },
            related_topics: {
              type: "array",
              items: { type: "string" },
              description: "4 short related rabbit-hole topics (1-4 words each)",
              minItems: 3,
              maxItems: 5,
            },
          },
          required: ["title", "summary", "body", "topic", "emoji", "related_topics"],
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
        tool_choice: { type: "function", function: { name: "publish_article" } },
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Too many spins! Try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Add credits in Settings." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error ${response.status}: ${errText}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call");
    const article = JSON.parse(toolCall.function.arguments);

    // For non-rabbit-hole spins, FORCE the article topic to match what the wheel landed on,
    // so the displayed topic always equals the spin result.
    if (!body.direction) {
      article.topic = pickedTopic;
    } else {
      pickedTopic = article.topic;
    }

    return new Response(JSON.stringify({
      article,
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
