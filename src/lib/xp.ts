// Knowledge XP system: weights, levels, and titles.

// XP weight per topic. Higher = harder/more substantive subject.
export const TOPIC_WEIGHTS: Record<string, number> = {
  // Heavy hitters
  Politics: 30, Geopolitics: 30, Economics: 28, "Behavioral Economics": 28,
  Philosophy: 28, Metaphysics: 28, Existentialism: 26, Ethics: 26, "Ethics of AI": 28,
  History: 22, World: 22, Science: 22, Tech: 18, Technology: 18,
  Environment: 22, Health: 22, Society: 20, Culture: 16,
  // Lighter
  Sports: 10, Esports: 10, Gaming: 10, "Fun Facts": 8, Curiosities: 12,
  Mythology: 14, Astrology: 8, "Pop Culture": 10, Entertainment: 10, Music: 12,
  Arts: 14, Film: 12, Fashion: 10,
};

const READING_BONUS_PER_MIN = 4; // bonus XP per full minute spent

export function xpForArticle(topic: string, secondsSpent: number): number {
  // Match by exact topic or first matching keyword (case-insensitive)
  const t = (topic || "").trim();
  let base = TOPIC_WEIGHTS[t];
  if (!base) {
    const lower = t.toLowerCase();
    const found = Object.keys(TOPIC_WEIGHTS).find((k) => lower.includes(k.toLowerCase()));
    base = found ? TOPIC_WEIGHTS[found] : 14; // sensible default
  }
  const minutes = Math.floor(secondsSpent / 60);
  return base + minutes * READING_BONUS_PER_MIN;
}

// Each level needs 100 XP more than the previous (triangular curve)
// Level n requires: 100 * n*(n-1)/2 cumulative XP
export function levelFromXp(xp: number): { level: number; title: string; nextLevelXp: number; intoLevelXp: number; xpThisLevel: number } {
  let level = 1;
  while (cumulativeXpForLevel(level + 1) <= xp) level++;
  const start = cumulativeXpForLevel(level);
  const next = cumulativeXpForLevel(level + 1);
  return {
    level,
    title: titleForLevel(level),
    nextLevelXp: next,
    intoLevelXp: xp - start,
    xpThisLevel: next - start,
  };
}

function cumulativeXpForLevel(level: number): number {
  if (level <= 1) return 0;
  return 100 * ((level - 1) * level) / 2;
}

export function titleForLevel(level: number): string {
  if (level >= 100) return "Living Library";
  if (level >= 75) return "Sage of Curiosity";
  if (level >= 50) return "Master Scholar";
  if (level >= 40) return "Wandering Polymath";
  if (level >= 30) return "Worldly Thinker";
  if (level >= 25) return "World Analyst";
  if (level >= 20) return "Topic Tracker";
  if (level >= 15) return "Page Wanderer";
  if (level >= 10) return "Knowledge Explorer";
  if (level >= 7) return "Bookshelf Climber";
  if (level >= 4) return "Bright Reader";
  if (level >= 2) return "Eager Mind";
  return "Curious Mind";
}
