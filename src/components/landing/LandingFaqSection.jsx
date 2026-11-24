import { useEffect, useId, useState } from 'react';
import { LANDING_FAQ_ITEMS, landingFaqJsonLd } from './landingFaqData.js';

export default function LandingFaqSection() {
  const baseId = useId();
  const [openIndex, setOpenIndex] = useState(null);

  useEffect(() => {
    const id = 'cv-landing-faq-jsonld';
    let el = document.getElementById(id);
    if (!el) {
      el = document.createElement('script');
      el.id = id;
      el.type = 'application/ld+json';
      document.head.appendChild(el);
    }
    el.textContent = JSON.stringify(landingFaqJsonLd());
    return () => {
      el?.remove();
    };
  }, []);

  return (
    <section className="section faq" id="faq" aria-labelledby="faq-heading">
      <div className="wrap narrow">
        <div className="head">
          <h2 id="faq-heading">Questions</h2>
        </div>
        <dl className="faq-list">
          {LANDING_FAQ_ITEMS.map((item, index) => {
            const panelId = `${baseId}-panel-${index}`;
            const buttonId = `${baseId}-btn-${index}`;
            const expanded = openIndex === index;
            return (
              <div className="faq-item" key={item.question}>
                <dt>
                  <button
                    type="button"
                    id={buttonId}
                    className="faq-trigger"
                    aria-expanded={expanded}
                    aria-controls={panelId}
                    onClick={() => setOpenIndex(expanded ? null : index)}
                  >
                    <span>{item.question}</span>
                    <span className="faq-icon" aria-hidden="true">
                      {expanded ? '−' : '+'}
                    </span>
                  </button>
                </dt>
                <dd
                  id={panelId}
                  role="region"
                  aria-labelledby={buttonId}
                  hidden={!expanded}
                  className="faq-panel"
                >
                  <p>{item.answer}</p>
                </dd>
              </div>
            );
          })}
        </dl>
      </div>
    </section>
  );
}
