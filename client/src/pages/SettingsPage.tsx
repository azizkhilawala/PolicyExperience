import { Breadcrumbs, BreadcrumbItem } from '@astryxdesign/core/Breadcrumbs';
import { Heading } from '@astryxdesign/core/Heading';
import { VStack } from '@astryxdesign/core/VStack';
import { HStack } from '@astryxdesign/core/HStack';
import { StackItem } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { Section } from '@astryxdesign/core/Section';
import { Switch } from '@astryxdesign/core/Switch';
import { Selector } from '@astryxdesign/core/Selector';

import { useSettings } from '../hooks/useSettings.js';
import { useAuth } from '../hooks/useAuth.js';
import { useColorMode } from '../hooks/useColorMode.js';

export default function SettingsPage() {
  const { settings, updateSetting } = useSettings();
  const { user, users, switchUser } = useAuth();
  const { mode, setMode } = useColorMode();

  const userOptions = users.map((u) => ({
    value: u.id,
    label: `${u.name} (${u.role === 'global_admin' ? 'Global Admin' : 'Author'})`,
  }));

  const themeOptions = [
    { value: 'system', label: 'System' },
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
  ];

  return (
    <VStack gap={4} padding={4}>
      <Breadcrumbs>
        <BreadcrumbItem isCurrent>Settings</BreadcrumbItem>
      </Breadcrumbs>

      <Heading level={1}>Settings</Heading>

      <Section>
        <VStack gap={3}>
          <Heading level={2}>Tenant Configuration</Heading>
          <HStack hAlign="between" vAlign="center">
            <StackItem size="fill">
              <VStack gap={0.5}>
                <Text weight="medium">Display Scopes in Policies</Text>
                <Text type="supporting" color="secondary">
                  Show scope labels on each policy card and detail view.
                </Text>
              </VStack>
            </StackItem>
            <Switch
              label="Display Scopes in Policies"
              isLabelHidden
              value={settings.display_scopes_in_policies === 'true'}
              onChange={(checked) =>
                updateSetting('display_scopes_in_policies', checked ? 'true' : 'false')
              }
            />
          </HStack>
        </VStack>
      </Section>

      <Section>
        <VStack gap={3}>
          <Heading level={2}>User Management</Heading>
          {user ? (
            <Text>
              Signed in as{' '}
              <Text as="span" weight="medium">
                {user.name}
              </Text>{' '}
              —{' '}
              <Text as="span" color="secondary">
                {user.role === 'global_admin' ? 'Global Admin' : 'Author'}
              </Text>
            </Text>
          ) : null}
          <Selector
            label="Switch User"
            options={userOptions}
            value={user?.id ?? ''}
            onChange={(id) => switchUser(id)}
            width="100%"
          />
        </VStack>
      </Section>

      <Section>
        <VStack gap={3}>
          <Heading level={2}>Appearance</Heading>
          <HStack vAlign="center" gap={3}>
            <Text weight="medium">Theme</Text>
            <Selector
              label="Theme"
              isLabelHidden
              options={themeOptions}
              value={mode}
              onChange={(value) => setMode(value as 'system' | 'light' | 'dark')}
              width="200"
            />
          </HStack>
        </VStack>
      </Section>
    </VStack>
  );
}
