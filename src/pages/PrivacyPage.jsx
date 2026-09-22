import SiteShell from '../components/landing/SiteShell';
import MarkdownBody from '../components/landing/MarkdownBody';

const PRIVACY_MD = `# Privacy Policy

**Last updated: August 14, 2026**

This Privacy Policy explains how ChangeView ("we," "us," "our") collects, uses, and protects information when you use our website and application (the "Service").

## 1. Information we collect

**Account information**: name, email address, password (encrypted), and company name when you sign up.

**Billing information**: payment details are collected and processed directly by our payment processor, Stripe. We do not store your full card number on our own servers.

**Usage data**: how you interact with the Service, pages visited, features used, and similar technical data (browser type, IP address, device information).

**Content you provide**: information you or your team enter into the Service, including Initiatives, Impacts, Stakeholders, comments, and any documents you upload.

## 2. Data you process about your own clients

If you use ChangeView to manage change programs for your own clients or employer, you may enter personal information about people who are not ChangeView account holders themselves, for example, names, departments, titles, or contact details of stakeholders affected by a change program.

**You are responsible for having a lawful basis to collect and store that information**, and for complying with any obligations you have to those individuals (such as notice or consent requirements). ChangeView acts as a data processor for this information, storing and processing it on your instructions, not as the party responsible for the underlying collection.

## 3. How we use information

We use the information we collect to:

- Provide, maintain, and improve the Service
- Process payments and manage subscriptions
- Send you service-related communications (confirmations, billing notices, product updates)
- Respond to support requests
- Detect and prevent fraud or misuse
- Comply with legal obligations

## 4. Third-party service providers

We use the following third-party services to operate ChangeView, each of which processes data on our behalf under their own privacy and security terms:

- **Supabase** — database hosting and authentication
- **Stripe** — payment processing
- **Resend** — transactional email delivery
- **Vercel** — application hosting
- **Anthropic** — AI-generated communications drafting (the AI Comms Generator feature)

## 5. Data security

We use industry-standard security practices, including encrypted connections, row-level access controls scoping every customer's data to their own account and workspace, and restricted access to production systems. No system is completely secure, and we cannot guarantee absolute security.

## 6. Data retention

We retain your information for as long as your account is active, plus a limited period afterward to allow for account recovery, unless a longer retention period is required by law. You may request deletion of your account and data at any time (see Section 8).

## 7. Cookies

We use cookies and similar technologies necessary for authentication and basic Service functionality. We do not use cookies for third-party advertising.

## 8. Your rights

Depending on your location, you may have rights to access, correct, export, or delete your personal information. You can manage most of this directly from your account, or contact us at privacy@changeview.app to make a request.

## 9. Children's privacy

ChangeView is a business tool not directed at or intended for use by children. We do not knowingly collect information from anyone under 18.

## 10. International data transfers

Our service providers may process data in countries other than your own. Where required, we rely on appropriate safeguards for such transfers.

## 11. Changes to this policy

We may update this policy from time to time. We'll notify you of material changes by email or through the Service.

## 12. Contact

Questions about this policy: privacy@changeview.app
`;

export default function PrivacyPage() {
  return (
    <SiteShell title="Privacy Policy — changeview">
      <main className="page">
        <div className="wrap narrow">
          <MarkdownBody source={PRIVACY_MD} />
        </div>
      </main>
    </SiteShell>
  );
}
