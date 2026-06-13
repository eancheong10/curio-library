import { Link, useNavigate } from "react-router-dom";
import { LibraryShell } from "@/components/LibraryShell";
import { BookshelfSection } from "@/components/BookshelfSection";
import { DailyDropBanner } from "@/components/DailyDropBanner";
import { Button } from "@/components/ui/button";
import { Newspaper, Sparkles, Heart, IdCard, Scissors, Search, Sparkle, Brain, ChevronDown, UserPlus, Swords } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { FavouriteArticle } from "@/lib/types";

interface Bookshelf {
  id: string;
  name: string;
  emoji: string | null;
  position: number;
}
interface FavArticle extends FavouriteArticle {
  bookshelf_id?: string | null;
}

interface HomeNotice {
  id: string;
  kind: "friend" | "challenge";
  from: string;
}

const SPINE_COLORS = [
  "bg-leather-red", "bg-leather-green", "bg-leather-blue", "bg-leather-mustard",
  "bg-wood", "bg-wood-dark", "bg-primary",
];

const Index = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [shelves, setShelves] = useState<Bookshelf[]>([]);
  const [articles, setArticles] = useState<FavArticle[]>([]);
  const [notices, setNotices] = useState<HomeNotice[]>([]);

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [shvs, arts, friendReqs, challenges] = await Promise.all([
        supabase.from("bookshelves").select("*").eq("user_id", user.id).order("position", { ascending: true }),
        supabase.from("favourite_articles").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("friendships").select("id, requester_id").eq("addressee_id", user.id).eq("status", "pending"),
        supabase.from("quiz_challenges").select("id, challenger_id").eq("opponent_id", user.id).eq("status", "invited"),
      ]);
      if (shvs.data) setShelves(shvs.data as Bookshelf[]);
      if (arts.data) setArticles(arts.data as FavArticle[]);
      const requesterIds = [...(friendReqs.data || []).map((r) => r.requester_id), ...(challenges.data || []).map((c) => c.challenger_id)];
      if (requesterIds.length) {
        const { data: profs } = await supabase.rpc("get_public_profiles", { _ids: requesterIds });
        const names = new Map(((profs as { id: string; display_name: string | null }[]) || []).map((p) => [p.id, p.display_name || "Reader"]));
        setNotices([
          ...(friendReqs.data || []).map((r) => ({ id: r.id, kind: "friend" as const, from: names.get(r.requester_id) || "Reader" })),
          ...(challenges.data || []).map((c) => ({ id: c.id, kind: "challenge" as const, from: names.get(c.challenger_id) || "Reader" })),
        ]);
      } else {
        setNotices([]);
      }
    })();
  }, [user]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="font-display text-2xl text-muted-foreground italic animate-pulse">
          Opening the library doors…
        </div>
      </div>
    );
  }

  // Group articles by shelf, with "favourites" as the catch-all bucket
  const grouped: { id: string; name: string; emoji: string; items: FavArticle[] }[] = [];
  shelves.forEach((s) => {
    grouped.push({
      id: s.id,
      name: s.name,
      emoji: s.emoji || "📚",
      items: articles.filter((a) => a.bookshelf_id === s.id),
    });
  });
  grouped.push({
    id: "favourites",
    name: "Favourites",
    emoji: "⭐",
    items: articles.filter(
      (a) => !a.bookshelf_id || !shelves.some((s) => s.id === a.bookshelf_id)
    ),
  });

  return (
    <LibraryShell>
      <DailyDropBanner />

      {/* Spin the Wheel spotlight */}
      <section className="container pt-6">
        <Link
          to="/spin"
          className="group block relative overflow-hidden rounded-2xl border-2 border-gold/40 shadow-[var(--shadow-deep)]
                     bg-gradient-to-r from-leather-green via-wood-dark to-leather-blue
                     transition-transform hover:scale-[1.01]"
        >
          <div
            className="absolute inset-0 opacity-20 mix-blend-overlay pointer-events-none"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.6'/%3E%3C/svg%3E\")",
            }}
          />
          <div className="relative flex items-center gap-5 p-5 md:p-7 text-paper">
            <div className="hidden sm:flex h-20 w-20 md:h-24 md:w-24 rounded-full bg-gradient-gold items-center justify-center shadow-xl group-hover:rotate-180 transition-transform duration-700">
              <Sparkles className="h-10 w-10 md:h-12 md:w-12 text-ink" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 text-gold text-xs uppercase tracking-widest font-semibold">
                <Sparkle className="h-3 w-3" /> Key feature
              </div>
              <h2 className="font-display text-2xl md:text-4xl font-bold leading-tight mt-1">
                Spin the Wheel of Curiosity
              </h2>
              <p className="text-paper/85 italic text-sm md:text-base mt-1">
                Give it a whirl and tumble down a glorious rabbit hole.
              </p>
            </div>
            <Button className="bg-gradient-gold text-ink font-bold shadow-md hover:scale-105 transition-transform shrink-0">
              Spin →
            </Button>
          </div>
        </Link>
      </section>

      <section className="container py-10 md:py-14">
        <div className="text-center mb-12 max-w-2xl mx-auto animate-float-up">
          <h1 className="font-display text-4xl md:text-6xl font-bold text-foreground mb-4">
            Welcome, dear reader
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground italic font-body">
            Pull a book, spin the wheel, revisit a friend, or check your reader's card.
          </p>
        </div>

        {notices.length > 0 && (
          <div className="max-w-5xl mx-auto mb-5 space-y-2">
            {notices.map((notice) => (
              <Link
                key={`${notice.kind}-${notice.id}`}
                to={notice.kind === "friend" ? "/profile" : `/quiz/challenge/${notice.id}`}
                className="flex items-center justify-between gap-3 rounded-lg border-2 border-gold/40 bg-card px-4 py-3 shadow-md hover:bg-paper transition-colors"
              >
                <span className="flex items-center gap-2 font-semibold text-foreground">
                  {notice.kind === "friend" ? <UserPlus className="h-4 w-4 text-gold" /> : <Swords className="h-4 w-4 text-gold" />}
                  {notice.kind === "friend" ? `${notice.from} sent you a friend request` : `${notice.from} challenged you to a quiz`}
                </span>
                <span className="text-sm font-bold text-primary">Open →</span>
              </Link>
            ))}
          </div>
        )}

        {/* Bookshelf */}
        <div className="relative max-w-5xl mx-auto">
          <div className="h-4 wood-texture rounded-t-lg shadow-md" />

          <div className="wood-texture px-3 md:px-6 py-6 shelf-shadow">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-5">
              <BookshelfSection to="/news" title="News Hub" subtitle="Today's stories from around the world" spineColor="red" icon={<Newspaper className="h-9 w-9" />} index={0} />
              <BookshelfSection to="/quiz" title="Curio Quiz" subtitle="Test what you know — earn XP per answer" spineColor="green" icon={<Brain className="h-9 w-9" />} index={1} />
              <BookshelfSection to="/favourites" title="Favourites" subtitle="Your personal collection" spineColor="blue" icon={<Heart className="h-9 w-9" />} index={2} />
              <BookshelfSection to="/profile" title="Reader's Card" subtitle="Your XP, stats & curiosity map" spineColor="mustard" icon={<IdCard className="h-9 w-9" />} index={3} />
              <BookshelfSection to="/craft" title="Craft Corner" subtitle="Make something with your hands" spineColor="red" icon={<Scissors className="h-9 w-9" />} index={4} />
              <BookshelfSection to="/search" title="Search" subtitle="Find a topic or revisit a read" spineColor="green" icon={<Search className="h-9 w-9" />} index={5} />
            </div>
          </div>

          <div className="h-6 bg-gradient-to-b from-wood-dark to-ink/80 rounded-b-lg shadow-2xl" />
          <div className="h-2 mx-8 bg-ink/40 blur-md rounded-full" />
        </div>

        {/* Your bookshelves (replaces the static hero image) */}
        <div className="mt-16 max-w-5xl mx-auto">
          <div className="flex items-end justify-between mb-3 gap-2 flex-wrap">
            <div>
              <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground">Your bookshelves</h2>
              <p className="text-sm text-muted-foreground italic">A peek at what you've been collecting.</p>
            </div>
            <Button asChild variant="outline" size="sm" className="border-wood/40">
              <Link to="/favourites">Open Favourites →</Link>
            </Button>
          </div>

          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            {grouped.every((g) => g.items.length === 0) ? (
              <div className="wood-texture rounded-lg p-8 text-center text-paper/80 italic shelf-shadow">
                Your shelves are empty for now. Save an article and it'll appear here.
              </div>
            ) : (
              grouped.map((g, gi) => (
                <Collapsible key={g.id} defaultOpen={gi === 0}>
                  <CollapsibleTrigger className="group w-full flex items-center justify-between gap-2 px-3 py-2 rounded-md bg-card border border-wood/30 hover:bg-paper/60 transition-colors">
                    <div className="font-display font-bold text-foreground flex items-center gap-2">
                      <span>{g.emoji}</span>
                      <span>{g.name}</span>
                      <span className="text-xs text-muted-foreground italic">({g.items.length})</span>
                    </div>
                    <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-2">
                    <div className="h-2 wood-texture rounded-t shadow-sm" />
                    <div className="wood-texture px-3 md:px-4 py-3 shelf-shadow min-h-[140px]">
                      {g.items.length === 0 ? (
                        <div className="text-paper/70 italic text-sm py-8 text-center">Empty shelf</div>
                      ) : (
                        <div className="flex gap-2 items-end overflow-x-auto pb-1">
                          {g.items.map((a, i) => {
                            const color = SPINE_COLORS[i % SPINE_COLORS.length];
                            const height = 150 + ((a.title.length * 7) % 60);
                            return (
                              <Link
                                key={a.id}
                                to="/favourites"
                                title={a.title}
                                style={{ height: `${height}px` }}
                                className={`group ${color} book-spine relative w-12 md:w-14 rounded-sm flex-shrink-0
                                           transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl
                                           text-paper px-1 py-2 flex flex-col items-center justify-between cursor-pointer`}
                              >
                                <div className="w-full h-1 bg-gradient-gold rounded" />
                                <div
                                  className="font-display text-[10px] md:text-xs font-bold leading-tight text-center overflow-hidden"
                                  style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
                                >
                                  {a.title.length > 35 ? a.title.slice(0, 33) + "…" : a.title}
                                </div>
                                <div className="w-full h-1 bg-gradient-gold rounded" />
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    <div className="h-3 bg-gradient-to-b from-wood-dark to-ink/70 rounded-b shadow-lg" />
                  </CollapsibleContent>
                </Collapsible>
              ))
            )}
          </div>
        </div>
      </section>
    </LibraryShell>
  );
};

export default Index;
