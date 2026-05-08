import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { SpunArticle } from "@/lib/types";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, RefreshCw, GitBranch, Shuffle } from "lucide-react";

interface RabbitHoleProps {
  fromTopic: string;
  fromTitle: string;
  relatedTopics: string[];
  onArticle: (article: SpunArticle, pickedTopic: string, fromTopic: string) => void;
}

const DIRECTIONS = [
  { key: "cause", label: "What led to this?", icon: ArrowLeft, color: "leather-blue" },
  { key: "impact", label: "What happened after?", icon: ArrowRight, color: "leather-green" },
  { key: "opposite", label: "Different perspective", icon: GitBranch, color: "leather-mustard" },
  { key: "related", label: "Similar topic", icon: RefreshCw, color: "leather-red" },
  { key: "random", label: "Random escape", icon: Shuffle, color: "wood" },
] as const;

export const RabbitHole = ({ fromTopic, fromTitle, relatedTopics, onArticle }: RabbitHoleProps) => {
  const [loading, setLoading] = useState<string | null>(null);

  const goDirection = async (direction: string) => {
    setLoading(direction);
    try {
      const { data, error } = await supabase.functions.invoke("spin-article", {
        body: { direction, fromTopic, previousTitle: fromTitle },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      onArticle(data.article, data.pickedTopic, fromTopic);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not go deeper");
    } finally {
      setLoading(null);
    }
  };

  const goTopic = async (topic: string) => {
    setLoading(topic);
    try {
      const { data, error } = await supabase.functions.invoke("spin-article", {
        body: { topic, previousTitle: fromTitle },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      onArticle(data.article, data.pickedTopic, fromTopic);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not go deeper");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="mt-10 pt-6 border-t-2 border-dashed border-wood/30">
      <p className="font-display text-2xl text-foreground mb-1">🐰 Down the rabbit hole…</p>
      <p className="text-sm text-muted-foreground italic mb-4">Where do you want to go next?</p>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 mb-5">
        {DIRECTIONS.map(({ key, label, icon: Icon }) => (
          <Button
            key={key}
            variant="outline"
            onClick={() => goDirection(key)}
            disabled={!!loading}
            className="justify-start border-wood/40 bg-paper/40 hover:bg-paper/80 h-auto py-3"
          >
            <Icon className="h-4 w-4 mr-2 text-primary" />
            <span className="text-left">
              <span className="block text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{key}</span>
              <span className="block font-semibold">{loading === key ? "Opening…" : label}</span>
            </span>
          </Button>
        ))}
      </div>

      {relatedTopics?.length > 0 && (
        <>
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-2">
            Or jump to a related topic
          </p>
          <div className="flex flex-wrap gap-2">
            {relatedTopics.map((t) => (
              <Button
                key={t}
                variant="outline"
                size="sm"
                onClick={() => goTopic(t)}
                disabled={!!loading}
                className="border-wood/40 hover:bg-gold/10"
              >
                {loading === t ? "Loading…" : `${t} →`}
              </Button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
