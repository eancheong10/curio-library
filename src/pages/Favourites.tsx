import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LibraryShell } from "@/components/LibraryShell";
import { PaperCard } from "@/components/PaperCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Trash2, BookOpen, Sparkles, FolderPlus, Pencil, Check, X, Plus } from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { FavouriteArticle, FavouriteTopic } from "@/lib/types";
import { toast } from "sonner";

interface Bookshelf {
  id: string;
  name: string;
  emoji: string | null;
  position: number;
}

interface FavArticle extends FavouriteArticle {
  bookshelf_id?: string | null;
}

const SPINE_COLORS = [
  "bg-leather-red", "bg-leather-green", "bg-leather-blue", "bg-leather-mustard",
  "bg-wood", "bg-wood-dark", "bg-primary",
];

const Favourites = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [articles, setArticles] = useState<FavArticle[]>([]);
  const [topics, setTopics] = useState<FavouriteTopic[]>([]);
  const [shelves, setShelves] = useState<Bookshelf[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [newShelfName, setNewShelfName] = useState("");
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  // For drag-drop reassignment
  const [draggedArticleId, setDraggedArticleId] = useState<string | null>(null);
  // Add-article picker
  const [pickerShelfId, setPickerShelfId] = useState<string | "unfiled" | null>(null);
  const [pickerQuery, setPickerQuery] = useState("");

  useEffect(() => { if (!authLoading && !user) navigate("/auth"); }, [user, authLoading, navigate]);

  const load = async () => {
    if (!user) return;
    const [arts, tops, shvs] = await Promise.all([
      supabase.from("favourite_articles").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("favourite_topics").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("bookshelves").select("*").eq("user_id", user.id).order("position", { ascending: true }),
    ]);
    if (arts.data) setArticles(arts.data as FavArticle[]);
    if (tops.data) setTopics(tops.data as FavouriteTopic[]);
    if (shvs.data) setShelves(shvs.data as Bookshelf[]);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user]);

  const removeArticle = async (id: string) => {
    await supabase.from("favourite_articles").delete().eq("id", id);
    setArticles((a) => a.filter((x) => x.id !== id));
    toast.success("Removed.");
    if (openId === id) setOpenId(null);
  };

  const removeTopic = async (id: string) => {
    await supabase.from("favourite_topics").delete().eq("id", id);
    setTopics((t) => t.filter((x) => x.id !== id));
  };

  const exploreTopic = async (topic: string) => {
    navigate("/read?topic=" + encodeURIComponent(topic));
  };

  const createShelf = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newShelfName.trim()) return;
    const pos = shelves.length;
    const { data, error } = await supabase.from("bookshelves")
      .insert({ user_id: user.id, name: newShelfName.trim().slice(0, 60), position: pos })
      .select().single();
    if (error) { toast.error(error.message); return; }
    setShelves((s) => [...s, data as Bookshelf]);
    setNewShelfName("");
    toast.success("New shelf added.");
  };

  const deleteShelf = async (id: string) => {
    if (!confirm("Delete this shelf? Books on it move back to Unfiled.")) return;
    await supabase.from("bookshelves").delete().eq("id", id);
    setShelves((s) => s.filter((x) => x.id !== id));
    setArticles((a) => a.map((x) => x.bookshelf_id === id ? { ...x, bookshelf_id: null } : x));
  };

  const startRename = (s: Bookshelf) => { setRenameId(s.id); setRenameValue(s.name); };
  const saveRename = async () => {
    if (!renameId) return;
    await supabase.from("bookshelves").update({ name: renameValue.slice(0, 60) }).eq("id", renameId);
    setShelves((s) => s.map((x) => x.id === renameId ? { ...x, name: renameValue.slice(0, 60) } : x));
    setRenameId(null);
  };

  const moveArticle = async (articleId: string, shelfId: string | null) => {
    const { error } = await supabase.from("favourite_articles")
      .update({ bookshelf_id: shelfId }).eq("id", articleId);
    if (error) { toast.error(error.message); return; }
    setArticles((a) => a.map((x) => x.id === articleId ? { ...x, bookshelf_id: shelfId } : x));
  };

  // Group articles by shelf (sorted alphabetically by title)
  const grouped = useMemo(() => {
    const map = new Map<string | "unfiled", FavArticle[]>();
    map.set("unfiled", []);
    shelves.forEach((s) => map.set(s.id, []));
    articles.forEach((a) => {
      const k = a.bookshelf_id && shelves.some((s) => s.id === a.bookshelf_id) ? a.bookshelf_id : "unfiled";
      const arr = map.get(k) || [];
      arr.push(a);
      map.set(k, arr);
    });
    map.forEach((arr) =>
      arr.sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: "base" }))
    );
    return map;
  }, [articles, shelves]);

  // All favourites alphabetical (for picker)
  const allArticlesAlpha = useMemo(
    () => [...articles].sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: "base" })),
    [articles]
  );

  const opened = articles.find((a) => a.id === openId);

  const Shelf = ({ id, title, items, deletable }: {
    id: string | "unfiled"; title: React.ReactNode; items: FavArticle[]; deletable?: boolean;
  }) => (
    <div
      className="relative"
      onDragOver={(e) => { e.preventDefault(); }}
      onDrop={(e) => {
        e.preventDefault();
        if (draggedArticleId) {
          moveArticle(draggedArticleId, id === "unfiled" ? null : id);
          setDraggedArticleId(null);
        }
      }}
    >
      <div className="flex items-end justify-between mb-1 gap-2">
        <div className="font-display font-bold text-foreground flex items-center gap-2">{title}</div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setPickerShelfId(id)}
            className="text-xs font-semibold text-primary hover:text-primary/80 inline-flex items-center gap-1"
          >
            <Plus className="h-3 w-3" /> Add article
          </button>
          {deletable && id !== "unfiled" && (
            <button onClick={() => deleteShelf(id as string)} className="text-xs text-muted-foreground hover:text-destructive">
              <Trash2 className="h-3 w-3 inline" /> Delete shelf
            </button>
          )}
        </div>
      </div>
      <div className="h-2 wood-texture rounded-t shadow-sm" />
      <div className="wood-texture px-3 md:px-4 py-3 shelf-shadow min-h-[170px]">
        {items.length === 0 ? (
          <div className="text-paper/70 italic text-sm py-10 text-center">
            Drop a book here…
          </div>
        ) : (
          <div className="flex gap-2 items-end overflow-x-auto pb-1">
            {items.map((a, i) => {
              const color = SPINE_COLORS[i % SPINE_COLORS.length];
              const height = 150 + ((a.title.length * 7) % 60);
              return (
                <div key={a.id} className="relative flex-shrink-0">
                  <button
                    draggable
                    onDragStart={() => setDraggedArticleId(a.id)}
                    onDragEnd={() => setDraggedArticleId(null)}
                    onClick={() => setOpenId(a.id)}
                    title={a.title}
                    style={{ height: `${height}px` }}
                    className={`group ${color} book-spine relative w-12 md:w-14 rounded-sm
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
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <div className="h-3 bg-gradient-to-b from-wood-dark to-ink/70 rounded-b shadow-lg" />
    </div>
  );

  return (
    <LibraryShell hideFooter={!!opened}>
      <section className="container py-8 max-w-5xl">
        <Button variant="ghost" size="sm" asChild className="mb-4 -ml-3 text-muted-foreground">
          <Link to="/"><ArrowLeft className="h-4 w-4 mr-1" /> Back to shelves</Link>
        </Button>

        <div className="mb-8">
          <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground">Your Favourites</h1>
          <p className="text-muted-foreground italic mt-1">A personal collection, sorted onto your own shelves.</p>
        </div>

        {/* Topics */}
        <div className="mb-10">
          <h2 className="font-display text-2xl font-bold text-foreground mb-3 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-gold" /> Topics you follow
          </h2>
          {topics.length === 0 ? (
            <PaperCard className="p-6 text-center text-muted-foreground italic">
              No topics yet. Spin the wheel and follow what fascinates you.
            </PaperCard>
          ) : (
            <div className="flex flex-wrap gap-2">
              {topics.map((t) => (
                <div key={t.id} className="group flex items-center gap-1 bg-card border border-wood/30 rounded-full pl-4 pr-1 py-1 shadow-sm">
                  <button onClick={() => exploreTopic(t.topic)} className="font-semibold text-foreground hover:text-primary">
                    {t.topic}
                  </button>
                  <button onClick={() => removeTopic(t.id)} className="ml-1 p-1 rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bookshelves header + add new */}
        <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
          <h2 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-gold" /> Your bookshelves
          </h2>
          <form onSubmit={createShelf} className="flex gap-2">
            <Input
              value={newShelfName}
              onChange={(e) => setNewShelfName(e.target.value)}
              placeholder="New shelf name…"
              maxLength={60}
              className="bg-paper/50 border-wood/30 w-48"
            />
            <Button type="submit" size="sm" disabled={!newShelfName.trim()} className="bg-gradient-gold text-ink">
              <FolderPlus className="h-4 w-4 mr-1" /> Add shelf
            </Button>
          </form>
        </div>

        <p className="text-xs text-muted-foreground italic mb-4">
          Tip: drag a book onto a shelf to move it — or use the dropdown when a book is open.
        </p>

        <div className="space-y-6 max-h-[80vh] overflow-y-auto pr-1">
          {/* Custom shelves */}
          {shelves.map((s) => (
            <div key={s.id}>
              {renameId === s.id ? (
                <div className="flex items-center gap-2 mb-1">
                  <Input
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    autoFocus
                    className="bg-paper/50 border-wood/30 h-8 w-60"
                  />
                  <Button size="sm" onClick={saveRename} className="h-7 bg-leather-green text-paper"><Check className="h-3 w-3" /></Button>
                  <Button size="sm" variant="outline" onClick={() => setRenameId(null)} className="h-7 border-wood/40"><X className="h-3 w-3" /></Button>
                </div>
              ) : null}
              <Shelf
                id={s.id}
                deletable
                title={
                  <span className="flex items-center gap-2">
                    <span>{s.emoji || "📚"}</span>
                    <span>{s.name}</span>
                    <button onClick={() => startRename(s)} className="text-muted-foreground hover:text-primary"><Pencil className="h-3 w-3" /></button>
                    <span className="text-xs text-muted-foreground italic">({(grouped.get(s.id) || []).length})</span>
                  </span>
                }
                items={grouped.get(s.id) || []}
              />
            </div>
          ))}

          {/* Favourites shelf — catch-all, always shown last */}
          <Shelf
            id="unfiled"
            title={<span>⭐ Favourites <span className="text-xs text-muted-foreground italic">({(grouped.get("unfiled") || []).length})</span></span>}
            items={grouped.get("unfiled") || []}
          />

          {articles.length === 0 && shelves.length === 0 && (
            <p className="text-sm text-muted-foreground italic text-center py-4">
              Save articles from any reading page — they'll appear here.
            </p>
          )}
        </div>
      </section>

      {/* Reader overlay */}
      {opened && (
        <div className="fixed inset-0 z-50 bg-ink/70 backdrop-blur-sm overflow-y-auto"
             onClick={() => setOpenId(null)}>
          <div className="min-h-full flex items-start justify-center p-4 py-8">
          <div className="max-w-3xl w-full" onClick={(e) => e.stopPropagation()}>
            <PaperCard className="p-8 md:p-12 animate-book-open my-8">
              <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
                <span className="text-xs font-semibold uppercase tracking-widest text-leather-blue">{opened.topic}</span>
                <div className="flex gap-2 items-center flex-wrap">
                  <Select
                    value={opened.bookshelf_id || "unfiled"}
                    onValueChange={(v) => moveArticle(opened.id, v === "unfiled" ? null : v)}
                  >
                    <SelectTrigger className="w-[180px] h-8 text-xs bg-card border-wood/40">
                      <SelectValue placeholder="Move to shelf…" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unfiled">⭐ Favourites</SelectItem>
                      {shelves.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.emoji || "📚"} {s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button size="sm" variant="ghost" onClick={() => removeArticle(opened.id)} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-4 w-4 mr-1" /> Remove
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setOpenId(null)}>Close ✕</Button>
                </div>
              </div>
              <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground leading-tight mb-3">{opened.title}</h1>
              <p className="font-display italic text-lg text-muted-foreground mb-8 border-l-4 border-gold pl-4">{opened.summary}</p>
              <div className="prose prose-lg max-w-none font-body text-foreground leading-relaxed">
                {opened.body.split("\n").filter(Boolean).map((p, i) => <p key={i} className="mb-4">{p}</p>)}
              </div>
              {opened.source_url && (
                <div className="mt-10 pt-6 border-t-2 border-dashed border-wood/30">
                  <a href={opened.source_url} target="_blank" rel="noopener noreferrer"
                     className="text-primary hover:underline font-semibold">
                    Read original on {opened.source_name}
                  </a>
                </div>
              )}
            </PaperCard>
          </div>
          </div>
        </div>
      )}

      {/* Add-article picker */}
      <Dialog open={pickerShelfId !== null} onOpenChange={(o) => { if (!o) { setPickerShelfId(null); setPickerQuery(""); } }}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Add an article to this shelf</DialogTitle>
            <DialogDescription>
              Search or scroll your favourites (sorted A–Z). Tap one to move it onto this shelf.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={pickerQuery}
            onChange={(e) => setPickerQuery(e.target.value)}
            placeholder="Search by title or topic…"
            autoFocus
            className="bg-paper/50 border-wood/30"
          />
          <div className="overflow-y-auto -mx-2 px-2 space-y-1">
            {allArticlesAlpha.length === 0 ? (
              <p className="text-sm text-muted-foreground italic py-6 text-center">
                You don't have any saved favourites yet.
              </p>
            ) : (() => {
              const q = pickerQuery.trim().toLowerCase();
              const filtered = q
                ? allArticlesAlpha.filter((a) =>
                    a.title.toLowerCase().includes(q) || (a.topic || "").toLowerCase().includes(q))
                : allArticlesAlpha;
              if (filtered.length === 0) {
                return <p className="text-sm text-muted-foreground italic py-6 text-center">No matches for “{pickerQuery}”.</p>;
              }
              return filtered.map((a) => {
                const here = (a.bookshelf_id || "unfiled") === pickerShelfId;
                return (
                  <button
                    key={a.id}
                    disabled={here}
                    onClick={async () => {
                      await moveArticle(a.id, pickerShelfId === "unfiled" ? null : (pickerShelfId as string));
                      toast.success("Added to shelf.");
                      setPickerShelfId(null);
                      setPickerQuery("");
                    }}
                    className={`w-full text-left p-3 rounded border transition-colors ${
                      here
                        ? "bg-paper/40 border-wood/20 text-muted-foreground cursor-not-allowed"
                        : "bg-card border-wood/30 hover:bg-gold/10"
                    }`}
                  >
                    <div className="text-[10px] uppercase tracking-widest text-leather-blue">{a.topic}</div>
                    <div className="font-semibold text-foreground">{a.title}</div>
                    {here && <div className="text-[11px] italic text-muted-foreground mt-0.5">Already on this shelf</div>}
                  </button>
                );
              });
            })()}
          </div>
        </DialogContent>
      </Dialog>
    </LibraryShell>
  );
};

export default Favourites;
