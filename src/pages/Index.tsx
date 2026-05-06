import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { InfoBox } from "@/components/InfoBox";
import { GraduationCap, Users } from "lucide-react";

export default function Index() {
  const nav = useNavigate();
  useEffect(() => {
    document.title = "READ E-COM: Learning Quest";
  }, []);
  return (
    <div className="app-shell">
      <AppHeader subtitle="A reading escape-room adventure" />
      <main className="px-4 space-y-4">
        <div className="app-card space-y-2 text-center">
          <h2 className="text-lg font-bold text-primary">Welcome, Investigators!</h2>
          <p className="text-sm text-muted-foreground">
            Solve the mystery of <strong>Room 407</strong> by working through five physical
            compartments — read, decode, and unlock!
          </p>
        </div>
        <InfoBox icon={Users} label="I'm a Student" onClick={async () => {
          const code = prompt("Enter your session join code:")?.toUpperCase().trim();
          if (!code) return;
          const { data } = await supabase.from("sessions").select("id").eq("join_code", code).maybeSingle();
          if (!data) return alert("Session not found");
          nav(`/join/${data.id}`);
        }}>
          Tap to enter your teacher's join code, then register your group.
        </InfoBox>
        <InfoBox icon={GraduationCap} label="I'm a Teacher" onClick={() => nav("/teacher/login")}>
          Create sessions, edit challenges, and watch the live leaderboard.
        </InfoBox>
      </main>
    </div>
  );
}
