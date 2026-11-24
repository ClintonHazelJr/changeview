/** FAQ copy for landing accordion and FAQPage JSON-LD (must match exactly). */
export const LANDING_FAQ_ITEMS = [
  {
    question: 'How does the 1-week free trial work?',
    answer:
      'You get full access for one week. A card is required to start, and you are only charged when the trial ends. Cancel before then and you pay nothing.',
  },
  {
    question: 'Can I cancel any time?',
    answer: 'Yes. You can cancel from your account settings.',
  },
  {
    question: 'Who is ChangeView for?',
    answer:
      'Independent change consultants, small change teams and organisations running change across multiple projects.',
  },
  {
    question: 'Do I need to follow a specific methodology?',
    answer: 'No. ChangeView works with any approach, including ADKAR, Kotter or your own.',
  },
  {
    question: 'What is the difference between the plans?',
    answer:
      'Single Project is for one rollout with up to 2 users. Multiple Projects supports 5 users and unlimited workspaces. Enterprise is custom, with sales-assisted setup.',
  },
  {
    question: 'What is a close out report?',
    answer:
      'A report that summarises the completed work on a project. It is included on every plan.',
  },
];

export function landingFaqJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: LANDING_FAQ_ITEMS.map(({ question, answer }) => ({
      '@type': 'Question',
      name: question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: answer,
      },
    })),
  };
}
