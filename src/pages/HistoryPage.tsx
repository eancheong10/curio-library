import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { LibraryShell } from "@/components/LibraryShell";
import { PaperCard } from "@/components/PaperCard";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BookOpen } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { ReadHistoryItem } from "@/lib/types";
import { ReadingText } from "@/components/Dictionary";

const HistoryPage = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [params] = useSearchParams();
  const filterTopic = params.get("topic");
  const itemId = params.get("id");

  const [items, setItems] = useState<ReadHistoryItem[]>([]);
  const [opened, setOpened] = useState<ReadHistoryItem | null>(null);

  useEffect(() => { if (!authLoading && !user) navigate("/auth"); }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      let q = supabase.from("read_history").select("*").eq("user_id", user.id).limit(500);
      if (filterTopic) q = q.ilike("topic", `%${filterTopic}%`);
      const { data } = await q;
      const list = ((data || []) as ReadHistoryItem[]).sort((a, b) =>
        a.title.localeCompare(b.title, undefined, { sensitivity: "base" })
      );
      setItems(list);
      if (itemId) {
        const found = list.find((x) => x.id === itemId);
        if (found) setOpened(found);
      }
    })();
  }, [user, filterTopic, itemId]);

  return (
    <LibraryShell hideFooter={!!opened}>
      <section className="container py-8 max-w-4xl">
        <Button variant="ghost" size="sm" asChild className="mb-4 -ml-3 text-muted-foreground">
          <Link to="/profile"><ArrowLeft className="h-4 w-4 mr-1" /> Back to Reader's Card</Link>
        </Button>
        <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground">
          {filterTopic ? `Articles about ${filterTopic}` : "Reading history"}
        </h1>
        <p className="text-muted-foreground italic mb-6">{filterTopic ? "Everything you've read on this topic." : "Everything you've read on Curio."}</p>

        {items.length === 0 ? (
          <PaperCard className="p-8 text-center text-muted-foreground italic">No reads yet. Spin the wheel!</PaperCard>
        ) : (
          <div className="space-y-2">
            {items.map((h) => (
              <button
                key={h.id}
                onClick={() => setOpened(h)}
                className="block w-full text-left p-4 rounded border border-wood/20 bg-card hover:bg-gold/10 transition-colors"
              >
                <div className="text-xs uppercase tracking-widest text-leather-green mb-1">{h.topic} · {h.source_kind}</div>
                <div className="font-display text-lg font-bold text-foreground flex items-center gap-2">
                  {h.emoji && <span>{h.emoji}</span>} {h.title}
                </div>
                {h.summary && <div className="text-sm text-muted-foreground line-clamp-2">{h.summary}</div>}
                <div className="text-[11px] text-muted-foreground italic mt-1">
                  {new Date(h.created_at).toLocaleDateString()}
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      {opened && (
        <div className="fixed inset-0 z-50 bg-ink/70 backdrop-blur-sm overflow-y-auto"
             onClick={() => setOpened(null)}>
          <div className="min-h-full flex items-start justify-center p-4 py-8">
            <div className="max-w-3xl w-full" onClick={(e) => e.stopPropagation()}>
              <PaperCard className="p-8 md:p-12 animate-book-open">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <span className="text-xs font-semibold uppercase tracking-widest text-leather-blue">{opened.topic}</span>
                  <Button size="sm" variant="ghost" onClick={() => setOpened(null)}>Close ✕</Button>
                </div>
                {opened.emoji && <div className="text-6xl mb-3">{opened.emoji}</div>}
                <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground leading-tight mb-3">{opened.title}</h1>
                {opened.summary && (
                  <p className="font-display italic text-lg text-muted-foreground mb-6 border-l-4 border-gold pl-4">{opened.summary}</p>
                )}
                <div className="prose prose-lg max-w-none font-body text-foreground leading-relaxed">
                  {(opened.body || "").split("\n").filter(Boolean).map((p, i) => (
                    <p key={i} className="mb-4"><ReadingText text={p} /></p>
                  ))}
                </div>
                <div className="text-xs text-muted-foreground italic mt-6 flex items-center gap-1">
                  <BookOpen className="h-3 w-3" /> Read on {new Date(opened.created_at).toLocaleString()}
                </div>
              </PaperCard>
            </div>
          </div>
        </div>
      )}
    </LibraryShell>
  );
};

export default HistoryPage;
