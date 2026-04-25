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
    <div className="min-h-screen flex flex-col bg-linear-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 transition-colors duration-300">
      
      <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-auto sm:h-16 flex flex-col sm:flex-row flex-wrap items-center justify-between gap-3 py-3 sm:py-0">
          
          {/* UPDATED HEADER LOGO */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="bg-gradient-to-br from-indigo-600 to-purple-600 text-white p-2 rounded-xl shadow-md group-hover:shadow-lg transition-all duration-300">
              <Calendar className="h-5 w-5" />
            </div>
            <span className="text-2xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 tracking-tight">
              PlannEx
            </span>
          </Link>

          <div className="flex items-center gap-4">
            <ThemeToggle />

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
                  className="cursor-pointer group relative rounded-2xl p-[2px] overflow-hidden transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_20px_40px_-15px_rgba(79,70,229,0.3)] dark:hover:shadow-[0_20px_40px_-15px_rgba(129,140,248,0.2)]"
                >
                  {/* Hover Animated Gradient Border */}
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl"></div>

                  {/* Inner Card Container */}
                  <div className="relative h-full bg-white dark:bg-gray-800 rounded-xl overflow-hidden z-10 flex flex-col border border-gray-100 dark:border-gray-700 group-hover:border-transparent transition-colors duration-500">
                    
                    {/* Creative Abstract Logo Section */}
                    <div className="h-40 w-full relative flex items-center justify-center overflow-hidden border-b border-gray-100 dark:border-gray-700/50 bg-slate-50 dark:bg-gray-900/50">
                      
                      {/* Expanding Blurred Color Blobs */}
                      <div className="absolute -top-10 -left-10 w-32 h-32 bg-indigo-400/20 dark:bg-indigo-500/20 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-2xl group-hover:scale-150 transition-transform duration-700 ease-out"></div>
                      <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-purple-400/20 dark:bg-purple-500/20 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-2xl group-hover:scale-150 transition-transform duration-700 ease-out delay-75"></div>
                      
                      {/* Tech Grid Pattern */}
                      <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] dark:bg-[radial-gradient(#374151_1px,transparent_1px)] [background-size:16px_16px] opacity-40"></div>

                      {team.logo && !failedLogos.has(team._id) ? (
                        <div className="relative z-10 w-full h-full p-8 flex items-center justify-center transform group-hover:scale-110 group-hover:rotate-1 transition-all duration-500 drop-shadow-xl">
                          <img 
                            src={team.logo} 
                            alt={team.name} 
                            className="max-h-full max-w-full object-contain mix-blend-multiply dark:mix-blend-normal"
                            onError={() => handleLogoError(team._id)}
                          />
                        </div>
                      ) : (
                        <div className="relative z-10 transform group-hover:scale-110 transition-transform duration-500">
                          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md p-4 rounded-2xl shadow-lg ring-1 ring-black/5 dark:ring-white/10">
                            <Building2 className="h-12 w-12 text-indigo-500 dark:text-indigo-400 drop-shadow-sm" />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Content Section */}
                    <div className="p-6 grow flex flex-col justify-between bg-gradient-to-b from-transparent to-gray-50/50 dark:to-gray-800/30">
                      <div>
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-indigo-600 group-hover:to-purple-500 transition-all duration-300">
                            {team.name}
                          </h3>
                          {/* Animated Arrow Icon */}
                          <div className="h-8 w-8 rounded-full bg-indigo-50 dark:bg-gray-700 flex items-center justify-center group-hover:bg-indigo-600 transition-all duration-300 shadow-sm shrink-0 overflow-hidden">
                            <ArrowRight className="h-4 w-4 text-indigo-600 dark:text-indigo-400 group-hover:text-white transition-all duration-300 -translate-x-4 opacity-0 group-hover:translate-x-0 group-hover:opacity-100" />
                          </div>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mt-1">
                          {team.description || "Active organization on EventFlow SaaS."}
                        </p>
                      </div>
                      
                      {/* UI Tags */}
                      <div className="mt-6 flex items-center gap-2">
                         <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400 ring-1 ring-inset ring-indigo-700/10 dark:ring-indigo-400/20">
                           <Users className="w-3.5 h-3.5" /> Workspace
                         </span>
                         <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400 ring-1 ring-inset ring-green-600/20 dark:ring-green-400/20">
                           Active
                         </span>
                      </div>
                    </div>

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