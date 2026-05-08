import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LibraryShell } from "@/components/LibraryShell";
import { PaperCard } from "@/components/PaperCard";
import { Button } from "@/components/ui/button";
import { ArrowLeft, RefreshCw, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSettings } from "@/hooks/useSettings";
import { NewsArticle } from "@/lib/types";
import { toast } from "sonner";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const COUNTRIES = [
  { code: "global", label: "🌍 Global" },
  { code: "us", label: "🇺🇸 United States" },
  { code: "uk", label: "🇬🇧 United Kingdom" },
  { code: "ca", label: "🇨🇦 Canada" },
  { code: "au", label: "🇦🇺 Australia" },
  { code: "in", label: "🇮🇳 India" },
  { code: "sg", label: "🇸🇬 Singapore" },
  { code: "my", label: "🇲🇾 Malaysia" },
  { code: "jp", label: "🇯🇵 Japan" },
  { code: "cn", label: "🇨🇳 China" },
  { code: "fr", label: "🇫🇷 France" },
  { code: "de", label: "🇩🇪 Germany" },
  { code: "br", label: "🇧🇷 Brazil" },
  { code: "za", label: "🇿🇦 South Africa" },
  { code: "ng", label: "🇳🇬 Nigeria" },
];

const NewsHub = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { settings, update } = useSettings();
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [date, setDate] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  const cacheKey = (country: string) => `curio_news_${country}`;
  const todayKey = () => new Date().toISOString().slice(0, 10);

  const load = async (force = false, country = settings.country) => {
    setLoading(true);
    try {
      if (!force) {
        // Try sessionStorage then localStorage (persists across reloads, same day only)
        const fromSession = sessionStorage.getItem(cacheKey(country));
        const fromLocal = localStorage.getItem(cacheKey(country));
        const cached = fromSession || fromLocal;
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed?.date === todayKey() && Array.isArray(parsed.articles)) {
            setArticles(parsed.articles);
            setDate(parsed.date || "");
            setLoading(false);
            return;
          }
        }
      }
      const { data, error } = await supabase.functions.invoke("fetch-news", { body: { country } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const fetched: NewsArticle[] = data.articles || [];
      setArticles(fetched);
      setDate(data.date || "");
      sessionStorage.setItem(cacheKey(country), JSON.stringify(data));
      localStorage.setItem(cacheKey(country), JSON.stringify(data));
      if (force) {
        if (fetched.length > 0) toast.success(`${fetched.length} fresh ${fetched.length === 1 ? "story" : "stories"} on the shelf.`);
        else toast("No stories found right now — try again in a moment.");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not fetch the news");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    load(false, settings.country);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, settings.country]);

  const changeCountry = async (c: string) => {
    await update({ country: c });
    sessionStorage.removeItem(cacheKey(c));
    load(true, c);
  };

  const formattedDate = date
    ? new Date(date + "T00:00:00").toLocaleDateString(undefined, {
        weekday: "long", month: "long", day: "numeric", year: "numeric",
      })
    : "";

  return (
    <LibraryShell>
      <section className="container py-8">
        <div className="flex items-start justify-between mb-6 gap-3 flex-wrap">
          <div>
            <Button variant="ghost" size="sm" asChild className="mb-2 -ml-3 text-muted-foreground">
              <Link to="/"><ArrowLeft className="h-4 w-4 mr-1" /> Back to shelves</Link>
            </Button>
            <p className="text-sm text-muted-foreground italic">{formattedDate}</p>
            <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground">News Hub</h1>
            <p className="text-muted-foreground mt-1 italic">Today's stories, bound and on the shelf.</p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={settings.country} onValueChange={changeCountry}>
              <SelectTrigger className="w-[180px] bg-card border-wood/40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COUNTRIES.map((c) => (
                  <SelectItem key={c.code} value={c.code}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={() => { sessionStorage.removeItem(cacheKey(settings.country)); load(true, settings.country); }} variant="outline" size="sm" disabled={loading} className="border-wood/40">
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
          </div>
        </div>

        {loading && articles.length === 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-64 paper-texture rounded-lg animate-pulse opacity-60" />
            ))}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {articles.map((a, i) => (
              <div key={a.id} className="group animate-float-up relative" style={{ animationDelay: `${i * 60}ms`, animationFillMode: "both" }}>
                <Link
                  to={`/news/${encodeURIComponent(a.id)}`}
                  state={{ article: a }}
                  className="block"
                >
                  <PaperCard className="h-full p-6 transition-all duration-300 group-hover:-translate-y-2 group-hover:rotate-[-0.5deg] group-hover:shadow-2xl border-l-8 border-l-leather-red relative overflow-hidden">
                    <div className="absolute top-2 right-3 text-xs font-semibold uppercase tracking-wider text-leather-red/80">
                      {a.topic}
                    </div>
                    <div className="text-5xl mb-3">{a.emoji}</div>
                    <h3 className="font-display text-xl font-bold text-foreground leading-tight mb-2 group-hover:text-primary transition-colors">
                      {a.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">{a.summary}</p>
                    <div className="mt-4 pt-3 border-t border-wood/20 text-xs italic text-muted-foreground flex items-center gap-1 justify-between">
                      <span className="flex items-center gap-1">{a.source_name}</span>
                      {a.published_at && <span>{new Date(a.published_at + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>}
                    </div>
                  </PaperCard>
                </Link>
                {a.source_url && (
                  <a
                    href={a.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="absolute bottom-3 right-3 inline-flex items-center gap-1 text-[11px] font-semibold text-primary bg-card border border-wood/30 rounded-full px-2 py-0.5 hover:bg-gold/20 z-10"
                    title={`Open original on ${a.source_name}`}
                  >
                    <ExternalLink className="h-3 w-3" /> Original
                  </a>
                )}
              </div>
            ))}
          </div>
        )}

        {!loading && articles.length === 0 && (
          <PaperCard className="p-8 text-center text-muted-foreground italic">
            No news yet. Tap Refresh to fetch today's stories.
          </PaperCard>
        )}
      </section>
    </LibraryShell>
  );
};

export default NewsHub;
