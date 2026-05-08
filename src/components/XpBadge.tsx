import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { levelFromXp } from "@/lib/xp";
import { Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

export const XpBadge = () => {
  const { user } = useAuth();
  const [xp, setXp] = useState(0);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const load = async () => {
      const { data } = await supabase.from("profiles").select("xp").eq("id", user.id).maybeSingle();
      if (!cancelled) setXp(data?.xp || 0);
    };
    load();
    // refresh on focus so XP updates after reading
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => { cancelled = true; window.removeEventListener("focus", onFocus); };
  }, [user]);

  if (!user) return null;
  const info = levelFromXp(xp);
  const pct = info.xpThisLevel > 0 ? Math.round((info.intoLevelXp / info.xpThisLevel) * 100) : 0;

  return (
    <Link
      to="/profile"
      className="hidden sm:flex items-center gap-3 bg-wood-dark/40 border border-gold/30 rounded-full px-3 py-1.5 hover:bg-wood-dark/60 transition-colors"
      title={`${xp} XP — ${info.title}`}
    >
      <div className="h-7 w-7 rounded-full bg-gradient-gold flex items-center justify-center shadow">
        <Sparkles className="h-4 w-4 text-ink" />
      </div>
      <div className="text-paper text-xs leading-tight">
        <div className="font-display font-bold text-sm">Lv {info.level} · {info.title}</div>
        <div className="w-32 h-1 bg-paper/20 rounded-full overflow-hidden mt-0.5">
          <div className="h-full bg-gradient-gold" style={{ width: `${pct}%` }} />
        </div>
      </div>
    </Link>
  );
};
