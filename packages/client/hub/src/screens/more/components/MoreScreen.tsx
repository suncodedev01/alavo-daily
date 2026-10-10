import { Screen, useT, type ModuleManifest, type MoreItem, type MoreSection } from '@alavo-daily/common';
import { Card, Eyebrow, PageColumn } from '@alavo-daily/design-system';

import { MoreRow } from './MoreRow';

export interface MoreScreenProps {
  manifest: ModuleManifest;
}

/** The "Khác" screen of any module: one card per section, drawn from the manifest. */
export function MoreScreen({ manifest }: MoreScreenProps) {
  const t = useT();
  const sections = manifest.more?.sections ?? [];
  return (
    <Screen title={t('Khác')}>
      <PageColumn>
        {sections.map((section) => (
          <SectionCard key={section.id} section={section} />
        ))}
      </PageColumn>
    </Screen>
  );
}

function SectionCard({ section }: { section: MoreSection }) {
  const t = useT();
  return (
    <Card aria-label={t(section.title)} className="grid gap-1">
      <Eyebrow>{t(section.title)}</Eyebrow>
      <ul className="grid">
        {section.items.map((item: MoreItem) => (
          <li key={item.id}>
            <MoreRow item={item} />
          </li>
        ))}
      </ul>
    </Card>
  );
}
