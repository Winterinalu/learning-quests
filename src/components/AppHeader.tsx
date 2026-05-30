export function AppHeader({ subtitle }: { subtitle?: string }) {
  return (
    <header className="bg-background pt-8 pb-6 px-5 text-center">
      <div className="mx-auto w-60 h-60 mb-3">
        <img src="/logoWithoutBg.png" alt="Learning Quests" className="w-full h-full object-contain" />
      </div>
      <h1 className="text-xl font-bold text-primary tracking-tight">
        READ E-COM: Learning Quest
      </h1>
      {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
    </header>
  );
}