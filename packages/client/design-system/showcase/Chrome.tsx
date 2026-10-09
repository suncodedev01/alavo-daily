import { Segmented } from '@/index';
import { buildHref, readQuery, type ShowcaseTheme } from './query';

const THEME_OPTIONS = [
  { value: 'light', label: 'Sáng' },
  { value: 'dark', label: 'Tối' },
  { value: 'system', label: 'Hệ thống' },
];
const LAYOUT_OPTIONS = [
  { value: 'wide', label: 'Rộng' },
  { value: 'narrow', label: 'Hẹp 390px' },
];
const SUBJECT_OPTIONS = [
  { value: 'components', label: 'Thành phần' },
  { value: 'shell', label: 'Khung ứng dụng' },
];

function go(href: string): void {
  window.location.search = href;
}

export function Chrome() {
  const query = readQuery();
  const narrow = query.layout === 'narrow';
  const subject = new URLSearchParams(window.location.search).get('subject') === 'shell' ? 'shell' : 'components';
  const frameView = subject === 'components' ? 'components' : narrow ? 'mobile' : 'app';
  const frameSrc = `?view=${frameView}&theme=${query.theme}&layout=${query.layout}`;

  const navigate = (patch: { theme?: ShowcaseTheme; layout?: 'wide' | 'narrow'; subject?: string }) => {
    const params = new URLSearchParams(buildHref({ view: 'chrome', theme: patch.theme ?? query.theme, layout: patch.layout ?? query.layout }));
    params.set('subject', patch.subject ?? subject);
    go(`?${params.toString()}`);
  };

  return (
    <div className="flex h-dvh flex-col bg-paper">
      <header className="flex flex-wrap items-center gap-3 px-4 py-3">
        <h1 className="mr-auto text-title font-semibold">Alavo Daily · Design system</h1>
        <Segmented label="Nội dung" options={SUBJECT_OPTIONS} value={subject} onChange={(value) => navigate({ subject: value })} />
        <Segmented label="Giao diện" options={THEME_OPTIONS} value={query.theme} onChange={(value) => navigate({ theme: value as ShowcaseTheme })} />
        <Segmented label="Khung" options={LAYOUT_OPTIONS} value={query.layout} onChange={(value) => navigate({ layout: value as 'wide' | 'narrow' })} />
      </header>
      <div className="flex min-h-0 flex-1 justify-center px-4 pb-4">
        <iframe
          title="Xem trước"
          src={frameSrc}
          className={narrow ? 'h-full w-97.5 shrink-0 rounded-4xl bg-paper shadow-frame' : 'h-full w-full rounded-lg bg-paper shadow-frame'}
        />
      </div>
    </div>
  );
}
