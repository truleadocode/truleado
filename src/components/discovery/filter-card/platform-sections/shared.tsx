'use client';

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-2.5 text-[10.5px] font-bold uppercase tracking-[0.08em] text-tru-slate-400">
      {children}
    </div>
  );
}
