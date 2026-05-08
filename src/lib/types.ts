export interface NewsArticle {
  id: string;
  title: string;
  summary: string;
  body: string;
  topic: string;
  source_name: string;
  source_url: string;
  emoji: string;
  published_at?: string;
}

export interface SpunArticle {
  title: string;
  summary: string;
  body: string;
  topic: string;
  emoji: string;
  related_topics: string[];
}

export interface FavouriteArticle {
  id: string;
  title: string;
  summary: string;
  body: string;
  topic: string;
  source_url: string | null;
  source_name: string | null;
  created_at: string;
  bookshelf_id?: string | null;
}

export interface FavouriteTopic {
  id: string;
  topic: string;
  created_at: string;
}

export type SpinMode = "safe" | "risk" | "jackpot";

export type SpinCategory =
  | "any" | "history" | "science" | "philosophy" | "politics"
  | "arts" | "games" | "mysteries" | "nature" | "tech" | "words";

export interface DailyDrop {
  drop_date: string;
  title: string;
  fact: string;
  body: string;
  emoji: string;
  topic: string;
}

export type ThemeId =
  | "library" | "cutesy" | "retro" | "matrix"
  | "pastel" | "futuristic" | "noir" | "garden";

export type FontSize = "small" | "medium" | "large" | "xlarge";

export interface UserSettings {
  user_id: string;
  theme: ThemeId;
  font_size: FontSize;
  country: string;
  onboarded: boolean;
}

export interface ReadHistoryItem {
  id: string;
  topic: string;
  title: string;
  summary: string | null;
  body: string | null;
  source_kind: "spin" | "news" | "daily";
  source_url: string | null;
  source_name: string | null;
  emoji: string | null;
  created_at: string;
}
