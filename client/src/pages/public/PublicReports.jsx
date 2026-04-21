import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getPublicEvents } from '../../api/services/event.service';
import { Calendar, MapPin, Image as ImageIcon } from 'lucide-react';
import Spinner from '../../components/common/Spinner';
import Card from '../../components/common/Card';
import Modal from '../../components/common/Modal';
import { formatDate } from '../../utils/helpers';
import ThemeToggle from '../../components/common/ThemeToggle';

// ✅ Global fallback for broken or temporary blob links
const PLACEHOLDER = "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&q=80&w=1000";

export default function PublicReports() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const res = await getPublicEvents({ limit: 100 });
        // Handle different possible response structures
        const fetchedData = res?.data?.events || res?.events || [];
        setEvents(fetchedData);
      } catch (err) {
        console.error('Failed to load public events:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, []);

  /**
   * 🛡️ Helper: Validates image strings. 
   * Returns fallback if the URL is a temporary blob or null.
   */
  const getSafeImage = (src) => {
    if (!src || typeof src !== 'string' || src.startsWith('blob:')) {
      return PLACEHOLDER;
    }
    return src;
  };

  /**
   * 🛡️ Helper: Swaps broken images for a placeholder at runtime
   */
  const handleImageError = (e) => {
    e.target.src = PLACEHOLDER;
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 transition-colors duration-300">
      
      {/* Header */}
      <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800 sticky top-0 z-10 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-auto sm:h-16 flex flex-col sm:flex-row flex-wrap items-center justify-between gap-3 py-3 sm:py-0">
          <Link to="/" className="text-xl font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
            <Calendar className="h-6 w-6" />
            PlannEx
          </Link>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Link to="/login" className="text-sm font-medium text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors">
              Login
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-10">
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
            Public Event Reports
          </h1>
          <p className="text-gray-500 dark:text-gray-300 mt-2">
            Official archives and results from finalized club activities.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Spinner size="lg" />
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-24 bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-sm">
            <ImageIcon className="h-12 w-12 text-gray-200 dark:text-gray-400 mx-auto mb-4" />
            <p className="text-gray-400 dark:text-gray-300 font-medium">No published reports found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {events.map((event) => {
              const previewImg = getSafeImage(event.images?.[0] || event.media?.[0]?.url);

              return (
                <Card
                  key={event._id}
                  className="group cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden border-gray-100 dark:border-slate-700"
                  onClick={() => setSelected(event)}
                >
                  <div className="aspect-video w-full overflow-hidden mb-4 rounded-xl bg-gray-100 dark:bg-slate-700">
                    <img
                      src={previewImg}
                      alt={event.title}
                      onError={handleImageError}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>

                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 line-clamp-1">
                    {event.title}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-300 line-clamp-2 mb-6 leading-relaxed">
                    {event.description}
                  </p>

                  <div className="mt-auto pt-4 border-t border-gray-50 dark:border-slate-700 flex items-center justify-between text-[11px] font-bold text-gray-400 dark:text-gray-400 uppercase tracking-widest">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-3 w-3 text-indigo-400 dark:text-indigo-500" />
                      {event.club?.name || "Organization"}
                    </div>
                    <span>{formatDate(event.createdAt)}</span>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* ================= REPORT MODAL ================= */}
      <Modal
        isOpen={!!selected}
        onClose={() => setSelected(null)}
        size="lg"
      >
        {selected && (
          <div className="max-h-[80vh] overflow-y-auto pr-3 custom-scrollbar">
            {/* Hero Section */}
            <div className="relative aspect-video w-full bg-gray-100 rounded-2xl overflow-hidden mb-8 shadow-inner">
              <img
                src={getSafeImage(selected.images?.[0] || selected.media?.[0]?.url)}
                alt={selected.title}
                onError={handleImageError}
                className="object-cover w-full h-full"
              />
              <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur px-3 py-1 rounded-lg shadow-sm">
                <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">
                  Official Archive
                </span>
              </div>
            </div>

            {/* Gallery */}
            {selected.images?.length > 1 && (
              <div className="mb-8">
                <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">
                  Visual Highlights
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {selected.images.map((img, i) => (
                    <div key={i} className="aspect-square rounded-xl overflow-hidden border-2 border-gray-50 bg-gray-50">
                      <img
                        src={getSafeImage(img)}
                        alt={`Highlight ${i}`}
                        onError={handleImageError}
                        className="w-full h-full object-cover hover:scale-110 transition-transform cursor-zoom-in"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Article Content */}
            <div className="space-y-6">
              <div className="border-b border-gray-100 pb-6">
                <h1 className="text-3xl font-black text-gray-900 leading-tight mb-4">
                  {selected.report?.headline || selected.title}
                </h1>
                <div className="flex items-center gap-3 text-sm">
                  <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                    {selected.club?.name?.[0] || "C"}
                  </div>
                  <div>
                    <p className="text-gray-900 font-bold">{selected.club?.name}</p>
                    <p className="text-gray-400 text-xs">{formatDate(selected.createdAt)}</p>
                  </div>
                </div>
              </div>

              {selected.report ? (
                <>
                  {selected.report.leadParagraph && (
                    <p className="text-lg text-gray-700 leading-relaxed font-medium first-letter:text-4xl first-letter:font-black first-letter:text-indigo-600 first-letter:mr-2 first-letter:float-left">
                      {selected.report.leadParagraph}
                    </p>
                  )}

                  {selected.report.teamHighlights?.length > 0 && (
                    <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 space-y-4">
                      <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                        <div className="w-1.5 h-4 bg-indigo-500 rounded-full" />
                        Execution Breakdown
                      </h3>
                      <div className="grid gap-3">
                        {selected.report.teamHighlights.map((highlight, index) => (
                          <div key={index} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200/50">
                            <p className="text-sm text-gray-800">
                              <span className="font-bold text-indigo-600 mr-2">{highlight.role}:</span>
                              {highlight.description}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-gray-600 leading-relaxed italic">
                  {selected.description}
                </p>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}