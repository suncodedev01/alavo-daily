import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { I18nProvider, createI18n, useT } from './index';

function Greeting({ count }: { count: number }) {
  const t = useT();
  return (
    <p>
      {t('Tổng quan')} / {t('Còn {{count}} món', { count })}
    </p>
  );
}

describe('i18n', () => {
  it('returns the Vietnamese key itself when there is no translation', () => {
    render(
      <I18nProvider i18n={createI18n('vi')}>
        <Greeting count={3} />
      </I18nProvider>,
    );
    expect(screen.getByText('Tổng quan / Còn 3 món')).toBeInTheDocument();
  });

  it('uses a translation table when one is given for the language', () => {
    const i18n = createI18n('en', { en: { 'Tổng quan': 'Overview', 'Còn {{count}} món': '{{count}} left' } });
    render(
      <I18nProvider i18n={i18n}>
        <Greeting count={3} />
      </I18nProvider>,
    );
    expect(screen.getByText('Overview / 3 left')).toBeInTheDocument();
  });

  it('keeps a key with dots and colons whole', () => {
    const i18n = createI18n('vi');
    expect(i18n.t('Giờ: 17.30 xong')).toBe('Giờ: 17.30 xong');
  });
});
