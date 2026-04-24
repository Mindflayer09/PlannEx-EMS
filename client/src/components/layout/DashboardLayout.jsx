import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import Footer from './Footer';
import { useAuth } from '../../context/AuthContext';

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();
  const location = useLocation();

  // 🚀 MOBILE UX FIX: Automatically close the mobile sidebar whenever a user clicks a link and navigates
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Check if the user is a super admin
  const isSuperAdmin = user?.role === 'super_admin';

  return (
    // 🚀 MOBILE FIX: Added 'min-h-[100dvh]' to perfectly fit mobile browser screens, ignoring address bar overlap
    <div className="min-h-dvh bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white transition-colors duration-200 flex flex-col font-sans">
      <Navbar
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        sidebarOpen={sidebarOpen}
        // hideHamburger={isSuperAdmin} 
      />
      
      <div className="flex flex-1 overflow-hidden relative w-full">
        
        {/* ✅ Only render the default Sidebar if NOT a Super Admin */}
        {!isSuperAdmin && (
          <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        )}

        {/* 🚀 MOBILE FIX: Added 'overflow-x-hidden' to prevent the phone screen from wobbling side-to-side */}
        <main 
          className={`flex-1 overflow-y-auto overflow-x-hidden w-full relative ${
            isSuperAdmin ? '' : 'p-4 sm:p-6 lg:p-8'
          }`}
        >
          {/* 🚀 DESKTOP FIX: Keeps mobile fluid, but stops desktop from stretching too wide */}
          <div className={isSuperAdmin ? 'w-full h-full' : 'max-w-7xl mx-auto w-full h-full'}>
            <Outlet />
          </div>
        </main>

      </div>
      
      {/* Footer */}
      <Footer />
    </div>
  );
}