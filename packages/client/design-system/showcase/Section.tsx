import type { ReactNode } from 'react';
import { Card, CardHeader, CardTitle, Eyebrow } from '@/index';

export function Section({ id, title, children }: { id?: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="grid gap-4">
      <h2 className="eyebrow pt-4 pl-1">{title}</h2>
      <div className="grid gap-4 md:grid-cols-2">{children}</div>
    </section>
  );
}

export function Demo({ title, children, wide = false }: { title: string; children: ReactNode; wide?: boolean }) {
  return (
    <Card padding="sm" className={wide ? 'md:col-span-2' : undefined}>
      <CardHeader className="mb-3">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <div className="grid gap-3">{children}</div>
    </Card>
  );
}

export function Row({ children, label }: { children: ReactNode; label?: string }) {
  return (
    <div className="grid gap-1.5">
      {label ? <Eyebrow>{label}</Eyebrow> : null}
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}
