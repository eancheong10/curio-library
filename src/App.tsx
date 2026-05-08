import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect } from "react";
import Index from "./pages/Index.tsx";
import Auth from "./pages/Auth.tsx";
import NewsHub from "./pages/NewsHub.tsx";
import NewsArticlePage from "./pages/NewsArticlePage.tsx";
import Spin from "./pages/Spin.tsx";
import Favourites from "./pages/Favourites.tsx";
import Daily from "./pages/Daily.tsx";
import Profile from "./pages/Profile.tsx";
import Search from "./pages/Search.tsx";
import Craft from "./pages/Craft.tsx";
import Onboarding from "./pages/Onboarding.tsx";
import HistoryPage from "./pages/HistoryPage.tsx";
import Read from "./pages/Read.tsx";
import Quiz from "./pages/Quiz.tsx";
import ChallengeRoom from "./pages/ChallengeRoom.tsx";
import NotFound from "./pages/NotFound.tsx";
import ScrollToTop from "./components/ScrollToTop.tsx";
import { useSettings } from "@/hooks/useSettings";

const queryClient = new QueryClient();

// Mount settings hook so theme/font apply globally as soon as the app loads.
const SettingsBoot = () => {
  useSettings();
  return null;
};

const App = () => {
  // Apply persisted theme immediately (before sign-in) to avoid flash
  useEffect(() => {
    try {
      const raw = localStorage.getItem("curio_settings");
      if (raw) {
        const s = JSON.parse(raw);
        // dynamic import to avoid SSR concerns
        import("@/lib/themes").then(({ applyTheme, applyFontSize }) => {
          if (s.theme) applyTheme(s.theme);
          if (s.font_size) applyFontSize(s.font_size);
        });
      }
    } catch { /* ignore */ }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ScrollToTop />
          <SettingsBoot />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/news" element={<NewsHub />} />
            <Route path="/news/:id" element={<NewsArticlePage />} />
            <Route path="/spin" element={<Spin />} />
            <Route path="/favourites" element={<Favourites />} />
            <Route path="/daily" element={<Daily />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/search" element={<Search />} />
            <Route path="/craft" element={<Craft />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/read" element={<Read />} />
            <Route path="/quiz" element={<Quiz />} />
            <Route path="/quiz/challenge/:id" element={<ChallengeRoom />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
