import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LibraryShell } from "@/components/LibraryShell";
import { PaperCard } from "@/components/PaperCard";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useSettings } from "@/hooks/useSettings";
import { supabase } from "@/integrations/supabase/client";
import { THEMES } from "@/lib/themes";
import { ThemeId, FontSize } from "@/lib/types";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";

const INTEREST_OPTIONS = [
  "History", "Science", "Philosophy", "Politics", "Mysteries",
  "Arts", "Music", "Tech", "Nature", "Games", "Mythology", "Words",
  "Space", "Health", "Sports", "Pop Culture",
];

const Onboarding = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { settings, update } = useSettings();
  const [step, setStep] = useState(0);
  const [picked, setPicked] = useState<Set<string>>(new Set());

  useEffect(() => { if (!authLoading && !user) navigate("/auth"); }, [user, authLoading, navigate]);
  useEffect(() => {
    // If already onboarded, jump home
    if (settings.onboarded && user) navigate("/");
  }, [settings.onboarded, user, navigate]);

  const togglePick = (i: string) => {
    const next = new Set(picked);
    next.has(i) ? next.delete(i) : next.add(i);
    setPicked(next);
  };

  const finish = async () => {
    if (!user) return;
    if (picked.size > 0) {
      await supabase.from("user_interests").insert(
        [...picked].map((interest) => ({ user_id: user.id, interest }))
      );
    }
    await update({ onboarded: true });
    toast.success("Welcome to your library ✨");
    navigate("/");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-96 lamp-glow animate-flicker" />
      <div className="w-full max-w-2xl relative z-10">
        <PaperCard className="p-8 md:p-10 animate-book-open">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center h-14 w-14 rounded-full bg-gradient-gold shadow-lg mb-3">
              <Sparkles className="h-7 w-7 text-ink" />
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground">Let's set up your library</h1>
            <p className="text-muted-foreground italic mt-1">Step {step + 1} of 3</p>
          </div>

          {step === 0 && (
            <>
              <h2 className="font-display text-xl font-bold mb-4">Pick a look</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                {THEMES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => update({ theme: t.id as ThemeId })}
                    className={`p-3 rounded-lg border-2 text-left transition-all ${
                      settings.theme === t.id ? "border-primary ring-2 ring-primary scale-[1.02]" : "border-wood/30"
                    }`}
                    style={{
                      background: `hsl(${t.vars["--card"]})`,
                      color: `hsl(${t.vars["--card-foreground"]})`,
                    }}
                  >
                    <div className="text-2xl">{t.emoji}</div>
                    <div className="font-display font-bold text-sm mt-1">{t.label}</div>
                    <div className="text-[11px] opacity-80 leading-tight">{t.description}</div>
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <h2 className="font-display text-xl font-bold mb-4 text-foreground">Pick a comfortable text size</h2>
              <div className="grid grid-cols-4 gap-2 mb-4">
                {(["small", "medium", "large", "xlarge"] as FontSize[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => update({ font_size: s })}
                    className={`p-3 rounded border-2 text-center capitalize transition-all ${
                      settings.font_size === s
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-wood/30 bg-card text-foreground hover:bg-gold/10"
                    }`}
                  >
                    <div style={{ fontSize: s === "small" ? 14 : s === "medium" ? 17 : s === "large" ? 20 : 24 }} className="font-display font-bold">Aa</div>
                    <div className="text-xs">{s}</div>
                  </button>
                ))}
              </div>
              <PaperCard className="p-4 mb-2">
                <p className="prose text-foreground">This is what your reading text will look like at this size. Comfortable?</p>
              </PaperCard>
            </>
          )}

          {step === 2 && (
            <>
              <h2 className="font-display text-xl font-bold mb-1">What sparks your curiosity?</h2>
              <p className="text-sm text-muted-foreground italic mb-4">Pick a few — we'll surface more of these.</p>
              <div className="flex flex-wrap gap-2 mb-6">
                {INTEREST_OPTIONS.map((i) => (
                  <button
                    key={i}
                    onClick={() => togglePick(i)}
                    className={`px-3 py-1.5 rounded-full border-2 text-sm transition-all ${
                      picked.has(i)
                        ? "bg-gradient-gold text-ink border-gold-deep"
                        : "bg-card border-wood/30 text-foreground hover:bg-gold/10"
                    }`}
                  >
                    {i}
                  </button>
                ))}
              </div>
            </>
          )}

          <div className="flex justify-between mt-4">
            <Button variant="ghost" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}>Back</Button>
            {step < 2 ? (
              <Button onClick={() => setStep(step + 1)} className="bg-primary text-primary-foreground">Next</Button>
            ) : (
              <Button onClick={finish} className="bg-gradient-gold text-ink">Enter the library →</Button>
            )}
          </div>
        </PaperCard>
      </div>
    </div>
  );
};

export default Onboarding;
