import { ThemeId } from "@/lib/types";

export interface ThemeDef {
  id: ThemeId;
  label: string;
  emoji: string;
  description: string;
  // CSS variables (HSL triples) applied at :root.
  // Themes ONLY change background-ish surfaces. All readable text + cards
  // share one warm, high-contrast palette so words always stand out.
  vars: Record<string, string>;
}

// Shared palette used by every theme — text, cards, primary, accent, borders.
// Background and decorative wood/paper colors come from each theme.
const SHARED: Record<string, string> = {
  // Reading surfaces (cards) stay parchment so prose is always legible.
  "--card": "36 45% 90%",
  "--card-foreground": "25 35% 15%",
  "--popover": "36 45% 92%",
  "--popover-foreground": "25 35% 15%",

  // Text everywhere
  "--foreground": "25 35% 15%",

  // Buttons & accents — same warm palette across themes
  "--primary": "18 65% 32%",
  "--primary-foreground": "38 50% 96%",
  "--secondary": "30 30% 80%",
  "--secondary-foreground": "25 35% 18%",
  "--accent": "38 75% 50%",
  "--accent-foreground": "25 50% 12%",
  "--muted": "36 25% 85%",
  "--muted-foreground": "25 30% 30%",
  "--border": "30 25% 70%",
  "--input": "30 25% 78%",
  "--ring": "18 65% 32%",

  // Decorative tokens kept consistent so book spines / wood shelves stay readable
  "--wood": "22 40% 32%",
  "--wood-dark": "22 45% 22%",
  "--wood-light": "28 35% 50%",
  "--gold": "42 80% 55%",
  "--gold-deep": "38 75% 42%",
  "--paper": "38 50% 94%",
  "--ink": "25 50% 12%",
};

export const THEMES: ThemeDef[] = [
  { id: "library", label: "Cozy Library", emoji: "📚", description: "Soft parchment backdrop.", vars: { ...SHARED, "--background": "36 45% 90%" } },
  { id: "cutesy",  label: "Cutesy",       emoji: "🍡", description: "Soft pink backdrop.",   vars: { ...SHARED, "--background": "340 70% 96%" } },
  { id: "retro",   label: "Retro 70s",    emoji: "🌻", description: "Golden wheat backdrop.", vars: { ...SHARED, "--background": "43 73% 80%" } },
  { id: "matrix",  label: "Matrix",       emoji: "🟢", description: "Bright code green.",    vars: { ...SHARED, "--background": "125 62% 82%" } },
  { id: "pastel",  label: "Pastel Dream", emoji: "🪻", description: "Lilac haze backdrop.",  vars: { ...SHARED, "--background": "275 47% 81%" } },
  { id: "futuristic", label: "Futuristic", emoji: "🛰️", description: "Aqua neon field.",    vars: { ...SHARED, "--background": "182 50% 80%" } },
  { id: "noir",    label: "Ash",          emoji: "🌫️", description: "Ash grey backdrop.",    vars: { ...SHARED, "--background": "0 0% 80%" } },
  { id: "garden",  label: "Secret Garden", emoji: "🌿", description: "Sage backdrop.",       vars: { ...SHARED, "--background": "74 32% 76%" } },
];

export function applyTheme(themeId: ThemeId) {
  const theme = THEMES.find((t) => t.id === themeId) || THEMES[0];
  const root = document.documentElement;
  Object.entries(theme.vars).forEach(([k, v]) => root.style.setProperty(k, v));
  root.dataset.theme = theme.id;
}

export const FONT_SIZE_PX: Record<string, string> = {
  small: "15px",
  medium: "17px",
  large: "20px",
  xlarge: "24px",
};

export function applyFontSize(size: string) {
  document.documentElement.style.setProperty("--reader-font-size", FONT_SIZE_PX[size] || "17px");
}
