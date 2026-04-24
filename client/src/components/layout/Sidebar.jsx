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
  
  // Safely fallback to an empty array if the role isn't found
  const links = linksByRole[user?.role] || [];

  return (
    <>
      {/* 🚀 MOBILE FIX: Added backdrop-blur and smooth fade-in for premium feel */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 lg:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      <aside
        className={clsx(
          // Base styles and layout
          'fixed top-16 left-0 z-30 h-[calc(100vh-4rem)] w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white transition-all duration-300 ease-in-out flex flex-col',
          // 🚀 MOBILE FIX: Added deep shadow on mobile, removed on desktop
          'shadow-2xl lg:shadow-none',
          // Desktop positioning
          'lg:translate-x-0 lg:static lg:z-auto',
          // Mobile slide toggle
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <nav className="p-4 space-y-1.5 flex-1 overflow-y-auto">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              className={({ isActive }) =>
                clsx(
                  // 🚀 MOBILE FIX: Changed to py-3 for mobile thumbs, py-2.5 for desktop mice
                  'flex items-center gap-3 px-3 py-3 sm:py-2.5 rounded-xl text-sm font-semibold transition-all duration-200',
                  isActive
                    ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-400 shadow-sm'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white'
                )
              }
            >
              <Icon className={clsx(
                "h-5 w-5 shrink-0 transition-colors",
                // Make the active icon "pop" slightly more
                "text-current" 
              )} />
              {label}
            </NavLink>
          ))}
        </nav>
        
        {/* Optional: Add a little branding or version number at the bottom of the sidebar */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-800 text-xs font-medium text-gray-400 dark:text-gray-500 text-center uppercase tracking-widest">
          PlannEx v1.0
        </div>
      </aside>
    </>
  );
}