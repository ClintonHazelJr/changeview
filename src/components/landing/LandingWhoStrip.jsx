import { Link } from 'react-router-dom';

const COLUMNS = [
  {
    title: 'Independent consultants',
    body: 'Run client rollouts without juggling spreadsheets.',
  },
  {
    title: 'Small change teams',
    body: 'Share plans, stakeholders and progress across projects.',
  },
  {
    title: 'Larger organisations',
    body: (
      <>
        Need custom setup?{' '}
        <Link className="who-link" to="/contact">
          Talk to us.
        </Link>
      </>
    ),
  },
];

export default function LandingWhoStrip() {
  return (
    <section className="who-strip" aria-labelledby="who-its-for-heading">
      <div className="wrap">
        <h2 id="who-its-for-heading" className="visually-hidden">
          Who it&apos;s for
        </h2>
        <ul className="who-cols">
          {COLUMNS.map((col) => (
            <li key={col.title}>
              <h3>{col.title}</h3>
              <p>{col.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
