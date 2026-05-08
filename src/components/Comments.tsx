import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Trash2, MessageSquare, Reply, UserPlus } from "lucide-react";
import { toast } from "sonner";

interface CommentRow {
  id: string;
  user_id: string;
  display_name: string | null;
  body: string;
  created_at: string;
  parent_id: string | null;
}

// Tiny client-side cuss filter. Server-side schema also limits length.
// Keep the list short + match word boundaries; replace with asterisks.
const PROFANITY = [
  "fuck", "fucking", "shit", "bitch", "bastard", "asshole", "arsehole",
  "dick", "piss", "cunt", "slut", "whore", "nigger", "nigga", "faggot",
  "retard", "wanker",
];
const PROFANITY_RE = new RegExp(`\\b(${PROFANITY.join("|")})\\b`, "gi");
function cleanText(s: string): string {
  return s.replace(PROFANITY_RE, (m) => m[0] + "*".repeat(Math.max(2, m.length - 1)));
}

export const Comments = ({ articleKey }: { articleKey: string }) => {
  const { user } = useAuth();
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<CommentRow | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from("article_comments")
      .select("id, user_id, display_name, body, created_at, parent_id")
      .eq("article_key", articleKey)
      .order("created_at", { ascending: true });
    setComments((data || []) as CommentRow[]);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [articleKey]);

  const post = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !text.trim()) return;
    setBusy(true);
    try {
      const { data: prof } = await supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle();
      const cleaned = cleanText(text.trim()).slice(0, 1000);
      const { error } = await supabase.from("article_comments").insert({
        user_id: user.id,
        article_key: articleKey,
        display_name: prof?.display_name || user.email?.split("@")[0] || "Reader",
        body: cleaned,
        parent_id: replyTo?.id ?? null,
      });
      if (error) throw error;
      setText("");
      setReplyTo(null);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't post");
    } finally { setBusy(false); }
  };

  const remove = async (id: string) => {
    await supabase.from("article_comments").delete().eq("id", id);
    setComments((c) => c.filter((x) => x.id !== id));
  };

  // Send a friend request to whoever wrote a comment.
  const addFriend = async (other: CommentRow) => {
    if (!user || other.user_id === user.id) return;
    try {
      const { data: existing } = await supabase.from("friendships").select("id, status")
        .or(`and(requester_id.eq.${user.id},addressee_id.eq.${other.user_id}),and(requester_id.eq.${other.user_id},addressee_id.eq.${user.id})`)
        .maybeSingle();
      if (existing) {
        toast.info(existing.status === "accepted" ? "You're already friends." : "A request is already pending.");
        return;
      }
      const { error } = await supabase.from("friendships").insert({
        requester_id: user.id, addressee_id: other.user_id, status: "pending",
      });
      if (error) throw error;
      toast.success(`Friend request sent to ${other.display_name || "Reader"}.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't send request");
    }
  };

  // Group: top-level comments + their replies
  const grouped = useMemo(() => {
    const top = comments.filter((c) => !c.parent_id);
    const repliesOf = (id: string) => comments.filter((c) => c.parent_id === id);
    return top.map((t) => ({ comment: t, replies: repliesOf(t.id) }));
  }, [comments]);

  const Row = ({ c, isReply = false }: { c: CommentRow; isReply?: boolean }) => (
    <div className={`p-3 rounded bg-card border border-wood/20 ${isReply ? "ml-6" : ""}`}>
      <div className="flex items-center justify-between mb-1 flex-wrap gap-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-primary">{c.display_name || "Reader"}</span>
          {user && c.user_id !== user.id && (
            <button
              onClick={() => addFriend(c)}
              className="text-[11px] inline-flex items-center gap-1 text-leather-blue hover:underline"
              title="Send friend request"
            >
              <UserPlus className="h-3 w-3" /> Add friend
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-muted-foreground italic">{new Date(c.created_at).toLocaleString()}</span>
          {user && !isReply && (
            <button onClick={() => setReplyTo(c)} className="text-[11px] inline-flex items-center gap-1 text-muted-foreground hover:text-primary">
              <Reply className="h-3 w-3" /> Reply
            </button>
          )}
          {user?.id === c.user_id && (
            <button onClick={() => remove(c.id)} className="text-muted-foreground hover:text-destructive">
              <Trash2 className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>
      <p className="text-sm text-foreground whitespace-pre-wrap">{c.body}</p>
    </div>
  );

  return (
    <div className="mt-8 pt-6 border-t border-wood/20">
      <h3 className="font-display text-xl font-bold text-foreground mb-3 flex items-center gap-2">
        <MessageSquare className="h-5 w-5" /> Reader notes ({comments.length})
      </h3>

      {!user ? (
        <p className="text-sm text-muted-foreground italic">
          <Link to="/auth" className="text-primary underline">Sign in</Link> to leave a note.
        </p>
      ) : (
        <form onSubmit={post} className="flex flex-col gap-2 mb-4">
          {replyTo && (
            <div className="text-xs text-muted-foreground bg-muted/60 px-2 py-1 rounded flex items-center justify-between">
              <span>Replying to <strong className="text-primary">{replyTo.display_name || "Reader"}</strong></span>
              <button type="button" onClick={() => setReplyTo(null)} className="text-muted-foreground hover:text-destructive">cancel</button>
            </div>
          )}
          <div className="flex gap-2">
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={replyTo ? "Write a reply…" : "Share a thought…"}
              maxLength={1000}
              className="bg-paper/50 border-wood/30"
            />
            <Button type="submit" size="sm" disabled={busy || !text.trim()} className="bg-gradient-gold text-ink">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {grouped.length === 0 && (
          <p className="text-sm text-muted-foreground italic">Be the first to leave a note.</p>
        )}
        {grouped.map(({ comment, replies }) => (
          <div key={comment.id} className="space-y-2">
            <Row c={comment} />
            {replies.map((r) => <Row key={r.id} c={r} isReply />)}
          </div>
        ))}
      </div>
    </div>
  );
};
