import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserPlus, Check, X, Users } from "lucide-react";
import { toast } from "sonner";

interface Friend {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: string;
  created_at: string;
}

export const FriendsPanel = () => {
  const { user } = useAuth();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [profiles, setProfiles] = useState<Map<string, string>>(new Map());
  const [myCode, setMyCode] = useState<string>("");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = async () => {
    if (!user) return;
    const [{ data: me }, { data }] = await Promise.all([
      supabase.from("profiles").select("short_code").eq("id", user.id).maybeSingle(),
      supabase.from("friendships").select("*")
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
        .order("created_at", { ascending: false }),
    ]);
    if (me?.short_code) setMyCode(me.short_code);
    const list = (data || []) as Friend[];
    setFriends(list);
    const ids = new Set<string>();
    list.forEach((f) => { ids.add(f.requester_id); ids.add(f.addressee_id); });
    if (ids.size) {
      const { data: profs } = await supabase.rpc("get_public_profiles", { _ids: [...ids] });
      const map = new Map<string, string>();
      ((profs as { id: string; display_name: string | null }[]) || []).forEach((p) => map.set(p.id, p.display_name || "Reader"));
      setProfiles(map);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user]);

  // Friend by display name OR by short reader code (12 chars) OR full UUID.
  const sendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !query.trim()) return;
    setBusy(true);
    try {
      const handle = query.trim();
      const isUuid = /^[0-9a-fA-F-]{36}$/.test(handle);
      const isShortCode = /^[A-Z2-9]{12}$/i.test(handle);
      let target: { id: string; display_name: string | null } | null = null;
      if (isUuid) {
        const { data } = await supabase.rpc("get_public_profiles", { _ids: [handle] });
        target = ((data as { id: string; display_name: string | null }[]) || [])[0] ?? null;
      } else if (isShortCode) {
        const { data } = await supabase.rpc("find_public_profile_by_code", { _code: handle });
        target = ((data as { id: string; display_name: string | null }[]) || [])[0] ?? null;
      } else {
        const { data: targets } = await supabase.rpc("search_public_profiles", { _q: handle });
        const list = (targets as { id: string; display_name: string | null }[]) || [];
        target = (list.find((t) => (t.display_name || "").toLowerCase() === handle.toLowerCase()) as typeof target)
          || (list[0] as typeof target) || null;
      }
      if (!target) { toast.error("No reader found by that name or code."); return; }
      if (target.id === user.id) { toast.error("That's you 😊"); return; }

      // Block double-requests in either direction
      const { data: existing } = await supabase.from("friendships").select("id, status")
        .or(`and(requester_id.eq.${user.id},addressee_id.eq.${target.id}),and(requester_id.eq.${target.id},addressee_id.eq.${user.id})`)
        .maybeSingle();
      if (existing) { toast.info(existing.status === "accepted" ? "You're already friends." : "A request is already pending."); return; }

      const { error } = await supabase.from("friendships").insert({
        requester_id: user.id, addressee_id: target.id, status: "pending",
      });
      if (error) throw error;
      toast.success(`Request sent to ${target.display_name || "Reader"}.`);
      setQuery("");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't send request");
    } finally { setBusy(false); }
  };

  const copyId = async () => {
    if (!myCode) return;
    try {
      await navigator.clipboard.writeText(myCode);
      setCopied(true);
      toast.success("Reader code copied — share it with a friend.");
      setTimeout(() => setCopied(false), 1800);
    } catch { toast.error("Couldn't copy."); }
  };

  const accept = async (f: Friend) => {
    await supabase.from("friendships").update({ status: "accepted", updated_at: new Date().toISOString() }).eq("id", f.id);
    load();
  };
  const remove = async (f: Friend) => {
    await supabase.from("friendships").delete().eq("id", f.id);
    load();
  };

  if (!user) return null;

  const incoming = friends.filter((f) => f.addressee_id === user.id && f.status === "pending");
  const outgoing = friends.filter((f) => f.requester_id === user.id && f.status === "pending");
  const accepted = friends.filter((f) => f.status === "accepted");

  return (
    <div>
      <h2 className="font-display text-2xl font-bold text-foreground mb-3 flex items-center gap-2">
        <Users className="h-5 w-5 text-gold" /> Reader friends
      </h2>

      <div className="mb-3 text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
        <span>Your reader code:</span>
        <code className="bg-card border border-wood/30 rounded px-2 py-0.5 text-sm font-mono tracking-widest text-foreground">{myCode || "…"}</code>
        <button onClick={copyId} className="text-primary hover:underline font-semibold">{copied ? "Copied ✓" : "Copy"}</button>
      </div>

      <form onSubmit={sendRequest} className="flex gap-2 mb-4">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Friend's name (partial OK) or 12-char code…"
          className="bg-paper/50 border-wood/30"
        />
        <Button type="submit" size="sm" disabled={busy || !query.trim()} className="bg-gradient-gold text-ink">
          <UserPlus className="h-4 w-4 mr-1" /> Send
        </Button>
      </form>

      {incoming.length > 0 && (
        <div className="mb-4">
          <div className="text-xs uppercase tracking-widest font-bold text-leather-mustard mb-2">Incoming</div>
          {incoming.map((f) => (
            <div key={f.id} className="flex items-center justify-between p-2 rounded border border-wood/20 mb-1 bg-card">
              <span className="font-semibold text-foreground">{profiles.get(f.requester_id) || "Reader"}</span>
              <div className="flex gap-1">
                <Button size="sm" onClick={() => accept(f)} className="bg-leather-green text-paper h-7"><Check className="h-3 w-3" /></Button>
                <Button size="sm" variant="outline" onClick={() => remove(f)} className="h-7 border-wood/40"><X className="h-3 w-3" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {accepted.length > 0 && (
        <div className="mb-4">
          <div className="text-xs uppercase tracking-widest font-bold text-leather-green mb-2">Friends ({accepted.length})</div>
          <div className="flex flex-wrap gap-2">
            {accepted.map((f) => {
              const otherId = f.requester_id === user.id ? f.addressee_id : f.requester_id;
              return (
                <span key={f.id} className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-card border border-wood/30 text-sm text-foreground">
                  {profiles.get(otherId) || "Reader"}
                  <button onClick={() => remove(f)} className="text-muted-foreground hover:text-destructive ml-1"><X className="h-3 w-3" /></button>
                </span>
              );
            })}
          </div>
        </div>
      )}

      {outgoing.length > 0 && (
        <div>
          <div className="text-xs uppercase tracking-widest font-bold text-muted-foreground mb-2">Pending</div>
          {outgoing.map((f) => (
            <div key={f.id} className="text-sm text-muted-foreground italic mb-1">
              Sent to {profiles.get(f.addressee_id) || "Reader"} — waiting…
            </div>
          ))}
        </div>
      )}

      {accepted.length === 0 && incoming.length === 0 && outgoing.length === 0 && (
        <p className="text-sm text-muted-foreground italic">No friends yet — invite someone with their reader code.</p>
      )}
    </div>
  );
};
