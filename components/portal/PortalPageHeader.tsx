import type { LucideIcon } from "lucide-react";

type PortalPageHeaderProps = {
  eyebrow: string;
  title: string;
  description?: string;
  icon?: LucideIcon;
  actions?: React.ReactNode;
  stats?: { label: string; value: string | number; tone?: string }[];
};

/**
 * Shared header for portal pages so every section opens the same way:
 * a small context label, a strong title, and optional facts/actions.
 */
export default function PortalPageHeader({
  eyebrow,
  title,
  description,
  icon: Icon,
  actions,
  stats,
}: PortalPageHeaderProps) {
  return (
    <header className="animate-rise overflow-hidden rounded-3xl border border-emerald-100 bg-white shadow-sm">
      <div className="hero-mesh relative px-5 py-6 text-white sm:px-7 sm:py-7">
        <span className="pointer-events-none absolute -right-10 -top-14 h-40 w-40 rounded-full bg-lime-300/20 blur-3xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-lime-200">
              {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
              {eyebrow}
            </p>
            <h1 className="mt-1.5 text-2xl font-black leading-tight text-balance sm:text-3xl">{title}</h1>
            {description ? (
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-emerald-50/85">{description}</p>
            ) : null}
          </div>
          {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
        </div>
      </div>

      {stats && stats.length > 0 ? (
        <div className="scrollbar-hide flex gap-3 overflow-x-auto px-5 py-3.5 sm:px-7">
          {stats.map((stat) => (
            <div key={stat.label} className="flex shrink-0 items-center gap-2">
              <span className={`text-sm font-black ${stat.tone || "text-emerald-900"}`}>{stat.value}</span>
              <span className="text-[11px] font-semibold text-muted">{stat.label}</span>
              <span className="ml-1 h-1 w-1 rounded-full bg-emerald-200 last:hidden" />
            </div>
          ))}
        </div>
      ) : null}
    </header>
  );
}
