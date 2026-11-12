"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, Pill, cx } from "@/components/ui/glass";

const NAV = [
  { href: "/", label: "Dashboard", icon: "space_dashboard" },
  { href: "/contacts", label: "Contacts", icon: "group" },
  { href: "/pipeline", label: "Pipeline", icon: "view_kanban" },
  { href: "/activities", label: "Activities", icon: "history" },
  { href: "/ask", label: "Ask Tax AI", icon: "auto_awesome", badge: "AI" },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed bottom-0 left-0 top-16 z-40 hidden w-64 flex-col justify-between border-r border-white/10 bg-ink-900/30 p-4 backdrop-blur-xl lg:flex">
      <nav className="flex flex-col gap-1">
        <p className="px-3 pb-2 text-[11px] font-medium uppercase tracking-wider text-fg-subtle">
          Workspace
        </p>
        {NAV.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cx(
                "flex items-center justify-between rounded-xl px-3 py-2.5 text-sm transition-colors",
                active
                  ? "glass-strong font-medium text-fg"
                  : "text-fg-muted hover:bg-white/5 hover:text-fg",
              )}
            >
              <span className="flex items-center gap-3">
                <Icon
                  name={item.icon}
                  className={cx("text-[20px]", active ? "text-teal-soft" : item.badge && "text-violet-soft")}
                />
                {item.label}
              </span>
              {item.badge && <Pill tone="violet">{item.badge}</Pill>}
            </Link>
          );
        })}
      </nav>

      <div className="glass rounded-2xl p-4">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Icon name="menu_book" className="text-[18px] text-teal-soft" />
          Knowledge base
        </div>
        <p className="mt-1 text-xs leading-relaxed text-fg-muted">
          LHDN public rulings and guides. Every answer cites its page.
        </p>
      </div>
    </aside>
  );
}
