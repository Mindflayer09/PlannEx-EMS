import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '../context/AuthContext';
import ProtectedRoute from '../components/auth/ProtectedRoute';
import DashboardLayout from '../components/layout/DashboardLayout';
import Spinner from '../components/common/Spinner';

// Public pages
import Home from '../pages/public/Home';
import Login from '../pages/public/Login';
import Register from '../pages/public/Register';
import PublicReports from '../pages/public/PublicReports';
import ForgotPassword from '../pages/public/ForgotPassword';
import ResetPassword from '../pages/public/ResetPassword';

// Super Admin Pages (Platform Owner)
import PlatformDashboard from '../pages/superadmin/PlatformDashboard';
import CreateOrganization from '../pages/superadmin/CreateOrganization';
import UserManagement from '../pages/superadmin/UserManagement';

// Workspace Pages (Unified Team Dashboard)
import WorkspaceOverview from '../pages/workspace/WorkspaceOverview';
import TeamEvents from '../pages/workspace/TeamEvents';
import TeamTasks from '../pages/workspace/TeamTasks';
import TeamMembers from '../pages/workspace/TeamMembers';

import NotFound from '../pages/NotFound';

/**
 * Direct Redirector: The "Brain" of your routing.
 * When a user hits '/dashboard', this component decides where to send them
 * based on their specific role.
 */
function DashboardRedirect() {
  const { user, loading } = useAuth(); 

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  // If not logged in, back to login
  if (!user) return <Navigate to="/login" replace />;
  
  // 1. Super Admins go to the Platform Command Center
  if (user?.role === 'super_admin') {
    return <Navigate to="/super-admin/dashboard" replace />;
  }
  
  // 2. Everyone else (Admin, Sub-Admin, Volunteer) goes to the Team Workspace
  // Note: Your components (WorkspaceOverview) should handle the "Pending Approval" UI
  return <Navigate to="/workspace/dashboard" replace />;
}

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* ========================================== */}
          {/* PUBLIC ROUTES                              */}
          {/* ========================================== */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/reports" element={<PublicReports />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
          
          {/* The Central Redirect Gate */}
          <Route path="/dashboard" element={<DashboardRedirect />} />

          {/* ========================================== */}
          {/* SUPER ADMIN ROUTES (SaaS Management)       */}
          {/* ========================================== */}
          <Route element={<ProtectedRoute allowedRoles={['super_admin']} />}>
            <Route element={<DashboardLayout />}>
              <Route path="/super-admin/dashboard" element={<PlatformDashboard />} />
              <Route path="/super-admin/organizations/new" element={<CreateOrganization />} />
              <Route path="/super-admin/users" element={<UserManagement />} />
            </Route>
          </Route>

          {/* ========================================== */}
          {/* WORKSPACE ROUTES (Team Admins & Members)   */}
          {/* ========================================== */}
          <Route element={<ProtectedRoute allowedRoles={['admin', 'sub-admin', 'volunteer']} />}>
            <Route element={<DashboardLayout />}>
              <Route path="/workspace/dashboard" element={<WorkspaceOverview />} />
              <Route path="/workspace/events" element={<TeamEvents />} />
              <Route path="/workspace/tasks" element={<TeamTasks />} />
              <Route path="/workspace/members" element={<TeamMembers />} />
            </Route>
          </Route>

          {/* 404 Catch-All */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}