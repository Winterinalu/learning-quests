import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { InfoBox } from "@/components/InfoBox";
import { Users, AlertTriangle, Plus, X } from "lucide-react";
import { toast } from "sonner";

export default function Join() {
  const { sessionId } = useParams();
  const nav = useNavigate();
  const [session, setSession] = useState<any>(null);
  const [open, setOpen] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [members, setMembers] = useState<string[]>([""]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!sessionId) return;
    supabase.from("sessions").select("*").eq("id", sessionId).maybeSingle().then(({ data }) => {
      setSession(data);
    });
  }, [sessionId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!groupName.trim()) return toast.error("Please enter a group name");
    const cleanMembers = members.map((m) => m.trim()).filter(Boolean);
    if (cleanMembers.length === 0) return toast.error("Add at least one member");

    // Re-check late registration
    const { data: latest } = await supabase
      .from("sessions").select("allow_late_registration,is_active").eq("id", sessionId!).maybeSingle();
    if (!latest?.is_active) return toast.error("This session is not active.");
    if (!latest.allow_late_registration) return toast.error("Registration is now closed.");

    setSubmitting(true);
    const { data, error } = await supabase
      .from("groups")
      .insert({ session_id: sessionId, group_name: groupName.trim(), members: cleanMembers })
      .select()
      .single();
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Group registered!");
    nav(`/play/${data.id}`);
  }

  if (!session) {
    return (
      <div className="app-shell">
        <AppHeader />
        <div className="px-4">
          <div className="app-card text-center text-muted-foreground">Session not found.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell pb-12">
      <AppHeader />
      <div className="px-4 space-y-4">
        <div className="app-card space-y-3">
          <h2 className="text-lg font-bold text-primary">
            The Last Message of Room 407 – Group Registration
          </h2>
          <p className="text-sm text-muted-foreground">
            Register your group before you begin the escape-room style reading activity.
            One member should fill this in for the whole group.
          </p>
          <p className="text-sm text-foreground/80">
            You'll work through five physical compartments. After each puzzle, scan the QR code
            inside the compartment to unlock the next challenge on this device.
          </p>
        </div>

        <InfoBox icon={Users} label="Group Registration" onClick={() => setOpen((v) => !v)}>
          Tap to {open ? "hide" : "open"} the registration form.
        </InfoBox>

        {open && (
          <form onSubmit={submit} className="app-card space-y-3 animate-pop-in">
            <label className="block">
              <span className="text-sm font-semibold text-primary">Group Name</span>
              <input className="field-input mt-1" value={groupName} onChange={(e) => setGroupName(e.target.value)} maxLength={60} />
            </label>
            <div className="space-y-2">
              <span className="text-sm font-semibold text-primary">Members</span>
              {members.map((m, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    className="field-input"
                    placeholder={`Member ${i + 1}`}
                    value={m}
                    maxLength={60}
                    onChange={(e) => setMembers(members.map((mm, j) => (i === j ? e.target.value : mm)))}
                  />
                  {members.length > 1 && (
                    <button type="button" onClick={() => setMembers(members.filter((_, j) => j !== i))} className="px-3 rounded-xl bg-muted text-muted-foreground">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              {members.length < 6 && (
                <button type="button" onClick={() => setMembers([...members, ""])} className="text-sm text-action font-semibold flex items-center gap-1">
                  <Plus className="w-4 h-4" /> Add member
                </button>
              )}
            </div>
            <button disabled={submitting} className="btn-primary">
              {submitting ? "Registering..." : "Register Group"}
            </button>
          </form>
        )}

        <InfoBox icon={AlertTriangle} label="Only registered groups can continue to the activity." tone="warning">
          Make sure your group is registered above before you head to Compartment 1.
        </InfoBox>
      </div>
    </div>
  );
}
