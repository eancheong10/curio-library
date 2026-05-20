import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { DailyDrop } from "@/lib/types";
import { Sparkles } from "lucide-react";

export const DailyDropBanner = () => {
  const [drop, setDrop] = useState<DailyDrop | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase.functions.invoke("daily-drop");
        if (!cancelled && data?.drop) setDrop(data.drop);
      } catch {/* ignore */}
    })();
    return () => { cancelled = true; };
  }, []);

  if (!drop) {
    return (
      <div className="container py-3">
        <div className="rounded-xl bg-wood-dark/70 border border-gold/30 px-4 py-3 animate-pulse">
          <div className="text-xs text-paper italic">Today's Curiosity Drop is brewing…</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-3">
      <Link
        to="/daily"
        className="group block rounded-xl bg-gradient-to-r from-ink via-wood-dark to-ink border-2 border-gold/50 px-4 py-3 hover:shadow-2xl hover:-translate-y-0.5 transition-all"
      >
        <div className="flex items-center gap-3">
          <div className="text-3xl group-hover:scale-110 transition-transform">{drop.emoji}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-gold font-bold">
              <Sparkles className="h-3 w-3" /> On This Day in History · {drop.topic}
            </div>
            <div className="font-display text-paper text-base md:text-lg font-bold leading-tight truncate">
              {drop.title}
            </div>
            <div className="text-xs md:text-sm text-paper/90 italic truncate">{drop.fact}</div>
          </div>
          <div className="hidden md:block text-gold text-sm italic font-bold">Tap to read →</div>
        </div>
      </Link>
    </div>
  );
};
