import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { BookOpen, Loader2 } from "lucide-react";

interface Cache { [word: string]: { definition: string; partOfSpeech?: string } | "loading" | "missing" }
const cache: Cache = {};

interface ReadingTextProps {
  text: string;
}

// Split into words but keep whitespace/punct as separators.
const TOKEN_RE = /([A-Za-zÀ-ÖØ-öø-ÿ'-]+)|([^A-Za-zÀ-ÖØ-öø-ÿ'-]+)/g;

// Words "long enough or interesting" — at least 7 letters or contains uncommon letters
function isHardWord(w: string): boolean {
  if (w.length < 7) return false;
  // Skip ALL CAPS acronyms
  if (w.toUpperCase() === w) return false;
  return true;
}

const DefinitionWord = ({ word }: { word: string }) => {
  const [open, setOpen] = useState(false);
  const [, force] = useState(0);
  const key = word.toLowerCase();
  const entry = cache[key];

  // Try the original word, then a few common lemma fall-backs (plural -s/-es,
  // -ed, -ing, -ly, -ies → -y) so we don't return "no definition" for normal words.
  const candidates = (w: string): string[] => {
    const out = new Set<string>([w]);
    if (w.endsWith("ies") && w.length > 4) out.add(w.slice(0, -3) + "y");
    if (w.endsWith("es") && w.length > 3) out.add(w.slice(0, -2));
    if (w.endsWith("s") && w.length > 3) out.add(w.slice(0, -1));
    if (w.endsWith("ed") && w.length > 3) { out.add(w.slice(0, -2)); out.add(w.slice(0, -1)); }
    if (w.endsWith("ing") && w.length > 4) { out.add(w.slice(0, -3)); out.add(w.slice(0, -3) + "e"); }
    if (w.endsWith("ly") && w.length > 4) out.add(w.slice(0, -2));
    if (w.endsWith("er") && w.length > 4) { out.add(w.slice(0, -2)); out.add(w.slice(0, -1)); }
    if (w.endsWith("est") && w.length > 5) { out.add(w.slice(0, -3)); out.add(w.slice(0, -2)); }
    return [...out];
  };

  const fetchDef = async () => {
    if (cache[key] && cache[key] !== "loading") return;
    cache[key] = "loading";
    force((n) => n + 1);
    for (const c of candidates(key)) {
      try {
        const r = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(c)}`);
        if (!r.ok) continue;
        const data = await r.json();
        const meaning = data?.[0]?.meanings?.[0];
        const def = meaning?.definitions?.[0]?.definition;
        if (def) {
          cache[key] = { definition: def, partOfSpeech: meaning?.partOfSpeech };
          force((n) => n + 1);
          return;
        }
      } catch { /* try next */ }
    }
    cache[key] = "missing";
    force((n) => n + 1);
  };

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (o) fetchDef(); }}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="border-b border-dotted border-primary/60 hover:bg-gold/20 transition-colors rounded-sm px-0.5"
          aria-label={`Look up ${word}`}
        >
          {word}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3 text-sm" side="top">
        <div className="flex items-center gap-2 mb-1 text-primary font-display font-bold">
          <BookOpen className="h-4 w-4" /> {word}
          {entry && entry !== "loading" && entry !== "missing" && entry.partOfSpeech && (
            <span className="text-xs italic text-muted-foreground">· {entry.partOfSpeech}</span>
          )}
        </div>
        {entry === "loading" || !entry ? (
          <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" /> looking it up…</div>
        ) : entry === "missing" ? (
          <div className="text-muted-foreground italic">No definition found.</div>
        ) : (
          <div className="text-foreground leading-snug">{entry.definition}</div>
        )}
      </PopoverContent>
    </Popover>
  );
};

/** Renders a paragraph where "hard" words are tappable for a definition. */
export const ReadingText = ({ text }: ReadingTextProps) => {
  const tokens = text.match(TOKEN_RE) || [];
  return (
    <>
      {tokens.map((tok, i) => {
        if (/^[A-Za-zÀ-ÖØ-öø-ÿ'-]+$/.test(tok) && isHardWord(tok)) {
          return <DefinitionWord key={i} word={tok} />;
        }
        return <span key={i}>{tok}</span>;
      })}
    </>
  );
};
