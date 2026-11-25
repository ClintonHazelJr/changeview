import SiteShell from '../components/landing/SiteShell';
import MarkdownBody from '../components/landing/MarkdownBody';
import { USER_GUIDE_MD } from '../content/userGuide';

export default function GuidePage() {
  return (
    <SiteShell title="ChangeView User Guide | Change Management Software">
      <main className="page">
        <div className="wrap narrow">
          <MarkdownBody source={USER_GUIDE_MD} />
        </div>
      </main>
    </SiteShell>
  );
}
