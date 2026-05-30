import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { InfoBox } from "@/components/InfoBox";
import { GraduationCap, Users, ScanLine, Hash, X, ArrowRight } from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";
import { toast } from "sonner";

type JoinMode = "idle" | "scanner" | "code";

export default function Index() {
  const nav = useNavigate();
  const [joinMode, setJoinMode] = useState<JoinMode>("idle");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerStarted = useRef(false);

  useEffect(() => {
    document.title = "READ E-COM: Learning Quest";
  }, []);

  // Start / stop QR scanner
  useEffect(() => {
    if (joinMode !== "scanner") {
      if (scannerRef.current && scannerStarted.current) {
        scannerRef.current.stop().catch(() => {});
        scannerStarted.current = false;
      }
      return;
    }

    const id = "qr-student-join";
    const qr = new Html5Qrcode(id);
    scannerRef.current = qr;

    // Small delay so the DOM node is mounted
    const t = setTimeout(() => {
      qr.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        async (text) => {
          await qr.stop().catch(() => {});
          scannerStarted.current = false;
          await handleScannedUrl(text);
        },
        () => {}
      ).then(() => { scannerStarted.current = true; }).catch(() => {
        toast.error("Camera access denied.");
        setJoinMode("idle");
      });
    }, 120);

    return () => {
      clearTimeout(t);
      if (scannerStarted.current) {
        qr.stop().catch(() => {});
        scannerStarted.current = false;
      }
    };
    // eslint-disable-next-line
  }, [joinMode]);

  async function handleScannedUrl(text: string) {
    try {
      const url = new URL(text, window.location.origin);
      // Accept /join/:sessionId directly
      const joinMatch = url.pathname.match(/^\/join\/([^/]+)/);
      if (joinMatch) {
        nav(`/join/${joinMatch[1]}`);
        return;
      }
      // Accept bare session URLs too
      toast.error("QR code not recognised. Try entering the code manually.");
      setJoinMode("code");
    } catch {
      toast.error("Invalid QR code.");
      setJoinMode("code");
    }
  }

  async function submitCode(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = code.toUpperCase().trim();
    if (!trimmed) return;
    setBusy(true);
    const { data } = await supabase
      .from("sessions")
      .select("id")
      .eq("join_code", trimmed)
      .maybeSingle();
    setBusy(false);
    if (!data) return toast.error("Session not found. Check the code and try again.");
    nav(`/join/${data.id}`);
  }

  const isModalOpen = joinMode !== "idle";

  return (
    <div className="app-shell">
      <AppHeader subtitle="A reading escape-room adventure" />
      <main className="px-4 space-y-4">
        <div className="app-card space-y-2 text-center">
          <h2 className="text-lg font-bold text-primary">Welcome, Investigators!</h2>
          <p className="text-sm text-muted-foreground">
            Solve the mystery of the <strong>Room</strong> by exploring compartments — read, decode, and unlock!
          </p>
        </div>

        <InfoBox
          icon={Users}
          label="I'm a Student"
          onClick={() => setJoinMode("scanner")}
        >
          Scan your teacher's QR code or enter the session code to join.
        </InfoBox>

        <InfoBox icon={GraduationCap} label="I'm a Teacher" onClick={() => nav("/teacher/login")}>
          Create sessions, edit challenges, and watch the live leaderboard.
        </InfoBox>
      </main>

      {/* ── Join modal ── */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setJoinMode("idle"); }}
        >
          <div className="w-full max-w-md bg-card rounded-t-3xl shadow-2xl pb-8 animate-pop-in">
            {/* Handle bar */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-border" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-3 pb-4">
              <h2 className="text-base font-bold text-primary">Join a Session</h2>
              <button
                onClick={() => setJoinMode("idle")}
                className="rounded-full p-1.5 bg-muted text-muted-foreground hover:bg-muted/70"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Mode tabs */}
            <div className="flex gap-2 px-5 mb-4">
              <button
                onClick={() => setJoinMode("scanner")}
                className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold border-2 transition ${
                  joinMode === "scanner"
                    ? "border-action bg-action/10 text-action"
                    : "border-border text-muted-foreground"
                }`}
              >
                <ScanLine className="w-4 h-4" /> Scan QR
              </button>
              <button
                onClick={() => setJoinMode("code")}
                className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold border-2 transition ${
                  joinMode === "code"
                    ? "border-action bg-action/10 text-action"
                    : "border-border text-muted-foreground"
                }`}
              >
                <Hash className="w-4 h-4" /> Enter Code
              </button>
            </div>

            {/* Scanner view */}
            {joinMode === "scanner" && (
              <div className="px-5 space-y-3">
                <p className="text-xs text-center text-muted-foreground">
                  Point your camera at the QR code your teacher displayed.
                </p>
                <div
                  id="qr-student-join"
                  className="w-full overflow-hidden rounded-2xl bg-black"
                  style={{ aspectRatio: "1/1" }}
                />
                <button
                  onClick={() => setJoinMode("code")}
                  className="w-full text-sm text-action font-semibold text-center py-1"
                >
                  Can't scan? Enter the code instead →
                </button>
              </div>
            )}

            {/* Code entry view */}
            {joinMode === "code" && (
              <form onSubmit={submitCode} className="px-5 space-y-3">
                <p className="text-xs text-muted-foreground text-center">
                  Ask your teacher for the 6-character session code.
                </p>
                <input
                  className="field-input text-center text-2xl font-bold tracking-[0.25em] uppercase"
                  placeholder="ABC123"
                  value={code}
                  maxLength={8}
                  autoFocus
                  autoCapitalize="characters"
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                />
                <button
                  disabled={busy || !code.trim()}
                  className="btn-primary flex items-center justify-center gap-2"
                >
                  {busy ? "Checking..." : <>Join Session <ArrowRight className="w-4 h-4" /></>}
                </button>
                <button
                  type="button"
                  onClick={() => setJoinMode("scanner")}
                  className="w-full text-sm text-action font-semibold text-center py-1"
                >
                  ← Scan QR instead
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}