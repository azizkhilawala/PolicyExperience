import { Navigate } from 'react-router-dom';

import PolicyListPage from '../pages/PolicyListPage.js';
import PolicyDetailPage from '../pages/PolicyDetailPage.js';
import SettingsPage from '../pages/SettingsPage.js';
import V2PolicyListPage from '../pages/V2PolicyListPage.js';
import V2PolicyDetailPage from '../pages/V2PolicyDetailPage.js';
import V2TemplateDetailPage from '../pages/V2TemplateDetailPage.js';
import V2TemplateCreatePage from '../pages/V2TemplateCreatePage.js';
import ObjectsPage from '../pages/ObjectsPage.js';
import { WorkloadListPage } from '../pages/WorkloadListPage.js';
import { WorkloadDetailPage } from '../pages/WorkloadDetailPage.js';
import AuditLogPage from '../pages/AuditLogPage.js';

export const routes = [
  { path: '/', element: <Navigate to="/policies" replace /> },
  { path: '/policies', element: <PolicyListPage /> },
  { path: '/policies/:id', element: <PolicyDetailPage /> },
  { path: '/settings', element: <SettingsPage /> },
  { path: '/policy-v2', element: <V2PolicyListPage /> },
  { path: '/policy-v2/templates/new', element: <V2TemplateCreatePage /> },
  { path: '/policy-v2/templates/:id/edit', element: <V2TemplateCreatePage /> },
  { path: '/policy-v2/templates/:id', element: <V2TemplateDetailPage /> },
  { path: '/policy-v2/:id', element: <V2PolicyDetailPage /> },
  { path: '/objects', element: <ObjectsPage /> },
  { path: '/workloads', element: <WorkloadListPage /> },
  { path: '/workloads/:id', element: <WorkloadDetailPage /> },
  { path: '/audit-log', element: <AuditLogPage /> },
  { path: '*', element: <Navigate to="/policies" replace /> },
];
