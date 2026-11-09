import { createBrowserRouter, Navigate } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import DashboardPage from '../pages/DashboardPage';
import JobsPage from '../pages/JobsPage';
import TemplatesPage from '../pages/TemplatesPage';
import MyCVsPage from '../pages/MyCVsPage';
import SettingsPage from '../pages/SettingsPage';
import ApplicationsPage from '../pages/ApplicationsPage';
import SkillsGapPage from '../pages/SkillsGapPage';
import ProtectedRoute from './ProtectedRoute';
import LoginPage from '../pages/LoginPage';
import ErrorPage from '../pages/ErrorPage';
import ProfilePage from '../pages/ProfilePage';
import NotificationsPage from '../pages/NotificationsPage';
import NotificationTemplatesPage from '../pages/NotificationTemplatesPage';
import NotificationAdminRoute from './NotificationAdminRoute';

export const router = createBrowserRouter([
    {
        element: <ProtectedRoute />,
        errorElement: <ErrorPage />,
        children: [
            {
                path: '/',
                element: <MainLayout />,
                children: [
                    { index: true,           element: <DashboardPage /> },
                    { path: 'cvs',           element: <MyCVsPage /> },
                    { path: 'cvs/new',       element: <Navigate to="/cvs" replace /> },
                    { path: 'profile',       element: <ProfilePage /> },
                    { path: 'skills-gap',    element: <SkillsGapPage /> },
                    { path: 'templates',     element: <TemplatesPage /> },
                    { path: 'jobs',          element: <JobsPage /> },
                    { path: 'applications',  element: <ApplicationsPage /> },
                    { path: 'notifications', element: <NotificationsPage /> },
                    {
                        path: 'admin/notification-templates',
                        element: <NotificationAdminRoute><NotificationTemplatesPage /></NotificationAdminRoute>,
                    },
                    { path: 'settings',      element: <SettingsPage /> },
                ],
            },
        ],
    },
    {
        path: '/login',
        element: <LoginPage />,
        errorElement: <ErrorPage />,
    },
    {
        path: '*',
        element: <Navigate to="/" replace />,
    },
]);