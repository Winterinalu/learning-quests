import { LucideIcon } from "lucide-react";
import { ReactNode } from "react";

export function InfoBox({
  icon: Icon,
  label,
  children,
  onClick,
  tone = "default",
}: {
  icon: LucideIcon;
  label: string;
  children?: ReactNode;
  onClick?: () => void;
  tone?: "default" | "warning" | "success";
}) {
  const toneClass =
    tone === "warning"
      ? "text-warning"
      : tone === "success"
        ? "text-success"
        : "text-primary";
  const Wrap: any = onClick ? "button" : "div";
  return (
    <Wrap
      onClick={onClick}
      className={`info-box w-full text-left ${onClick ? "hover:shadow-[var(--shadow-elevated)] transition" : ""}`}
    >
      <div className={`flex-shrink-0 mt-0.5 ${toneClass}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-bold text-foreground">{label}</div>
        {children && <div className="text-sm text-muted-foreground mt-1">{children}</div>}
      </div>
    </Wrap>
  );
}
