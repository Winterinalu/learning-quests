import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { QRCodeCanvas } from "qrcode.react";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { Trophy } from "lucide-react";

export default function Complete() {
  const { groupId } = useParams();
  const [groupName, setGroupName] = useState<string>("");
  const url = `${window.location.origin}/teacher/dashboard`;

  useEffect(() => {
    if (!groupId) return;
    (async () => {
      const { data } = await supabase
        .from("groups").select("group_name,finish_time").eq("id", groupId).maybeSingle();
      if (data) {
        setGroupName(data.group_name);
        if (!data.finish_time) {
          await supabase.from("groups").update({ finish_time: new Date().toISOString() }).eq("id", groupId);
        }
      }
    })();
  }, [groupId]);

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
          {groupName && (
            <p className="text-base font-semibold text-foreground">Well done, Group {groupName}!</p>
          )}
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
