import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getAllTeams } from "../../api/services/team.service"; 
import { Users, ArrowRight, Calendar, Building2 } from "lucide-react"; 
import Spinner from "../../components/common/Spinner";
import { useAuth } from "../../context/AuthContext";
import Login from "./Login";
import Register from "./Register";
import Modal from "../../components/common/Modal";
import Footer from '../../components/layout/Footer';
import ThemeToggle from '../../components/common/ThemeToggle'; 

export default function Home() {
  const [teams, setTeams] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [failedLogos, setFailedLogos] = useState(new Set());

  const { user, isAuthenticated, isSuperAdmin } = useAuth();
  const navigate = useNavigate();

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  
  const [preSelectedTeam, setPreSelectedTeam] = useState("");

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const data = await getAllTeams(); 
        const teamsArray = Array.isArray(data) ? data : (data?.teams || data?.data?.teams || []);
        setTeams(teamsArray);
      } catch (err) {
        console.error("Failed to load organizations:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchTeams();
  }, []);

  const handleDashboardNavigation = () => {
    if (!user) return;
    
    if (isSuperAdmin) {
      navigate("/super-admin/dashboard");
    } else {
      navigate("/workspace/dashboard");
    }
  };

  const handleTeamNavigation = (teamId) => {
    if (isAuthenticated) {
      handleDashboardNavigation();
    } else {
      setPreSelectedTeam(teamId);
      setAuthMode("register");
      setShowAuthModal(true);
    }
  };

  const handleLogoError = (teamId) => {
    setFailedLogos(prev => new Set(prev).add(teamId));
  };

  return (
    // 🚀 FIX 1: Added dark: gradients to the main background wrapper
    <div className="min-h-screen flex flex-col bg-linear-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 transition-colors duration-300">
      
      {/* 🚀 FIX 2: Added dark: bg and borders to the Header */}
      <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-auto sm:h-16 flex flex-col sm:flex-row flex-wrap items-center justify-between gap-3 py-3 sm:py-0">
          <Link to="/" className="text-xl font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
            <Calendar className="h-6 w-6" />
            PlannEx
          </Link>

          <div className="flex items-center gap-4">
            {/* Added ThemeToggle here! */}
            <ThemeToggle />

            {/* 🚀 FIX 3: Updated text colors for links */}
            <Link to="/reports" className="text-sm text-gray-600 hover:text-gray-900 dark:text-white dark:hover:text-white transition-colors">
              Public Reports
            </Link>

            {isAuthenticated ? (
              <button
                onClick={handleDashboardNavigation}
                className="text-sm font-medium bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors cursor-pointer"
              >
                Go to Dashboard
              </button>
            ) : (
              <div className="flex gap-4">
                <button
                  onClick={() => { 
                    setPreSelectedTeam(""); 
                    setAuthMode("login"); 
                    setShowAuthModal(true); 
                  }}
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 cursor-pointer transition-colors"
                >
                  Login
                </button>
                <button
                  onClick={() => { 
                    setPreSelectedTeam(""); 
                    setAuthMode("register"); 
                    setShowAuthModal(true); 
                  }}
                  className="text-sm font-medium bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors cursor-pointer"
                >
                  Register
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="grow">
        {/* HERO */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          {/* 🚀 FIX 4: Made the main heading text white in dark mode */}
          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 dark:text-white transition-colors duration-300">
            Multi-Tenant <span className="text-indigo-600 dark:text-indigo-400">Event Management System</span>
          </h1>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-100 max-w-2xl mx-auto transition-colors duration-300">
            One platform, multiple organizations. Manage your team's events, 
            track tasks, and generate professional reports seamlessly.
          </p>
        </section>

        {/* TEAM GRID */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-8 text-center transition-colors duration-300">
            Explore Organizations
          </h2>

          {loading ? (
            <div className="flex justify-center py-12">
              <Spinner size="lg" />
            </div>
          ) : teams.length === 0 ? (
            <p className="text-center text-gray-500 dark:text-gray-300 py-12">No organizations registered yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {teams.map((team) => (
                <div
                  key={team._id}
                  onClick={() => handleTeamNavigation(team._id)}
                  className="cursor-pointer group bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg dark:hover:shadow-gray-900/50 hover:border-indigo-300 dark:hover:border-indigo-500 transition-all duration-200"
                >
                  {/* Logo Section - Full Width at Top */}
                  <div className="h-32 w-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center overflow-hidden">
                    {team.logo && !failedLogos.has(team._id) ? (
                      <img 
                        src={team.logo} 
                        alt={team.name} 
                        className="h-full w-full object-contain p-4"
                        onError={() => handleLogoError(team._id)}
                      />
                    ) : (
                      <Building2 className="h-16 w-16 text-indigo-600 dark:text-indigo-400" />
                    )}
                  </div>

                  {/* Content Section */}
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors flex-1">
                        {team.name}
                      </h3>
                      <ArrowRight className="h-5 w-5 text-gray-300 dark:text-gray-400 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors shrink-0 ml-2" />
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-300 line-clamp-2">
                      {team.description || "Active organization on EventFlow SaaS."}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* FOOTER */}
      <Footer />

      {/* AUTH MODAL */}
      <Modal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} size="md">
        {authMode === "login" ? (
          <Login onSuccess={() => setShowAuthModal(false)} switchToRegister={() => setAuthMode("register")} />
        ) : (
          <Register 
            onSuccess={() => setShowAuthModal(false)} 
            switchToLogin={() => setAuthMode("login")} 
            preSelectedTeamId={preSelectedTeam} 
          />
        )}
      </Modal>
    </div>
  );
}