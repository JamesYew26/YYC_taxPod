import { Fragment, type ReactNode } from "react";
import { cx } from "@/components/ui/glass";

/**
 * Renders a model answer safely as React nodes (no dangerouslySetInnerHTML):
 *  - "[n]" citation markers → small clickable chips that highlight source n
 *  - **bold** → <strong>
 *  - lines starting with "- ", "* " or "1. " → list items; blank lines → paragraph breaks
 */
export function AnswerText({
  text,
  validCitations,
  onCite,
}: {
  text: string;
  validCitations: Set<number>;
  onCite: (n: number) => void;
}) {
  const blocks: ReactNode[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;

  const flushList = () => {
    if (!list) return;
    const Tag = list.ordered ? "ol" : "ul";
    blocks.push(
      <Tag
        key={blocks.length}
        className={cx("flex flex-col gap-1.5 pl-5", list.ordered ? "list-decimal" : "list-disc", "marker:text-fg-subtle")}
      >
        {list.items.map((item, i) => (
          <li key={i}>{inline(item, validCitations, onCite)}</li>
        ))}
      </Tag>,
    );
    list = null;
  };

  for (const raw of text.split("\n")) {
    const line = raw.trim();
    const bullet = line.match(/^[-*•]\s+(.*)$/);
    const numbered = line.match(/^\d+[.)]\s+(.*)$/);
    if (bullet || numbered) {
      const ordered = Boolean(numbered);
      if (list && list.ordered !== ordered) flushList();
      list ??= { ordered, items: [] };
      list.items.push((bullet ?? numbered)![1]);
      continue;
    }
    flushList();
    if (line) blocks.push(<p key={blocks.length}>{inline(line, validCitations, onCite)}</p>);
  }
  flushList();

  return <div className="flex flex-col gap-3 text-[15px] leading-relaxed text-fg/90">{blocks}</div>;
}

function inline(text: string, valid: Set<number>, onCite: (n: number) => void): ReactNode[] {
  // Split on **bold** and [n] tokens, keeping the delimiters.
  return text.split(/(\*\*[^*]+\*\*|\[\d+\])/g).map((part, i) => {
    const bold = part.match(/^\*\*([^*]+)\*\*$/);
    if (bold) return <strong key={i} className="font-semibold text-fg">{bold[1]}</strong>;

    const cite = part.match(/^\[(\d+)\]$/);
    if (cite && valid.has(Number(cite[1]))) {
      const n = Number(cite[1]);
      return (
        <button
          key={i}
          type="button"
          onClick={() => onCite(n)}
          aria-label={`Show source ${n}`}
          className="mx-0.5 inline-flex h-[18px] min-w-[18px] -translate-y-px items-center justify-center rounded-md bg-teal/15 px-1 align-middle font-mono text-[11px] font-medium text-teal-soft ring-1 ring-inset ring-teal/30 transition-colors hover:bg-teal/30"
        >
          {n}
        </button>
      );
    }
    return <Fragment key={i}>{part}</Fragment>;
  });
}
