import { Fragment } from 'react';

/** Minimal markdown → React for marketing posts (h1/h2/p/ul + *em* / **strong**). */
export default function MarkdownBody({ source }) {
  const blocks = String(source || '')
    .replace(/\r\n/g, '\n')
    .trim()
    .split(/\n{2,}/);

  return (
    <div className="prose">
      {blocks.map((raw, i) => {
        const block = raw.trim();
        if (!block) return null;
        if (block.startsWith('# ')) {
          return <h1 key={i}>{inline(block.slice(2))}</h1>;
        }
        if (block.startsWith('## ')) {
          return <h2 key={i}>{inline(block.slice(3))}</h2>;
        }

        const lines = block.split('\n');
        const listStart = lines.findIndex((l) => /^[-*]\s+/.test(l.trim()));
        if (listStart >= 0) {
          const before = lines.slice(0, listStart).join(' ').trim();
          const items = lines
            .slice(listStart)
            .map((l) => l.trim())
            .filter((l) => /^[-*]\s+/.test(l))
            .map((l) => l.replace(/^[-*]\s+/, ''));
          return (
            <Fragment key={i}>
              {before ? <p>{inline(before)}</p> : null}
              <ul>
                {items.map((item, j) => (
                  <li key={j}>{inline(item)}</li>
                ))}
              </ul>
            </Fragment>
          );
        }

        return <p key={i}>{inline(block.replace(/\n/g, ' '))}</p>;
      })}
    </div>
  );
}

function inline(text) {
  const parts = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let last = 0;
  let match;
  let key = 0;
  while ((match = re.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    const token = match[0];
    if (token.startsWith('**')) {
      parts.push(<strong key={key++}>{token.slice(2, -2)}</strong>);
    } else {
      parts.push(<em key={key++}>{token.slice(1, -1)}</em>);
    }
    last = match.index + token.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.map((p, i) => <Fragment key={i}>{p}</Fragment>);
}
