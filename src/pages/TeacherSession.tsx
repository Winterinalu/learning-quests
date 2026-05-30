import { useEffect, useRef, useState, useCallback } from "react";
import { Link, useParams } from "react-router-dom";
import { QRCodeCanvas } from "qrcode.react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppHeader } from "@/components/AppHeader";
import { ArrowLeft, ChevronDown, ChevronUp, Download, Plus, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function TeacherSession() {
  const { sessionId } = useParams();
  const { user, loading } = useAuth();
  const [session, setSession] = useState<any>(null);
  const [challenges, setChallenges] = useState<any[]>([]);
  const [joinQrExpanded, setJoinQrExpanded] = useState(true);
  const joinQrRef = useRef<HTMLDivElement>(null);
  // null = QR overview, 1–5 = compartment editor
  const [activeCompartment, setActiveCompartment] = useState<number | null>(null);
  // How many compartments the teacher has opened so far
  const [unlockedUpTo, setUnlockedUpTo] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!sessionId) return;
    (async () => {
      const { data: s } = await supabase.from("sessions").select("*").eq("id", sessionId).maybeSingle();
      setSession(s);
      const { data: c } = await supabase
        .from("challenges").select("*").eq("session_id", sessionId).order("level");
      setChallenges(c || []);
    })();
  }, [sessionId]);

  // Auto-save a single challenge silently on every field change
  const autosave = useCallback(async (c: any) => {
    await supabase.from("challenges").update({
      story_text: c.story_text,
      question_text: c.question_text,
      correct_answer_code: c.correct_answer_code,
      compartment_code: c.compartment_code,
      reveal_message: c.reveal_message,
      keywords: c.keywords,
      options: c.options,
    }).eq("id", c.id);
  }, []);

  function updateField(id: string, patch: object) {
    setChallenges((arr) => {
      const updated = arr.map((x) => x.id === id ? { ...x, ...patch } : x);
      const changed = updated.find((x) => x.id === id);
      if (changed) autosave(changed);
      return updated;
    });
  }

  async function submitSession() {
    // Save all unlocked compartments then go back to dashboard
    setSubmitting(true);
    const toSave = challenges.filter((c) => c.level <= unlockedUpTo);
    await Promise.all(toSave.map(autosave));
    setSubmitting(false);
    toast.success("Session submitted!");
    setActiveCompartment(null);
  }

  function downloadQr(canvasId: string, filename: string) {
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement | null;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = filename;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  if (loading) return <div className="app-shell"><AppHeader /></div>;
  if (!user) return (
    <div className="app-shell">
      <AppHeader />
      <div className="px-4"><Link to="/teacher/login" className="btn-primary inline-block">Sign in</Link></div>
    </div>
  );
  if (!session) return <div className="app-shell"><AppHeader /><div className="px-4 text-center">Loading...</div></div>;

  const joinUrl = `${window.location.origin}/join/${session.id}`;

  return (
    <div className="app-shell pb-16">
      <AppHeader subtitle={`Session ${session.join_code}`} />
      <div className="px-4 space-y-4">
        <Link to="/teacher/dashboard" className="text-sm text-action font-semibold flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Back to dashboard
        </Link>

        {/* ── Student Join QR ── */}
        <div className="app-card space-y-3">
          <button
            onClick={() => setJoinQrExpanded((v) => !v)}
            className="w-full flex items-center justify-between"
          >
            <div className="text-left">
              <div className="font-bold text-primary text-base">Student Join QR</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                Display or print this — students scan to register
              </div>
            </div>
            {joinQrExpanded
              ? <ChevronUp className="w-5 h-5 text-muted-foreground" />
              : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
          </button>

          {joinQrExpanded && (
            <div className="space-y-3 animate-pop-in">
              <div className="flex items-center gap-4 bg-muted/40 rounded-2xl p-4">
                <div className="bg-white p-2 rounded-xl shadow" ref={joinQrRef}>
                  <QRCodeCanvas id="join-qr-canvas" value={joinUrl} size={140} includeMargin />
                </div>
                <div className="flex-1 space-y-2">
                  <div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">Session code</div>
                    <div className="text-3xl font-bold tracking-[0.15em] text-primary mt-0.5">
                      {session.join_code}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Students can scan the QR <em>or</em> tap "I'm a Student" and type this code.
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => downloadQr("join-qr-canvas", `join-qr-${session.join_code}.png`)}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl border-2 border-border py-2.5 text-sm font-semibold text-muted-foreground hover:bg-muted/50 transition"
                >
                  <Download className="w-4 h-4" /> Download QR
                </button>
                <button
                  onClick={() => window.print()}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl border-2 border-border py-2.5 text-sm font-semibold text-muted-foreground hover:bg-muted/50 transition"
                >
                  🖨️ Print
                </button>
              </div>
              <a href={joinUrl} className="text-[11px] text-action break-all underline block text-center">
                {joinUrl}
              </a>
            </div>
          )}
        </div>

        {/* ── Compartment Unlock QRs ── */}
        <div className="app-card space-y-3">
          <div className="font-bold text-primary">Compartment Unlock QRs</div>
          <p className="text-xs text-muted-foreground">
            Print and place inside each physical compartment. After a group solves Compartment N,
            they scan its QR to unlock the next level.
          </p>
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((n) => {
              const canvasId = `unlock-qr-${n}`;
              return (
                <div key={n} className="bg-background rounded-xl p-3 text-center space-y-1.5 border border-border">
                  <div className="text-xs font-semibold text-primary">After Compartment {n}</div>
                  <div className="bg-white p-1.5 rounded-lg inline-block">
                    <QRCodeCanvas id={canvasId} value={`?from=${n}`} size={88} includeMargin />
                  </div>
                  <button
                    onClick={() => downloadQr(canvasId, `compartment-${n}-unlock.png`)}
                    className="text-[10px] text-action font-semibold flex items-center justify-center gap-1 mx-auto"
                  >
                    <Download className="w-3 h-3" /> Save
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Challenge Builder — Paginated ── */}
        {activeCompartment === null ? (
          <div className="app-card space-y-4">
            <div className="font-bold text-primary">Compartment Setup</div>
            <p className="text-xs text-muted-foreground">
              Fill in Compartment 1, then add more as needed. Changes are saved automatically.
            </p>
            <div className="flex items-center justify-center gap-2 py-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => n <= unlockedUpTo ? setActiveCompartment(n) : undefined}
                  disabled={n > unlockedUpTo}
                  className={`w-9 h-9 rounded-full text-sm font-bold border-2 transition ${
                    n <= unlockedUpTo
                      ? "border-action bg-action/10 text-action hover:bg-action/20"
                      : "border-border bg-muted/30 text-muted-foreground/40 cursor-not-allowed"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            <button
              onClick={() => setActiveCompartment(1)}
              className="btn-primary flex items-center justify-center gap-2"
            >
              {unlockedUpTo === 1 ? "Set Up Compartment 1" : `Edit Compartments (1–${unlockedUpTo})`}
            </button>
          </div>
        ) : (
          (() => {
            const c = challenges.find((ch) => ch.level === activeCompartment);
            if (!c) return null;
            const isLast = activeCompartment === 5;

            return (
              <div className="app-card space-y-4 animate-pop-in">

                {/* Pagination dots */}
                <div className="space-y-2">
                  <button
                    onClick={() => setActiveCompartment(null)}
                    className="text-xs text-action font-semibold flex items-center gap-1"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Back to QR overview
                  </button>
                  <div className="flex items-center justify-center gap-2">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        onClick={() => n <= unlockedUpTo ? setActiveCompartment(n) : undefined}
                        disabled={n > unlockedUpTo}
                        className={`transition-all rounded-full font-bold border-2 ${
                          n === activeCompartment
                            ? "w-9 h-9 text-sm border-action bg-action text-white scale-110"
                            : n < activeCompartment
                            ? "w-8 h-8 text-xs border-action bg-action/20 text-action"
                            : n <= unlockedUpTo
                            ? "w-8 h-8 text-xs border-border bg-muted/40 text-muted-foreground hover:border-action"
                            : "w-7 h-7 text-xs border-border/40 bg-muted/20 text-muted-foreground/40 cursor-not-allowed"
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                  <p className="text-center text-xs font-semibold text-primary">
                    Compartment {activeCompartment}
                    <span className="font-normal text-muted-foreground"> · {c.type}</span>
                  </p>
                </div>

                {/* Fields — all auto-save on change */}
                <div className="space-y-3">
                  {activeCompartment === 1 && (
                    <label className="block text-xs">
                      <span className="font-semibold text-primary">Story Text</span>
                      <textarea
                        className="field-input mt-1 min-h-[120px] text-sm"
                        value={c.story_text || ""}
                        onChange={(e) => updateField(c.id, { story_text: e.target.value })}
                      />
                    </label>
                  )}
                  <label className="block text-xs">
                    <span className="font-semibold text-primary">Question / Prompt</span>
                    <textarea
                      className="field-input mt-1 min-h-[80px] text-sm"
                      value={c.question_text || ""}
                      onChange={(e) => updateField(c.id, { question_text: e.target.value })}
                    />
                  </label>
                  {(c.type === "sequence" || c.type === "final_riddle") && (
                    <label className="block text-xs">
                      <span className="font-semibold text-primary">Correct Answer Code</span>
                      <input
                        className="field-input mt-1 text-sm"
                        value={c.correct_answer_code || ""}
                        onChange={(e) => updateField(c.id, { correct_answer_code: e.target.value })}
                      />
                    </label>
                  )}
                  {(c.type === "short_answer" || c.type === "long_text") && (
                    <label className="block text-xs">
                      <span className="font-semibold text-primary">Keywords (comma-separated)</span>
                      <input
                        className="field-input mt-1 text-sm"
                        value={(c.keywords || []).join(", ")}
                        onChange={(e) =>
                          updateField(c.id, {
                            keywords: e.target.value.split(",").map((s: string) => s.trim()).filter(Boolean),
                          })
                        }
                      />
                    </label>
                  )}
                  <label className="block text-xs">
                    <span className="font-semibold text-primary">Compartment / Padlock Code</span>
                    <input
                      className="field-input mt-1 text-sm"
                      value={c.compartment_code || ""}
                      onChange={(e) => updateField(c.id, { compartment_code: e.target.value })}
                    />
                  </label>
                  <label className="block text-xs">
                    <span className="font-semibold text-primary">Reveal Message</span>
                    <textarea
                      className="field-input mt-1 text-sm"
                      value={c.reveal_message || ""}
                      onChange={(e) => updateField(c.id, { reveal_message: e.target.value })}
                    />
                  </label>
                </div>

                {/* Navigation + actions */}
                <div className="flex gap-2">
                  {activeCompartment > 1 && (
                    <button
                      onClick={() => setActiveCompartment(activeCompartment - 1)}
                      className="flex items-center justify-center gap-1.5 rounded-xl border-2 border-border px-4 py-2.5 text-sm font-semibold text-muted-foreground hover:bg-muted/50 transition"
                    >
                      <ArrowLeft className="w-4 h-4" /> Back
                    </button>
                  )}

                  {isLast ? (
                    <button
                      onClick={submitSession}
                      disabled={submitting}
                      className="flex-1 btn-primary flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      {submitting ? "Submitting…" : "Submit Session"}
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          const next = activeCompartment + 1;
                          setUnlockedUpTo((u) => Math.max(u, next));
                          setActiveCompartment(next);
                        }}
                        className="flex-1 btn-primary flex items-center justify-center gap-2"
                      >
                        <Plus className="w-4 h-4" /> Add Compartment {activeCompartment + 1}
                      </button>
                      <button
                        onClick={submitSession}
                        disabled={submitting}
                        className="flex items-center justify-center gap-1.5 rounded-xl border-2 border-action/50 px-4 py-2.5 text-sm font-semibold text-action hover:bg-action/10 transition"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        {submitting ? "…" : "Submit"}
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })()
        )}
      </div>
    </div>
  );
}