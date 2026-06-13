import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PaperCard } from "@/components/PaperCard";
import { BookOpen, Mail, Lock, User as UserIcon } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

const Auth = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (authLoading || !user) return;
    (async () => {
      const { data } = await supabase.from("user_settings").select("onboarded").eq("user_id", user.id).maybeSingle();
      if (!data) {
        // No settings row yet (just signed up) — create one then onboard
        await supabase.from("user_settings").insert({ user_id: user.id, onboarded: false });
        navigate("/onboarding");
        return;
      }
      if (data.onboarded) navigate("/");
      else navigate("/onboarding");
    })();
  }, [user, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const cleanEmail = email.trim().toLowerCase();
        const cleanName = (displayName || cleanEmail.split("@")[0]).trim();
        const { data: taken } = await supabase.rpc("display_name_taken", { _name: cleanName });
        if (taken) {
          toast.error("That username is already taken. Try another one.");
          return;
        }
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth`,
            data: { display_name: cleanName },
          },
        });
        if (error) throw error;
        if (data.user?.identities?.length === 0) {
          toast.error("That email already has a library card. Try signing in instead.");
          return;
        }
        toast.success("Check your email to verify your account, then return here to sign in.", { duration: 6000 });
        // If signup returned a session immediately (auto-confirm on), make sure
        // the new reader has a settings row and go straight to onboarding.
        if (data.session && data.user) {
          await supabase.from("user_settings").upsert(
            { user_id: data.user.id, onboarded: false },
            { onConflict: "user_id" },
          );
          navigate("/onboarding");
          return;
        }
        setMode("signin");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back, dear reader.");
      }
    } catch (err) {
      const raw = err instanceof Error ? err.message : "Something went wrong";
      const friendly = /email not confirmed/i.test(raw)
        ? "Please check your email and verify your account before signing in."
        : /invalid login credentials/i.test(raw)
        ? "No account with that email & password. New here? Tap “Get a library card” to sign up."
        : /profiles_display_name_unique_ci|duplicate key/i.test(raw)
        ? "That username is already taken. Try another one."
        : /already registered|user already/i.test(raw)
        ? "That email already has a library card. Try signing in instead."
        : raw;
      toast.error(friendly);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-96 lamp-glow animate-flicker" />
      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8 animate-float-up">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-gradient-gold shadow-lg mb-4">
            <BookOpen className="h-8 w-8 text-ink" />
          </div>
          <h1 className="font-display text-4xl font-bold text-foreground">Curio Library</h1>
          <p className="text-muted-foreground italic mt-2">
            {mode === "signin" ? "Welcome back, dear reader." : "A new chapter begins."}
          </p>
        </div>

        <PaperCard className="p-8 animate-book-open">
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div className="space-y-2">
                <Label htmlFor="name" className="text-foreground font-semibold">Name</Label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="name"
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="What shall we call you?"
                    className="pl-10 bg-paper/50 border-wood/30"
                  />
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground font-semibold">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@somewhere.com"
                  className="pl-10 bg-paper/50 border-wood/30"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground font-semibold">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="pl-10 bg-paper/50 border-wood/30"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-gold text-ink hover:opacity-90 font-semibold shadow-md"
            >
              {loading ? "One moment…" : mode === "signin" ? "Enter the library" : "Begin reading"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            {mode === "signin" ? "New to the library? " : "Already a reader? "}
            <button
              type="button"
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              className="text-primary font-semibold hover:underline"
            >
              {mode === "signin" ? "Get a library card" : "Sign in"}
            </button>
          </p>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-wood/30" /></div>
            <div className="relative flex justify-center text-xs uppercase tracking-widest">
              <span className="bg-paper/80 px-2 text-muted-foreground">or</span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            disabled={loading}
            onClick={async () => {
              setLoading(true);
              try {
                const { error } = await supabase.auth.signInAnonymously();
                if (error) throw error;
                toast.success("Welcome, wandering reader. Your progress won't be saved.", { duration: 5000 });
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Couldn't start guest session");
              } finally {
                setLoading(false);
              }
            }}
            className="w-full border-wood/40 hover:bg-gold/10"
          >
            Continue as guest
          </Button>
          <p className="text-center text-xs text-muted-foreground italic mt-2">
            Browse freely — favourites and history won't be saved.
          </p>
        </PaperCard>
      </div>
    </div>
  );
};

export default Auth;
