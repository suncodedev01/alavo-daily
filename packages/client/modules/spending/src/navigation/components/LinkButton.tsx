import { Button, type ButtonProps } from '@alavo-daily/design-system';
import { Link } from 'react-router';

export type LinkButtonProps = Omit<ButtonProps, 'render' | 'nativeButton' | 'onClick'> & { to: string };

export function LinkButton({ to, children, ...rest }: LinkButtonProps) {
  return (
    <Button nativeButton={false} render={<Link to={to} />} role="link" {...rest}>
      {children}
    </Button>
  );
}
