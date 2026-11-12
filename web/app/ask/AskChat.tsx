"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { AnswerText } from "@/components/ask/AnswerText";
import { Icon, IconTile, Pill, cx, type PillTone } from "@/components/ui/glass";
import type { AskResult, Citation } from "@/lib/rag/answer"; // type-only: no server code reaches the browser
import { SUGGESTED_QUESTIONS } from "@/lib/rag/suggestions";

const MAX_LENGTH = 500;

const FILTERS = [
  { value: "", label: "All documents" },
  { value: "public_ruling", label: "Public rulings" },
  { value: "sst", label: "Service tax" },
  { value: "e_invoice", label: "e-Invoice" },
] as const;

const SUGGESTIONS = SUGGESTED_QUESTIONS;

type Turn =
  | { id: number; question: string; state: "pending" }
  | { id: number; question: string; state: "done"; result: AskResult }
  | { id: number; question: string; state: "error"; message: string; docType: string };

export function AskChat() {
  const searchParams = useSearchParams();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [docType, setDocType] = useState("");
  const nextId = useRef(1);
  const autoAsked = useRef(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const busy = turns.some((t) => t.state === "pending");

  async function ask(question: string, filter = docType) {
    const q = question.trim();
    if (q.length < 3 || busy) return;
    const id = nextId.current++;
    setTurns((prev) => [...prev, { id, question: q, state: "pending" }]);
    setDraft("");

    let turn: Turn;
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, docType: filter || undefined }),
      });
      const data = await res.json();
      turn = res.ok
        ? { id, question: q, state: "done", result: data as AskResult }
        : { id, question: q, state: "error", message: data.message ?? "Something went wrong.", docType: filter };
    } catch {
      turn = { id, question: q, state: "error", message: "Couldn't reach the server. Check your connection.", docType: filter };
    }
    setTurns((prev) => prev.map((t) => (t.id === id ? turn : t)));
  }

  // Questions sent from the dashboard arrive as /ask?q=...
  useEffect(() => {
    const q = searchParams.get("q");
    if (q && !autoAsked.current) {
      autoAsked.current = true;
      void ask(q);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns]);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void ask(draft);
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void ask(draft);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Conversation */}
      {turns.length === 0 ? (
        <EmptyState onPick={(q) => void ask(q)} />
      ) : (
        <ol className="flex flex-col gap-5" aria-live="polite">
          {turns.map((t) => (
            <li key={t.id} className="flex flex-col gap-3">
              <UserBubble text={t.question} />
              {t.state === "pending" && <PendingCard />}
              {t.state === "done" && <AnswerCard result={t.result} />}
              {t.state === "error" && (
                <ErrorCard message={t.message} disabled={busy} onRetry={() => void ask(t.question, t.docType)} />
              )}
            </li>
          ))}
        </ol>
      )}
      <div ref={bottomRef} />

      {/* Composer */}
      <form
        onSubmit={onSubmit}
        // Opaque ink base under the glass so answers scrolling behind the sticky composer don't show through.
        className="glass-strong sticky bottom-4 z-10 flex flex-col gap-2 rounded-2xl !bg-ink-800/95 p-2 shadow-2xl shadow-black/50 focus-within:ring-1 focus-within:ring-violet/50"
      >
        <div className="flex items-end gap-2 pl-3">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value.slice(0, MAX_LENGTH))}
            onKeyDown={onKeyDown}
            rows={1}
            aria-label="Ask a tax question"
            placeholder="Ask about Malaysian income tax, service tax or e-invoicing…"
            className="max-h-40 min-h-[40px] flex-1 resize-none bg-transparent py-2.5 text-sm text-fg [field-sizing:content] placeholder:text-fg-subtle focus:outline-none"
          />
          <button
            type="submit"
            disabled={busy || draft.trim().length < 3}
            className="btn-glow flex h-10 items-center gap-1 rounded-xl px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:filter-none"
          >
            {busy ? "Asking…" : "Ask"} <Icon name="arrow_upward" className="text-[18px]" />
          </button>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 px-1">
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Search in">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                role="radio"
                aria-checked={docType === f.value}
                onClick={() => setDocType(f.value)}
                className={cx(
                  "rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ring-inset transition-colors",
                  docType === f.value
                    ? "bg-violet/20 text-violet-soft ring-violet/40"
                    : "bg-white/5 text-fg-muted ring-white/10 hover:bg-white/10 hover:text-fg",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
          <span className="font-mono text-[11px] tabular-nums text-fg-subtle">
            {draft.length}/{MAX_LENGTH}
            <span className="hidden xl:inline"> · Enter to send, Shift+Enter for a new line</span>
          </span>
        </div>
      </form>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function EmptyState({ onPick }: { onPick: (q: string) => void }) {
  return (
    <div className="glass relative overflow-hidden rounded-2xl p-6">
      <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-violet/25 blur-3xl" />
      <div className="relative">
        <h2 className="text-[15px] font-semibold">Try one of these</h2>
        <p className="mt-0.5 text-xs text-fg-muted">
          Each question is answered independently, from the documents only.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {SUGGESTIONS.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => onPick(q)}
              className="flex items-start gap-2 rounded-xl bg-white/5 p-3 text-left text-sm text-fg-muted ring-1 ring-inset ring-white/10 transition-colors hover:bg-white/10 hover:text-fg"
            >
              <Icon name="north_east" className="mt-0.5 text-[16px] text-violet-soft" />
              {q}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function UserBubble({ text }: { text: string }) {
  return (
    <div className="flex justify-end">
      <p className="max-w-[85%] rounded-2xl rounded-br-md bg-gradient-to-br from-teal/25 to-violet/25 px-4 py-2.5 text-sm text-fg ring-1 ring-inset ring-white/15">
        {text}
      </p>
    </div>
  );
}

function PendingCard() {
  return (
    <div className="glass flex items-center gap-3 rounded-2xl p-4">
      <IconTile name="auto_awesome" tone="violet" />
      <div className="flex-1">
        <p className="text-sm text-fg-muted">Searching the knowledge base and drafting a cited answer…</p>
        <div className="mt-2 flex flex-col gap-1.5" aria-hidden>
          <div className="h-2 w-3/4 animate-pulse rounded-full bg-white/10" />
          <div className="h-2 w-1/2 animate-pulse rounded-full bg-white/10" />
        </div>
      </div>
    </div>
  );
}

function ErrorCard({ message, onRetry, disabled }: { message: string; onRetry: () => void; disabled: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-rose/10 p-4 ring-1 ring-inset ring-rose/25">
      <span className="flex items-center gap-2 text-sm text-rose">
        <Icon name="error" className="text-[20px]" /> {message}
      </span>
      <button
        type="button"
        onClick={onRetry}
        disabled={disabled}
        className="glass rounded-xl px-3 py-1.5 text-xs font-medium text-fg hover:bg-white/10 disabled:opacity-40"
      >
        Try again
      </button>
    </div>
  );
}

const STATUS: Record<string, { label: string; tone: PillTone; icon: string }> = {
  answered: { label: "Answered from documents", tone: "teal", icon: "verified" },
  below_threshold: { label: "No relevant passages found", tone: "amber", icon: "search_off" },
  llm_declined: { label: "Not covered by the documents", tone: "amber", icon: "info" },
  no_valid_citations: { label: "Couldn't ground an answer", tone: "amber", icon: "info" },
};

function AnswerCard({ result }: { result: AskResult }) {
  const [highlighted, setHighlighted] = useState<number | null>(null);
  const sourceRefs = useRef(new Map<number, HTMLLIElement>());
  const status = STATUS[result.status === "answered" ? "answered" : (result.reason ?? "llm_declined")];
  const valid = new Set(result.citations.map((c) => c.n));

  function showSource(n: number) {
    setHighlighted(n);
    sourceRefs.current.get(n)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  return (
    <article className="glass rounded-2xl">
      <header className="flex items-center gap-3 px-5 pt-4">
        <IconTile name="auto_awesome" tone="violet" />
        <Pill tone={status.tone}>
          <Icon name={status.icon} className="text-[13px]" /> {status.label}
        </Pill>
      </header>

      <div className="px-5 py-4">
        <AnswerText text={result.answer} validCitations={valid} onCite={showSource} />
      </div>

      {result.citations.length > 0 && (
        <section className="border-t border-white/10 px-5 py-4">
          <h3 className="text-[11px] font-medium uppercase tracking-wider text-fg-subtle">Sources</h3>
          <ul className="mt-2 flex flex-col gap-1.5">
            {result.citations.map((c) => (
              <li
                key={c.n}
                ref={(el) => {
                  if (el) sourceRefs.current.set(c.n, el);
                }}
                className={cx(
                  "flex items-start gap-3 rounded-xl p-2.5 ring-1 ring-inset transition-colors",
                  highlighted === c.n ? "bg-teal/10 ring-teal/40" : "ring-transparent hover:bg-white/5",
                )}
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-teal/15 font-mono text-[11px] font-medium text-teal-soft ring-1 ring-inset ring-teal/30">
                  {c.n}
                </span>
                <SourceLine citation={c} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <footer className="border-t border-white/10 px-5 py-3">
        <details className="group text-xs text-fg-subtle">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 hover:text-fg-muted">
            <span className="flex items-center gap-1">
              <Icon name="chevron_right" className="text-[16px] transition-transform group-open:rotate-90" />
              Retrieval details
            </span>
            <span className="font-mono tabular-nums">
              {result.model ?? "no LLM call"} · {(result.timings_ms.total / 1000).toFixed(1)}s
            </span>
          </summary>
          <div className="mt-3 flex flex-col gap-3">
            <table className="w-full text-left">
              <thead className="text-fg-subtle">
                <tr>
                  <th className="py-1 pr-2 font-medium">#</th>
                  <th className="py-1 pr-2 font-medium">Chunk</th>
                  <th className="py-1 text-right font-medium">Similarity</th>
                </tr>
              </thead>
              <tbody className="text-fg-muted">
                {result.retrieved.map((r) => (
                  <tr key={r.n} className="border-t border-white/5">
                    <td className="py-1.5 pr-2 font-mono">{r.n}</td>
                    <td className="py-1.5 pr-2">
                      {r.title} · {r.section ?? "—"} · {r.pages}
                    </td>
                    <td className="py-1.5 text-right font-mono tabular-nums">{r.similarity.toFixed(3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="font-mono tabular-nums">
              embed {result.timings_ms.embed}ms · retrieve {result.timings_ms.retrieve}ms · llm {result.timings_ms.llm}ms
            </p>
            {result.warnings.length > 0 && (
              <ul className="flex flex-col gap-0.5 text-amber/80">
                {result.warnings.map((w) => (
                  <li key={w}>⚠ {w}</li>
                ))}
              </ul>
            )}
          </div>
        </details>
      </footer>
    </article>
  );
}

function SourceLine({ citation: c }: { citation: Citation }) {
  const pages = c.page_start === c.page_end ? `p. ${c.page_start}` : `pp. ${c.page_start}–${c.page_end}`;
  const body = (
    <span className="min-w-0 text-sm">
      <span className="block font-medium text-fg">{c.title}</span>
      <span className="block text-xs text-fg-muted">
        {c.section ? `${c.section} · ` : ""}
        {pages}
      </span>
    </span>
  );
  if (!c.source_url) return body;
  return (
    // #page=N opens most browser PDF viewers at the cited page.
    <a
      href={`${c.source_url}#page=${c.page_start}`}
      target="_blank"
      rel="noreferrer"
      className="group flex min-w-0 flex-1 items-start justify-between gap-2"
    >
      {body}
      <Icon name="open_in_new" className="mt-0.5 shrink-0 text-[16px] text-fg-subtle group-hover:text-teal-soft" />
    </a>
  );
}
