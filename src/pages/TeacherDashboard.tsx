import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { QRCodeCanvas } from "qrcode.react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppHeader } from "@/components/AppHeader";
import { DEFAULT_CHALLENGES, DEFAULT_STORY, genJoinCode } from "@/lib/gameDefaults";
import { Plus, LogOut, ExternalLink, Trophy, QrCode, X, Trash2, PlayCircle, ChevronDown, ChevronUp, Users } from "lucide-react";
import { toast } from "sonner";

export default function TeacherDashboard() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [sessions, setSessions] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [qrSession, setQrSession] = useState<any>(null); // session whose QR popover is open
  const [deleteTarget, setDeleteTarget] = useState<any>(null); // session pending deletion
  const [deleteInput, setDeleteInput] = useState(""); // typed confirmation text
  const [deleting, setDeleting] = useState(false);
  const [startingSession, setStartingSession] = useState<string | null>(null); // sessionId being started
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set()); // groupIds with expanded members

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
    await supabase.from("sessions").update({ allow_late_registration: !(s.allow_late_registration ?? false) }).eq("id", s.id);
    load();
  }

  function openDeleteDialog(s: any) {
    setDeleteTarget(s);
    setDeleteInput("");
  }

  function closeDeleteDialog() {
    setDeleteTarget(null);
    setDeleteInput("");
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const expected = `delete-${deleteTarget.join_code}`;
    if (deleteInput.trim() !== expected) {
      toast.error(`Type exactly: ${expected}`);
      return;
    }
    setDeleting(true);
    try {
      // Delete related data first (challenges, groups), then the session
      await supabase.from("challenges").delete().eq("session_id", deleteTarget.id);
      await supabase.from("groups").delete().eq("session_id", deleteTarget.id);
      const { error } = await supabase.from("sessions").delete().eq("id", deleteTarget.id);
      if (error) throw error;
      toast.success(`Session ${deleteTarget.join_code} deleted.`);
      closeDeleteDialog();
      load();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to delete session.");
    } finally {
      setDeleting(false);
    }
  }

  async function startSession(sessionId: string) {
    setStartingSession(sessionId);
    const { error } = await supabase
      .from("sessions")
      .update({ started_at: new Date().toISOString() })
      .eq("id", sessionId);
    if (error) toast.error(error.message);
    else {
      toast.success("Session started! All groups are now live.");
      load();
    }
    setStartingSession(null);
  }

  function toggleGroupExpand(groupId: string) {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      next.has(groupId) ? next.delete(groupId) : next.add(groupId);
      return next;
    });
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
                  <button
                    onClick={() => openDeleteDialog(s)}
                    className="flex items-center gap-1.5 rounded-xl border-2 border-destructive/40 px-3 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/10 transition"
                    title="Delete session"
                  >
                    <Trash2 className="w-4 h-4" />
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
                  checked={s.allow_late_registration ?? false}
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

                {/* Start Session button */}
                {!(s.started_at ?? null) ? (
                  <button
                    onClick={() => startSession(s.id)}
                    disabled={startingSession === s.id || sGroups.length === 0}
                    className="w-full btn-primary flex items-center justify-center gap-2 py-3 text-sm disabled:opacity-50"
                  >
                    <PlayCircle className="w-4 h-4" />
                    {startingSession === s.id
                      ? "Starting..."
                      : sGroups.length === 0
                      ? "Waiting for groups to register..."
                      : `Start Session · ${sGroups.length} group${sGroups.length !== 1 ? "s" : ""} ready`}
                  </button>
                ) : (
                  <div className="flex items-center justify-center gap-2 rounded-xl bg-success/10 border border-success/30 py-2.5 text-sm font-semibold text-success">
                    <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                    Session Live
                  </div>
                )}

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
                    const membersExpanded = expandedGroups.has(g.id);
                    const memberList: string[] = g.members || [];
                    return (
                      <div
                        key={g.id}
                        className={`rounded-xl border overflow-hidden ${
                          g.finish_time
                            ? "border-success bg-success/5"
                            : "border-border bg-background/40"
                        }`}
                      >
                        <div className="p-3 space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-semibold flex items-center gap-1.5">
                              {g.group_name}
                              {g.finish_time && (
                                <Trophy className="w-4 h-4 text-success" />
                              )}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">
                                L{g.current_level}/5 · {Math.floor(elapsed / 60)}m {elapsed % 60}s
                              </span>
                              {memberList.length > 0 && (
                                <button
                                  onClick={() => toggleGroupExpand(g.id)}
                                  className="flex items-center gap-1 text-[10px] font-semibold text-action"
                                >
                                  <Users className="w-3 h-3" />
                                  {memberList.length}
                                  {membersExpanded
                                    ? <ChevronUp className="w-3 h-3" />
                                    : <ChevronDown className="w-3 h-3" />}
                                </button>
                              )}
                            </div>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-action transition-all"
                              style={{ width: `${Math.min(100, pct)}%` }}
                            />
                          </div>
                        </div>
                        {membersExpanded && memberList.length > 0 && (
                          <div className="border-t border-border bg-muted/30 px-3 py-2 flex flex-wrap gap-1.5">
                            {memberList.map((name, i) => (
                              <span
                                key={i}
                                className="text-[11px] bg-background border border-border rounded-full px-2.5 py-0.5 text-foreground/80 font-medium"
                              >
                                {name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
          onClick={(e) => { if (e.target === e.currentTarget) closeDeleteDialog(); }}
        >
          <div className="bg-background rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4 animate-pop-in">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 text-destructive">
                <Trash2 className="w-5 h-5 flex-shrink-0" />
                <h2 className="text-lg font-bold">Delete Session</h2>
              </div>
              <button onClick={closeDeleteDialog} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-muted-foreground leading-relaxed">
              This will permanently delete session{" "}
              <span className="font-bold text-primary">{deleteTarget.join_code}</span> and all
              associated groups and challenges. This action cannot be undone.
            </p>

            <div className="bg-muted/50 rounded-xl px-3 py-2 text-xs text-muted-foreground">
              To confirm, type:{" "}
              <span className="font-mono font-bold text-destructive select-all">
                delete-{deleteTarget.join_code}
              </span>
            </div>

            <input
              type="text"
              value={deleteInput}
              onChange={(e) => setDeleteInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") confirmDelete(); }}
              placeholder={`delete-${deleteTarget.join_code}`}
              className="w-full rounded-xl border-2 border-border bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:border-destructive transition"
              autoFocus
            />

            <div className="flex gap-2">
              <button
                onClick={closeDeleteDialog}
                className="flex-1 rounded-xl border-2 border-border py-2 text-sm font-semibold text-muted-foreground hover:bg-muted/50 transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting || deleteInput.trim() !== `delete-${deleteTarget.join_code}`}
                className="flex-1 rounded-xl bg-destructive py-2 text-sm font-semibold text-white hover:opacity-90 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {deleting ? "Deleting…" : "Delete Session"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}