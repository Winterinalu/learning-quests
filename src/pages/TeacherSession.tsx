import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useParams } from "react-router-dom";
import { QRCodeCanvas } from "qrcode.react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppHeader } from "@/components/AppHeader";
import { ArrowLeft, Save, ChevronDown, ChevronUp, Download } from "lucide-react";
import { toast } from "sonner";

// Inject print styles once
const PRINT_STYLE_ID = "teacher-session-print-styles";
function injectPrintStyles() {
  if (document.getElementById(PRINT_STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = PRINT_STYLE_ID;
  style.textContent = `
    @media print {
      body > *:not(#qr-print-area) { display: none !important; }
      #qr-print-area { display: flex !important; }
    }
    #qr-print-area {
      display: none;
      flex-wrap: wrap;
      gap: 32px;
      padding: 24px;
      font-family: sans-serif;
    }
    #qr-print-area .print-qr-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      page-break-inside: avoid;
      break-inside: avoid;
      width: 180px;
    }
    #qr-print-area .print-qr-item .print-label {
      font-size: 14px;
      font-weight: 700;
      text-align: center;
      color: #111;
    }
    #qr-print-area .print-qr-item .print-sublabel {
      font-size: 11px;
      color: #555;
      text-align: center;
    }
    #qr-print-area .print-qr-item canvas {
      border: 1px solid #ddd;
      border-radius: 8px;
      padding: 6px;
      background: white;
    }
  `;
  document.head.appendChild(style);
}

export default function TeacherSession() {
  const { sessionId } = useParams();
  const { user, loading } = useAuth();
  const [session, setSession] = useState<any>(null);
  const [challenges, setChallenges] = useState<any[]>([]);
  const [joinQrExpanded, setJoinQrExpanded] = useState(true);
  const joinQrRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    injectPrintStyles();
  }, []);

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

  async function saveChallenge(c: any) {
    const { error } = await supabase.from("challenges").update({
      story_text: c.story_text,
      question_text: c.question_text,
      correct_answer_code: c.correct_answer_code,
      compartment_code: c.compartment_code,
      reveal_message: c.reveal_message,
      keywords: c.keywords,
      options: c.options,
    }).eq("id", c.id);
    if (error) toast.error(error.message);
    else toast.success(`Compartment ${c.level} saved`);
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

        {/* ── Student Join QR — prominent card ── */}
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
              {/* Big QR + session code side by side */}
              <div className="flex items-center gap-4 bg-muted/40 rounded-2xl p-4">
                <div className="bg-white p-2 rounded-xl shadow" ref={joinQrRef}>
                  <QRCodeCanvas
                    id="join-qr-canvas"
                    value={joinUrl}
                    size={140}
                    includeMargin
                  />
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

              {/* Action buttons */}
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
              const url = `${window.location.origin}/play/SCAN/scan?from=${n}`;
              const canvasId = `unlock-qr-${n}`;
              return (
                <div key={n} className="bg-background rounded-xl p-3 text-center space-y-1.5 border border-border">
                  <div className="text-xs font-semibold text-primary">Compartment {n}</div>
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
          <p className="text-[11px] text-muted-foreground">
            Tip: For per-group QR codes, use each group's{" "}
            <code>/play/&lt;id&gt;/scan?from=N</code> URL.
          </p>
        </div>

        {/* ── Challenge Builder ── */}
        <div className="app-card space-y-3">
          <div className="font-bold text-primary">Challenge Builder</div>
          {challenges.map((c) => (
            <details key={c.id} className="rounded-xl border border-border bg-background/50 p-3">
              <summary className="font-semibold cursor-pointer">
                Compartment {c.level} · {c.type}
              </summary>
              <div className="mt-3 space-y-2">
                {c.level === 1 && (
                  <label className="block text-xs">
                    <span className="font-semibold text-primary">Story Text</span>
                    <textarea
                      className="field-input mt-1 min-h-[120px] text-sm"
                      value={c.story_text || ""}
                      onChange={(e) =>
                        setChallenges((arr) =>
                          arr.map((x) => x.id === c.id ? { ...x, story_text: e.target.value } : x)
                        )
                      }
                    />
                  </label>
                )}
                <label className="block text-xs">
                  <span className="font-semibold text-primary">Question / Prompt</span>
                  <textarea
                    className="field-input mt-1 min-h-[80px] text-sm"
                    value={c.question_text || ""}
                    onChange={(e) =>
                      setChallenges((arr) =>
                        arr.map((x) => x.id === c.id ? { ...x, question_text: e.target.value } : x)
                      )
                    }
                  />
                </label>
                {(c.type === "sequence" || c.type === "final_riddle") && (
                  <label className="block text-xs">
                    <span className="font-semibold text-primary">Correct Answer Code</span>
                    <input
                      className="field-input mt-1 text-sm"
                      value={c.correct_answer_code || ""}
                      onChange={(e) =>
                        setChallenges((arr) =>
                          arr.map((x) => x.id === c.id ? { ...x, correct_answer_code: e.target.value } : x)
                        )
                      }
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
                        setChallenges((arr) =>
                          arr.map((x) =>
                            x.id === c.id
                              ? { ...x, keywords: e.target.value.split(",").map((s: string) => s.trim()).filter(Boolean) }
                              : x
                          )
                        )
                      }
                    />
                  </label>
                )}
                <label className="block text-xs">
                  <span className="font-semibold text-primary">Compartment / Padlock Code</span>
                  <input
                    className="field-input mt-1 text-sm"
                    value={c.compartment_code || ""}
                    onChange={(e) =>
                      setChallenges((arr) =>
                        arr.map((x) => x.id === c.id ? { ...x, compartment_code: e.target.value } : x)
                      )
                    }
                  />
                </label>
                <label className="block text-xs">
                  <span className="font-semibold text-primary">Reveal Message</span>
                  <textarea
                    className="field-input mt-1 text-sm"
                    value={c.reveal_message || ""}
                    onChange={(e) =>
                      setChallenges((arr) =>
                        arr.map((x) => x.id === c.id ? { ...x, reveal_message: e.target.value } : x)
                      )
                    }
                  />
                </label>
                <button
                  onClick={() => saveChallenge(c)}
                  className="btn-primary flex items-center justify-center gap-2 text-sm"
                >
                  <Save className="w-4 h-4" /> Save
                </button>
              </div>
            </details>
          ))}
        </div>
      </div>

      {/* ── Hidden QR Print Area — rendered via portal directly to body ── */}
      {createPortal(
        <div id="qr-print-area">
          {/* Session Join QR */}
          <div className="print-qr-item">
            <div className="print-label">Session Code</div>
            <div className="print-sublabel">{session.join_code}</div>
            <QRCodeCanvas
              id="print-join-qr"
              value={joinUrl}
              size={160}
              includeMargin
            />
            <div className="print-sublabel">Scan to join the session</div>
          </div>

          {/* Compartment Unlock QRs */}
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="print-qr-item">
              <div className="print-label">Compartment {n}</div>
              <div className="print-sublabel">Place inside compartment {n}</div>
              <QRCodeCanvas
                id={`print-unlock-qr-${n}`}
                value={`${window.location.origin}/play/SCAN/scan?from=${n}`}
                size={160}
                includeMargin
              />
              <div className="print-sublabel">Scan to unlock next level</div>
            </div>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}