import { useState } from 'react';
import { BrowserRouter, useRoutes, useLocation, useNavigate } from 'react-router-dom';
import { Theme, defineTheme } from '@astryxdesign/core/theme';
import { neutralTheme } from '@astryxdesign/theme-neutral';
import { AppShell } from '@astryxdesign/core/AppShell';
import { HStack } from '@astryxdesign/core/HStack';
import { SideNav, SideNavHeading, SideNavItem, SideNavSection } from '@astryxdesign/core/SideNav';
import { DropdownMenu } from '@astryxdesign/core/DropdownMenu';
import { Avatar } from '@astryxdesign/core/Avatar';
import { Icon } from '@astryxdesign/core/Icon';

import { Box, Shield } from 'lucide-react';
import { AuthProvider, useAuth } from '../hooks/useAuth.js';
import { SettingsProvider } from '../hooks/useSettings.js';
import { LabelsProvider } from '../hooks/useLabels.js';
import { ColorModeProvider, useColorMode } from '../hooks/useColorMode.js';
import { routes } from './routes.js';
import { ErrorBoundary } from '../components/ErrorBoundary.js';

const a11yTheme = defineTheme({
  name: 'a11y-neutral',
  extends: neutralTheme,
  components: {
    avatar: {
      base: { color: '#525252' },
    },
    'segmented-control-item': {
      base: { color: '#525252' },
    },
  },
});

function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, users, switchUser } = useAuth();
  const routeElement = useRoutes(routes);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const navTo = (path: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    navigate(path);
  };

  const userMenuItems = [
    { label: user?.name ?? 'Unknown', isDisabled: true },
    { label: user?.role ?? '', isDisabled: true },
    { type: 'divider' as const },
    ...users
      .filter((u) => u.id !== user?.id)
      .map((u) => ({
        label: `Switch to ${u.name}`,
        onClick: () => switchUser(u.id),
      })),
  ];

  return (
    <AppShell
      variant="elevated"
      height="fill"
      sideNav={
        <SideNav
          collapsible={{ isCollapsed, onCollapsedChange: setIsCollapsed }}
          header={
            <SideNavHeading
              heading="Illumio"
              subheading="Policy Experience"
              icon={<Icon icon={Shield} />}
            />
          }
          footer={
            <HStack hAlign="start">
              <DropdownMenu
                hasChevron={false}
                button={{
                  label: user?.name ?? 'User menu',
                  icon: <Avatar name={user?.name ?? 'U'} size="sm" tooltip={false} />,
                  isIconOnly: isCollapsed,
                  variant: 'ghost',
                }}
                items={userMenuItems}
              />
            </HStack>
          }
        >
          <SideNavSection title="Policy">
            <SideNavItem
              label="Policy-v1"
              href="/policies"
              onClick={navTo('/policies')}
              isSelected={location.pathname.startsWith('/policies')}
              icon={<Icon icon="funnel" />}
            />
            <SideNavItem
              label="Policy-v2"
              href="/policy-v2"
              onClick={navTo('/policy-v2')}
              isSelected={location.pathname.startsWith('/policy-v2')}
              icon={<Icon icon="funnel" />}
            />
          </SideNavSection>
          <SideNavSection title="Infrastructure">
            <SideNavItem
              label="Policy Objects"
              href="/objects"
              onClick={navTo('/objects')}
              isSelected={location.pathname.startsWith('/objects')}
              icon={<Icon icon="viewColumns" />}
            />
            <SideNavItem
              label="Workloads"
              href="/workloads"
              onClick={navTo('/workloads')}
              isSelected={location.pathname.startsWith('/workloads')}
              icon={<Icon icon={Box} />}
            />
          </SideNavSection>
          <SideNavSection title="Admin">
            <SideNavItem
              label="Audit Log"
              href="/audit-log"
              onClick={navTo('/audit-log')}
              isSelected={location.pathname === '/audit-log'}
              icon={<Icon icon="clock" />}
            />
            <SideNavItem
              label="Settings"
              href="/settings"
              onClick={navTo('/settings')}
              isSelected={location.pathname === '/settings'}
              icon={<Icon icon="wrench" />}
            />
          </SideNavSection>
        </SideNav>
      }
    >
      {routeElement}
    </AppShell>
  );
}

function ThemedApp() {
  const { mode } = useColorMode();

  return (
    <Theme theme={a11yTheme} mode={mode}>
      <BrowserRouter>
        <AuthProvider>
          <SettingsProvider>
            <LabelsProvider>
              <ErrorBoundary>
                <AppLayout />
              </ErrorBoundary>
            </LabelsProvider>
          </SettingsProvider>
        </AuthProvider>
      </BrowserRouter>
    </Theme>
  );
}

export default function App() {
  return (
    <ColorModeProvider>
      <ThemedApp />
    </ColorModeProvider>
  );
}
