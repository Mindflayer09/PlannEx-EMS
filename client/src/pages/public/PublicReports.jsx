import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getPublicReports } from '../../api/services/report.service'; 
import { Calendar, MapPin, ArrowRight, Building, Tag } from 'lucide-react';
import Spinner from '../../components/common/Spinner';
import Modal from '../../components/common/Modal';
import { formatDate } from '../../utils/helpers';
import ThemeToggle from '../../components/common/ThemeToggle';

const PLACEHOLDER = "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&q=80&w=1000";

export default function PublicReports() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const res = await getPublicReports({ limit: 100 });
        const fetchedData = res?.data?.data?.reports || res?.data?.reports || res?.reports || [];
        setEvents(fetchedData);
      } catch (err) {
        console.error('Failed to load public reports:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, []);

  const getSafeImage = (src) => (!src || typeof src !== 'string' || src.startsWith('blob:') ? PLACEHOLDER : src);
  const handleImageError = (e) => { e.target.src = PLACEHOLDER; };

  // Safely unpacks AI JSON strings if the backend dumped raw JSON
  const extractCleanContent = (reportDoc, eventDoc) => {
    let title = reportDoc.title || eventDoc.title;
    let content = reportDoc.content || eventDoc.description;
    
    if (typeof content === 'string' && content.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(content);
        title = parsed.title || title;
        content = parsed.content || content;
      } catch (e) {
        // Fallback to raw text
      }
    }
    return { title, content };
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-300 font-sans text-gray-900 dark:text-gray-100">
      
      {/* Modern Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="text-xl font-bold tracking-tight text-indigo-600 dark:text-indigo-400">
              PlannEx
            </Link>
            <span className="hidden sm:inline-block h-5 w-px bg-gray-300 dark:bg-gray-700"></span>
            <span className="hidden sm:inline-block text-sm font-medium text-gray-500 dark:text-gray-400">
              Event Highlights & Reports
            </span>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Link to="/login" className="text-sm font-semibold text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
              Staff Login
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-3">Discover Recent Events</h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl">
            Explore the latest highlights, success stories, and reports from our community's top events.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Spinner size="lg" /></div>
        ) : events.length === 0 ? (
          <div className="text-center py-24 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-1">No reports published yet</h3>
            <p className="text-gray-500 dark:text-gray-400">Check back later for exciting event highlights.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {events.map((reportDoc) => {
              const eventDoc = reportDoc.event || reportDoc; 
              
              const { title: articleTitle, content: articleContent } = extractCleanContent(reportDoc, eventDoc);
              
              const fallbackPhotos = eventDoc.images || eventDoc.media || [];
              const heroImage = reportDoc.reportImage || fallbackPhotos[0]?.url || fallbackPhotos[0];
              const orgName = reportDoc.team?.name || eventDoc.club?.name || "Independent Division";
              const publishDate = formatDate(reportDoc.createdAt || eventDoc.createdAt);
              
              return (
              <article 
                key={reportDoc._id} 
                className="group flex flex-col bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer"
                onClick={() => setSelected(reportDoc)}
              >
                {/* Card Image */}
                <div className="relative h-48 w-full overflow-hidden bg-gray-100 dark:bg-gray-800">
                  <img 
                    src={getSafeImage(heroImage?.url || heroImage)} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    alt="Event highlight"
                    onError={handleImageError}
                  />
                  <div className="absolute top-4 left-4">
                    <span className="inline-flex items-center rounded-full bg-white/90 dark:bg-gray-900/90 backdrop-blur-xs px-2.5 py-0.5 text-xs font-semibold text-gray-900 dark:text-white shadow-xs">
                      {publishDate}
                    </span>
                  </div>
                </div>

                {/* Card Body */}
                <div className="flex flex-col flex-1 p-6">
                  <div className="flex items-center gap-2 text-xs font-medium text-indigo-600 dark:text-indigo-400 mb-3">
                    <Building className="h-4 w-4" />
                    <span className="truncate">{orgName}</span>
                  </div>
                  
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3 line-clamp-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {articleTitle}
                  </h2>
                  
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3 mb-6 flex-1">
                    {articleContent}
                  </p>
                  
                  {/* Card Footer */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-800 mt-auto">
                    <div className="flex items-center gap-1.5 text-sm font-semibold text-indigo-600 dark:text-indigo-400 group-hover:gap-2 transition-all">
                      Read Report <ArrowRight className="h-4 w-4" />
                    </div>
                  </div>
                </div>
              </article>
            )})}
          </div>
        )}
      </main>

      {/* ================= MODERN MODAL ================= */}
      <Modal isOpen={!!selected} onClose={() => setSelected(null)} size="2xl">
        {selected && (() => {
          const eventDoc = selected.event || selected;
          const { title: modalTitle, content: modalContent } = extractCleanContent(selected, eventDoc);
          
          const fallbackPhotos = eventDoc.images || eventDoc.media || [];
          const modalHero = selected.reportImage || fallbackPhotos[0]?.url || fallbackPhotos[0];
          const modalSideImages = (selected.galleryImages && selected.galleryImages.length > 0) 
                                  ? selected.galleryImages 
                                  : fallbackPhotos.slice(1, 4);
          const orgName = selected.team?.name || eventDoc.club?.name || "Independent Division";
          const reportDate = formatDate(selected.createdAt || eventDoc.createdAt);

          return (
          <div className="bg-white dark:bg-gray-900 rounded-2xl overflow-hidden font-sans">
            {/* Modal Hero */}
            <div className="relative h-64 sm:h-80 w-full">
              <img 
                src={getSafeImage(modalHero?.url || modalHero)} 
                className="w-full h-full object-cover" 
                alt="Event cover"
              />
              <div className="absolute inset-0 bg-linear-to-t from-gray-900/80 via-gray-900/20 to-transparent"></div>
              <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
                <div className="flex flex-wrap items-center gap-3 mb-3">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/20 text-indigo-200 backdrop-blur-md px-3 py-1 text-xs font-semibold">
                    <Building className="h-3.5 w-3.5" /> {orgName}
                  </span>
                  <span className="text-gray-300 text-sm flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" /> {reportDate}
                  </span>
                </div>
                <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
                  {modalTitle}
                </h1>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 sm:p-8 max-h-[60vh] overflow-y-auto">
              <div className="prose prose-indigo dark:prose-invert max-w-none">
                <p className="text-base sm:text-lg text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                  {modalContent}
                </p>
              </div>
              
              {/* Image Gallery */}
              {modalSideImages.length > 0 && (
                <div className="mt-12">
                  <h3 className="text-lg font-bold mb-4 border-b border-gray-200 dark:border-gray-800 pb-2">Event Gallery</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {modalSideImages.map((img, i) => (
                      <div key={i} className="aspect-video sm:aspect-square overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
                        <img 
                          src={getSafeImage(img?.url || img)} 
                          className="w-full h-full object-cover hover:scale-110 transition-transform duration-500 cursor-pointer" 
                          alt={`Gallery item ${i + 1}`} 
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tags */}
              {selected.hashtags && selected.hashtags.length > 0 && (
                <div className="mt-10 pt-6 border-t border-gray-200 dark:border-gray-800">
                  <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-gray-900 dark:text-white">
                    <Tag className="h-4 w-4 text-indigo-500" /> Tags
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selected.hashtags.map((tag, i) => (
                      <span key={i} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                        #{tag.replace('#', '')}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          )
        })()}
      </Modal>
    </div>
  );
}