import { Navigate } from 'react-router-dom';

import PolicyListPage from '../pages/PolicyListPage.js';
import PolicyDetailPage from '../pages/PolicyDetailPage.js';
import SettingsPage from '../pages/SettingsPage.js';

export const routes = [
  { path: '/', element: <Navigate to="/policies" replace /> },
  { path: '/policies', element: <PolicyListPage /> },
  { path: '/policies/:id', element: <PolicyDetailPage /> },
  { path: '/settings', element: <SettingsPage /> },
  { path: '*', element: <Navigate to="/policies" replace /> },
];
