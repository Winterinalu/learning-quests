import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { QRCodeCanvas } from "qrcode.react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppHeader } from "@/components/AppHeader";
import { DEFAULT_CHALLENGES, DEFAULT_STORY, genJoinCode } from "@/lib/gameDefaults";
import { Plus, LogOut, ExternalLink, Trophy, QrCode, X } from "lucide-react";
import { toast } from "sonner";

export default function TeacherDashboard() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [sessions, setSessions] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [qrSession, setQrSession] = useState<any>(null); // session whose QR popover is open

  useEffect(() => {
    if (!loading && !user) nav("/teacher/login");
  }, [user, loading, nav]);

  async function load() {
    if (!user) return;
    const { data } = await supabase
      .from("sessions").select("*").eq("teacher_id", user.id).order("created_at", { ascending: false });
    setSessions(data || []);
    const sids = (data || []).map((s) => s.id);
    if (sids.length) {
      const { data: g } = await supabase.from("groups").select("*").in("session_id", sids);
      setGroups(g || []);
    } else setGroups([]);
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel("dashboard-groups")
      .on("postgres_changes", { event: "*", schema: "public", table: "groups" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line
  }, [user, sessions.length]);

  async function createSession() {
    if (!user) return;
    const code = genJoinCode();
    const { data: s, error } = await supabase
      .from("sessions").insert({ teacher_id: user.id, join_code: code }).select().single();
    if (error) return toast.error(error.message);
    const rows = DEFAULT_CHALLENGES.map((c) => ({
      ...c, session_id: s.id, story_text: c.level === 1 ? DEFAULT_STORY : null,
    }));
    await supabase.from("challenges").insert(rows);
    toast.success(`Session created: ${code}`);
    load();
  }

  async function toggleLate(s: any) {
    await supabase.from("sessions").update({ allow_late_registration: !s.allow_late_registration }).eq("id", s.id);
    load();
  }

  async function logout() {
    await supabase.auth.signOut();
    nav("/teacher/login");
  }

  if (loading) return <div className="app-shell"><AppHeader /></div>;

  return (
    <div className="app-shell pb-16">
      <AppHeader subtitle="Teacher Dashboard" />
      <div className="px-4 space-y-4">
        <div className="flex gap-2">
          <button
            onClick={createSession}
            className="btn-primary flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" /> New Session
          </button>
          <button
            onClick={logout}
            className="px-4 rounded-full border-2 border-border text-muted-foreground"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        {sessions.length === 0 && (
          <div className="app-card text-center text-muted-foreground">
            No sessions yet. Create one to begin.
          </div>
        )}

        {sessions.map((s) => {
          const sGroups = groups.filter((g) => g.session_id === s.id);
          const completed = sGroups.filter((g) => g.finish_time).length;
          const joinUrl = `${window.location.origin}/join/${s.id}`;

          return (
            <div key={s.id} className="app-card space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-xs text-muted-foreground">Join code</div>
                  <div className="text-2xl font-bold tracking-wider text-primary">{s.join_code}</div>
                </div>
                <div className="flex items-center gap-2">
                  {/* Quick QR button */}
                  <button
                    onClick={() => setQrSession(qrSession?.id === s.id ? null : s)}
                    className="flex items-center gap-1.5 rounded-xl border-2 border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted/50 transition"
                  >
                    <QrCode className="w-4 h-4" /> QR
                  </button>
                  <Link
                    to={`/teacher/session/${s.id}`}
                    className="text-action font-semibold flex items-center gap-1 text-sm"
                  >
                    Manage <ExternalLink className="w-4 h-4" />
                  </Link>
                </div>
              </div>

              {/* Inline QR popover */}
              {qrSession?.id === s.id && (
                <div className="bg-muted/40 rounded-2xl p-4 space-y-3 animate-pop-in">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-primary">Student Join QR</span>
                    <button onClick={() => setQrSession(null)} className="text-muted-foreground">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="bg-white p-2 rounded-xl shadow-sm flex-shrink-0">
                      <QRCodeCanvas value={joinUrl} size={110} includeMargin />
                    </div>
                    <div className="space-y-1.5 min-w-0">
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Students scan this QR <strong>or</strong> go to the app and type the code:
                      </p>
                      <div className="text-xl font-bold tracking-[0.2em] text-primary">{s.join_code}</div>
                      <a
                        href={joinUrl}
                        className="text-[10px] text-action underline break-all block"
                      >
                        {joinUrl}
                      </a>
                    </div>
                  </div>
                  <Link
                    to={`/teacher/session/${s.id}`}
                    className="text-xs text-action font-semibold"
                  >
                    Full session page (download / print QR) →
                  </Link>
                </div>
              )}

              <label className="flex items-center justify-between text-sm bg-muted/50 rounded-xl px-3 py-2">
                <span className="font-medium">Allow late registration</span>
                <input
                  type="checkbox"
                  checked={s.allow_late_registration}
                  onChange={() => toggleLate(s)}
                  className="w-5 h-5 accent-[hsl(var(--action))]"
                />
              </label>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-primary">Live Leaderboard</span>
                  <span className="text-xs text-muted-foreground">
                    {sGroups.length} groups · {completed} done
                  </span>
                </div>
                {sGroups.length === 0 && (
                  <p className="text-xs text-muted-foreground">Waiting for groups to register...</p>
                )}
                {sGroups
                  .sort(
                    (a, b) =>
                      b.current_level - a.current_level ||
                      (a.created_at < b.created_at ? -1 : 1)
                  )
                  .map((g) => {
                    const pct = ((g.current_level - 1) / 5) * 100 + (g.finish_time ? 20 : 0);
                    const elapsed = g.start_time
                      ? Math.round(
                          ((g.finish_time ? +new Date(g.finish_time) : Date.now()) -
                            +new Date(g.start_time)) /
                            1000
                        )
                      : 0;
                    return (
                      <div
                        key={g.id}
                        className={`rounded-xl p-3 border ${
                          g.finish_time
                            ? "border-success bg-success/5"
                            : "border-border bg-background/40"
                        }`}
                      >
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-semibold">
                            {g.group_name}{" "}
                            {g.finish_time && (
                              <Trophy className="inline w-4 h-4 text-success ml-1" />
                            )}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            L{g.current_level}/5 · {Math.floor(elapsed / 60)}m {elapsed % 60}s
                          </span>
                        </div>
                        <div className="h-2 bg-muted rounded-full mt-2 overflow-hidden">
                          <div
                            className="h-full bg-action transition-all"
                            style={{ width: `${Math.min(100, pct)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}