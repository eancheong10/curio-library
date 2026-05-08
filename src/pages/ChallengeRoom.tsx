import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { LibraryShell } from "@/components/LibraryShell";
import { PaperCard } from "@/components/PaperCard";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Swords, Trophy, Timer, X, Check, Hourglass } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useReader } from "@/hooks/useReader";
import { ReadingText } from "@/components/Dictionary";
import { toast } from "sonner";

type Status = "invited" | "accepted" | "declined" | "reading" | "quizzing" | "finished" | "cancelled";

interface QuizQuestion {
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
}

interface Challenge {
  id: string;
  challenger_id: string;
  opponent_id: string;
  status: Status;
  question_count: number;
  topic: string | null;
  article_title: string | null;
  article_body: string | null;
  article_summary: string | null;
  questions: QuizQuestion[] | null;
  reading_started_at: string | null;
  challenger_done_reading: boolean;
  opponent_done_reading: boolean;
  challenger_score: number;
  opponent_score: number;
  challenger_finished: boolean;
  opponent_finished: boolean;
}

const XP_PER_CORRECT = 10;
const XP_WIN_BONUS = 40;

function shuffleChallengeQuestions(qs: QuizQuestion[]): QuizQuestion[] {
  return qs.map((q) => {
    const idxs = q.options.map((_, i) => i);
    for (let i = idxs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [idxs[i], idxs[j]] = [idxs[j], idxs[i]];
    }
    return { ...q, options: idxs.map((i) => q.options[i]), correct_index: idxs.indexOf(q.correct_index) };
  });
}

// Reading window: ~250 words/min, clamp 90s..360s
function readingSeconds(body: string) {
  const words = (body || "").split(/\s+/).filter(Boolean).length;
  const sec = Math.round((words / 250) * 60);
  return Math.max(90, Math.min(360, sec));
}

function readingTimedOut(startedAt: string | null, body: string | null) {
  if (!startedAt || !body) return false;
  const elapsed = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
  return elapsed >= readingSeconds(body);
}

const ChallengeRoom = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { awardRead } = useReader();

  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [profiles, setProfiles] = useState<Map<string, string>>(new Map());
  const [readingLeft, setReadingLeft] = useState<number>(0);
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [localScore, setLocalScore] = useState(0);
  const [endingReading, setEndingReading] = useState(false);
  const xpAwardedRef = useRef(false);
  const winBonusRef = useRef(false);

  const ensureQuestions = async (target: Challenge) => {
    if (target.questions?.length) return target.questions;
    if (!target.article_body || !target.article_title || !target.topic) {
      throw new Error("Challenge article is not ready yet.");
    }
    const { data: quiz, error: qErr } = await supabase.functions.invoke("generate-quiz", {
      body: {
        topic: target.topic,
        title: target.article_title,
        body: target.article_body,
        count: target.question_count,
      },
    });
    if (qErr) throw qErr;
    if (!quiz?.questions?.length) throw new Error("Couldn't make quiz questions.");
    const shuffled = shuffleChallengeQuestions(quiz.questions);
    await supabase
      .from("quiz_challenges")
      .update({ questions: shuffled as any })
      .eq("id", target.id);
    return shuffled as QuizQuestion[];
  };

  useEffect(() => { if (!authLoading && !user) navigate("/auth"); }, [user, authLoading, navigate]);

  // Initial fetch + realtime subscription
  useEffect(() => {
    if (!id || !user) return;
    let cancelled = false;

    const fetchOnce = async () => {
      const { data, error } = await supabase.from("quiz_challenges").select("*").eq("id", id).maybeSingle();
      if (error) { toast.error(error.message); return; }
      if (cancelled) return;
      if (!data) { toast.error("Challenge not found."); navigate("/quiz"); return; }
      setChallenge(data as unknown as Challenge);
      // Load names
      const ids = [data.challenger_id, data.opponent_id];
      const { data: profs } = await supabase.from("profiles").select("id, display_name").in("id", ids);
      const m = new Map<string, string>();
      (profs || []).forEach((p: any) => m.set(p.id, p.display_name || "Reader"));
      setProfiles(m);
    };
    fetchOnce();

    const channel = supabase
      .channel(`challenge_${id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "quiz_challenges", filter: `id=eq.${id}` },
        (payload) => setChallenge(payload.new as unknown as Challenge)
      )
      .subscribe();

    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [id, user, navigate]);

  // Reading countdown — shared server start time, so timeout works even if one reader never presses the button.
  useEffect(() => {
    if (!challenge || challenge.status !== "reading" || !challenge.article_body) return;
    const total = readingSeconds(challenge.article_body);
    const startedAt = challenge.reading_started_at ? new Date(challenge.reading_started_at).getTime() : Date.now();
    const tick = () => {
      const elapsed = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
      setReadingLeft(Math.max(0, total - elapsed));
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [challenge?.status, challenge?.article_body, challenge?.reading_started_at]);

  // Countdown shown to both players once both confirm + questions are ready.
  const [quizCountdown, setQuizCountdown] = useState<number | null>(null);
  const transitioningRef = useRef(false);

  // Step 1: when both done reading, ensure questions exist (either side may generate)
  useEffect(() => {
    if (!challenge || !user) return;
    if (challenge.status !== "reading") return;
    const timeExpired = readingTimedOut(challenge.reading_started_at, challenge.article_body);
    const bothDone = challenge.challenger_done_reading && challenge.opponent_done_reading;
    if (!bothDone && !timeExpired) return;
    if (challenge.questions?.length) return;
    if (transitioningRef.current) return;
    transitioningRef.current = true;
    (async () => {
      try {
        await ensureQuestions(challenge);
      } catch (e) {
        console.error(e);
        transitioningRef.current = false;
        toast.error("Couldn't load questions — retrying…");
      }
    })();
    // eslint-disable-next-line
  }, [challenge?.challenger_done_reading, challenge?.opponent_done_reading, challenge?.questions, challenge?.status, readingLeft]);

  // Step 2: once both done + questions ready, run a 5s countdown then flip to quizzing.
  // IMPORTANT: do NOT include `readingLeft` (or anything that ticks every second) in deps —
  // the effect would re-run each second and clear the interval before it ever fires.
  const flipRef = useRef(false);
  useEffect(() => {
    if (!challenge) return;
    const bothDone = challenge.challenger_done_reading && challenge.opponent_done_reading;
    const timeExpired = readingTimedOut(challenge.reading_started_at, challenge.article_body);
    const hasQuestions = (challenge.questions?.length ?? 0) > 0;
    const ready =
      challenge.status === "reading" &&
      (bothDone || timeExpired) &&
      hasQuestions;
    if (!ready) { setQuizCountdown(null); return; }

    setQuizCountdown((c) => (c === null ? (bothDone ? 3 : 1) : c));
    const t = setInterval(() => {
      setQuizCountdown((c) => {
        if (c === null) return null;
        if (c <= 1) {
          clearInterval(t);
          if (!flipRef.current) {
            flipRef.current = true;
            supabase.from("quiz_challenges").update({ status: "quizzing" }).eq("id", challenge.id);
          }
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [challenge?.status, challenge?.challenger_done_reading, challenge?.opponent_done_reading, challenge?.questions?.length, challenge?.id, challenge?.reading_started_at]);


  // Fallback poll if realtime drops a frame
  useEffect(() => {
    if (!challenge || !id) return;
    if (!["invited", "accepted", "reading", "quizzing"].includes(challenge.status)) return;
    const t = setInterval(async () => {
      const { data } = await supabase.from("quiz_challenges").select("*").eq("id", id).maybeSingle();
      if (data) setChallenge(data as unknown as Challenge);
    }, 3000);
    return () => clearInterval(t);
  }, [challenge?.status, id]);

  // When both finished → mark finished + award win bonus (challenger writes once)
  useEffect(() => {
    if (!challenge || !user) return;
    if (
      challenge.status === "quizzing" &&
      challenge.challenger_finished &&
      challenge.opponent_finished &&
      user.id === challenge.challenger_id
    ) {
      supabase.from("quiz_challenges").update({ status: "finished" }).eq("id", challenge.id);
    }
    // eslint-disable-next-line
  }, [challenge?.challenger_finished, challenge?.opponent_finished, challenge?.status]);

  // Award win bonus locally (each winner only)
  useEffect(() => {
    if (!challenge || !user) return;
    if (challenge.status !== "finished" || winBonusRef.current) return;
    const youAreChallenger = user.id === challenge.challenger_id;
    const myScore = youAreChallenger ? challenge.challenger_score : challenge.opponent_score;
    const oppScore = youAreChallenger ? challenge.opponent_score : challenge.challenger_score;
    if (myScore > oppScore) {
      winBonusRef.current = true;
      grantXp(XP_WIN_BONUS, challenge.topic || "Challenge", `Won challenge: ${challenge.article_title || ""}`);
      toast.success(`You won! +${XP_WIN_BONUS} bonus XP`);
    }
  }, [challenge?.status]);

  const grantXp = async (amount: number, topic: string, ttl: string) => {
    if (!user) return;
    const { data: profile } = await supabase.from("profiles").select("xp").eq("id", user.id).maybeSingle();
    const newXp = (profile?.xp || 0) + amount;
    await supabase.from("profiles").update({ xp: newXp }).eq("id", user.id);
    await supabase.from("xp_events").insert({
      user_id: user.id, topic, xp: amount,
      reason: "quiz_challenge", article_title: ttl, seconds_spent: 0,
    });
  };

  // Opponent accepts → challenger generates article + questions
  const acceptInvite = async () => {
    if (!challenge || !user) return;
    await supabase.from("quiz_challenges").update({ status: "accepted" }).eq("id", challenge.id);
  };
  const declineInvite = async () => {
    if (!challenge) return;
    await supabase.from("quiz_challenges").update({ status: "declined" }).eq("id", challenge.id);
    toast.message("Challenge declined.");
    navigate("/quiz");
  };
  const cancel = async () => {
    if (!challenge) return;
    await supabase.from("quiz_challenges").update({ status: "cancelled" }).eq("id", challenge.id);
    navigate("/quiz");
  };

  // Challenger: spin the shared article as soon as accepted so the room loads quickly.
  useEffect(() => {
    if (!challenge || !user) return;
    if (challenge.status !== "accepted") return;
    if (user.id !== challenge.challenger_id) return;
    if (challenge.article_body) return; // already prepared
    (async () => {
      try {
        const { data: spin, error: spinErr } = await supabase.functions.invoke("spin-article", { body: { mode: "safe" } });
        if (spinErr) throw spinErr;
        const a = spin?.article;
        if (!a) throw new Error("No article");
        await supabase.from("quiz_challenges").update({
          topic: a.topic, article_title: a.title, article_body: a.body, article_summary: a.summary || "",
          reading_started_at: new Date().toISOString(),
          status: "reading",
        } as any).eq("id", challenge.id);
      } catch (e) {
        console.error(e);
        toast.error("Couldn't prepare the challenge — try again.");
      }
    })();
    // eslint-disable-next-line
  }, [challenge?.status]);

  // Repair older challenge rows that entered reading before the shared timer existed.
  useEffect(() => {
    if (!challenge || challenge.status !== "reading" || challenge.reading_started_at || !challenge.article_body) return;
    supabase
      .from("quiz_challenges")
      .update({ reading_started_at: new Date().toISOString() } as any)
      .eq("id", challenge.id)
      .is("reading_started_at", null);
  }, [challenge?.status, challenge?.reading_started_at, challenge?.article_body, challenge?.id]);

  // Generate questions in the background — either reader can do it once reading starts.
  // Whoever wins the write race is fine; the other side will see the questions via realtime.
  useEffect(() => {
    if (!challenge || !user) return;
    if (challenge.status !== "reading" || !challenge.article_body || challenge.questions?.length) return;
    // Only the challenger generates initially to avoid double-spend; opponent
    // is a fallback if questions still aren't there 20s in or after reading is done.
    const isChallenger = user.id === challenge.challenger_id;
    const bothDone = challenge.challenger_done_reading && challenge.opponent_done_reading;
    const timeExpired = readingTimedOut(challenge.reading_started_at, challenge.article_body);
    if (!isChallenger && !bothDone && !timeExpired) return;
    (async () => {
      try {
        const { data: quiz, error: qErr } = await supabase.functions.invoke("generate-quiz", {
          body: { topic: challenge.topic, title: challenge.article_title, body: challenge.article_body, count: challenge.question_count },
        });
        if (qErr) throw qErr;
        if (!quiz?.questions?.length) throw new Error("No questions");
        await supabase.from("quiz_challenges").update({ questions: shuffleChallengeQuestions(quiz.questions) as any }).eq("id", challenge.id);
      } catch (e) {
        console.error(e);
        toast.error("Questions are taking too long — please keep the room open.");
      }
    })();
    // eslint-disable-next-line
  }, [challenge?.status, challenge?.article_body, challenge?.questions, challenge?.challenger_done_reading, challenge?.opponent_done_reading, readingLeft]);

  const markDoneReading = async () => {
    if (!challenge || !user) return;
    setEndingReading(true);
    const isChallenger = user.id === challenge.challenger_id;
    const patch = isChallenger ? { challenger_done_reading: true } : { opponent_done_reading: true };
    try {
      const updatedChallenge = { ...challenge, ...patch };
      setChallenge(updatedChallenge);
      const { error: doneError } = await supabase.from("quiz_challenges").update(patch).eq("id", challenge.id);
      if (doneError) throw doneError;

      if (!xpAwardedRef.current && challenge.article_body && challenge.topic && challenge.article_title) {
        xpAwardedRef.current = true;
        awardRead({
          topic: challenge.topic,
          title: challenge.article_title,
          secondsSpent: Math.max(30, readingSeconds(challenge.article_body) - readingLeft),
          summary: challenge.article_summary,
          body: challenge.article_body,
          sourceKind: "spin",
        });
      }

      const questions = await ensureQuestions(updatedChallenge);
      const { error: quizError } = await supabase
        .from("quiz_challenges")
        .update({ ...patch, questions: questions as any, status: "quizzing" })
        .eq("id", challenge.id);
      if (quizError) throw quizError;
      setChallenge({ ...updatedChallenge, questions, status: "quizzing" });
      setQuizCountdown(null);
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Couldn't start the quiz.");
      setEndingReading(false);
    }
  };

  const handleAnswer = async (choice: number) => {
    if (picked !== null || !challenge?.questions) return;
    setPicked(choice);
    const correct = choice === challenge.questions[idx].correct_index;
    if (correct) {
      const newLocal = localScore + 1;
      setLocalScore(newLocal);
      grantXp(XP_PER_CORRECT, challenge.topic || "Challenge", challenge.article_title || "");
      // sync to row
      const isChallenger = user!.id === challenge.challenger_id;
      const patch = isChallenger ? { challenger_score: newLocal } : { opponent_score: newLocal };
      await supabase.from("quiz_challenges").update(patch).eq("id", challenge.id);
    }
  };

  const next = async () => {
    if (!challenge?.questions) return;
    if (idx + 1 >= challenge.questions.length) {
      // mark finished
      const isChallenger = user!.id === challenge.challenger_id;
      const patch = isChallenger ? { challenger_finished: true } : { opponent_finished: true };
      await supabase.from("quiz_challenges").update(patch).eq("id", challenge.id);
      return;
    }
    setIdx((i) => i + 1);
    setPicked(null);
  };

  // ---------- RENDER ----------

  if (authLoading || !user || !challenge) {
    return (
      <LibraryShell>
        <div className="container py-20 text-center font-display text-xl text-muted-foreground italic animate-pulse">
          Setting up the challenge…
        </div>
      </LibraryShell>
    );
  }

  const isChallenger = user.id === challenge.challenger_id;
  const meName = profiles.get(user.id) || "You";
  const oppId = isChallenger ? challenge.opponent_id : challenge.challenger_id;
  const oppName = profiles.get(oppId) || "Opponent";
  const myScore = isChallenger ? challenge.challenger_score : challenge.opponent_score;
  const oppScore = isChallenger ? challenge.opponent_score : challenge.challenger_score;
  const myDoneReading = isChallenger ? challenge.challenger_done_reading : challenge.opponent_done_reading;
  const oppDoneReading = isChallenger ? challenge.opponent_done_reading : challenge.challenger_done_reading;
  const myFinished = isChallenger ? challenge.challenger_finished : challenge.opponent_finished;
  const readingExpired = challenge.status === "reading" && readingTimedOut(challenge.reading_started_at, challenge.article_body);
  const q = challenge.questions?.[idx];

  const Header = (
    <div className="mb-6">
      <Button variant="ghost" size="sm" asChild className="mb-4 -ml-3 text-muted-foreground">
        <Link to="/quiz"><ArrowLeft className="h-4 w-4 mr-1" /> Back to Quiz</Link>
      </Button>
      <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground flex items-center gap-2">
        <Swords className="h-8 w-8 text-gold" /> Friend Challenge
      </h1>
      <p className="text-sm text-muted-foreground italic">
        {meName} vs {oppName} · {challenge.question_count} questions
      </p>
    </div>
  );

  return (
    <LibraryShell hideFooter={challenge.status === "reading" || challenge.status === "quizzing"}>
      <section className="container py-8 max-w-3xl">
        {Header}

        {/* INVITED — opponent must accept */}
        {challenge.status === "invited" && (
          <PaperCard className="p-8 text-center">
            {isChallenger ? (
              <>
                <Hourglass className="h-10 w-10 mx-auto text-gold mb-3 animate-pulse" />
                <h2 className="font-display text-2xl font-bold text-foreground">Waiting for {oppName}…</h2>
                <p className="text-muted-foreground italic mt-2">
                  We've sent your invitation. Keep this page open — the battle starts the moment they accept.
                </p>
                <Button onClick={cancel} variant="outline" className="mt-6 border-wood/40">Cancel challenge</Button>
              </>
            ) : (
              <>
                <Swords className="h-10 w-10 mx-auto text-gold mb-3" />
                <h2 className="font-display text-2xl font-bold text-foreground">{oppName} challenges you!</h2>
                <p className="text-muted-foreground italic mt-2">
                  {challenge.question_count} questions on a surprise topic. Ready?
                </p>
                <div className="mt-6 flex gap-2 justify-center">
                  <Button onClick={acceptInvite} className="bg-leather-green text-paper">
                    <Check className="h-4 w-4 mr-1" /> Accept
                  </Button>
                  <Button onClick={declineInvite} variant="outline" className="border-wood/40">
                    <X className="h-4 w-4 mr-1" /> Decline
                  </Button>
                </div>
              </>
            )}
          </PaperCard>
        )}

        {/* ACCEPTED — challenger generating */}
        {challenge.status === "accepted" && (
          <PaperCard className="p-10 text-center">
            <div className="font-display text-xl text-muted-foreground italic animate-pulse">
              Spinning a topic & writing questions for both of you…
            </div>
          </PaperCard>
        )}

        {/* READING */}
        {challenge.status === "reading" && challenge.article_body && (
          <PaperCard className="p-6 md:p-8">
            <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
              <span className="text-xs font-semibold uppercase tracking-widest text-leather-blue">
                Topic · {challenge.topic}
              </span>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Timer className="h-3 w-3" /> {Math.floor(readingLeft / 60)}:{String(readingLeft % 60).padStart(2, "0")}
              </span>
            </div>
            <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-2">{challenge.article_title}</h2>
            {challenge.article_summary && (
              <p className="font-display italic text-muted-foreground border-l-4 border-gold pl-4 mb-5">
                {challenge.article_summary}
              </p>
            )}
            <div className="prose prose-lg max-w-none font-body text-foreground leading-relaxed">
              {challenge.article_body.split("\n").filter(Boolean).map((p, i) => (
                <p key={i} className="mb-4"><ReadingText text={p} /></p>
              ))}
            </div>

            <div className="mt-8 sticky bottom-2 z-10 flex items-center justify-between gap-3 flex-wrap p-3 rounded-lg bg-card border-2 border-wood/30 shadow-lg">
              <div className="text-sm text-foreground">
                <span className="font-semibold">{meName}:</span> {myDoneReading ? "✓ ready" : "reading…"}
                {" · "}
                <span className="font-semibold">{oppName}:</span> {oppDoneReading ? "✓ ready" : "reading…"}
              </div>
              {readingExpired && !challenge.questions?.length ? (
                <span className="text-sm text-muted-foreground italic">Time is up — preparing quiz…</span>
              ) : readingExpired && quizCountdown !== null ? (
                <span className="text-sm font-bold text-leather-red">Quiz starting…</span>
              ) : !myDoneReading ? (
                <Button onClick={markDoneReading} disabled={endingReading} className="bg-gradient-gold text-ink font-bold">
                  {endingReading ? "Starting quiz…" : "End reading session"}
                </Button>
              ) : challenge.challenger_done_reading && challenge.opponent_done_reading && !challenge.questions?.length ? (
                <span className="text-sm text-muted-foreground italic">Preparing questions…</span>
              ) : challenge.challenger_done_reading && challenge.opponent_done_reading && quizCountdown !== null ? (
                <span className="text-sm font-bold text-leather-red">Quiz starts in {quizCountdown}…</span>
              ) : (
                <span className="text-sm text-muted-foreground italic">Waiting for {oppName}…</span>
              )}
            </div>
          </PaperCard>
        )}

        {/* QUIZZING */}
        {challenge.status === "quizzing" && q && !myFinished && (
          <PaperCard className="p-6 md:p-8">
            <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
              <span className="text-xs font-semibold uppercase tracking-widest text-leather-blue">
                {challenge.topic} · Q {idx + 1} of {challenge.questions!.length}
              </span>
              <div className="text-xs text-muted-foreground">
                {meName}: {myScore} · {oppName}: {oppScore}
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
                    {idx + 1 >= (challenge.questions?.length || 0) ? "Submit answers" : "Next →"}
                  </Button>
                </div>
              </div>
            )}
          </PaperCard>
        )}

        {challenge.status === "quizzing" && myFinished && (
          <PaperCard className="p-10 text-center">
            <Hourglass className="h-10 w-10 mx-auto text-gold mb-3 animate-pulse" />
            <h2 className="font-display text-2xl font-bold text-foreground">Done! Waiting for {oppName}…</h2>
            <p className="text-muted-foreground italic mt-2">
              Your score: {myScore}. We'll show the final result when {oppName} finishes.
            </p>
          </PaperCard>
        )}

        {/* FINISHED */}
        {challenge.status === "finished" && (
          <PaperCard className="p-8 text-center">
            <Trophy className="h-12 w-12 mx-auto text-gold mb-3" />
            <h2 className="font-display text-3xl font-bold text-foreground mb-1">
              {myScore > oppScore ? "Victory!" : myScore === oppScore ? "It's a tie!" : `${oppName} wins this round`}
            </h2>
            <p className="text-muted-foreground italic">on “{challenge.topic}”</p>
            <div className="mt-5 grid grid-cols-2 gap-4 max-w-md mx-auto">
              <div className="rounded-lg bg-paper/60 border border-wood/30 p-3">
                <div className="text-xs uppercase tracking-widest text-muted-foreground">{meName}</div>
                <div className="font-display text-3xl font-bold text-foreground">{myScore}</div>
              </div>
              <div className="rounded-lg bg-paper/60 border border-wood/30 p-3">
                <div className="text-xs uppercase tracking-widest text-muted-foreground">{oppName}</div>
                <div className="font-display text-3xl font-bold text-foreground">{oppScore}</div>
              </div>
            </div>
            {myScore > oppScore && (
              <p className="text-sm text-leather-green font-semibold mt-3">+{XP_WIN_BONUS} bonus XP for the win 🏆</p>
            )}
            <div className="mt-6 flex gap-2 justify-center flex-wrap">
              <Button asChild variant="outline" className="border-wood/40">
                <Link to="/quiz">New quiz</Link>
              </Button>
              <Button asChild className="bg-gradient-gold text-ink font-bold">
                <Link to="/profile">View Reader's Card →</Link>
              </Button>
            </div>
          </PaperCard>
        )}

        {(challenge.status === "declined" || challenge.status === "cancelled") && (
          <PaperCard className="p-8 text-center">
            <p className="font-display text-xl text-muted-foreground italic">
              This challenge was {challenge.status}.
            </p>
            <Button asChild className="mt-4 bg-gradient-gold text-ink"><Link to="/quiz">Back to Quiz</Link></Button>
          </PaperCard>
        )}
      </section>
    </LibraryShell>
  );
};

export default ChallengeRoom;
