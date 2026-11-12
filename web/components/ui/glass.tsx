/**
 * Building blocks for the dark fintech glassmorphism look:
 * a glowing backdrop, frosted cards, pills and icons.
 */
import type { ReactNode } from "react";

export function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

/** Fixed, blurred colour orbs behind everything. */
export function Backdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full bg-teal/25 blur-[120px]" />
      <div className="absolute -right-32 top-1/3 h-[480px] w-[480px] rounded-full bg-violet/25 blur-[120px]" />
      <div className="absolute -bottom-40 left-1/3 h-[420px] w-[420px] rounded-full bg-teal/10 blur-[120px]" />
    </div>
  );
}

export function GlassCard({
  children,
  className,
  as: Tag = "section",
}: {
  children: ReactNode;
  className?: string;
  as?: "section" | "div" | "article";
}) {
  return <Tag className={cx("glass rounded-2xl", className)}>{children}</Tag>;
}

export function CardHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  return (
    <header className="flex items-start justify-between gap-3 px-5 pt-5">
      <div>
        <h2 className="text-[15px] font-semibold text-fg">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-fg-muted">{subtitle}</p>}
      </div>
      {right}
    </header>
  );
}

const PILL_TONES = {
  neutral: "bg-white/5 text-fg-muted ring-white/10",
  teal: "bg-teal/15 text-teal-soft ring-teal/30",
  violet: "bg-violet/15 text-violet-soft ring-violet/30",
  amber: "bg-amber/10 text-amber ring-amber/25",
  rose: "bg-rose/10 text-rose ring-rose/25",
} as const;

export type PillTone = keyof typeof PILL_TONES;

export function Pill({ children, tone = "neutral" }: { children: ReactNode; tone?: PillTone }) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset",
        PILL_TONES[tone],
      )}
    >
      {children}
    </span>
  );
}

export function Icon({ name, className }: { name: string; className?: string }) {
  return (
    <span aria-hidden className={cx("icon", className)}>
      {name}
    </span>
  );
}

/** Rounded gradient tile holding an icon. */
export function IconTile({ name, tone = "teal" }: { name: string; tone?: "teal" | "violet" }) {
  return (
    <span
      className={cx(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset",
        tone === "teal" ? "bg-teal/15 text-teal-soft ring-teal/30" : "bg-violet/15 text-violet-soft ring-violet/30",
      )}
    >
      <Icon name={name} className="text-[20px]" />
    </span>
  );
}
