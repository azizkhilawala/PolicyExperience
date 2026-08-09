import { Token } from '@astryxdesign/core/Token';
import { Tooltip } from '@astryxdesign/core/Tooltip';

interface ActionTokenProps {
  action: 'allow' | 'deny' | 'override_deny';
  size?: 'sm' | 'md' | 'lg';
}

type TokenColor =
  | 'default'
  | 'red'
  | 'orange'
  | 'yellow'
  | 'green'
  | 'teal'
  | 'cyan'
  | 'blue'
  | 'purple'
  | 'pink'
  | 'gray';

interface ActionConfig {
  label: string;
  color: TokenColor;
  wrapperStyle?: React.CSSProperties;
}

const ACTION_TOOLTIP: Record<string, string> = {
  allow: 'Allow\nPermits matching traffic',
  deny: 'Deny\nBlocks matching traffic',
  override_deny: 'Override Deny\nBlocks traffic, overrides allow rules',
};

const ACTION_CONFIG: Record<string, ActionConfig> = {
  allow: { label: 'Allow', color: 'green' },
  deny: { label: 'Deny', color: 'red' },
  override_deny: {
    label: 'Override Deny',
    color: 'red',
    wrapperStyle: {
      background: 'var(--color-red-900)',
      color: 'var(--color-white)',
      borderRadius: 'var(--radius-sm)',
      display: 'inline-flex',
    },
  },
};

export function ActionToken({ action, size = 'sm' }: ActionTokenProps) {
  const config = ACTION_CONFIG[action] ?? ACTION_CONFIG.allow;
  const tooltip = ACTION_TOOLTIP[action] ?? action;
  if (config.wrapperStyle) {
    return (
      <Tooltip content={tooltip}>
        <span style={config.wrapperStyle}>
          <Token label={config.label} color={config.color} size={size} />
        </span>
      </Tooltip>
    );
  }
  return (
    <Tooltip content={tooltip}>
      <Token label={config.label} color={config.color} size={size} />
    </Tooltip>
  );
}
