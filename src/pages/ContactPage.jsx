import { useState } from 'react';
import SiteShell from '../components/landing/SiteShell';

export default function ContactPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    const body = [
      `Name: ${name.trim()}`,
      `Email: ${email.trim()}`,
      company.trim() ? `Company: ${company.trim()}` : null,
      '',
      message.trim(),
    ].filter((line) => line !== null).join('\n');

    const href = `mailto:hello@changeview.app?subject=${encodeURIComponent('changeview inquiry')}&body=${encodeURIComponent(body)}`;
    window.location.href = href;
    setSent(true);
  };

  return (
    <SiteShell title="Contact — changeview">
      <main className="page">
        <div className="wrap narrow">
          <div className="prose">
            <h1>Contact</h1>
            <h2>Talk to us</h2>
            <p>
              Whether you&apos;re evaluating changeview for a single rollout or a whole portfolio of
              change, we&apos;d like to hear from you.
            </p>
          </div>

          <form className="contact-form" onSubmit={handleSubmit}>
            <label>
              <span>Name</span>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
              />
            </label>
            <label>
              <span>Work email</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </label>
            <label>
              <span>Company</span>
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                autoComplete="organization"
              />
            </label>
            <label>
              <span>What are you working on?</span>
              <textarea
                required
                rows={5}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Tell us about the change you're planning, or what you're hoping changeview can help with."
              />
            </label>
            <button type="submit" className="btn btn-red">Send message</button>
            {sent && (
              <p className="form-note">
                Your email client should open with the message ready. If it doesn&apos;t, write us at{' '}
                <a href="mailto:hello@changeview.app">hello@changeview.app</a>.
              </p>
            )}
          </form>

          <div className="contact-aside">
            <p>
              Prefer email? Reach us directly at{' '}
              <a href="mailto:hello@changeview.app">hello@changeview.app</a>.
            </p>
            <p>
              For support with an existing account, visit the Help section inside the app, or email{' '}
              <a href="mailto:support@changeview.app">support@changeview.app</a>.
            </p>
          </div>
        </div>
      </main>
    </SiteShell>
  );
}
