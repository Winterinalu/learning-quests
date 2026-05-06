import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { toast } from "sonner";

export default function TeacherLogin() {
  const nav = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
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

  return (
    <div className="app-shell">
      <AppHeader subtitle="Teacher Portal" />
      <div className="px-4">
        <form onSubmit={submit} className="app-card space-y-3">
          <h2 className="text-lg font-bold text-primary">
            {mode === "signin" ? "Teacher Sign In" : "Create Teacher Account"}
          </h2>
          <input className="field-input" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input className="field-input" type="password" placeholder="Password (min 6)" value={password} minLength={6} onChange={(e) => setPassword(e.target.value)} required />
          <button disabled={busy} className="btn-primary">
            {busy ? "..." : mode === "signin" ? "Sign In" : "Sign Up"}
          </button>
          <button type="button" onClick={() => setMode(mode === "signin" ? "signup" : "signin")} className="text-sm text-action font-semibold w-full">
            {mode === "signin" ? "Need an account? Sign up" : "Have an account? Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
