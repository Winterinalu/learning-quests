import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { toast } from "sonner";
import { Eye, EyeOff, Check, X } from "lucide-react";

const passwordRules = [
  { label: "At least 8 characters",          test: (p: string) => p.length >= 8 },
  { label: "Uppercase and lowercase letters", test: (p: string) => /[a-z]/.test(p) && /[A-Z]/.test(p) },
  { label: "At least one number",             test: (p: string) => /[0-9]/.test(p) },
  { label: "At least one special character",  test: (p: string) => /[^a-zA-Z0-9]/.test(p) },
];

export default function TeacherLogin() {
  const nav = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const checks = passwordRules.map((r) => ({ ...r, passed: r.test(password) }));
  const passwordValid = checks.every((c) => c.passed);
  const confirmMatch = password === confirm && confirm.length > 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
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
      else { toast.success("Account created!"); nav("/teacher/dashboard"); }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) toast.error(error.message);
      else nav("/teacher/dashboard");
    }
    setBusy(false);
  }

  function switchMode() {
    setMode(mode === "signin" ? "signup" : "signin");
    setPassword("");
    setConfirm("");
    setShowPassword(false);
    setShowConfirm(false);
  }

  return (
    <div className="app-shell">
      <AppHeader/>
      <div className="px-4">
        <form onSubmit={submit} className="app-card space-y-3">
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
              placeholder={mode === "signup" ? "Password" : "Password"}
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
          <button type="button" onClick={switchMode} className="text-sm text-action font-semibold w-full">
            {mode === "signin" ? "Need an account? Sign up" : "Have an account? Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}