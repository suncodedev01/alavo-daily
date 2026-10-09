import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { I18nProvider, createI18n, toLanguage, useLanguage, useT } from './index';

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

  it('ships an English dictionary that createI18n uses by default', () => {
    const i18n = createI18n('en');
    expect(i18n.t('Tổng quan')).toBe('Overview');
    expect(i18n.t('Còn {{amount}}', { amount: '50.000 ₫' })).toBe('50.000 ₫ left');
  });

  it('falls back to the Vietnamese key when English has no translation', () => {
    const i18n = createI18n('en');
    expect(i18n.t('Câu chưa có bản dịch {{name}}', { name: 'Lan' })).toBe('Câu chưa có bản dịch Lan');
  });

  it('interpolates counts without picking a plural form', () => {
    const i18n = createI18n('en');
    expect(i18n.t('{{count}} món', { count: 1 })).toBe('1 dishes');
    expect(i18n.t('{{count}} món', { count: 3 })).toBe('3 dishes');
  });

  it('reports the active language to components', () => {
    function Probe() {
      return <p>{useLanguage()}</p>;
    }
    render(
      <I18nProvider i18n={createI18n('en')}>
        <Probe />
      </I18nProvider>,
    );
    expect(screen.getByText('en')).toBeInTheDocument();
  });

  it('treats an unknown language code as Vietnamese', () => {
    expect(toLanguage('en')).toBe('en');
    expect(toLanguage('fr')).toBe('vi');
  });

  it('keeps a key with dots and colons whole', () => {
    const i18n = createI18n('vi');
    expect(i18n.t('Giờ: 17.30 xong')).toBe('Giờ: 17.30 xong');
  });
});
