import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { toast } from "sonner";
import { Eye, EyeOff, Check, X, ArrowLeft } from "lucide-react";

const passwordRules = [
  { label: "At least 8 characters",          test: (p: string) => p.length >= 8 },
  { label: "Uppercase and lowercase letters", test: (p: string) => /[a-z]/.test(p) && /[A-Z]/.test(p) },
  { label: "At least one number",             test: (p: string) => /[0-9]/.test(p) },
  { label: "At least one special character",  test: (p: string) => /[^a-zA-Z0-9]/.test(p) },
];

const RESEND_COOLDOWN = 60; // seconds
const MAX_RESENDS     = 3;

type Mode = "signin" | "signup" | "forgot";

export default function TeacherLogin() {
  const nav = useNavigate();
  const [mode, setMode]               = useState<Mode>("signin");
  const [email, setEmail]             = useState("");
  const [password, setPassword]       = useState("");
  const [confirm, setConfirm]         = useState("");
  const [busy, setBusy]               = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm]   = useState(false);

  // Forgot password state
  const [resetSent, setResetSent]     = useState(false);
  const [resendCount, setResendCount] = useState(0);
  const [cooldown, setCooldown]       = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const checks        = passwordRules.map((r) => ({ ...r, passed: r.test(password) }));
  const passwordValid = checks.every((c) => c.passed);
  const confirmMatch  = password === confirm && confirm.length > 0;

  // Countdown timer
  useEffect(() => {
    if (cooldown <= 0) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(() => {
      setCooldown((c) => {
        if (c <= 1) { clearInterval(timerRef.current!); return 0; }
        return c - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [cooldown > 0]);

  async function sendResetEmail() {
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/teacher/reset-password`,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    setResetSent(true);
    setResendCount((c) => c + 1);
    setCooldown(RESEND_COOLDOWN);
    if (resendCount > 0) toast.success("Reset link resent!");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (mode === "forgot") { await sendResetEmail(); return; }
    if (mode === "signup") {
      if (!passwordValid) { toast.error("Password does not meet all requirements."); return; }
      if (!confirmMatch)  { toast.error("Passwords do not match."); return; }
    }
    setBusy(true);
    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email, password,
        options: { emailRedirectTo: `${window.location.origin}/teacher/dashboard` },
      });
      if (error) toast.error(error.message);
      else toast.success("Account created! Check your email to confirm.");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) toast.error(error.message);
      else nav("/teacher/dashboard");
    }
    setBusy(false);
  }

  function switchMode(next: Mode) {
    setMode(next);
    setPassword(""); setConfirm("");
    setShowPassword(false); setShowConfirm(false);
    setResetSent(false); setResendCount(0); setCooldown(0);
    if (timerRef.current) clearInterval(timerRef.current);
  }

  const resendExhausted = resendCount >= MAX_RESENDS;
  const resendDisabled  = busy || cooldown > 0 || resendExhausted;

  return (
    <div className="app-shell">
      <AppHeader subtitle="Teacher Portal" />
      <div className="px-4">
        <form onSubmit={submit} className="app-card space-y-3">

          {/* ── Forgot password ── */}
          {mode === "forgot" && (
            <>
              <button
                type="button"
                onClick={() => switchMode("signin")}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary -mt-1"
              >
                <ArrowLeft size={14} /> Back to Sign In
              </button>

              <h2 className="text-lg font-bold text-primary">Reset Password</h2>

              {resetSent ? (
                <div className="space-y-4">
                  {/* Success box */}
                  <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-4 text-sm text-green-700 space-y-1">
                    <p className="font-semibold">Check your email</p>
                    <p>We sent a password reset link to <strong>{email}</strong>. Follow the link to set a new password.</p>
                  </div>

                  {/* Resend section */}
                  <div className="rounded-lg border border-border bg-gray-50 px-4 py-3 space-y-2">
                    <p className="text-xs text-muted-foreground">Didn't receive it? Check your spam folder or resend.</p>

                    {resendExhausted ? (
                      <p className="text-xs text-red-500 font-medium">
                        Maximum resends reached. Please wait a few minutes and try again from the sign in page.
                      </p>
                    ) : (
                      <div className="flex items-center justify-between gap-3">
                        <button
                          type="button"
                          onClick={sendResetEmail}
                          disabled={resendDisabled}
                          className={`text-sm font-semibold transition ${
                            resendDisabled
                              ? "text-muted-foreground cursor-not-allowed"
                              : "text-action hover:underline"
                          }`}
                        >
                          {busy ? "Sending..." : "Resend link"}
                        </button>

                        {cooldown > 0 && (
                          <span className="text-xs text-muted-foreground tabular-nums">
                            Wait {cooldown}s ({MAX_RESENDS - resendCount} resend{MAX_RESENDS - resendCount !== 1 ? "s" : ""} left)
                          </span>
                        )}

                        {cooldown === 0 && !resendExhausted && resendCount > 0 && (
                          <span className="text-xs text-muted-foreground">
                            {MAX_RESENDS - resendCount} resend{MAX_RESENDS - resendCount !== 1 ? "s" : ""} left
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    Enter your email and we'll send you a link to reset your password.
                  </p>
                  <input
                    className="field-input"
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                  <button disabled={busy} className="btn-primary">
                    {busy ? "Sending..." : "Send Reset Link"}
                  </button>
                </>
              )}
            </>
          )}

          {/* ── Sign In / Sign Up ── */}
          {mode !== "forgot" && (
            <>
              <h2 className="text-lg font-bold text-primary">
                {mode === "signin" ? "Teacher Sign In" : "Create Teacher Account"}
              </h2>

              <input
                className="field-input"
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              {/* Password */}
              <div className="relative">
                <input
                  className="field-input w-full pr-10"
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  minLength={mode === "signin" ? 6 : 8}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {/* Forgot password link — signin only */}
              {mode === "signin" && (
                <div className="flex justify-end -mt-1">
                  <button
                    type="button"
                    onClick={() => switchMode("forgot")}
                    className="text-xs text-muted-foreground hover:text-primary"
                  >
                    Forgot password?
                  </button>
                </div>
              )}

              {/* Live checklist — signup only */}
              {mode === "signup" && password.length > 0 && (
                <ul className="space-y-1 rounded-lg bg-gray-50 px-4 py-3 text-sm">
                  {checks.map((c) => (
                    <li key={c.label} className={`flex items-center gap-2 ${c.passed ? "text-green-600" : "text-red-500"}`}>
                      {c.passed ? <Check size={14} /> : <X size={14} />}
                      {c.label}
                    </li>
                  ))}
                </ul>
              )}

              {/* Confirm password — signup only */}
              {mode === "signup" && (
                <div className="space-y-1">
                  <div className="relative">
                    <input
                      className={`field-input w-full pr-10 ${confirm.length > 0 ? (confirmMatch ? "border-green-500" : "border-red-400") : ""}`}
                      type={showConfirm ? "text" : "password"}
                      placeholder="Confirm password"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {confirm.length > 0 && (
                    <p className={`text-xs ${confirmMatch ? "text-green-600" : "text-red-500"}`}>
                      {confirmMatch ? "Passwords match" : "Passwords do not match"}
                    </p>
                  )}
                </div>
              )}

              <button disabled={busy} className="btn-primary">
                {busy ? "..." : mode === "signin" ? "Sign In" : "Sign Up"}
              </button>

              <button type="button" onClick={() => switchMode(mode === "signin" ? "signup" : "signin")} className="text-sm text-action font-semibold w-full">
                {mode === "signin" ? "Need an account? Sign up" : "Have an account? Sign in"}
              </button>

              <div className="flex items-center gap-3 pt-1">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground">or</span>
                <div className="flex-1 h-px bg-border" />
              </div>
              <button
                type="button"
                onClick={() => nav("/")}
                className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-primary w-full"
              >
                <ArrowLeft size={14} /> I'm a Student
              </button>
            </>
          )}

        </form>
      </div>
    </div>
  );
}