import { Bot } from "lucide-react";

export function AppHeader({ subtitle }: { subtitle?: string }) {
  return (
    <header className="bg-background pt-8 pb-6 px-5 text-center">
      <div className="mx-auto w-14 h-14 rounded-2xl bg-primary flex items-center justify-center mb-3 shadow-[var(--shadow-elevated)]">
        <Bot className="w-8 h-8 text-primary-foreground" />
      </div>
      <h1 className="text-xl font-bold text-primary tracking-tight">
        READ E-COM: Learning Quest
      </h1>
      {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
    </header>
  );
}
