import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LibraryShell } from "@/components/LibraryShell";
import { PaperCard } from "@/components/PaperCard";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Search as SearchIcon, BookOpen } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { ReadHistoryItem, FavouriteArticle } from "@/lib/types";

const Search = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [q, setQ] = useState("");
  const [history, setHistory] = useState<ReadHistoryItem[]>([]);
  const [favs, setFavs] = useState<FavouriteArticle[]>([]);

  useEffect(() => { if (!authLoading && !user) navigate("/auth"); }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: h }, { data: f }] = await Promise.all([
        supabase.from("read_history").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(200),
        supabase.from("favourite_articles").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      ]);
      setHistory((h || []) as ReadHistoryItem[]);
      setFavs((f || []) as FavouriteArticle[]);
    })();
  }, [user]);

  const lower = q.trim().toLowerCase();
  const matchHistory = lower
    ? history.filter((h) =>
        h.title.toLowerCase().includes(lower) ||
        h.topic.toLowerCase().includes(lower) ||
        (h.summary || "").toLowerCase().includes(lower))
    : [];
  const matchFavs = lower
    ? favs.filter((f) =>
        f.title.toLowerCase().includes(lower) ||
        f.topic.toLowerCase().includes(lower) ||
        f.summary.toLowerCase().includes(lower))
    : [];

  const exploreNew = () => {
    if (!q.trim()) return;
    navigate(`/read?topic=${encodeURIComponent(q.trim())}`);
  };

  return (
    <LibraryShell>
      <section className="container py-8 max-w-3xl">
        <Button variant="ghost" size="sm" asChild className="mb-4 -ml-3 text-muted-foreground">
          <Link to="/"><ArrowLeft className="h-4 w-4 mr-1" /> Back to shelves</Link>
        </Button>
        <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground">Search the library</h1>
        <p className="text-muted-foreground italic mb-6">Look through what you've read, saved, or ask the librarian to fetch something new.</p>

        <PaperCard className="p-4 md:p-6 mb-6">
          <form onSubmit={(e) => { e.preventDefault(); exploreNew(); }} className="flex gap-2">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search your reads or type a topic to fetch a new article…"
                className="pl-10 bg-paper/50 border-wood/30"
              />
            </div>
            <Button type="submit" disabled={!q.trim()} className="bg-gradient-gold text-ink">
              Fetch new
            </Button>
          </form>
        </PaperCard>

        {!lower && (
          <p className="text-center text-muted-foreground italic py-8">Type a word above to search.</p>
        )}

        {lower && (
          <>
            <Section title={`Saved articles (${matchFavs.length})`}>
              {matchFavs.length === 0 ? (
                <p className="text-muted-foreground italic">No matches in your favourites.</p>
              ) : matchFavs.map((f) => (
                <button key={f.id} onClick={() => navigate("/favourites")} className="block w-full text-left p-3 rounded hover:bg-gold/10 border border-wood/20 mb-2">
                  <div className="text-xs uppercase tracking-widest text-leather-blue">{f.topic}</div>
                  <div className="font-display font-bold text-foreground">{f.title}</div>
                  <div className="text-sm text-muted-foreground line-clamp-2">{f.summary}</div>
                </button>
              ))}
            </Section>

            <Section title={`Your reading history (${matchHistory.length})`}>
              {matchHistory.length === 0 ? (
                <p className="text-muted-foreground italic">Nothing in your history yet.</p>
              ) : matchHistory.map((h) => (
                <Link key={h.id} to={`/history?id=${h.id}`} className="block p-3 rounded hover:bg-gold/10 border border-wood/20 mb-2">
                  <div className="text-xs uppercase tracking-widest text-leather-green">{h.topic} · {h.source_kind}</div>
                  <div className="font-display font-bold text-foreground flex items-center gap-2"><BookOpen className="h-4 w-4" /> {h.title}</div>
                  {h.summary && <div className="text-sm text-muted-foreground line-clamp-2">{h.summary}</div>}
                </Link>
              ))}
            </Section>
          </>
        )}
      </section>
    </LibraryShell>
  );
};

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <PaperCard className="p-4 md:p-6 mb-6">
    <h2 className="font-display text-xl font-bold text-foreground mb-3">{title}</h2>
    {children}
  </PaperCard>
);

export default Search;
