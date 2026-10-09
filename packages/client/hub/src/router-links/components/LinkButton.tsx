import { Link } from 'react-router';

import { Button, type ButtonProps } from '@alavo-daily/design-system';

export type LinkButtonProps = Omit<ButtonProps, 'render' | 'nativeButton' | 'onClick'> & {
  to: string;
  onNavigate?: () => void;
};

/** A router link that looks like a design-system button. */
export function LinkButton({ to, onNavigate, ...rest }: LinkButtonProps) {
  return <Button role="link" nativeButton={false} render={<Link to={to} onClick={onNavigate} />} {...rest} />;
}
