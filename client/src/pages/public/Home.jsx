import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getClubs } from "../../api/services/club.service";
import { Users, ArrowRight, Calendar } from "lucide-react";
import Spinner from "../../components/common/Spinner";
import { useAuth } from "../../context/AuthContext";
import Login from "./Login";
import Register from "./Register";
import Modal from "../../components/common/Modal";

export default function Home() {
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);

  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState("login");

  useEffect(() => {
    const fetchClubs = async () => {
      try {
        const clubsData = await getClubs();
        setClubs(Array.isArray(clubsData) ? clubsData : []);
      } catch (err) {
        console.error("Failed to load clubs:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchClubs();
  }, []);

  const handleDashboardNavigation = () => {
    if (!user) return;

    const routes = {
      admin: "/admin/dashboard",
      "sub-admin": "/subadmin/dashboard",
      volunteer: "/volunteer/dashboard",
    };

    navigate(routes[user.role] || "/");
  };

  const handleClubNavigation = (clubId) => {
    if (isAuthenticated && user) {
      handleDashboardNavigation();
    } else {
      setAuthMode("register");
      setShowAuthModal(true);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-indigo-50 via-white to-purple-50">

      {/* HEADER */}

      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">

          <Link
            to="/"
            className="text-xl font-bold text-indigo-600 flex items-center gap-2"
          >
            <Calendar className="h-6 w-6" />
            ClubEvents
          </Link>

          <div className="flex items-center gap-4">

            <Link
              to="/reports"
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Public Reports
            </Link>

            {isAuthenticated ? (
              <button
                onClick={handleDashboardNavigation}
                className="text-sm font-medium bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Go to Dashboard
              </button>
            ) : (
              <>
                <button
                  onClick={() => {
                    setAuthMode("login");
                    setShowAuthModal(true);
                  }}
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-800 cursor-pointer"
                >
                  Login
                </button>

                <button
                  onClick={() => {
                    setAuthMode("register");
                    setShowAuthModal(true);
                  }}
                  className="text-sm font-medium bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors cursor-pointer"
                >
                  Register
                </button>
              </>
            )}

          </div>
        </div>
      </header>

      {/* HERO */}

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">

        <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900">
          JIMS Club <span className="text-indigo-600">Event Management</span>
        </h1>

        <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
          Streamline your club events from planning to post-event reports.
          Manage tasks, collaborate with your team, and share achievements
          with the community.
        </p>

      </section>

      {/* CLUB GRID */}

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">

        <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">
          Select Your Club
        </h2>

        {loading ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : clubs.length === 0 ? (
          <p className="text-center text-gray-500 py-12">
            No clubs available yet.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">

            {clubs.map((club) => (
              <div
                key={club._id}
                onClick={() => handleClubNavigation(club._id)}
                className="cursor-pointer group bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg hover:border-indigo-300 transition-all duration-200"
              >

                <div className="flex items-start justify-between">

                  <div className="h-12 w-12 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
                    <Users className="h-6 w-6" />
                  </div>

                  <ArrowRight className="h-5 w-5 text-gray-300 group-hover:text-indigo-500 transition-colors" />

                </div>

                <h3 className="mt-4 text-lg font-semibold text-gray-900 group-hover:text-indigo-600">
                  {club.name}
                </h3>

                <p className="mt-2 text-sm text-gray-500 line-clamp-2">
                  {club.description}
                </p>

              </div>
            ))}

          </div>
        )}

      </section>

      {/* AUTH MODAL */}

      <Modal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        size="md"
      >

        {authMode === "login" ? (
          <>
            <Login
              onSuccess={() => setShowAuthModal(false)}
              switchToRegister={() => setAuthMode("register")}
            />
          </>
        ) : (
          <>
            <Register
              onSuccess={() => setShowAuthModal(false)}
              switchToLogin={() => setAuthMode("login")}
            />
          </>
        )}

      </Modal>

    </div>
  );
}