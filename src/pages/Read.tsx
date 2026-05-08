import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { LibraryShell } from "@/components/LibraryShell";
import { PaperCard } from "@/components/PaperCard";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BookOpen, Heart, RotateCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useReader } from "@/hooks/useReader";
import { ReadingText } from "@/components/Dictionary";
import { Comments } from "@/components/Comments";
import { RabbitHole } from "@/components/RabbitHole";
import { SpunArticle } from "@/lib/types";
import { toast } from "sonner";

/**
 * Direct topic reader. Used by Search "Fetch new" and Favourites "Topics you follow".
 * No wheel — just fetches and displays the article on the requested topic.
 */
const Read = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { awardRead } = useReader();
  const topic = params.get("topic") || "";

  const [article, setArticle] = useState<SpunArticle | null>(null);
  const [loading, setLoading] = useState(true);
  const [seconds, setSeconds] = useState(0);
  const [awarded, setAwarded] = useState(false);
  const [favourited, setFavourited] = useState(false);
  const [previousTopic, setPreviousTopic] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => { if (!authLoading && !user) navigate("/auth"); }, [user, authLoading, navigate]);

  const fetchArticle = async (t: string, fromTopic?: string) => {
    setLoading(true); setArticle(null); setAwarded(false); setSeconds(0); setFavourited(false);
    try {
      const { data, error } = await supabase.functions.invoke("spin-article", { body: { topic: t } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const a = { ...data.article, topic: t };
      setArticle(a);
      setPreviousTopic(fromTopic ?? null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't fetch the article.");
    } finally { setLoading(false); }
  };

  useEffect(() => {
    if (!user || !topic) return;
    fetchArticle(topic);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, topic]);

  // Reading timer
  useEffect(() => {
    if (!article) return;
    timerRef.current = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => { if (timerRef.current) window.clearInterval(timerRef.current); };
  }, [article]);

  useEffect(() => {
    if (article && seconds === 30 && !awarded) {
      setAwarded(true);
      awardRead({
        topic: article.topic, title: article.title, secondsSpent: seconds,
        summary: article.summary, body: article.body, emoji: article.emoji,
        sourceKind: "spin", fromTopic: previousTopic,
      });
    }
  }, [seconds, article, awarded, awardRead, previousTopic]);

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

  const onRabbitHoleArticle = (a: SpunArticle, _picked: string, from: string) => {
    setArticle(a); setSeconds(0); setAwarded(false); setFavourited(false);
    setPreviousTopic(from);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const mins = Math.floor(seconds / 60), secs = seconds % 60;

  return (
    <LibraryShell hideFooter={!!article}>
      <section className="container py-8 max-w-3xl">
        <Button variant="ghost" size="sm" asChild className="mb-4 -ml-3 text-muted-foreground">
          <Link to="/"><ArrowLeft className="h-4 w-4 mr-1" /> Back to shelves</Link>
        </Button>

        {!topic && (
          <PaperCard className="p-8 text-center text-muted-foreground italic">
            Pick a topic from your favourites or search to read.
          </PaperCard>
        )}

        {topic && (loading || !article) && (
          <PaperCard className="p-8 md:p-12 animate-pulse">
            <div className="text-xs uppercase tracking-widest text-leather-green mb-2">{topic}</div>
            <div className="h-12 bg-wood/15 rounded mb-3" />
            <div className="h-6 bg-wood/15 rounded w-2/3 mb-6" />
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-4 bg-wood/10 rounded" />)}
            </div>
            <p className="text-sm text-muted-foreground italic mt-6">Pulling this book off the shelf…</p>
          </PaperCard>
        )}

        {article && (
          <PaperCard className="p-8 md:p-12 animate-book-open">
            <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
              <div>
                <div className="text-xs font-semibold uppercase tracking-widest text-leather-green mb-1">{article.topic}</div>
                <div className="text-xs text-muted-foreground italic flex items-center gap-2">
                  <BookOpen className="h-3 w-3" /> {mins}:{secs.toString().padStart(2, "0")}
                  {awarded && <span className="text-leather-green font-semibold">· XP awarded ✓</span>}
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" variant="outline" onClick={() => fetchArticle(topic)} className="border-wood/40">
                  <RotateCw className="h-4 w-4 mr-1" /> Another on this topic
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
            <Comments articleKey={`read:${article.title.slice(0, 80)}`} />
          </PaperCard>
        )}
      </section>
    </LibraryShell>
  );
};

export default Read;
