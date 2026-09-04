import SiteShell from '../components/landing/SiteShell';
import MarkdownBody from '../components/landing/MarkdownBody';

const ABOUT_MD = `# About changeview

## We were the ones stuck in the spreadsheet.

changeview wasn't built by a software company that decided change management looked like a good market. It was built by people who spent years running actual change programs, migrations, reorgs, new system rollouts, and hit the same wall every single time: the tools didn't exist.

Not the strategy. Not the frameworks. Those are solid, ADKAR, Kotter, Prosci, decades of good thinking on how change is supposed to work. What was missing was somewhere to actually *run* it. A place to scope who's impacted, plan the training and comms around that impact, and track whether people actually adopted the change, not just whether they clicked through a training module.

Instead, every project started the same way: a new spreadsheet. A new slide deck. A new folder of Word documents that would be out of date within a week. Enterprise-grade tools existed, but they were built and priced for organizations running a handful of massive transformations a year, not for the independent consultant running three client engagements at once, or the internal change manager who's one person doing the job of a whole team.

We built changeview because we needed it ourselves, and because every other change manager we talked to needed it too. Solo practitioners juggling multiple clients. Small teams running change across a growing company. Larger organizations that had outgrown spreadsheets but weren't ready for a six-figure enterprise contract.

Change management has always been treated as something you *do*, a methodology, a mindset, a set of soft skills. We think it's time it was also something you *use*, a system that holds the plan, the people, the communications, and the results, in one place, built by people who've actually done the work.

That's changeview.`;

export default function AboutPage() {
  return (
    <SiteShell title="About — changeview">
      <main className="page">
        <div className="wrap narrow">
          <MarkdownBody source={ABOUT_MD} />
        </div>
      </main>
    </SiteShell>
  );
}
