import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LibraryShell } from "@/components/LibraryShell";
import { PaperCard } from "@/components/PaperCard";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BookOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useReader } from "@/hooks/useReader";
import { DailyDrop } from "@/lib/types";
import { toast } from "sonner";

const Daily = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { awardRead } = useReader();
  const [drop, setDrop] = useState<DailyDrop | null>(null);
  const [loading, setLoading] = useState(true);
  const [seconds, setSeconds] = useState(0);
  const [awarded, setAwarded] = useState(false);

  useEffect(() => { if (!authLoading && !user) navigate("/auth"); }, [user, authLoading, navigate]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase.functions.invoke("daily-drop");
        if (!cancelled) setDrop(data?.drop || null);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Couldn't load today's drop");
      } finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  // Reading timer + auto-award after 30s
  useEffect(() => {
    if (!drop) return;
    const id = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, [drop]);

  useEffect(() => {
    if (drop && seconds === 30 && !awarded) {
      setAwarded(true);
      awardRead({
        topic: drop.topic || "On this day", title: drop.title, secondsSpent: seconds,
        summary: drop.fact, body: drop.body, emoji: drop.emoji, sourceKind: "daily",
      });
    }
  }, [seconds, drop, awarded, awardRead]);

  return (
    <LibraryShell hideFooter={!!drop}>
      <section className="container py-8 max-w-3xl">
        <Button variant="ghost" size="sm" asChild className="mb-4 -ml-3 text-muted-foreground">
          <Link to="/"><ArrowLeft className="h-4 w-4 mr-1" /> Back to shelves</Link>
        </Button>

        {loading || !drop ? (
          <div className="h-96 paper-texture rounded-lg animate-pulse" />
        ) : (
          <PaperCard className="p-8 md:p-12 animate-book-open">
            <div className="text-xs font-semibold uppercase tracking-widest text-leather-mustard mb-2">
              Daily Curiosity Drop · {drop.topic}
            </div>
            <div className="text-7xl mb-4">{drop.emoji}</div>
            <h1 className="font-display text-3xl md:text-5xl font-bold text-foreground leading-tight mb-3">
              {drop.title}
            </h1>
            <p className="font-display italic text-lg text-muted-foreground mb-6 border-l-4 border-gold pl-4">
              {drop.fact}
            </p>
            <div className="text-xs text-muted-foreground italic flex items-center gap-1 mb-6">
              <BookOpen className="h-3 w-3" /> {Math.floor(seconds/60)}:{(seconds%60).toString().padStart(2,"0")}
              {awarded && <span className="ml-2 text-leather-green">· XP awarded ✓</span>}
            </div>

            <div className="prose prose-lg max-w-none font-body text-foreground leading-relaxed">
              {drop.body.split("\n").filter(Boolean).map((p, i) => <p key={i} className="mb-4">{p}</p>)}
            </div>
          </PaperCard>
        )}
      </section>
    </LibraryShell>
  );
};

export default Daily;
