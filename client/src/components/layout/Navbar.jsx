import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LogOut, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { getInitials } from '../../utils/helpers';
// 🚀 NEW: Import your ThemeToggle
import ThemeToggle from '../common/ThemeToggle'; 

export default function Navbar({ onToggleSidebar, sidebarOpen }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    // 🚀 Added dark mode backgrounds and borders
    <header className="sticky top-0 z-40 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 transition-colors duration-200">
      <div className="flex flex-col sm:flex-row flex-wrap items-center justify-between gap-3 h-auto sm:h-16 px-4 sm:px-6">
        
        {/* LEFT SIDE: Hamburger & Logo */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className="lg:hidden text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white"
            aria-label="Toggle sidebar"
          >
            {sidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
          <Link to="/" className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
            PlannEx
          </Link>
        </div>

        {/* RIGHT SIDE: Theme Toggle & User Menu */}
        <div className="flex flex-wrap items-center gap-3 sm:gap-6">
          
          {/* 🚀 NEW: Placed the Theme Toggle right inside the header */}
          <ThemeToggle />

          {user && (
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="flex items-center gap-2 text-sm cursor-pointer focus:outline-none"
              >
                <div className="h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-semibold text-xs border border-transparent dark:border-indigo-800">
                  {getInitials(user.name)}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="font-medium text-gray-900 dark:text-white text-sm leading-tight">{user.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-300 capitalize leading-tight">{user.role}</p>
                </div>
              </button>

              {/* 🚀 Added dark mode styling to the dropdown menu */}
              {showMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
                  <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{user.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-300 truncate">{user.email}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-400 capitalize mt-1 font-semibold">
                      {user.club?.name ? `${user.club.name} - ` : ''}{user.role}
                    </p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors cursor-pointer"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </button>
                </div>
              )}
            </div>
          )}
          
        </div>
      </div>
    </header>
  );
}