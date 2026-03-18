import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getAllTeams } from "../../api/services/team.service"; 
import { Users, ArrowRight, Calendar, Building2 } from "lucide-react"; 
import Spinner from "../../components/common/Spinner";
import { useAuth } from "../../context/AuthContext";
import Login from "./Login";
import Register from "./Register";
import Modal from "../../components/common/Modal";

export default function Home() {
  const [teams, setTeams] = useState([]); 
  const [loading, setLoading] = useState(true);

  const { user, isAuthenticated, isSuperAdmin } = useAuth();
  const navigate = useNavigate();

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  
  // ✅ NEW: State to hold the team ID when a card is clicked
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
      // ✅ SAVE the team ID before opening the register modal
      setPreSelectedTeam(teamId);
      setAuthMode("register");
      setShowAuthModal(true);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-indigo-50 via-white to-purple-50">
      {/* HEADER */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="text-xl font-bold text-indigo-600 flex items-center gap-2">
            <Calendar className="h-6 w-6" />
            PlannEx
          </Link>

          <div className="flex items-center gap-4">
            <Link to="/reports" className="text-sm text-gray-600 hover:text-gray-900">
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
                    setPreSelectedTeam(""); // Clear team if standard login clicked
                    setAuthMode("login"); 
                    setShowAuthModal(true); 
                  }}
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-800 cursor-pointer"
                >
                  Login
                </button>
                <button
                  onClick={() => { 
                    setPreSelectedTeam(""); // Clear team if standard register clicked
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

      {/* HERO */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900">
          Multi-Tenant <span className="text-indigo-600">Event Management System</span>
        </h1>
        <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
          One platform, multiple organizations. Manage your team's events, 
          track tasks, and generate professional reports seamlessly.
        </p>
      </section>

      {/* TEAM GRID */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">
          Explore Organizations
        </h2>

        {loading ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : teams.length === 0 ? (
          <p className="text-center text-gray-500 py-12">No organizations registered yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {teams.map((team) => (
              <div
                key={team._id}
                onClick={() => handleTeamNavigation(team._id)}
                className="cursor-pointer group bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg hover:border-indigo-300 transition-all duration-200"
              >
                <div className="flex items-start justify-between">
                  <div className="h-12 w-12 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
                    <Building2 className="h-6 w-6" />
                  </div>
                  <ArrowRight className="h-5 w-5 text-gray-300 group-hover:text-indigo-500 transition-colors" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-gray-900 group-hover:text-indigo-600">
                  {team.name}
                </h3>
                <p className="mt-2 text-sm text-gray-500 line-clamp-2">
                  {team.description || "Active organization on EventFlow SaaS."}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* AUTH MODAL */}
      <Modal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} size="md">
        {authMode === "login" ? (
          <Login onSuccess={() => setShowAuthModal(false)} switchToRegister={() => setAuthMode("register")} />
        ) : (
          <Register 
            onSuccess={() => setShowAuthModal(false)} 
            switchToLogin={() => setAuthMode("login")} 
            // ✅ PASS the team ID to the Register component as a prop
            preSelectedTeamId={preSelectedTeam} 
          />
        )}
      </Modal>
    </div>
  );
}