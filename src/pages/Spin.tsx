import { useEffect, useRef, useState } from "react";
import { Sfx } from "@/lib/sounds";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { LibraryShell } from "@/components/LibraryShell";
import { PaperCard } from "@/components/PaperCard";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Sparkles, Heart, BookOpen, RotateCw, Shield, Flame, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useReader } from "@/hooks/useReader";
import { SpunArticle, SpinMode, SpinCategory } from "@/lib/types";
import { RabbitHole } from "@/components/RabbitHole";
import { ReadingText } from "@/components/Dictionary";
import { Comments } from "@/components/Comments";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

const CATEGORY_OPTIONS: { id: SpinCategory; label: string; emoji: string }[] = [
  { id: "any", label: "Any topic", emoji: "🎲" },
  { id: "history", label: "History", emoji: "🏛️" },
  { id: "science", label: "Science", emoji: "🔬" },
  { id: "philosophy", label: "Philosophy", emoji: "🤔" },
  { id: "politics", label: "Politics", emoji: "🗳️" },
  { id: "arts", label: "Arts", emoji: "🎨" },
  { id: "games", label: "Games", emoji: "🎮" },
  { id: "mysteries", label: "Mysteries", emoji: "🔍" },
  { id: "nature", label: "Nature", emoji: "🌿" },
  { id: "tech", label: "Tech", emoji: "💻" },
  { id: "words", label: "Words", emoji: "📖" },
];

const FALLBACK = {
  safe: ["Ancient Egypt", "Mythology", "Volcanoes", "Ocean Mysteries", "Esports", "Vikings", "Renaissance Art", "Black Holes"],
  risk: ["Quantum Physics", "Geopolitics", "Stoicism", "Game Theory", "Ethics of AI", "Hyperinflation", "Cybersecurity", "Linguistics"],
  jackpot: ["The Voynich Manuscript", "Wow! Signal", "Tunguska Event", "Antikythera Mechanism", "Dyatlov Pass", "Boltzmann Brains", "Tardigrades in Space", "Operation Mincemeat"],
};

// Per-mode wheel colors
const MODE_COLORS: Record<SpinMode, string[]> = {
  safe: ["hsl(130 30% 30%)", "hsl(215 35% 32%)", "hsl(42 60% 42%)", "hsl(160 30% 30%)", "hsl(38 55% 42%)", "hsl(220 30% 35%)", "hsl(140 25% 28%)", "hsl(35 50% 38%)"],
  risk: ["hsl(8 55% 35%)", "hsl(280 30% 32%)", "hsl(348 50% 38%)", "hsl(18 65% 32%)", "hsl(0 40% 30%)", "hsl(300 25% 30%)", "hsl(20 60% 35%)", "hsl(340 45% 35%)"],
  jackpot: ["hsl(42 90% 55%)", "hsl(45 85% 60%)", "hsl(38 95% 50%)", "hsl(48 80% 55%)", "hsl(40 90% 58%)", "hsl(36 85% 52%)", "hsl(50 90% 55%)", "hsl(44 95% 60%)"],
};

const WHEEL_SIZE = 8;

function sample<T>(arr: T[], n: number): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

const MODE_META: Record<SpinMode, { label: string; desc: string; icon: typeof Shield; ringClass: string }> = {
  safe:    { label: "Safe Spin",    desc: "Familiar, fascinating topics",      icon: Shield, ringClass: "ring-leather-green" },
  risk:    { label: "Risk Spin",    desc: "Weird, dense, out-of-comfort zone", icon: Flame,  ringClass: "ring-leather-red" },
  jackpot: { label: "Jackpot Spin", desc: "Rare, mind-blowing stories",         icon: Star,   ringClass: "ring-gold" },
};

const Spin = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { awardRead } = useReader();

  const [mode, setMode] = useState<SpinMode>("safe");
  const [category, setCategory] = useState<SpinCategory>("any");
  const [spinning, setSpinning] = useState(false);
  const [article, setArticle] = useState<SpunArticle | null>(null);
  const [pickedTopic, setPickedTopic] = useState<string | null>(null);
  const [favourited, setFavourited] = useState(false);
  const [topicSaved, setTopicSaved] = useState(false);
  const [readSeconds, setReadSeconds] = useState(0);
  const [awarded, setAwarded] = useState(false);
  const [previousTopic, setPreviousTopic] = useState<string | null>(null);
  const [showJackpot, setShowJackpot] = useState(false);
  const [pools, setPools] = useState<{ safe: string[]; risk: string[]; jackpot: string[] }>(FALLBACK);
  const [categories, setCategories] = useState<Record<string, string[]>>({});
  const [wheelTopics, setWheelTopics] = useState<string[]>(() => sample(FALLBACK.safe, WHEEL_SIZE));

  const wheelRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => { if (!authLoading && !user) navigate("/auth"); }, [user, authLoading, navigate]);

  // Fetch full pools once
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase.functions.invoke("spin-article", { body: { poolOnly: true } });
        if (!cancelled && data?.safe?.length) {
          setPools({ safe: data.safe, risk: data.risk, jackpot: data.jackpot });
          if (data.categories) setCategories(data.categories);
        }
      } catch { /* keep fallback */ }
    })();
    return () => { cancelled = true; };
  }, []);

  // Re-sample wheel when mode OR category changes.
  // Category takes precedence over mode for the wheel content.
  useEffect(() => {
    let pool: string[] = pools[mode];
    if (category !== "any" && categories[category]?.length) {
      pool = categories[category];
    }
    setWheelTopics(sample(pool, WHEEL_SIZE));
  }, [mode, category, pools, categories]);

  // Auto-spin if topic param passed (from Favourites)
  useEffect(() => {
    if (!user) return;
    const t = searchParams.get("topic");
    if (t && !article && !spinning) spin(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, searchParams]);

  // Reading timer
  useEffect(() => {
    if (!article) return;
    setReadSeconds(0); setAwarded(false);
    timerRef.current = window.setInterval(() => setReadSeconds((s) => s + 1), 1000);
    return () => { if (timerRef.current) window.clearInterval(timerRef.current); };
  }, [article]);

  // Award XP after 30s
  useEffect(() => {
    if (article && readSeconds === 30 && !awarded) {
      setAwarded(true);
      awardRead({
        topic: pickedTopic || article.topic,
        title: article.title,
        secondsSpent: readSeconds,
        fromTopic: previousTopic,
        summary: article.summary, body: article.body, emoji: article.emoji,
        sourceKind: "spin",
      });
    }
  }, [readSeconds, article, awarded, awardRead, previousTopic, pickedTopic]);

  const spin = async (topicOverride?: string) => {
    if (spinning) return;
    setSpinning(true);
    setArticle(null); setFavourited(false); setTopicSaved(false); setShowJackpot(false);

    // Decide which slice the pointer (top, 0deg) will land on AFTER the spin.
    // Pointer is fixed at the top. After rotating the wheel by spinEnd deg clockwise,
    // the slice currently under the pointer is the slice whose original mid-angle
    // satisfies (midAngle + spinEnd) mod 360 ≈ 0 → landed at original angle (-spinEnd) mod 360.
    const sliceAngle = 360 / wheelTopics.length;
    const sliceIndex = Math.floor(Math.random() * wheelTopics.length);
    // Compute rotation that lands the chosen slice's mid under the pointer.
    // Slice i mid (in our svg) is at angle: i * sliceAngle + sliceAngle/2 (with -90 offset, but pointer is at -90 too, so it cancels).
    const sliceMid = sliceIndex * sliceAngle + sliceAngle / 2;
    const rotations = 5;
    // Add small jitter inside the slice so it doesn't look fake
    const jitter = (Math.random() - 0.5) * (sliceAngle * 0.6);
    const spinEnd = rotations * 360 + (360 - sliceMid) + jitter;
    if (wheelRef.current) {
      wheelRef.current.style.setProperty("--spin-end", `${spinEnd}deg`);
      wheelRef.current.classList.remove("animate-spin-wheel");
      void wheelRef.current.offsetWidth;
      wheelRef.current.classList.add("animate-spin-wheel");
    }
    Sfx.spinStart();
    setTimeout(() => Sfx.spinLand(), 3950);

    // The actual topic the wheel will land on
    const landedTopic = topicOverride || wheelTopics[sliceIndex];

    try {
      const { data, error } = await supabase.functions.invoke("spin-article", {
        body: { topic: landedTopic, mode, category },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      await new Promise((r) => setTimeout(r, 4000));
      // Force topic to be the slice the wheel landed on.
      const a = { ...data.article, topic: landedTopic };
      setArticle(a);
      setPickedTopic(landedTopic);
      setPreviousTopic(null);
      if (mode === "jackpot" && !topicOverride) {
        setShowJackpot(true);
        setTimeout(() => setShowJackpot(false), 3500);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "The wheel got stuck");
    } finally { setSpinning(false); }
  };

  const onRabbitHoleArticle = (a: SpunArticle, picked: string, fromTopic: string) => {
    setPreviousTopic(fromTopic);
    setArticle(a);
    setPickedTopic(picked);
    setFavourited(false); setTopicSaved(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const saveArticle = async () => {
    if (!user || !article || favourited) return;
    const { error } = await supabase.from("favourite_articles").insert({
      user_id: user.id, title: article.title, summary: article.summary, body: article.body,
      topic: article.topic, source_url: null, source_name: "Curio Library",
    });
    if (error) { toast.error(error.message); return; }
    setFavourited(true);
    toast.success("Tucked into your collection.");
  };

  const saveTopic = async () => {
    if (!user || !article || topicSaved) return;
    const { error } = await supabase.from("favourite_topics").insert({
      user_id: user.id, topic: article.topic,
    });
    if (error && !error.message.includes("duplicate")) { toast.error(error.message); return; }
    setTopicSaved(true);
    toast.success(`"${article.topic}" added to your topics.`);
  };

  const minutes = Math.floor(readSeconds / 60);
  const seconds = readSeconds % 60;
  const sliceColors = MODE_COLORS[mode];

  return (
    <LibraryShell hideFooter={!!article}>
      <section className="container py-8 max-w-4xl">
        <Button variant="ghost" size="sm" asChild className="mb-4 -ml-3 text-muted-foreground">
          <Link to="/"><ArrowLeft className="h-4 w-4 mr-1" /> Back to shelves</Link>
        </Button>

        {!article && (
          <>
            <div className="text-center mb-6 animate-float-up">
              <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-2">Spin the Wheel</h1>
              <p className="text-muted-foreground italic">Choose your risk, then let fate pick your next rabbit hole.</p>
            </div>

            {/* Mode selector */}
            <div className="grid grid-cols-3 gap-3 mb-8 max-w-2xl mx-auto">
              {(Object.keys(MODE_META) as SpinMode[]).map((m) => {
                const meta = MODE_META[m];
                const Icon = meta.icon;
                const active = mode === m;
                return (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    disabled={spinning}
                    className={`p-3 rounded-lg border-2 text-left transition-all ${
                      active
                        ? `bg-gradient-gold text-ink border-gold-deep shadow-lg scale-[1.02] ring-2 ${meta.ringClass}`
                        : "bg-paper/40 border-wood/30 text-foreground hover:bg-paper/70"
                    }`}
                  >
                    <Icon className="h-5 w-5 mb-1" />
                    <div className="font-display font-bold">{meta.label}</div>
                    <div className="text-[11px] opacity-80 leading-tight">{meta.desc}</div>
                  </button>
                );
              })}
            </div>

            {/* Category selector */}
            <div className="max-w-2xl mx-auto mb-6 flex items-center gap-3 justify-center flex-wrap">
              <span className="text-sm font-display font-bold text-foreground">Category:</span>
              <Select value={category} onValueChange={(v) => setCategory(v as SpinCategory)}>
                <SelectTrigger className="w-[200px] bg-card border-wood/40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.emoji} {c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        {/* Wheel */}
        {!article && (
          <div className="flex flex-col items-center gap-8">
            <div className={`relative w-[20rem] h-[20rem] md:w-[26rem] md:h-[26rem] ${mode === "jackpot" ? "animate-flicker" : ""}`}>
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-wood-dark via-wood to-wood-dark shadow-[var(--shadow-deep)]" />
              <div className={`absolute inset-3 rounded-full shadow-inner ${mode === "jackpot" ? "bg-gold/70" : "bg-gold/40"}`} />

              <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center">
                <div className="w-0 h-0 border-l-[16px] border-l-transparent border-r-[16px] border-r-transparent border-t-[28px] border-t-leather-red drop-shadow-lg" />
                <div className="w-3 h-3 rounded-full bg-gold border-2 border-wood-dark -mt-1" />
              </div>

              <div ref={wheelRef} className="absolute inset-5 rounded-full overflow-hidden">
                <svg viewBox="-100 -100 200 200" className="w-full h-full block">
                  <defs>
                    {sliceColors.map((c, i) => (
                      <radialGradient key={i} id={`sg-${mode}-${i}`} cx="50%" cy="50%" r="80%">
                        <stop offset="0%" stopColor={c} stopOpacity="0.85" />
                        <stop offset="100%" stopColor={c} stopOpacity="1" />
                      </radialGradient>
                    ))}
                  </defs>

                  {wheelTopics.map((t, i) => {
                    const n = wheelTopics.length;
                    const sliceAngle = 360 / n;
                    const startA = (i * sliceAngle - 90) * (Math.PI / 180);
                    const endA = ((i + 1) * sliceAngle - 90) * (Math.PI / 180);
                    const r = 100;
                    const x1 = r * Math.cos(startA), y1 = r * Math.sin(startA);
                    const x2 = r * Math.cos(endA), y2 = r * Math.sin(endA);
                    const largeArc = sliceAngle > 180 ? 1 : 0;
                    const path = `M0,0 L${x1},${y1} A${r},${r} 0 ${largeArc} 1 ${x2},${y2} Z`;

                    const midA = (i * sliceAngle + sliceAngle / 2) - 90;
                    const labelR = 60;
                    const lx = labelR * Math.cos(midA * Math.PI / 180);
                    const ly = labelR * Math.sin(midA * Math.PI / 180);
                    const textRotate = midA + (midA > 90 || midA < -90 ? 180 : 0);
                    const display = t.length > 14 ? t.slice(0, 13) + "…" : t;

                    return (
                      <g key={`${t}-${i}`}>
                        <path d={path} fill={`url(#sg-${mode}-${i % sliceColors.length})`}
                              stroke="hsl(40 30% 88% / 0.5)" strokeWidth="0.5" />
                        <text x={lx} y={ly}
                              transform={`rotate(${textRotate} ${lx} ${ly})`}
                              textAnchor="middle" dominantBaseline="middle"
                              fill={mode === "jackpot" ? "hsl(25 50% 12%)" : "hsl(40 35% 95%)"}
                              fontSize="7" fontWeight="700"
                              style={{ paintOrder: "stroke", stroke: "rgba(0,0,0,0.35)", strokeWidth: 0.6 }}>
                          {display}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>

              <button
                onClick={() => spin()}
                disabled={spinning}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full bg-gradient-gold border-4 border-wood-dark shadow-xl flex items-center justify-center z-20 hover:scale-105 transition-transform disabled:cursor-not-allowed"
                aria-label="Spin"
              >
                <Sparkles className="h-9 w-9 text-ink" />
              </button>
            </div>

            <Button
              size="lg"
              onClick={() => spin()}
              disabled={spinning}
              className={`font-display text-xl px-12 py-7 shadow-lg ${
                mode === "jackpot" ? "bg-gradient-gold text-ink hover:opacity-90" :
                mode === "risk" ? "bg-leather-red text-paper hover:bg-leather-red/90" :
                "bg-leather-green text-paper hover:bg-leather-green/90"
              }`}
            >
              {spinning ? "Spinning…" : `${MODE_META[mode].label}`}
            </Button>
          </div>
        )}

        {/* Jackpot celebration overlay */}
        {showJackpot && (
          <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center">
            <div className="absolute inset-0 bg-gradient-to-b from-gold/20 via-transparent to-transparent animate-flicker" />
            <div className="relative bg-gradient-gold border-4 border-wood-dark rounded-2xl px-10 py-8 shadow-2xl animate-book-open text-center">
              <Star className="h-12 w-12 text-ink mx-auto mb-2" />
              <div className="font-display text-3xl font-bold text-ink">JACKPOT!</div>
              <div className="text-ink/80 italic">You got a rare topic ✨</div>
            </div>
          </div>
        )}

        {/* Article */}
        {article && (
          <PaperCard className="p-8 md:p-12 animate-book-open">
            <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
              <div>
                <div className="text-xs font-semibold uppercase tracking-widest text-leather-green mb-1">
                  {article.topic}
                </div>
                <div className="text-xs text-muted-foreground italic flex items-center gap-2">
                  <BookOpen className="h-3 w-3" /> {minutes}:{seconds.toString().padStart(2, "0")}
                  {awarded && <span className="text-leather-green font-semibold">· XP awarded ✓</span>}
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" variant="outline" onClick={saveTopic} disabled={topicSaved} className="border-wood/40">
                  {topicSaved ? "Topic added ✓" : `+ Follow ${article.topic}`}
                </Button>
                <Button size="sm" onClick={saveArticle} disabled={favourited} className="bg-gradient-gold text-ink">
                  <Heart className={`h-4 w-4 mr-2 ${favourited ? "fill-current" : ""}`} />
                  {favourited ? "Saved" : "Save article"}
                </Button>
              </div>
            </div>

            <div className="text-7xl mb-4">{article.emoji}</div>
            <h1 className="font-display text-3xl md:text-5xl font-bold text-foreground leading-tight mb-3">
              {article.title}
            </h1>
            <p className="font-display italic text-lg text-muted-foreground mb-8 border-l-4 border-gold pl-4">
              {article.summary}
            </p>

            <div className="prose prose-lg max-w-none font-body text-foreground leading-relaxed">
              {article.body.split("\n").filter(Boolean).map((para, i) => (
                <p key={i} className="mb-4"><ReadingText text={para} /></p>
              ))}
            </div>

            <RabbitHole
              fromTopic={article.topic}
              fromTitle={article.title}
              relatedTopics={article.related_topics || []}
              onArticle={onRabbitHoleArticle}
            />
            <Comments articleKey={`spin:${article.title.slice(0, 80)}`} />

            <div className="mt-6 pt-4 border-t border-wood/20">
              <Button size="sm" onClick={() => { setArticle(null); setPreviousTopic(null); }} variant="outline" className="border-wood/40">
                <RotateCw className="h-4 w-4 mr-2" /> Spin again
              </Button>
            </div>
          </PaperCard>
        )}
      </section>
    </LibraryShell>
  );
};

export default Spin;
