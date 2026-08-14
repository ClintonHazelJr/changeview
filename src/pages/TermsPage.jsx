import SiteShell from '../components/landing/SiteShell';
import MarkdownBody from '../components/landing/MarkdownBody';

const TERMS_MD = `# Terms of Service

**Last updated: August 14, 2026**

These Terms of Service ("Terms") govern your access to and use of ChangeView (the "Service"), operated by [LEGAL ENTITY NAME]. By creating an account, you agree to these Terms.

## 1. The Service

ChangeView is a subscription-based software platform for organizational change management, including impact scoping, stakeholder tracking, communications drafting, training planning, and adoption reporting.

## 2. Accounts

You must provide accurate information when creating an account and are responsible for maintaining the security of your login credentials. You're responsible for all activity that occurs under your account, including actions taken by users you invite.

## 3. Subscriptions and billing

- ChangeView offers a free trial period, details of which are shown at signup. A valid payment method is required to start a trial; you will not be charged until the trial ends unless you cancel first.
- Subscriptions are billed in advance on a monthly or annual basis, depending on the plan selected, and automatically renew until cancelled.
- You may cancel at any time from your account settings. Cancellation takes effect at the end of the current billing period; we do not provide partial refunds for unused time except where required by law.
- We may change our pricing with advance notice. Continued use of the Service after a price change takes effect constitutes acceptance of the new pricing.

## 4. Acceptable use

You agree not to:

- Use the Service for any unlawful purpose
- Attempt to gain unauthorized access to any part of the Service or another account
- Reverse engineer, decompile, or attempt to extract the source code of the Service
- Use the Service to store or transmit malicious code
- Resell or white-label the Service without our written permission

We reserve the right to suspend or terminate accounts that violate these Terms.

## 5. Your content and data

You retain ownership of all data and content you or your team enter into ChangeView ("Customer Data"). You grant us a limited license to host, process, and display that data solely to provide the Service to you.

You are responsible for ensuring you have the necessary rights and permissions to store any information about third parties (such as your own clients' employees) within the Service. See our Privacy Policy for more detail on this.

## 6. Intellectual property

ChangeView, including its software, design, and branding, is owned by us and protected by intellectual property law. These Terms don't grant you any rights to our intellectual property beyond the limited right to use the Service as intended.

## 7. AI-generated content

The Service includes a feature that generates draft communications using artificial intelligence. AI-generated drafts are suggestions only; you are responsible for reviewing and editing any content before using or distributing it.

## 8. Disclaimers

The Service is provided "as is" without warranties of any kind, express or implied, including warranties of merchantability, fitness for a particular purpose, or non-infringement. We do not warrant that the Service will be uninterrupted or error-free.

## 9. Limitation of liability

To the maximum extent permitted by law, we are not liable for any indirect, incidental, special, or consequential damages arising from your use of the Service. Our total liability for any claim arising from these Terms or the Service is limited to the amount you paid us in the 12 months preceding the claim.

## 10. Termination

You may terminate your account at any time. We may suspend or terminate your account if you violate these Terms, or with reasonable notice for any other reason. Upon termination, your right to access the Service ends; we will retain your data for a limited period as described in our Privacy Policy before deletion.

## 11. Changes to these Terms

We may update these Terms from time to time. We'll notify you of material changes by email or through the Service. Continued use after changes take effect constitutes acceptance.

## 12. Governing law

These Terms are governed by the laws of [JURISDICTION], without regard to conflict of law principles.

## 13. Contact

Questions about these Terms: legal@changeview.app
`;

export default function TermsPage() {
  return (
    <SiteShell title="Terms of Service — changeview">
      <main className="page">
        <div className="wrap narrow">
          <MarkdownBody source={TERMS_MD} />
        </div>
      </main>
    </SiteShell>
  );
}
