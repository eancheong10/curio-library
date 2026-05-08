import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { xpForArticle } from "@/lib/xp";
import { toast } from "sonner";
import { Sfx } from "@/lib/sounds";

interface AwardOpts {
  topic: string;
  title: string;
  secondsSpent: number;
  fromTopic?: string | null;
  // Optional context for read_history logging:
  summary?: string | null;
  body?: string | null;
  emoji?: string | null;
  sourceKind?: "spin" | "news" | "daily";
  sourceUrl?: string | null;
  sourceName?: string | null;
}

const STREAK_BONUS_XP = 15;

function isoDay(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

function daysBetween(a: string, b: string) {
  const start = new Date(`${a}T00:00:00Z`).getTime();
  const end = new Date(`${b}T00:00:00Z`).getTime();
  return Math.round((end - start) / 86_400_000);
}

/** Awards XP, increments stats, logs xp event + read history, records topic connection. */
export function useReader() {
  const { user } = useAuth();

  const awardRead = useCallback(async (opts: AwardOpts) => {
    if (!user) return null;
    const { topic, title, secondsSpent, fromTopic } = opts;
    const xp = xpForArticle(topic, secondsSpent);

    const { data: profile } = await supabase
      .from("profiles")
      .select("xp, articles_read, seconds_read, top_topic, current_streak, highest_streak, last_read_date")
      .eq("id", user.id)
      .maybeSingle() as { data: any };

    const today = isoDay();
    const lastRead = profile?.last_read_date as string | null | undefined;
    let currentStreak = profile?.current_streak || 0;
    let highestStreak = profile?.highest_streak || 0;
    let streakBonus = 0;

    if (lastRead !== today) {
      currentStreak = lastRead && daysBetween(lastRead, today) === 1 ? currentStreak + 1 : 1;
      highestStreak = Math.max(highestStreak, currentStreak);
      streakBonus = currentStreak > 0 && currentStreak % 5 === 0 ? STREAK_BONUS_XP : 0;
    }

    const newXp = (profile?.xp || 0) + xp + streakBonus;
    const newCount = (profile?.articles_read || 0) + 1;
    const newSeconds = (profile?.seconds_read || 0) + secondsSpent;

    const { data: events } = await supabase
      .from("xp_events")
      .select("topic, xp")
      .eq("user_id", user.id);
    const tally = new Map<string, number>();
    (events || []).forEach((e) => tally.set(e.topic, (tally.get(e.topic) || 0) + e.xp));
    tally.set(topic, (tally.get(topic) || 0) + xp);
    let top: string | null = profile?.top_topic ?? null;
    let bestXp = -1;
    tally.forEach((v, k) => { if (v > bestXp) { bestXp = v; top = k; } });

    const profilePatch = {
      xp: newXp,
      articles_read: newCount,
      seconds_read: newSeconds,
      top_topic: top,
      current_streak: currentStreak,
      highest_streak: highestStreak,
      last_read_date: today,
    } as any;
    await supabase.from("profiles").update(profilePatch).eq("id", user.id);

    await supabase.from("xp_events").insert({
      user_id: user.id,
      topic,
      xp,
      reason: fromTopic ? "rabbit_hole" : "read",
      article_title: title,
      seconds_spent: secondsSpent,
    });

    if (streakBonus > 0) {
      await supabase.from("xp_events").insert({
        user_id: user.id,
        topic: "Reading Streak",
        xp: streakBonus,
        reason: "streak_bonus",
        article_title: `${currentStreak}-day streak`,
        seconds_spent: 0,
      });
    }

    // Log to read_history
    await supabase.from("read_history").insert({
      user_id: user.id,
      topic,
      title,
      summary: opts.summary || null,
      body: opts.body || null,
      source_kind: opts.sourceKind || "spin",
      source_url: opts.sourceUrl || null,
      source_name: opts.sourceName || null,
      emoji: opts.emoji || null,
    });

    if (fromTopic && fromTopic !== topic) {
      const { data: existing } = await supabase
        .from("topic_connections")
        .select("id, weight")
        .eq("user_id", user.id)
        .eq("from_topic", fromTopic)
        .eq("to_topic", topic)
        .maybeSingle();
      if (existing) {
        await supabase.from("topic_connections")
          .update({ weight: existing.weight + 1, updated_at: new Date().toISOString() })
          .eq("id", existing.id);
      } else {
        await supabase.from("topic_connections").insert({
          user_id: user.id, from_topic: fromTopic, to_topic: topic, weight: 1,
        });
      }
    }

    if (streakBonus > 0) Sfx.streak(); else Sfx.xp();
    toast.success(`+${xp + streakBonus} XP — ${topic}${streakBonus ? ` (+${streakBonus} streak bonus)` : ""}`, { duration: 2200 });
    return xp + streakBonus;
  }, [user]);

  return { awardRead };
}
