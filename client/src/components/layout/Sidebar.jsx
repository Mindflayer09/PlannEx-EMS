import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  Calendar,
  ClipboardList,
  FolderOpen,
  CheckSquare,
  ListTodo,
} from 'lucide-react';
import clsx from 'clsx';

// ✅ THE FIX: All links now point to the unified /workspace routes defined in App.jsx
// and the main dashboard link points to the smart /dashboard redirector!

const adminLinks = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/workspace/members', label: 'Manage Members', icon: Users },
  { to: '/workspace/events', label: 'Manage Events', icon: Calendar },
  { to: '/workspace/tasks', label: 'Manage Tasks', icon: ClipboardList },
];

const subAdminLinks = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/workspace/events', label: 'Workspace Events', icon: FolderOpen },
  { to: '/workspace/tasks', label: 'Manage Tasks', icon: ListTodo },
  { to: '/workspace/members', label: 'Team Directory', icon: Users },
];

const volunteerLinks = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/workspace/events', label: 'Team Events', icon: Calendar },
  { to: '/workspace/tasks', label: 'My Tasks', icon: CheckSquare },
];

const linksByRole = {
  admin: adminLinks,
  'sub-admin': subAdminLinks,
  volunteer: volunteerLinks,
};

export default function Sidebar({ isOpen, onClose }) {
  const { user } = useAuth();
  
  // Safely fallback to an empty array if the role isn't found (like for super_admin)
  const links = linksByRole[user?.role] || [];

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-30 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={clsx(
          'fixed top-16 left-0 z-30 h-[calc(100vh-4rem)] w-64 bg-white border-r border-gray-200 transition-transform duration-200',
          'lg:translate-x-0 lg:static lg:z-auto',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <nav className="p-4 space-y-1">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                )
              }
            >
              <Icon className="h-5 w-5 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
}