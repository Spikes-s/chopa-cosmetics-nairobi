import { Fragment } from 'react';

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Splits `text` and wraps occurrences of `query` (case-insensitive, whole or partial)
 * in a highlighted <mark>. Multiple whitespace-separated tokens are highlighted.
 */
export function Highlight({ text, query, className = 'bg-primary/20 text-primary font-semibold rounded-sm' }: {
  text: string;
  query: string;
  className?: string;
}) {
  if (!query || !text) return <>{text}</>;
  const tokens = query.trim().split(/\s+/).filter(t => t.length >= 1).map(escapeRegex);
  if (tokens.length === 0) return <>{text}</>;
  const re = new RegExp(`(${tokens.join('|')})`, 'gi');
  const parts = text.split(re);
  return (
    <>
      {parts.map((p, i) =>
        re.test(p) ? <mark key={i} className={className}>{p}</mark> : <Fragment key={i}>{p}</Fragment>
      )}
    </>
  );
}
