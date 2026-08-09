import { BrowserRouter, useRoutes, useLocation } from 'react-router-dom';
import { Theme, defineTheme } from '@astryxdesign/core/theme';
import { neutralTheme } from '@astryxdesign/theme-neutral';
import { AppShell } from '@astryxdesign/core/AppShell';
import { TopNav, TopNavHeading } from '@astryxdesign/core/TopNav';
import { SideNav, SideNavItem } from '@astryxdesign/core/SideNav';
import { DropdownMenu } from '@astryxdesign/core/DropdownMenu';
import { Avatar } from '@astryxdesign/core/Avatar';
import { Icon } from '@astryxdesign/core/Icon';

import { AuthProvider, useAuth } from '../hooks/useAuth.js';
import { SettingsProvider } from '../hooks/useSettings.js';
import { LabelsProvider } from '../hooks/useLabels.js';
import { useColorMode } from '../hooks/useColorMode.js';
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
  const { user, users, switchUser } = useAuth();
  const routeElement = useRoutes(routes);

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
      topNav={
        <TopNav
          heading={<TopNavHeading heading="Illumio Policy Experience" />}
          endContent={
            <DropdownMenu
              hasChevron={false}
              button={{
                label: user?.name ?? 'User menu',
                icon: <Avatar name={user?.name ?? 'U'} size="sm" tooltip={false} />,
                isIconOnly: true,
                variant: 'ghost',
              }}
              items={userMenuItems}
            />
          }
        />
      }
      sideNav={
        <SideNav collapsible>
          <SideNavItem
            label="Policies"
            href="/policies"
            isSelected={location.pathname.startsWith('/policies')}
            icon={<Icon icon="funnel" />}
          />
          <SideNavItem
            label="Policy-v2"
            href="/policy-v2"
            isSelected={location.pathname.startsWith('/policy-v2')}
            icon={<Icon icon="funnel" />}
          />
          <SideNavItem
            label="Objects"
            href="/objects"
            isSelected={location.pathname.startsWith('/objects')}
            icon={<Icon icon="viewColumns" />}
          />
          <SideNavItem
            label="Audit Log"
            href="/audit-log"
            isSelected={location.pathname === '/audit-log'}
            icon={<Icon icon="clock" />}
          />
          <SideNavItem
            label="Settings"
            href="/settings"
            isSelected={location.pathname === '/settings'}
            icon={<Icon icon="wrench" />}
          />
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
  return <ThemedApp />;
}
