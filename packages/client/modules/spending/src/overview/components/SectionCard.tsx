import { Card, CardHeader, CardTitle } from '@alavo-daily/design-system';
import { useId, type ReactNode } from 'react';

export interface SectionCardProps {
  title: string;
  hint?: ReactNode;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}

export function SectionCard({ title, hint, action, className, children }: SectionCardProps) {
  const titleId = useId();
  return (
    <Card aria-labelledby={titleId} className={className}>
      <CardHeader>
        <CardTitle id={titleId}>{title}</CardTitle>
        {hint ? <span className="text-xs text-text-muted">{hint}</span> : null}
        {action}
      </CardHeader>
      {children}
    </Card>
  );
}
