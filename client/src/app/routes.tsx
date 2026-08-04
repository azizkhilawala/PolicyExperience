import { Navigate } from 'react-router-dom';

import PolicyListPage from '../pages/PolicyListPage.js';
import PolicyDetailPage from '../pages/PolicyDetailPage.js';
import SettingsPage from '../pages/SettingsPage.js';
import V2PolicyListPage from '../pages/V2PolicyListPage.js';
import V2PolicyDetailPage from '../pages/V2PolicyDetailPage.js';

export const routes = [
  { path: '/', element: <Navigate to="/policies" replace /> },
  { path: '/policies', element: <PolicyListPage /> },
  { path: '/policies/:id', element: <PolicyDetailPage /> },
  { path: '/settings', element: <SettingsPage /> },
  { path: '/policy-v2', element: <V2PolicyListPage /> },
  { path: '/policy-v2/:id', element: <V2PolicyDetailPage /> },
  { path: '*', element: <Navigate to="/policies" replace /> },
];
