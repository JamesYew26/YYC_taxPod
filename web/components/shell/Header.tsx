import Link from "next/link";
import { Icon } from "@/components/ui/glass";

export function Header() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 h-16 border-b border-white/10 bg-ink-900/40 backdrop-blur-xl">
      <div className="flex h-full items-center justify-between gap-4 px-4 lg:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="btn-glow flex h-9 w-9 items-center justify-center rounded-xl">
            <Icon name="account_balance" className="text-[20px] text-white" />
          </span>
          <span className="text-[17px] font-semibold tracking-tight">
            YYC <span className="text-gradient">taxPod</span>
          </span>
        </Link>

        <form action="/contacts" className="hidden max-w-md flex-1 md:block">
          <label className="glass flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-fg-muted focus-within:ring-1 focus-within:ring-teal/50">
            <Icon name="search" className="text-[18px]" />
            <input
              name="q"
              type="search"
              placeholder="Search contacts, companies, deals…"
              className="w-full bg-transparent text-fg placeholder:text-fg-subtle focus:outline-none"
            />
          </label>
        </form>

        <div className="flex items-center gap-3">
          <span className="hidden rounded-full bg-white/5 px-3 py-1 text-xs text-fg-muted ring-1 ring-inset ring-white/10 sm:inline">
            YA 2026
          </span>
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-teal/60 to-violet/60 ring-1 ring-white/20">
            <Icon name="person" className="text-[18px] text-white" />
          </span>
        </div>
      </div>
    </header>
  );
}
