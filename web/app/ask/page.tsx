import { Suspense } from "react";
import { Icon, Pill } from "@/components/ui/glass";
import { AskChat } from "./AskChat";

export const metadata = {
  title: "Ask Tax AI · YYC taxPod",
};

const KNOWLEDGE_BASE = ["3 LHDN public rulings", "e-Invoice Guideline", "2 service tax guides"];

export default function AskPage() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-5 p-4 lg:p-6">
      <section className="flex flex-col gap-3">
        <div>
          <p className="text-sm text-fg-muted">Ask Tax AI</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
            Answers <span className="text-gradient">cited to the page</span>
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-fg-muted">
            Questions are answered only from the documents below. If they don&apos;t cover your question, the
            assistant says so instead of guessing.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Icon name="menu_book" className="text-[16px] text-teal-soft" />
          {KNOWLEDGE_BASE.map((d) => (
            <Pill key={d}>{d}</Pill>
          ))}
        </div>
      </section>

      {/* useSearchParams (for ?q= from the dashboard) needs a Suspense boundary so the shell can prerender. */}
      <Suspense fallback={<div className="glass h-40 animate-pulse rounded-2xl" />}>
        <AskChat />
      </Suspense>

      <p className="text-center text-[11px] text-fg-subtle">
        Generated from published LHDN and JKDM guidance. Not tax advice — verify with the cited source.
      </p>
    </div>
  );
}
