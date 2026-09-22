/** Logo mark — full / mono / footer variants (landing + marketing pages). */
export default function Mark({ variant = 'full', color, style, className }) {
  const mono = variant === 'mono';
  const footer = variant === 'footer';
  const full = variant === 'full';

  let c1;
  let c2;
  let c3;
  let c4;
  if (mono) {
    c1 = c2 = c3 = c4 = color || '#1c2f8f';
  } else if (footer) {
    c1 = '#93a6ee';
    c2 = '#93a6ee';
    c3 = '#93a6ee';
    c4 = '#ffffff';
  } else {
    c1 = '#1c2f8f';
    c2 = '#3a54c4';
    c3 = '#5f79df';
    c4 = '#93a6ee';
  }

  return (
    <span className={className} style={style} aria-hidden>
      <svg
        viewBox="0 0 124 100"
        width="100%"
        height="100%"
        style={{ display: 'block', overflow: 'visible' }}
        aria-label="changeview"
      >
        {full && <circle cx="87" cy="50" r="33" fill="#ff1717" />}
        <g fill="none" strokeLinejoin="round" strokeLinecap="butt" strokeWidth="19">
          <polyline points="54,10 88,50 54,90" stroke={c4} />
          <polyline points="36,10 70,50 36,90" stroke={c3} />
          <polyline points="18,10 52,50 18,90" stroke={c2} />
          <polyline points="0,10 34,50 0,90" stroke={c1} />
        </g>
      </svg>
    </span>
  );
}
