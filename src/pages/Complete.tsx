import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { QRCodeCanvas } from "qrcode.react";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { Trophy } from "lucide-react";

export default function Complete() {
  const { groupId } = useParams();
  const url = `${window.location.origin}/teacher/dashboard`;

  useEffect(() => {
    if (!groupId) return;
    supabase.from("groups").select("finish_time").eq("id", groupId).maybeSingle().then(({ data }) => {
      if (data && !data.finish_time) {
        supabase.from("groups").update({ finish_time: new Date().toISOString() }).eq("id", groupId).then();
      }
    });
  }, [groupId]);

  const [groupName, setGroupName] = (function useGn() {
    // simple inline state
    return [null, () => {}] as const;
  })();

  return (
    <div className="app-shell pb-12">
      <AppHeader />
      <div className="px-4 space-y-4">
        <div className="app-card text-center space-y-4 animate-pop-in">
          <div className="mx-auto w-16 h-16 rounded-full bg-success/15 flex items-center justify-center">
            <Trophy className="w-9 h-9 text-success" />
          </div>
          <h2 className="text-2xl font-bold text-primary">Congratulations, Investigators!</h2>
          <p className="text-sm text-muted-foreground">
            You have solved "The Last Message of Room 407" and unlocked all compartments.
          </p>
          <GroupGreeting groupId={groupId!} />
          <p className="text-xs text-muted-foreground">
            Teacher: read the group name above to confirm against your registration list.
          </p>
          <div className="flex justify-center pt-2">
            <div className="bg-card p-3 rounded-xl shadow-[var(--shadow-card)]">
              <QRCodeCanvas value={url} size={160} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Show this QR to your teacher to mark completion.</p>
        </div>
      </div>
    </div>
  );
}

function GroupGreeting({ groupId }: { groupId: string }) {
  const [name, setName] = useStateName(groupId);
  return name ? (
    <p className="text-base font-semibold text-foreground">Well done, Group {name}!</p>
  ) : null;
}

import { useState } from "react";
function useStateName(groupId: string): [string | null, (s: string) => void] {
  const [name, setName] = useState<string | null>(null);
  useEffect(() => {
    supabase.from("groups").select("group_name").eq("id", groupId).maybeSingle().then(({ data }) => {
      if (data) setName(data.group_name);
    });
  }, [groupId]);
  return [name, setName];
}
