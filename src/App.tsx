import { lazy } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router';
import { AuthProvider } from './auth/AuthProvider';
import { MessDataProvider } from './data/MessDataProvider';
import { PublicOnly, RequireAdmin, RequireAuth } from './auth/guards';
import { AdminLayout } from './components/layout/AdminLayout';
import { AppShell } from './components/layout/AppShell';
import { LoginPage } from './pages/auth/LoginPage';
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage';
import { SignupPage } from './pages/auth/SignupPage';
import { HistoryPage } from './pages/HistoryPage';
import { MenuPage } from './pages/MenuPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { ProfilePage } from './pages/ProfilePage';
import { SummaryPage } from './pages/SummaryPage';
import { TodayPage } from './pages/TodayPage';
import { WeightPage } from './pages/WeightPage';
import { SetupPage } from './pages/SetupPage';

// Admin screens are split out so students never download them.
const AdminDashboardPage = lazy(() => import('./pages/admin/AdminDashboardPage'));
const FoodEditorPage = lazy(() => import('./pages/admin/FoodEditorPage'));
const MenuEditorPage = lazy(() => import('./pages/admin/MenuEditorPage'));

const router = createBrowserRouter([
  {
    element: <PublicOnly />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/signup', element: <SignupPage /> },
      { path: '/reset-password', element: <ResetPasswordPage /> },
    ],
  },
  {
    path: '/',
    element: (
      <MessDataProvider>
        <AppShell />
      </MessDataProvider>
    ),
    children: [
      // Public: anyone can see what's being served.
      { index: true, element: <TodayPage /> },
      { path: 'menu', element: <MenuPage /> },
      // Personal: tracking, history, profile and admin need an account.
      {
        element: <RequireAuth />,
        children: [
          { path: 'summary', element: <SummaryPage /> },
          { path: 'history', element: <HistoryPage /> },
          { path: 'profile', element: <ProfilePage /> },
          { path: 'weight', element: <WeightPage /> },
          { path: 'setup', element: <SetupPage /> },
          {
            path: 'admin',
            element: <RequireAdmin />,
            children: [
              {
                element: <AdminLayout />,
                children: [
                  { index: true, element: <AdminDashboardPage /> },
                  { path: 'foods', element: <FoodEditorPage /> },
                  { path: 'menus', element: <MenuEditorPage /> },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
]);

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}
