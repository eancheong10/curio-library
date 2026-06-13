import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { LibraryShell } from "@/components/LibraryShell";
import { PaperCard } from "@/components/PaperCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft, Brain, BookOpen, Swords, Sparkles, X, Trophy, Timer,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useReader } from "@/hooks/useReader";
import { toast } from "sonner";
import { ReadingText } from "@/components/Dictionary";
import { SpunArticle } from "@/lib/types";

interface QuizQuestion {
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
}

type Mode = "menu" | "past" | "new" | "friend";
type Phase = "setup" | "loading" | "reading" | "playing" | "done";

function shuffleQuestions(qs: QuizQuestion[]): QuizQuestion[] {
  return qs.map((q) => {
    const idxs = q.options.map((_, i) => i);
    for (let i = idxs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [idxs[i], idxs[j]] = [idxs[j], idxs[i]];
    }
    const newOptions = idxs.map((i) => q.options[i]);
    const newCorrect = idxs.indexOf(q.correct_index);
    return { ...q, options: newOptions, correct_index: newCorrect };
  });
}

const PER_QUESTION_SECONDS = 25; // not too short, not too long
const XP_PER_CORRECT = 10;
const XP_FRIEND_WIN_BONUS = 30;

const Quiz = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { awardRead } = useReader();
  const [params] = useSearchParams();

  const [mode, setMode] = useState<Mode>("menu");
  const [phase, setPhase] = useState<Phase>("setup");
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [topic, setTopic] = useState<string>("");
  const [title, setTitle] = useState<string>("");
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [xpEarned, setXpEarned] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(PER_QUESTION_SECONDS);
  const [readArticle, setReadArticle] = useState<SpunArticle | null>(null);
  const [readingSeconds, setReadingSeconds] = useState(0);

  // setup state
  const [pastTopics, setPastTopics] = useState<string[]>([]);
  const [chosenPast, setChosenPast] = useState<string>("");
  const [newTopic, setNewTopic] = useState<string>("");
  // Friend challenge setup
  const [friends, setFriends] = useState<{ id: string; name: string }[]>([]);
  const [chosenFriend, setChosenFriend] = useState<string>("");
  const [questionCount, setQuestionCount] = useState<5 | 10>(5);
  const [pendingInvites, setPendingInvites] = useState<{ id: string; from: string }[]>([]);
  const [creating, setCreating] = useState(false);

  useEffect(() => { if (!authLoading && !user) navigate("/auth"); }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("read_history").select("topic").eq("user_id", user.id)
        .order("created_at", { ascending: false }).limit(50);
      const uniq = Array.from(new Set((data || []).map((r) => r.topic).filter(Boolean)));
      setPastTopics(uniq);
      if (uniq.length) setChosenPast(uniq[0]);
    })();
  }, [user]);

  // Load accepted friends (for challenge picker) and pending invites (incoming)
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: fr } = await supabase.from("friendships").select("*")
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
        .eq("status", "accepted");
      const friendIds = (fr || []).map((f: any) => f.requester_id === user.id ? f.addressee_id : f.requester_id);
      if (friendIds.length) {
        const { data: profs } = await supabase.rpc("get_public_profiles", { _ids: friendIds });
        const list = ((profs as { id: string; display_name: string | null }[]) || []).map((p) => ({ id: p.id, name: p.display_name || "Reader" }));
        setFriends(list);
        if (list.length && !chosenFriend) setChosenFriend(list[0].id);
      }

      const { data: invites } = await supabase.from("quiz_challenges").select("id, challenger_id")
        .eq("opponent_id", user.id).eq("status", "invited");
      if (invites?.length) {
        const ids = invites.map((i: any) => i.challenger_id);
        const { data: ip } = await supabase.rpc("get_public_profiles", { _ids: ids });
        const nameMap = new Map<string, string>(((ip as { id: string; display_name: string | null }[]) || []).map((p) => [p.id, p.display_name || "Reader"]));
        setPendingInvites(invites.map((i: any) => ({ id: i.id, from: nameMap.get(i.challenger_id) || "Reader" })));
      }
    })();
    // eslint-disable-next-line
  }, [user]);

  // Pre-select mode if ?mode= present
  useEffect(() => {
    const m = params.get("mode");
    if (m === "past" || m === "new" || m === "friend") setMode(m as Mode);
  }, [params]);

  // Per-question countdown
  useEffect(() => {
    if (phase !== "playing" || picked !== null) return;
    setSecondsLeft(PER_QUESTION_SECONDS);
    const i = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(i);
          // auto-advance as wrong
          handleAnswer(-1);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(i);
    // eslint-disable-next-line
  }, [phase, idx]);

  useEffect(() => {
    if (phase !== "reading") return;
    const i = window.setInterval(() => setReadingSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(i);
  }, [phase]);

  const startQuiz = async () => {
    setPhase("loading");
    try {
      let payloadTopic = "";
      let payloadTitle = "";
      let payloadBody = "";

      if (mode === "past") {
        if (!chosenPast) { toast.error("Pick a topic from your history first."); setPhase("setup"); return; }
        payloadTopic = chosenPast;
        // pull most recent article body for that topic
        const { data } = await supabase
          .from("read_history").select("title, body")
          .eq("user_id", user!.id).eq("topic", chosenPast)
          .order("created_at", { ascending: false }).limit(1).maybeSingle();
        if (data) { payloadTitle = data.title || ""; payloadBody = data.body || ""; }
      } else if (mode === "new") {
        // First spin a fresh article and let the reader read it before any questions appear.
        const t = newTopic.trim() || undefined;
        const { data: spin, error: spinErr } = await supabase.functions.invoke("spin-article", {
          body: t ? { topic: t } : { mode: "safe" },
        });
        if (spinErr) throw spinErr;
        const a = spin?.article;
        if (!a) throw new Error("Couldn't fetch an article.");
        payloadTopic = a.topic;
        payloadTitle = a.title;
        payloadBody = a.body;
        setReadArticle(a);
        setTopic(payloadTopic);
        setTitle(payloadTitle);
        setReadingSeconds(0);
        setPhase("reading");
        return;
      }
      // friend mode is handled separately via createChallenge() — never reaches here
      if (mode === "friend") { setPhase("setup"); return; }

      const { data: quiz, error: qErr } = await supabase.functions.invoke("generate-quiz", {
        body: { topic: payloadTopic, title: payloadTitle, body: payloadBody, count: 5 },
      });
      if (qErr) throw qErr;
      if (!quiz?.questions?.length) throw new Error("Couldn't make quiz questions.");
      setQuestions(shuffleQuestions(quiz.questions));
      setTopic(payloadTopic);
      setTitle(payloadTitle);
      setIdx(0);
      setCorrectCount(0);
      setXpEarned(0);
      setPicked(null);
      setPhase("playing");
    } catch (e) {
      console.error(e);
      const msg = e instanceof Error ? e.message : "Something went wrong";
      toast.error(msg);
      setPhase("setup");
    }
  };

  const finishReadingSession = async () => {
    if (!readArticle) return;
    setPhase("loading");
    try {
      await awardRead({
        topic: readArticle.topic,
        title: readArticle.title,
        secondsSpent: Math.max(30, readingSeconds),
        summary: readArticle.summary,
        body: readArticle.body,
        emoji: readArticle.emoji,
        sourceKind: "spin",
      });
      const { data: quiz, error: qErr } = await supabase.functions.invoke("generate-quiz", {
        body: { topic: readArticle.topic, title: readArticle.title, body: readArticle.body, count: 5 },
      });
      if (qErr) throw qErr;
      if (!quiz?.questions?.length) throw new Error("Couldn't make quiz questions.");
      setQuestions(shuffleQuestions(quiz.questions));
      setIdx(0);
      setCorrectCount(0);
      setXpEarned(0);
      setPicked(null);
      setPhase("playing");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't start the questions.");
      setPhase("reading");
    }
  };

  const handleAnswer = (choice: number) => {
    if (picked !== null) return;
    setPicked(choice);
    const correct = choice === questions[idx].correct_index;
    if (correct) {
      setCorrectCount((c) => c + 1);
      setXpEarned((x) => x + XP_PER_CORRECT);
      // award xp immediately (per-question), so quitting still keeps it
      grantXp(XP_PER_CORRECT, topic, title);
      toast.success(`+${XP_PER_CORRECT} XP`);
    }
  };

  const grantXp = async (amount: number, t: string, ttl: string) => {
    if (!user) return;
    const { data: profile } = await supabase
      .from("profiles").select("xp").eq("id", user.id).maybeSingle();
    const newXp = (profile?.xp || 0) + amount;
    await supabase.from("profiles").update({ xp: newXp }).eq("id", user.id);
    await supabase.from("xp_events").insert({
      user_id: user.id, topic: t || "Quiz", xp: amount,
      reason: "quiz", article_title: ttl || "Quiz round", seconds_spent: 0,
    });
  };

  const next = () => {
    if (idx + 1 >= questions.length) {
      finish();
      return;
    }
    setIdx((i) => i + 1);
    setPicked(null);
  };

  const finish = async () => {
    setPhase("done");
  };

  // Friend challenge — create row + navigate to room
  const createChallenge = async () => {
    if (!user || !chosenFriend) { toast.error("Pick a friend first."); return; }
    setCreating(true);
    try {
      const { data, error } = await supabase.from("quiz_challenges").insert({
        challenger_id: user.id,
        opponent_id: chosenFriend,
        question_count: questionCount,
        status: "invited",
      }).select().single();
      if (error) throw error;
      navigate(`/quiz/challenge/${data.id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't send invite");
    } finally { setCreating(false); }
  };

  const quit = () => {
    if (!confirm("Quit the quiz? You'll keep XP for questions you answered correctly.")) return;
    setPhase("done");
  };

  // -------- RENDER --------

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="font-display text-xl text-muted-foreground italic animate-pulse">Loading the quiz hall…</div>
      </div>
    );
  }

  const q = questions[idx];

  return (
    <LibraryShell hideFooter={phase === "reading" || phase === "playing"}>
      <section className="container py-8 max-w-3xl">
        <Button variant="ghost" size="sm" asChild className="mb-4 -ml-3 text-muted-foreground">
          <Link to="/"><ArrowLeft className="h-4 w-4 mr-1" /> Back to shelves</Link>
        </Button>

        <div className="mb-6">
          <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground flex items-center gap-3">
            <Brain className="h-9 w-9 text-gold" /> Curio Quiz
          </h1>
          <p className="text-muted-foreground italic mt-1">
            Earn XP for every correct answer. Quit anytime — your XP sticks.
          </p>
        </div>

        {/* MODE PICKER */}
        {phase === "setup" && (
          <div className="space-y-4">
            <div className="grid md:grid-cols-3 gap-3">
              <ModeCard
                active={mode === "past"}
                onClick={() => setMode("past")}
                icon={<BookOpen className="h-6 w-6" />}
                title="Past topics"
                desc="Test yourself on something you've already read."
              />
              <ModeCard
                active={mode === "new"}
                onClick={() => setMode("new")}
                icon={<Sparkles className="h-6 w-6" />}
                title="Read & quiz"
                desc="Spin a fresh article, then take a quiz on it."
              />
              <ModeCard
                active={mode === "friend"}
                onClick={() => setMode("friend")}
                icon={<Swords className="h-6 w-6" />}
                title="Challenge a friend"
                desc="Both read the same article. Highest score wins bonus XP."
              />
            </div>

            <PaperCard className="p-6">
              {mode === "menu" && (
                <p className="text-muted-foreground italic">Pick a mode above to begin.</p>
              )}

              {mode === "past" && (
                <div className="space-y-3">
                  <label className="font-semibold text-foreground">Pick a topic from your history</label>
                  {pastTopics.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">
                      You haven't read anything yet. Try a spin or news article first.
                    </p>
                  ) : (
                    <Select value={chosenPast} onValueChange={setChosenPast}>
                      <SelectTrigger className="bg-card border-wood/40"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {pastTopics.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}

              {mode === "new" && (
                <div className="space-y-3">
                  <label className="font-semibold text-foreground">Topic (optional — leave blank for a surprise)</label>
                  <Input
                    value={newTopic}
                    onChange={(e) => setNewTopic(e.target.value)}
                    placeholder="e.g. Octopus Intelligence"
                    className="bg-paper/50 border-wood/30"
                  />
                </div>
              )}

              {mode === "friend" && (
                <div className="space-y-4">
                  {pendingInvites.length > 0 && (
                    <div className="rounded-lg border-2 border-gold/50 bg-leather-mustard/10 p-3">
                      <div className="text-xs uppercase tracking-widest font-bold text-leather-mustard mb-2">
                        Incoming challenges
                      </div>
                      <div className="space-y-2">
                        {pendingInvites.map((inv) => (
                          <div key={inv.id} className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-foreground">{inv.from} wants to battle</span>
                            <Button size="sm" onClick={() => navigate(`/quiz/challenge/${inv.id}`)} className="bg-leather-green text-paper">
                              Open →
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {friends.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">
                      You need at least one friend to challenge. Add friends from your{" "}
                      <Link to="/profile" className="text-primary underline">Reader's Card</Link>.
                    </p>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <label className="font-semibold text-foreground">Pick a friend</label>
                        <Select value={chosenFriend} onValueChange={setChosenFriend}>
                          <SelectTrigger className="bg-card border-wood/40"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {friends.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <label className="font-semibold text-foreground">How many questions?</label>
                        <div className="flex gap-2">
                          {[5, 10].map((n) => (
                            <button
                              key={n}
                              type="button"
                              onClick={() => setQuestionCount(n as 5 | 10)}
                              className={`px-4 py-2 rounded-lg border-2 font-bold ${
                                questionCount === n
                                  ? "border-gold bg-gradient-gold text-ink"
                                  : "border-wood/40 bg-card text-foreground hover:bg-paper"
                              }`}
                            >
                              {n} questions
                            </button>
                          ))}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground italic">
                        Both of you must be online. Your friend will get an invite — once they accept,
                        the wheel spins and you both read the same article.
                      </p>
                    </>
                  )}
                </div>
              )}

              {mode !== "menu" && mode !== "friend" && (
                <div className="mt-5">
                  <Button
                    onClick={startQuiz}
                    disabled={mode === "past" && pastTopics.length === 0}
                    className="bg-gradient-gold text-ink font-bold"
                  >
                    Start quiz →
                  </Button>
                </div>
              )}

              {mode === "friend" && friends.length > 0 && (
                <div className="mt-5">
                  <Button
                    onClick={createChallenge}
                    disabled={creating || !chosenFriend}
                    className="bg-gradient-gold text-ink font-bold"
                  >
                    <Swords className="h-4 w-4 mr-1" /> Send challenge →
                  </Button>
                </div>
              )}
            </PaperCard>
          </div>
        )}

        {phase === "loading" && (
          <PaperCard className="p-10 text-center">
            <div className="font-display text-xl text-muted-foreground italic animate-pulse">
              {mode === "new" ? "Preparing the questions…" : "Cooking up your questions…"}
            </div>
          </PaperCard>
        )}

        {phase === "reading" && readArticle && (
          <PaperCard className="p-6 md:p-8 animate-book-open">
            <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
              <div>
                <div className="text-xs font-semibold uppercase tracking-widest text-leather-green mb-1">
                  {readArticle.topic}
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <BookOpen className="h-3 w-3" /> Read first, quiz after · {Math.floor(readingSeconds / 60)}:{String(readingSeconds % 60).padStart(2, "0")}
                </div>
              </div>
              <Button onClick={finishReadingSession} className="bg-gradient-gold text-ink font-bold">
                Finish reading session →
              </Button>
            </div>
            <div className="text-6xl mb-4">{readArticle.emoji}</div>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground leading-tight mb-3">
              {readArticle.title}
            </h2>
            <p className="font-display italic text-lg text-muted-foreground mb-7 border-l-4 border-gold pl-4">
              {readArticle.summary}
            </p>
            <div className="prose prose-lg max-w-none font-body text-foreground leading-relaxed">
              {readArticle.body.split("\n").filter(Boolean).map((para, i) => (
                <p key={i} className="mb-4"><ReadingText text={para} /></p>
              ))}
            </div>
            <div className="mt-8 sticky bottom-2 z-10 flex justify-end p-3 rounded-lg bg-card border-2 border-wood/30 shadow-lg">
              <Button onClick={finishReadingSession} className="bg-gradient-gold text-ink font-bold">
                Finish reading session →
              </Button>
            </div>
          </PaperCard>
        )}

        {phase === "playing" && q && (
          <PaperCard className="p-6 md:p-8">
            <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
              <span className="text-xs font-semibold uppercase tracking-widest text-leather-blue">
                {topic} · Question {idx + 1} of {questions.length}
              </span>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Timer className="h-3 w-3" /> {secondsLeft}s
                </span>
                <Button size="sm" variant="ghost" onClick={quit} className="text-muted-foreground hover:text-destructive">
                  <X className="h-4 w-4 mr-1" /> Quit
                </Button>
              </div>
            </div>

            <h2 className="font-display text-2xl font-bold text-foreground mb-5">{q.question}</h2>

            <div className="grid gap-2">
              {q.options.map((opt, i) => {
                const isPicked = picked === i;
                const isCorrect = i === q.correct_index;
                const showState = picked !== null;
                let cls = "bg-card hover:bg-paper border-wood/40";
                if (showState && isCorrect) cls = "bg-leather-green/20 border-leather-green text-foreground";
                else if (showState && isPicked && !isCorrect) cls = "bg-destructive/15 border-destructive text-foreground";
                return (
                  <button
                    key={i}
                    onClick={() => handleAnswer(i)}
                    disabled={picked !== null}
                    className={`text-left px-4 py-3 rounded-lg border-2 transition-colors ${cls}`}
                  >
                    <span className="font-bold mr-2">{String.fromCharCode(65 + i)}.</span>{opt}
                  </button>
                );
              })}
            </div>

            {picked !== null && (
              <div className="mt-5 p-4 rounded-lg bg-paper/60 border border-wood/30">
                <p className="text-sm text-foreground"><span className="font-bold">Why:</span> {q.explanation}</p>
                <div className="mt-3 flex justify-end">
                  <Button onClick={next} className="bg-gradient-gold text-ink font-bold">
                    {idx + 1 >= questions.length ? "See results" : "Next question →"}
                  </Button>
                </div>
              </div>
            )}

            <div className="mt-4 text-xs text-muted-foreground italic">
              Score so far: {correctCount} correct · {xpEarned} XP
            </div>
          </PaperCard>
        )}

        {phase === "done" && (
          <PaperCard className="p-8 text-center">
            <Trophy className="h-12 w-12 mx-auto text-gold mb-3" />
            <h2 className="font-display text-3xl font-bold text-foreground mb-2">Quiz complete</h2>
            <p className="text-muted-foreground italic">on “{topic}”</p>
            <div className="mt-5 grid grid-cols-2 gap-4 max-w-md mx-auto">
              <Stat label="Correct" value={`${correctCount} / ${questions.length}`} />
              <Stat label="XP earned" value={`+${xpEarned}`} />
            </div>
            <div className="mt-6 flex gap-2 justify-center flex-wrap">
              <Button onClick={() => { setPhase("setup"); setMode("menu"); }} variant="outline" className="border-wood/40">
                New quiz
              </Button>
              <Button asChild className="bg-gradient-gold text-ink font-bold">
                <Link to="/profile">View Reader's Card →</Link>
              </Button>
            </div>
          </PaperCard>
        )}
      </section>
    </LibraryShell>
  );
};

const ModeCard = ({ active, onClick, icon, title, desc }: {
  active: boolean; onClick: () => void; icon: React.ReactNode; title: string; desc: string;
}) => (
  <button
    onClick={onClick}
    className={`text-left p-4 rounded-xl border-2 transition-all ${
      active ? "border-gold bg-gradient-to-br from-leather-mustard/20 to-transparent shadow-md" : "border-wood/30 bg-card hover:border-wood/60"
    }`}
  >
    <div className="flex items-center gap-2 text-gold mb-1">{icon}<span className="font-display font-bold text-foreground">{title}</span></div>
    <p className="text-xs text-muted-foreground">{desc}</p>
  </button>
);

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-lg bg-paper/60 border border-wood/30 p-3">
    <div className="text-xs uppercase tracking-widest text-muted-foreground">{label}</div>
    <div className="font-display text-2xl font-bold text-foreground">{value}</div>
  </div>
);

export default Quiz;
