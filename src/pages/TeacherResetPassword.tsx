import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { toast } from "sonner";
import { Eye, EyeOff, Check, X, Link2Off, CheckCircle } from "lucide-react";

const passwordRules = [
  { label: "At least 8 characters",          test: (p: string) => p.length >= 8 },
  { label: "Uppercase and lowercase letters", test: (p: string) => /[a-z]/.test(p) && /[A-Z]/.test(p) },
  { label: "At least one number",             test: (p: string) => /[0-9]/.test(p) },
  { label: "At least one special character",  test: (p: string) => /[^a-zA-Z0-9]/.test(p) },
];

export default function TeacherResetPassword() {
  const nav = useNavigate();
  const [ready, setReady] = useState(false);
  const [invalidLink, setInvalidLink] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const checks = passwordRules.map((r) => ({ ...r, passed: r.test(password) }));
  const passwordValid = checks.every((c) => c.passed);
  const confirmMatch = password === confirm && confirm.length > 0;

  useEffect(() => {
    supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });

    const hash = window.location.hash;
    if (!hash || !hash.includes("access_token")) {
      setTimeout(() => {
        if (!ready) setInvalidLink(true);
      }, 2000);
    }
  }, []);

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    if (!passwordValid) { toast.error("Password does not meet all requirements."); return; }
    if (!confirmMatch)  { toast.error("Passwords do not match."); return; }

    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);

    if (error) {
      toast.error(error.message);
    } else {
      setDone(true);
      setTimeout(() => nav("/teacher/login"), 3000);
    }
  }

  return (
    <div className="app-shell">
      <AppHeader />
      <div className="px-4">
        <div className="app-card space-y-4">

          {/* Invalid link */}
          {invalidLink && !ready && (
            <div className="text-center space-y-3 py-4">
              <div className="mx-auto w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
                <Link2Off className="w-6 h-6 text-red-500" />
              </div>
              <h2 className="text-lg font-bold text-primary">Invalid or Expired Link</h2>
              <p className="text-sm text-muted-foreground">
                This password reset link is no longer valid. Please request a new one.
              </p>
              <button onClick={() => nav("/teacher/login")} className="btn-primary">
                Back to Sign In
              </button>
            </div>
          )}

          {/* Success */}
          {done && (
            <div className="text-center space-y-3 py-4">
              <div className="mx-auto w-12 h-12 rounded-full bg-green-50 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-500" />
              </div>
              <h2 className="text-lg font-bold text-primary">Password Updated!</h2>
              <p className="text-sm text-muted-foreground">
                Your password has been changed successfully. Redirecting you to sign in...
              </p>
            </div>
          )}

          {/* Reset form */}
          {ready && !done && (
            <form onSubmit={handleReset} className="space-y-3">
              <h2 className="text-lg font-bold text-primary">Set New Password</h2>
              <p className="text-sm text-muted-foreground">Enter your new password below.</p>

              {/* New password */}
              <div className="relative">
                <input
                  className="field-input w-full pr-10"
                  type={showPassword ? "text" : "password"}
                  placeholder="New password"
                  value={password}
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

              {/* Live checklist */}
              {password.length > 0 && (
                <ul className="space-y-1 rounded-lg bg-gray-50 px-4 py-3 text-sm">
                  {checks.map((c) => (
                    <li key={c.label} className={`flex items-center gap-2 ${c.passed ? "text-green-600" : "text-red-500"}`}>
                      {c.passed ? <Check size={14} /> : <X size={14} />}
                      {c.label}
                    </li>
                  ))}
                </ul>
              )}

              {/* Confirm password */}
              <div className="space-y-1">
                <div className="relative">
                  <input
                    className={`field-input w-full pr-10 ${confirm.length > 0 ? (confirmMatch ? "border-green-500" : "border-red-400") : ""}`}
                    type={showConfirm ? "text" : "password"}
                    placeholder="Confirm new password"
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

              <button disabled={busy} className="btn-primary">
                {busy ? "Updating..." : "Update Password"}
              </button>
            </form>
          )}

          {/* Loading state */}
          {!ready && !invalidLink && !done && (
            <div className="text-center py-6 text-sm text-muted-foreground">
              Verifying your reset link...
            </div>
          )}

        </div>
      </div>
    </div>
  );
}