import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { applyTheme, applyFontSize } from "@/lib/themes";
import { ThemeId, FontSize, UserSettings } from "@/lib/types";

const LS_KEY = "curio_settings";

const DEFAULTS: Omit<UserSettings, "user_id"> = {
  theme: "library",
  font_size: "medium",
  country: "global",
  onboarded: false,
};

function readLocal(): Partial<UserSettings> {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function writeLocal(s: Partial<UserSettings>) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(s)); } catch { /* ignore */ }
}

export function useSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<UserSettings>(() => ({
    user_id: "",
    ...DEFAULTS,
    ...readLocal(),
  }) as UserSettings);
  const [loaded, setLoaded] = useState(false);

  // Apply theme + font size whenever they change
  useEffect(() => {
    applyTheme(settings.theme as ThemeId);
    applyFontSize(settings.font_size);
  }, [settings.theme, settings.font_size]);

  // Load from DB
  useEffect(() => {
    if (!user) { setLoaded(true); return; }
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from("user_settings").select("*").eq("user_id", user.id).maybeSingle();
      if (cancelled) return;
      if (data) {
        const next: UserSettings = {
          user_id: user.id,
          theme: (data.theme as ThemeId) || "library",
          font_size: (data.font_size as FontSize) || "medium",
          country: data.country || "global",
          onboarded: !!data.onboarded,
        };
        setSettings(next);
        writeLocal(next);
      } else {
        // create row
        await supabase.from("user_settings").insert({ user_id: user.id, ...DEFAULTS });
        setSettings({ user_id: user.id, ...DEFAULTS });
      }
      setLoaded(true);
    })();
    return () => { cancelled = true; };
  }, [user]);

  const update = useCallback(async (patch: Partial<UserSettings>) => {
    setSettings((s) => {
      const next = { ...s, ...patch };
      writeLocal(next);
      return next;
    });
    if (user) {
      await supabase.from("user_settings").upsert({
        user_id: user.id,
        ...DEFAULTS,
        ...settings,
        ...patch,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });
    }
  }, [user, settings]);

  return { settings, update, loaded };
}
