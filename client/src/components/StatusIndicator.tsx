import { StatusDot } from '@astryxdesign/core/StatusDot';
import { Text } from '@astryxdesign/core/Text';
import { HStack } from '@astryxdesign/core/HStack';

export function StatusIndicator({ enabled }: { enabled: boolean }) {
  return (
    <HStack gap={1} vAlign="center">
      <StatusDot
        variant={enabled ? 'success' : 'neutral'}
        label={enabled ? 'Enabled' : 'Disabled'}
      />
      <Text>{enabled ? 'Enabled' : 'Disabled'}</Text>
    </HStack>
  );
}
