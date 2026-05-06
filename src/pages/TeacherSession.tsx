import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { QRCodeCanvas } from "qrcode.react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppHeader } from "@/components/AppHeader";
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";

export default function TeacherSession() {
  const { sessionId } = useParams();
  const { user, loading } = useAuth();
  const [session, setSession] = useState<any>(null);
  const [challenges, setChallenges] = useState<any[]>([]);

  useEffect(() => {
    if (!sessionId) return;
    (async () => {
      const { data: s } = await supabase.from("sessions").select("*").eq("id", sessionId).maybeSingle();
      setSession(s);
      const { data: c } = await supabase.from("challenges").select("*").eq("session_id", sessionId).order("level");
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

  if (loading) return <div className="app-shell"><AppHeader /></div>;
  if (!user) return <div className="app-shell"><AppHeader /><div className="px-4"><Link to="/teacher/login" className="btn-primary inline-block">Sign in</Link></div></div>;
  if (!session) return <div className="app-shell"><AppHeader /><div className="px-4 text-center">Loading...</div></div>;

  const joinUrl = `${window.location.origin}/join/${session.id}`;

  return (
    <div className="app-shell pb-16">
      <AppHeader subtitle={`Session ${session.join_code}`} />
      <div className="px-4 space-y-4">
        <Link to="/teacher/dashboard" className="text-sm text-action font-semibold flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Back to dashboard
        </Link>

        <div className="app-card text-center space-y-2">
          <div className="font-bold text-primary">Group Join QR</div>
          <p className="text-xs text-muted-foreground">Students scan to register their group</p>
          <div className="flex justify-center"><QRCodeCanvas value={joinUrl} size={180} /></div>
          <a href={joinUrl} className="text-xs text-action break-all underline">{joinUrl}</a>
        </div>

        <div className="app-card space-y-3">
          <div className="font-bold text-primary">Compartment Unlock QRs</div>
          <p className="text-xs text-muted-foreground">
            Print and place inside each physical compartment. After a group solves Compartment N,
            they scan its QR to unlock N+1. (These are group-agnostic — students will still need to
            scan from their own device.)
          </p>
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((n) => {
              const url = `${window.location.origin}/play/SCAN/scan?from=${n}`;
              return (
                <div key={n} className="bg-background rounded-xl p-2 text-center">
                  <div className="text-xs font-semibold text-primary mb-1">After Compartment {n}</div>
                  <div className="bg-card p-2 rounded-lg inline-block"><QRCodeCanvas value={`?from=${n}`} size={90} /></div>
                  <p className="text-[10px] text-muted-foreground mt-1">Encodes from={n}</p>
                </div>
              );
            })}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Tip: For per-group QR codes, generate from each group's <code>/play/&lt;id&gt;/scan?from=N</code> URL.
          </p>
        </div>

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
                    <textarea className="field-input mt-1 min-h-[120px] text-sm" value={c.story_text || ""}
                      onChange={(e) => setChallenges((arr) => arr.map((x) => x.id === c.id ? { ...x, story_text: e.target.value } : x))} />
                  </label>
                )}
                <label className="block text-xs">
                  <span className="font-semibold text-primary">Question / Prompt</span>
                  <textarea className="field-input mt-1 min-h-[80px] text-sm" value={c.question_text || ""}
                    onChange={(e) => setChallenges((arr) => arr.map((x) => x.id === c.id ? { ...x, question_text: e.target.value } : x))} />
                </label>
                {(c.type === "sequence" || c.type === "final_riddle") && (
                  <label className="block text-xs">
                    <span className="font-semibold text-primary">Correct Answer Code</span>
                    <input className="field-input mt-1 text-sm" value={c.correct_answer_code || ""}
                      onChange={(e) => setChallenges((arr) => arr.map((x) => x.id === c.id ? { ...x, correct_answer_code: e.target.value } : x))} />
                  </label>
                )}
                {(c.type === "short_answer" || c.type === "long_text") && (
                  <label className="block text-xs">
                    <span className="font-semibold text-primary">Keywords (comma-separated)</span>
                    <input className="field-input mt-1 text-sm" value={(c.keywords || []).join(", ")}
                      onChange={(e) => setChallenges((arr) => arr.map((x) => x.id === c.id ? { ...x, keywords: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) } : x))} />
                  </label>
                )}
                <label className="block text-xs">
                  <span className="font-semibold text-primary">Compartment / Padlock Code</span>
                  <input className="field-input mt-1 text-sm" value={c.compartment_code || ""}
                    onChange={(e) => setChallenges((arr) => arr.map((x) => x.id === c.id ? { ...x, compartment_code: e.target.value } : x))} />
                </label>
                <label className="block text-xs">
                  <span className="font-semibold text-primary">Reveal Message</span>
                  <textarea className="field-input mt-1 text-sm" value={c.reveal_message || ""}
                    onChange={(e) => setChallenges((arr) => arr.map((x) => x.id === c.id ? { ...x, reveal_message: e.target.value } : x))} />
                </label>
                <button onClick={() => saveChallenge(c)} className="btn-primary flex items-center justify-center gap-2 text-sm">
                  <Save className="w-4 h-4" /> Save
                </button>
              </div>
            </details>
          ))}
        </div>
      </div>
    </div>
  );
}
