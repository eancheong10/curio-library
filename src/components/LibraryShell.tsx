import { ReactNode, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LogOut, BookOpen, User as UserIcon, Search, Type } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { XpBadge } from "@/components/XpBadge";
import { RotatingQuote } from "@/components/RotatingQuote";
import { useSettings } from "@/hooks/useSettings";
import { FontSize } from "@/lib/types";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

export const LibraryShell = ({ children, hideFooter }: { children: ReactNode; hideFooter?: boolean }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { settings, update } = useSettings();
  const [displayName, setDisplayName] = useState<string>("");

  useEffect(() => {
    if (!user) { setDisplayName(""); return; }
    supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle()
      .then(({ data }) => setDisplayName(data?.display_name || (user.email ? user.email.split("@")[0] : "Reader")));
  }, [user]);

  const signOut = async () => {
    await supabase.auth.signOut();
    toast.success("Until next time, dear reader.");
    navigate("/auth");
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-96 lamp-glow animate-flicker" aria-hidden />

      <header className="relative z-10 border-b border-wood/30 bg-gradient-shelf">
        <div className="container flex items-center justify-between py-4 gap-2">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="h-10 w-10 rounded-md bg-gradient-gold flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
              <BookOpen className="h-5 w-5 text-ink" />
            </div>
            <div>
              <div className="font-display text-2xl font-bold text-paper leading-none">Curio Library</div>
              <div className="text-xs text-paper/70 italic hidden sm:block">Discover the world, one book at a time</div>
            </div>
          </Link>
          {user && (
            <div className="flex items-center gap-1 sm:gap-2">
              <XpBadge />
              <Button asChild variant="ghost" size="sm" className="text-paper hover:text-gold hover:bg-wood-dark/40">
                <Link to="/search" aria-label="Search"><Search className="h-4 w-4" /></Link>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-paper hover:text-gold hover:bg-wood-dark/40" aria-label="Text size">
                    <Type className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Text size</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {(["small", "medium", "large", "xlarge"] as FontSize[]).map((s) => (
                    <DropdownMenuItem key={s} onClick={() => update({ font_size: s })} className={settings.font_size === s ? "font-bold" : ""}>
                      {s} {settings.font_size === s && "✓"}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <Button asChild variant="ghost" size="sm" className="text-paper hover:text-gold hover:bg-wood-dark/40">
                <Link to="/profile">
                  <UserIcon className="h-4 w-4 sm:mr-1" />
                  <span className="hidden sm:inline max-w-[140px] truncate">{displayName || "Reader"}</span>
                </Link>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={signOut}
                className="text-paper hover:text-gold hover:bg-wood-dark/40"
              >
                <LogOut className="h-4 w-4 sm:mr-2" /> <span className="hidden sm:inline">Sign out</span>
              </Button>
            </div>
          )}
        </div>
      </header>

      <main className="relative z-10">{children}</main>

      {!hideFooter && (
        <footer className="relative z-10 border-t border-wood/30 bg-wood-dark/20 mt-16 py-6">
          <div className="container text-center text-sm text-muted-foreground space-y-2">
            <RotatingQuote />
            <div className="text-xs text-muted-foreground/80 not-italic">
              This website was created by team J.A.K.E in the NAIC 2026 Competition.
            </div>
          </div>
        </footer>
      )}
    </div>
  );
};
