import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams, Link } from "react-router-dom";
import { LibraryShell } from "@/components/LibraryShell";
import { PaperCard } from "@/components/PaperCard";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ExternalLink, Heart, HeartOff, BookOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useReader } from "@/hooks/useReader";
import { NewsArticle, SpunArticle } from "@/lib/types";
import { RabbitHole } from "@/components/RabbitHole";
import { ReadingText } from "@/components/Dictionary";
import { Comments } from "@/components/Comments";
import { toast } from "sonner";

const NewsArticlePage = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { awardRead } = useReader();
  const [article, setArticle] = useState<NewsArticle | null>(
    (location.state as { article?: NewsArticle })?.article || null
  );
  const [favourited, setFavourited] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [awarded, setAwarded] = useState(false);
  const [rabbitArticle, setRabbitArticle] = useState<{ a: SpunArticle; from: string } | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!article && id) {
      // try every cached country
      for (const k of Object.keys(sessionStorage)) {
        if (!k.startsWith("curio_news")) continue;
        try {
          const parsed = JSON.parse(sessionStorage.getItem(k)!);
          const found = (parsed.articles || []).find((a: NewsArticle) => a.id === decodeURIComponent(id));
          if (found) { setArticle(found); break; }
        } catch { /* ignore */ }
      }
    }
  }, [article, id]);

  useEffect(() => {
    const check = async () => {
      if (!user || !article) return;
      const { data } = await supabase
        .from("favourite_articles")
        .select("id")
        .eq("user_id", user.id)
        .eq("title", article.title)
        .maybeSingle();
      setFavourited(!!data);
    };
    check();
  }, [user, article]);

  useEffect(() => {
    if (!article) return;
    setSeconds(0); setAwarded(false);
    timerRef.current = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => { if (timerRef.current) window.clearInterval(timerRef.current); };
  }, [article]);

  useEffect(() => {
    if (article && seconds === 30 && !awarded) {
      setAwarded(true);
      awardRead({
        topic: article.topic, title: article.title, secondsSpent: seconds,
        summary: article.summary, body: article.body, emoji: article.emoji,
        sourceKind: "news", sourceUrl: article.source_url, sourceName: article.source_name,
      });
    }
  }, [seconds, article, awarded, awardRead]);

  const onRabbitHoleArticle = (a: SpunArticle, _picked: string, from: string) => {
    setRabbitArticle({ a, from });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const mins = Math.floor(seconds / 60), secs = seconds % 60;

  const toggleFavourite = async () => {
    if (!user || !article) return;
    if (favourited) {
      await supabase.from("favourite_articles").delete().eq("user_id", user.id).eq("title", article.title);
      setFavourited(false);
      toast.success("Removed from your collection.");
    } else {
      const { error } = await supabase.from("favourite_articles").insert({
        user_id: user.id, title: article.title, summary: article.summary, body: article.body,
        topic: article.topic, source_url: article.source_url, source_name: article.source_name,
      });
      if (error) { toast.error(error.message); return; }
      setFavourited(true);
      toast.success("Tucked into your collection.");
    }
  };

  if (!article) {
    return (
      <LibraryShell>
        <section className="container py-12 text-center">
          <p className="font-display text-2xl text-muted-foreground italic">This page seems to have been borrowed.</p>
          <Button asChild variant="outline" className="mt-4"><Link to="/news">Back to News Hub</Link></Button>
        </section>
      </LibraryShell>
    );
  }

  return (
    <LibraryShell hideFooter>
      <section className="container py-8 max-w-3xl">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-4 -ml-3 text-muted-foreground">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to News Hub
        </Button>

        <PaperCard className="p-8 md:p-12 animate-book-open">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="text-xs font-semibold uppercase tracking-widest text-leather-red">{article.topic}</div>
            <Button size="sm" variant={favourited ? "default" : "outline"} onClick={toggleFavourite}
              className={favourited ? "bg-gradient-gold text-ink" : "border-wood/40"}>
              {favourited ? <Heart className="h-4 w-4 mr-2 fill-current" /> : <HeartOff className="h-4 w-4 mr-2" />}
              {favourited ? "Saved" : "Save"}
            </Button>
          </div>

          <div className="text-7xl mb-4">{article.emoji}</div>
          <h1 className="font-display text-3xl md:text-5xl font-bold text-foreground leading-tight mb-3">{article.title}</h1>
          <p className="font-display italic text-lg md:text-xl text-muted-foreground mb-8 border-l-4 border-gold pl-4">{article.summary}</p>

          <div className="text-xs text-muted-foreground italic flex items-center gap-2 mb-4">
            <BookOpen className="h-3 w-3" /> {mins}:{secs.toString().padStart(2, "0")}
            {awarded && <span className="text-leather-green font-semibold">· XP awarded ✓</span>}
          </div>

          <div className="prose prose-lg max-w-none font-body text-foreground leading-relaxed">
            {article.body.split("\n").filter(Boolean).map((para, i) => (
              <p key={i} className="mb-4"><ReadingText text={para} /></p>
            ))}
          </div>

          <div className="mt-8 pt-6 border-t border-wood/20">
            <a href={article.source_url} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-primary hover:underline font-semibold">
              Read the original on {article.source_name} <ExternalLink className="h-4 w-4" />
            </a>
          </div>

          <RabbitHole fromTopic={article.topic} fromTitle={article.title} relatedTopics={[]} onArticle={onRabbitHoleArticle} />
          <Comments articleKey={`news:${article.id}`} />
        </PaperCard>

        {rabbitArticle && (
          <PaperCard className="p-8 md:p-12 animate-book-open mt-6">
            <div className="text-xs font-semibold uppercase tracking-widest text-leather-green mb-1">{rabbitArticle.a.topic}</div>
            <div className="text-7xl mb-4">{rabbitArticle.a.emoji}</div>
            <h2 className="font-display text-2xl md:text-4xl font-bold text-foreground leading-tight mb-3">{rabbitArticle.a.title}</h2>
            <p className="font-display italic text-lg text-muted-foreground mb-6 border-l-4 border-gold pl-4">{rabbitArticle.a.summary}</p>
            <div className="prose prose-lg max-w-none font-body text-foreground leading-relaxed">
              {rabbitArticle.a.body.split("\n").filter(Boolean).map((p, i) => <p key={i} className="mb-4"><ReadingText text={p} /></p>)}
            </div>
            <RabbitHole fromTopic={rabbitArticle.a.topic} fromTitle={rabbitArticle.a.title} relatedTopics={rabbitArticle.a.related_topics || []} onArticle={onRabbitHoleArticle} />
          </PaperCard>
        )}
      </section>
    </LibraryShell>
  );
};

export default NewsArticlePage;
