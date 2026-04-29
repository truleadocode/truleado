'use client';

/**
 * Section primitives for the redesigned scrolling sidebar.
 *
 * Each block in the sidebar is a `<Section>` with a stable header style.
 * Some blocks (Similar / Connected) wrap themselves in `<DetailsSection>`
 * to render a collapsed `<details>` accordion instead.
 */

interface SectionProps {
  title: string;
  description?: string;
  rightSlot?: React.ReactNode;
  children: React.ReactNode;
}

export function Section({ title, description, rightSlot, children }: SectionProps) {
  return (
    <section className="border-b border-tru-slate-100 px-6 py-5 last:border-b-0">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <div>
          <h3 className="text-[11px] font-bold uppercase tracking-[0.08em] text-tru-slate-400">
            {title}
          </h3>
          {description ? (
            <p className="mt-0.5 text-[11px] text-tru-slate-500">{description}</p>
          ) : null}
        </div>
        {rightSlot ? <div className="text-[11px] text-tru-slate-500">{rightSlot}</div> : null}
      </div>
      {children}
    </section>
  );
}

