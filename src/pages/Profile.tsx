import { useEffect, useMemo, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LibraryShell } from "@/components/LibraryShell";
import { PaperCard } from "@/components/PaperCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, BookOpen, Clock, Sparkles, TrendingUp, Maximize2, X, Palette, Flame, Volume2, Pencil, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSettings } from "@/hooks/useSettings";
import { levelFromXp, titleForLevel } from "@/lib/xp";
import { THEMES } from "@/lib/themes";
import { ThemeId } from "@/lib/types";
import { FriendsPanel } from "@/components/FriendsPanel";
import { Switch } from "@/components/ui/switch";
import { isSoundEnabled, setSoundEnabled, Sfx } from "@/lib/sounds";
import { toast } from "sonner";

interface ProfileRow {
  display_name: string | null;
  xp: number;
  articles_read: number;
  seconds_read: number;
  top_topic: string | null;
  current_streak: number;
  highest_streak: number;
  last_read_date: string | null;
}

interface ConnectionRow { from_topic: string; to_topic: string; weight: number; }

const Profile = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { settings, update } = useSettings();
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [topicXp, setTopicXp] = useState<{ topic: string; xp: number }[]>([]);
  const [connections, setConnections] = useState<ConnectionRow[]>([]);
  const [mapFull, setMapFull] = useState(false);
  const [soundOn, setSoundOn] = useState<boolean>(() => isSoundEnabled());
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [savingName, setSavingName] = useState(false);

  useEffect(() => { if (!authLoading && !user) navigate("/auth"); }, [user, authLoading, navigate]);

  const reload = useCallback(async () => {
    if (!user) return;
    const [{ data: prof }, { data: events }, { data: conns }] = await Promise.all([
      supabase.from("profiles").select("display_name, xp, articles_read, seconds_read, top_topic, current_streak, highest_streak, last_read_date").eq("id", user.id).maybeSingle(),
      supabase.from("xp_events").select("topic, xp").eq("user_id", user.id),
      supabase.from("topic_connections").select("from_topic, to_topic, weight").eq("user_id", user.id),
    ]);
    setProfile(prof as ProfileRow);
    const tally = new Map<string, number>();
    (events || []).forEach((e: { topic: string; xp: number }) => tally.set(e.topic, (tally.get(e.topic) || 0) + e.xp));
    setTopicXp([...tally.entries()].map(([topic, xp]) => ({ topic, xp })).sort((a, b) => b.xp - a.xp));
    setConnections((conns || []) as ConnectionRow[]);
  }, [user]);

  useEffect(() => { reload(); }, [reload]);

  // Refresh stats whenever the page is focused/becomes visible (e.g. after reading)
  useEffect(() => {
    const onFocus = () => reload();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [reload]);

  const startEditName = () => {
    setNameDraft(profile?.display_name || "");
    setEditingName(true);
  };
  const saveName = async () => {
    if (!user) return;
    const next = nameDraft.trim();
    if (!next) { toast.error("Name can't be empty."); return; }
    if (next === profile?.display_name) { setEditingName(false); return; }
    setSavingName(true);
    try {
      // Check for case-insensitive collision
      const { data: clash } = await supabase.from("profiles").select("id")
        .ilike("display_name", next).neq("id", user.id).limit(1);
      if (clash && clash.length) { toast.error("That name is already taken."); return; }
      const { error } = await supabase.from("profiles").update({ display_name: next }).eq("id", user.id);
      if (error) throw error;
      setProfile((p) => p ? { ...p, display_name: next } : p);
      setEditingName(false);
      toast.success("Display name updated.");
      window.dispatchEvent(new CustomEvent("curio:display-name-changed", { detail: next }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't update name");
    } finally { setSavingName(false); }
  };

  const info = profile ? levelFromXp(profile.xp || 0) : levelFromXp(0);
  const minutesRead = Math.floor((profile?.seconds_read || 0) / 60);
  const hours = Math.floor(minutesRead / 60);
  const mins = minutesRead % 60;

  // Build curiosity map node positions deterministically (circle layout)
  const nodes = useMemo(() => {
    const set = new Set<string>();
    connections.forEach((c) => { set.add(c.from_topic); set.add(c.to_topic); });
    topicXp.slice(0, 14).forEach((t) => set.add(t.topic));
    const list = [...set].slice(0, 18);
    const cx = 250, cy = 200, r = 160;
    return list.map((topic, i) => {
      const angle = (i / Math.max(list.length, 1)) * Math.PI * 2;
      return { topic, x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
    });
  }, [connections, topicXp]);
  const nodeMap = useMemo(() => new Map(nodes.map((n) => [n.topic, n])), [nodes]);
  const maxXp = Math.max(1, ...topicXp.map((t) => t.xp));
  const xpFor = (topic: string) => topicXp.find((t) => t.topic === topic)?.xp || 0;

  const milestones = [
    { lv: 1, t: titleForLevel(1) }, { lv: 4, t: titleForLevel(4) },
    { lv: 10, t: titleForLevel(10) }, { lv: 15, t: titleForLevel(15) },
    { lv: 25, t: titleForLevel(25) }, { lv: 50, t: titleForLevel(50) },
    { lv: 75, t: titleForLevel(75) }, { lv: 100, t: titleForLevel(100) },
  ];

  return (
    <LibraryShell>
      <section className="container py-8 max-w-5xl">
        <Button variant="ghost" size="sm" asChild className="mb-4 -ml-3 text-muted-foreground">
          <Link to="/"><ArrowLeft className="h-4 w-4 mr-1" /> Back to shelves</Link>
        </Button>

        <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground">Reader's Card</h1>
        <p className="text-muted-foreground italic mb-8">Your reading life, bound in leather and gold.</p>

        {/* Top card */}
        <PaperCard className="p-6 md:p-8 mb-6 border-l-8 border-l-gold">
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            <div className="h-24 w-24 rounded-full bg-gradient-gold flex items-center justify-center shadow-xl border-4 border-wood-dark/40 flex-shrink-0">
              <Sparkles className="h-12 w-12 text-ink" />
            </div>
            <div className="flex-1">
              <div className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">Reader</div>
              {editingName ? (
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    value={nameDraft}
                    onChange={(e) => setNameDraft(e.target.value)}
                    autoFocus
                    maxLength={40}
                    className="bg-paper/60 border-wood/40 h-9 max-w-xs font-display text-xl"
                    onKeyDown={(e) => { if (e.key === "Enter") saveName(); if (e.key === "Escape") setEditingName(false); }}
                  />
                  <Button size="sm" onClick={saveName} disabled={savingName} className="h-8 bg-leather-green text-paper">
                    <Check className="h-3 w-3" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setEditingName(false)} className="h-8 border-wood/40">
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <button
                  onClick={startEditName}
                  className="group inline-flex items-center gap-2 font-display text-2xl md:text-3xl font-bold text-foreground hover:text-primary transition-colors text-left"
                  title="Click to rename"
                >
                  {profile?.display_name || "Curious Reader"}
                  <Pencil className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              )}
              <div className="font-display text-lg text-primary italic mt-1">
                Lv {info.level} · {info.title}
              </div>
              <div className="mt-3 w-full max-w-md">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                  <span>{profile?.xp || 0} XP</span>
                  <span>{info.intoLevelXp} / {info.xpThisLevel} to next level</span>
                </div>
                <div className="h-2 bg-wood/20 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-gold transition-all" style={{ width: `${Math.round((info.intoLevelXp/Math.max(info.xpThisLevel,1))*100)}%` }} />
                </div>
              </div>
            </div>
          </div>
        </PaperCard>

        {/* Stats grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <PaperCard className="p-5">
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground mb-1">
              <BookOpen className="h-4 w-4" /> Articles read
            </div>
            <div className="font-display text-3xl font-bold text-foreground">{profile?.articles_read || 0}</div>
          </PaperCard>
          <PaperCard className="p-5">
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground mb-1">
              <Clock className="h-4 w-4" /> Time spent reading
            </div>
            <div className="font-display text-3xl font-bold text-foreground">
              {hours > 0 ? `${hours}h ${mins}m` : `${mins} min`}
            </div>
          </PaperCard>
          <PaperCard className="p-5">
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground mb-1">
              <TrendingUp className="h-4 w-4" /> Top topic
            </div>
            <div className="font-display text-2xl font-bold text-foreground truncate">
              {profile?.top_topic || "—"}
            </div>
          </PaperCard>
          <PaperCard className="p-5">
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground mb-1">
              <Flame className="h-4 w-4" /> Current streak
            </div>
            <div className="font-display text-3xl font-bold text-foreground">{profile?.current_streak || 0} days</div>
          </PaperCard>
          <PaperCard className="p-5">
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground mb-1">
              <Sparkles className="h-4 w-4" /> Highest streak
            </div>
            <div className="font-display text-3xl font-bold text-foreground">{profile?.highest_streak || 0} days</div>
          </PaperCard>
        </div>

        {/* Topic XP breakdown */}
        <PaperCard className="p-6 mb-8">
          <h2 className="font-display text-2xl font-bold text-foreground mb-4">XP by topic</h2>
          {topicXp.length === 0 ? (
            <p className="text-muted-foreground italic">Read your first article to start earning XP.</p>
          ) : (
            <div className="space-y-2">
              {topicXp.slice(0, 10).map((t) => (
                <button
                  key={t.topic}
                  onClick={async () => {
                    if (!user) return;
                    const { data } = await supabase
                      .from("read_history")
                      .select("id")
                      .eq("user_id", user.id)
                      .ilike("topic", t.topic)
                      .order("created_at", { ascending: false })
                      .limit(1)
                      .maybeSingle();
                    if (data?.id) {
                      navigate(`/history?id=${data.id}&topic=${encodeURIComponent(t.topic)}`);
                    } else {
                      navigate(`/read?topic=${encodeURIComponent(t.topic)}`);
                    }
                  }}
                  className="block w-full text-left rounded p-1 hover:bg-gold/10 transition-colors"
                  title={`Open your latest read about ${t.topic}`}
                >
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-semibold text-foreground hover:text-primary">{t.topic} →</span>
                    <span className="text-muted-foreground">{t.xp} XP</span>
                  </div>
                  <div className="h-2 bg-wood/15 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-leather-red via-gold to-leather-green" style={{ width: `${Math.round((t.xp/maxXp)*100)}%` }} />
                  </div>
                </button>
              ))}
            </div>
          )}
        </PaperCard>

        {/* Curiosity Journey Map */}
        <PaperCard className="p-6 mb-8">
          <div className="flex items-start justify-between mb-1 gap-2 flex-wrap">
            <div>
              <h2 className="font-display text-2xl font-bold text-foreground">🗺️ Curiosity Journey Map</h2>
              <p className="text-sm text-muted-foreground italic">Topics you've explored and how they connect.</p>
            </div>
            {nodes.length > 0 && (
              <Button size="sm" variant="outline" onClick={() => setMapFull(true)} className="border-wood/40">
                <Maximize2 className="h-4 w-4 mr-1" /> Fullscreen
              </Button>
            )}
          </div>
          {nodes.length === 0 ? (
            <p className="text-muted-foreground italic">Your map will draw itself as you go down rabbit holes.</p>
          ) : (
            <div className="relative w-full overflow-x-auto">
              <svg viewBox="0 0 500 400" className="w-full max-w-2xl mx-auto block" style={{ minWidth: 320 }}>
                {/* Edges */}
                {connections.map((c, i) => {
                  const a = nodeMap.get(c.from_topic), b = nodeMap.get(c.to_topic);
                  if (!a || !b) return null;
                  return (
                    <line
                      key={i}
                      x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                      stroke="hsl(var(--gold))"
                      strokeOpacity={Math.min(0.2 + c.weight * 0.2, 0.85)}
                      strokeWidth={Math.min(1 + c.weight, 4)}
                    />
                  );
                })}
                {/* Nodes */}
                {nodes.map((n) => {
                  const xp = xpFor(n.topic);
                  const r = 14 + Math.min(xp / 30, 14);
                  return (
                    <g key={n.topic} className="cursor-pointer" onClick={() => navigate(`/history?topic=${encodeURIComponent(n.topic)}`)}>
                      <circle cx={n.x} cy={n.y} r={r} fill="hsl(var(--leather-red))" opacity="0.85" stroke="hsl(var(--gold))" strokeWidth="1.5" />
                      <text x={n.x} y={n.y + r + 12} textAnchor="middle"
                            fontSize="10" fill="hsl(var(--foreground))" fontWeight="600">
                        {n.topic.length > 16 ? n.topic.slice(0, 15) + "…" : n.topic}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          )}
        </PaperCard>

        {/* Theme picker */}
        <PaperCard className="p-6 mb-8">
          <h2 className="font-display text-2xl font-bold text-foreground mb-1 flex items-center gap-2">
            <Palette className="h-5 w-5 text-gold" /> Library theme
          </h2>
          <p className="text-sm text-muted-foreground italic mb-4">Pick a vibe — it changes the whole library.</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {THEMES.map((t) => {
              const active = settings.theme === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => update({ theme: t.id as ThemeId })}
                  className={`p-3 rounded-lg border-2 text-left transition-all ${active ? "border-primary ring-2 ring-primary scale-[1.02]" : "border-wood/30 hover:border-wood/60"}`}
                  style={{
                    background: `hsl(${t.vars["--card"]})`,
                    color: `hsl(${t.vars["--card-foreground"]})`,
                  }}
                >
                  <div className="text-2xl">{t.emoji}</div>
                  <div className="font-display font-bold text-sm mt-1">{t.label}</div>
                  <div className="text-[11px] opacity-80 leading-tight">{t.description}</div>
                </button>
              );
            })}
          </div>
        </PaperCard>

        {/* Sounds toggle */}
        <PaperCard className="p-6 mb-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl font-bold text-foreground mb-1 flex items-center gap-2">
                <Volume2 className="h-5 w-5 text-gold" /> Sound effects
              </h2>
              <p className="text-sm text-muted-foreground italic">Subtle clicks, page turns, and reward chimes.</p>
            </div>
            <Switch
              checked={soundOn}
              onCheckedChange={(v) => {
                setSoundOn(v);
                setSoundEnabled(v);
                if (v) Sfx.xp();
              }}
            />
          </div>
        </PaperCard>

        {/* Friends */}
        <PaperCard className="p-6 mb-8">
          <FriendsPanel />
        </PaperCard>

        {/* Level milestones */}
        <PaperCard className="p-6">
          <h2 className="font-display text-2xl font-bold text-foreground mb-4">Reader titles</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {milestones.map((m) => (
              <div
                key={m.lv}
                className={`p-3 rounded-lg border ${info.level >= m.lv ? "bg-gradient-gold border-gold-deep text-ink" : "bg-paper/40 border-wood/30 text-muted-foreground"}`}
              >
                <div className="text-[10px] uppercase tracking-widest font-bold">Lv {m.lv}</div>
                <div className="font-display text-sm font-bold leading-tight">{m.t}</div>
              </div>
            ))}
          </div>
        </PaperCard>
      </section>

      {/* Fullscreen Curiosity Map */}
      {mapFull && (
        <div className="fixed inset-0 z-50 bg-ink/90 backdrop-blur-sm flex flex-col" onClick={() => setMapFull(false)}>
          <div className="flex items-center justify-between p-4 border-b border-wood/30 bg-wood-dark/40" onClick={(e) => e.stopPropagation()}>
            <div className="text-paper font-display text-xl font-bold flex items-center gap-2">🗺️ Curiosity Journey Map</div>
            <Button size="sm" variant="ghost" onClick={() => setMapFull(false)} className="text-paper hover:bg-wood-dark/40">
              <X className="h-4 w-4 mr-1" /> Close
            </Button>
          </div>
          <div className="flex-1 overflow-auto p-4" onClick={(e) => e.stopPropagation()}>
            <svg viewBox="0 0 500 400" className="w-full h-full min-w-[600px] min-h-[500px]" preserveAspectRatio="xMidYMid meet">
              {connections.map((c, i) => {
                const a = nodeMap.get(c.from_topic), b = nodeMap.get(c.to_topic);
                if (!a || !b) return null;
                return (
                  <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                        stroke="hsl(var(--gold))"
                        strokeOpacity={Math.min(0.3 + c.weight * 0.2, 1)}
                        strokeWidth={Math.min(1.5 + c.weight, 5)} />
                );
              })}
              {nodes.map((n) => {
                const xp = xpFor(n.topic);
                const r = 16 + Math.min(xp / 30, 18);
                return (
                  <g key={n.topic} className="cursor-pointer" onClick={() => { setMapFull(false); navigate(`/history?topic=${encodeURIComponent(n.topic)}`); }}>
                    <circle cx={n.x} cy={n.y} r={r} fill="hsl(var(--leather-red))" opacity="0.9" stroke="hsl(var(--gold))" strokeWidth="2" />
                    <text x={n.x} y={n.y + r + 14} textAnchor="middle"
                          fontSize="12" fill="hsl(var(--paper))" fontWeight="700">
                      {n.topic.length > 20 ? n.topic.slice(0, 19) + "…" : n.topic}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      )}
    </LibraryShell>
  );
};

export default Profile;
