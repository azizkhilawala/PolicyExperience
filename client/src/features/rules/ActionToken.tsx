import { Token } from '@astryxdesign/core/Token';

interface ActionTokenProps {
  action: 'allow' | 'deny';
  size?: 'sm' | 'md' | 'lg';
}

export function ActionToken({ action, size = 'sm' }: ActionTokenProps) {
  return (
    <Token
      label={action === 'allow' ? 'Allow' : 'Deny'}
      color={action === 'allow' ? 'green' : 'red'}
      size={size}
    />
  );
}
