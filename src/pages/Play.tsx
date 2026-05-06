import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { InfoBox } from "@/components/InfoBox";
import { QRScanner } from "@/components/QRScanner";
import { BookOpen, Key, ScanLine, CheckCircle2, Puzzle } from "lucide-react";
import { toast } from "sonner";

const COOLDOWN_SEC = 30;
const MAX_ATTEMPTS = 5;

export default function Play() {
  const { groupId } = useParams();
  const [params] = useSearchParams();
  const requestedLevel = parseInt(params.get("level") || "0", 10);
  const nav = useNavigate();

  const [group, setGroup] = useState<any>(null);
  const [challenges, setChallenges] = useState<any[]>([]);
  const [answer, setAnswer] = useState("");
  const [chosenOption, setChosenOption] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [cooldownUntil, setCooldownUntil] = useState<number>(0);
  const [now, setNow] = useState(Date.now());

  // tick for cooldown countdown
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Load group + challenges
  useEffect(() => {
    if (!groupId) return;
    (async () => {
      const { data: g } = await supabase.from("groups").select("*").eq("id", groupId).maybeSingle();
      setGroup(g);
      if (g) {
        const { data: ch } = await supabase
          .from("challenges").select("*").eq("session_id", g.session_id).order("level");
        setChallenges(ch || []);
      }
    })();
  }, [groupId]);

  const currentLevel = group?.current_level ?? 1;
  // Enforce sequential
  useEffect(() => {
    if (group && requestedLevel && requestedLevel !== currentLevel) {
      toast.error("This challenge is locked. Continue in order.");
    }
  }, [requestedLevel, currentLevel, group]);

  const challenge = useMemo(
    () => challenges.find((c) => c.level === currentLevel),
    [challenges, currentLevel]
  );

  // Reset per-challenge state when level changes
  useEffect(() => {
    setAnswer("");
    setChosenOption("");
    setSuccess(false);
    setAttempts(0);
  }, [currentLevel]);

  if (!group) {
    return (
      <div className="app-shell">
        <AppHeader />
        <div className="px-4"><div className="app-card text-center text-muted-foreground">Loading group...</div></div>
      </div>
    );
  }

  if (!challenge) {
    return (
      <div className="app-shell">
        <AppHeader />
        <div className="px-4"><div className="app-card text-center text-muted-foreground">Teacher hasn't configured this challenge yet.</div></div>
      </div>
    );
  }

  const cooldownLeft = Math.max(0, Math.ceil((cooldownUntil - now) / 1000));
  const onCooldown = cooldownLeft > 0;

  function validate(input: string): boolean {
    const c = challenge;
    const ans = input.trim().toLowerCase();
    if (c.type === "sequence" || c.type === "final_riddle") {
      return ans === (c.correct_answer_code || "").trim().toLowerCase();
    }
    if (c.type === "multiple_choice") {
      const opt = (c.options as any[])?.find((o) => o.label.startsWith(input));
      return !!opt?.is_correct;
    }
    if (c.type === "short_answer" || c.type === "long_text") {
      const kws: string[] = (c.keywords as string[]) || [];
      if (kws.length === 0) return ans.length > 5;
      return kws.some((k) => ans.includes(k.toLowerCase()));
    }
    return false;
  }

  async function submit() {
    if (onCooldown) return;
    const input = challenge.type === "multiple_choice" ? chosenOption : answer;
    if (!input.trim()) return toast.error("Enter an answer first");

    setBusy(true);
    const ok = validate(input);
    await supabase.from("submissions").insert({
      group_id: groupId!, challenge_level: currentLevel,
      submitted_answer: input, is_correct: ok,
    });

    if (!group.start_time) {
      await supabase.from("groups").update({ start_time: new Date().toISOString() }).eq("id", groupId!);
    }

    if (ok) {
      setSuccess(true);
      toast.success("Correct!");
    } else {
      const next = attempts + 1;
      setAttempts(next);
      if (next >= MAX_ATTEMPTS) {
        setCooldownUntil(Date.now() + COOLDOWN_SEC * 1000);
        toast.error(`Too many attempts. Wait ${COOLDOWN_SEC}s.`);
        setAttempts(0);
      } else {
        toast.error(`Wrong answer (${next}/${MAX_ATTEMPTS})`);
      }
    }
    setBusy(false);
  }

  async function advanceLevel() {
    const nextLevel = currentLevel + 1;
    if (nextLevel > 5) {
      await supabase.from("groups").update({
        current_level: 5, finish_time: new Date().toISOString(),
      }).eq("id", groupId!);
      nav(`/complete/${groupId}`);
      return;
    }
    await supabase.from("groups").update({ current_level: nextLevel }).eq("id", groupId!);
    setGroup({ ...group, current_level: nextLevel });
  }

  function handleScan(text: string) {
    setShowScanner(false);
    try {
      const url = new URL(text, window.location.origin);
      const expected = `/play/${groupId}/scan`;
      if (!url.pathname.startsWith(`/play/${groupId}`)) {
        toast.error("This QR code is for a different group.");
        return;
      }
      const fromLevel = parseInt(url.searchParams.get("from") || "0", 10);
      if (fromLevel !== currentLevel) {
        toast.error("This QR code is for a different compartment.");
        return;
      }
      advanceLevel();
    } catch {
      toast.error("Invalid QR code.");
    }
  }

  // Level 1 shows story first
  return (
    <div className="app-shell pb-12">
      <AppHeader subtitle={`Group: ${group.group_name} · Compartment ${currentLevel}/5`} />
      <div className="px-4 space-y-4">

        {currentLevel === 1 && challenges.find((c) => c.level === 1)?.story_text && (
          <div className="app-card space-y-3">
            <h2 className="text-lg font-bold text-primary">The Last Message of Room 407</h2>
            <p className="text-sm text-muted-foreground">Read the story carefully. You will need details from it to solve the compartments.</p>
            <div className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/90 max-h-72 overflow-auto rounded-xl bg-muted/50 p-3">
              {challenges.find((c) => c.level === 1)?.story_text}
            </div>
          </div>
        )}

        <InfoBox icon={Key} label={`Compartment ${currentLevel} Padlock`} tone="warning">
          {currentLevel === 1
            ? `Open Compartment 1 with the code your teacher provided. Scan the QR inside to begin.`
            : `Use the revealed code to open Compartment ${currentLevel}. Scan the QR inside.`}
        </InfoBox>

        <div className="app-card space-y-3 animate-pop-in">
          <div className="flex items-center gap-2 text-primary">
            <Puzzle className="w-5 h-5" />
            <h3 className="font-bold">Compartment {currentLevel} Challenge</h3>
          </div>
          <p className="text-sm whitespace-pre-wrap text-foreground/90">{challenge.question_text}</p>

          {!success && (
            <>
              {challenge.type === "multiple_choice" ? (
                <div className="space-y-2">
                  {(challenge.options as any[]).map((o: any) => {
                    const letter = o.label.charAt(0);
                    const sel = chosenOption === letter;
                    return (
                      <button
                        key={o.label}
                        type="button"
                        onClick={() => setChosenOption(letter)}
                        className={`w-full text-left rounded-xl px-4 py-3 border-2 transition ${
                          sel ? "border-action bg-action/10" : "border-border bg-card"
                        }`}
                      >
                        <span className="font-semibold text-primary">{o.label}</span>
                      </button>
                    );
                  })}
                </div>
              ) : challenge.type === "long_text" || challenge.type === "short_answer" ? (
                <textarea
                  className="field-input min-h-[100px]"
                  placeholder="Write your answer..."
                  value={answer}
                  maxLength={1000}
                  onChange={(e) => setAnswer(e.target.value)}
                />
              ) : (
                <input
                  className="field-input"
                  placeholder={challenge.type === "sequence" ? "Enter 4-digit code" : "Your answer"}
                  value={answer}
                  maxLength={50}
                  onChange={(e) => setAnswer(e.target.value)}
                  inputMode={challenge.type === "sequence" ? "numeric" : "text"}
                />
              )}

              <button onClick={submit} disabled={busy || onCooldown} className="btn-primary">
                {onCooldown ? `Cooldown ${cooldownLeft}s` : busy ? "Checking..." : "Submit Answer"}
              </button>
            </>
          )}

          {success && (
            <div className="rounded-xl bg-success/10 border-2 border-success p-4 space-y-3 animate-pop-in">
              <div className="flex items-center gap-2 text-success font-bold">
                <CheckCircle2 className="w-6 h-6" /> Code Accepted!
              </div>
              <p className="text-sm text-foreground/80">{challenge.reveal_message}</p>
              {currentLevel < 5 ? (
                <button onClick={() => setShowScanner(true)} className="btn-primary flex items-center justify-center gap-2">
                  <ScanLine className="w-5 h-5" /> Scan Compartment QR
                </button>
              ) : (
                <button onClick={advanceLevel} className="btn-primary">Finish Activity</button>
              )}
            </div>
          )}
        </div>

        {/* Teacher bypass for demo */}
        <button onClick={advanceLevel} className="btn-outline flex items-center justify-center gap-2">
          <BookOpen className="w-4 h-4" /> Next (Teacher use only)
        </button>
      </div>

      {showScanner && <QRScanner onResult={handleScan} onClose={() => setShowScanner(false)} />}
    </div>
  );
}
