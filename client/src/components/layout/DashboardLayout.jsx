import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import { useAuth } from '../../context/AuthContext';

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();

  // Check if the user is a super admin
  const isSuperAdmin = user?.role === 'super_admin';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        sidebarOpen={sidebarOpen}
        // Optional: If your Navbar accepts a prop to hide the hamburger menu, you can pass it here
        // hideHamburger={isSuperAdmin} 
      />
      
      <div className="flex flex-1 overflow-hidden">
        
        {/* ✅ THE FIX: Only render the default Sidebar if NOT a Super Admin */}
        {!isSuperAdmin && (
          <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        )}

        {/* ✅ THE PADDING FIX: Remove default padding for Super Admins so their custom sidebar is flush with the edge */}
        <main className={`flex-1 overflow-y-auto ${isSuperAdmin ? '' : 'p-4 sm:p-6 lg:p-8'}`}>
          <Outlet />
        </main>
        
      </div>
    </div>
  );
}