import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LogOut, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { getInitials } from '../../utils/helpers';
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
    <header className="sticky top-0 z-40 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 transition-colors duration-200 shadow-sm">
      {/* 🚀 MOBILE FIX: Forced a single row (h-16) so it never stacks vertically on phones */}
      <div className="flex items-center justify-between h-16 px-4 sm:px-6 w-full">
        
        {/* LEFT SIDE: Hamburger & Logo */}
        <div className="flex items-center gap-3 sm:gap-4">
          <button
            onClick={onToggleSidebar}
            className="lg:hidden text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white p-1 -ml-1 rounded-md transition-colors"
            aria-label="Toggle sidebar"
          >
            {sidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
          <Link to="/" className="text-xl sm:text-2xl font-black tracking-tight text-indigo-600 dark:text-indigo-400">
            PlannEx
          </Link>
        </div>

        {/* RIGHT SIDE: Theme Toggle & User Menu */}
        <div className="flex items-center gap-2 sm:gap-4">
          
          <ThemeToggle />

          {user && (
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="flex items-center gap-2 text-sm cursor-pointer focus:outline-none rounded-full ring-2 ring-transparent hover:ring-indigo-100 dark:hover:ring-indigo-900 transition-all"
              >
                <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-xs sm:text-sm shadow-sm">
                  {getInitials(user.name)}
                </div>
                <div className="hidden sm:block text-left pr-1">
                  <p className="font-semibold text-gray-900 dark:text-white text-sm leading-tight">{user.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 capitalize leading-tight">{user.role}</p>
                </div>
              </button>

              {/* 🚀 MOBILE UX FIX: Invisible full-screen overlay to close menu when tapping outside */}
              {showMenu && (
                <div 
                  className="fixed inset-0 z-40"
                  onClick={() => setShowMenu(false)}
                ></div>
              )}

              {/* Dropdown Menu */}
              {showMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 py-1 z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                    <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{user.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">{user.email}</p>
                    <div className="mt-2 inline-flex items-center px-2 py-1 rounded bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-[10px] font-bold uppercase tracking-wider">
                      {user.club?.name ? `${user.club.name} • ` : ''}{user.role}
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-4 py-3 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors cursor-pointer"
                  >
                    <LogOut className="h-4 w-4" />
                    Secure Logout
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