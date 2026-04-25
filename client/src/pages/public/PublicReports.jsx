import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getPublicReports, deleteReport } from '../../api/services/report.service'; 
import { Calendar, Building, ArrowRight, Folder, Tag, ChevronLeft, Trash2 } from 'lucide-react';
import Spinner from '../../components/common/Spinner';
import Modal from '../../components/common/Modal';
import { formatDate } from '../../utils/helpers';
import ThemeToggle from '../../components/common/ThemeToggle';
import { useAuth } from '../../context/AuthContext'; // Added to check for admin status

const PLACEHOLDER = "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&q=80&w=1000";

export default function PublicReports() {
  const { user } = useAuth(); // Access current logged-in user
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  
  // 🔥 NEW STATE: Tracks which folder is open
  const [activeFolder, setActiveFolder] = useState(null);

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

  // Safely unpacks AI JSON strings whether the backend dumped an object OR an array
  const extractCleanContent = (reportDoc, eventDoc) => {
    let title = reportDoc.title || eventDoc.title;
    let content = reportDoc.content || eventDoc.description;
    
    if (typeof content === 'string') {
      const trimmed = content.trim();
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        try {
          let parsed = JSON.parse(trimmed);
          if (Array.isArray(parsed) && parsed.length > 0) {
            parsed = parsed[0];
          }
          title = parsed.title || title;
          content = parsed.content || content;
        } catch (e) {
          console.warn('Failed to parse AI content JSON, falling back to raw text', e);
        }
      }
    }
    if (typeof content === 'string') {
        content = content.replace(/\\n/g, '\n');
    }
    return { title, content };
  };

  // 🔥 NEW LOGIC: Group reports by Organization Name
  const groupedReports = useMemo(() => {
    return events.reduce((acc, report) => {
      const eventDoc = report.event || report;
      const orgName = report.team?.name || eventDoc.club?.name || "Independent Events";
      
      if (!acc[orgName]) {
        acc[orgName] = [];
      }
      acc[orgName].push(report);
      return acc;
    }, {});
  }, [events]);

  // 🔥 NEW LOGIC: Admin Delete Handler
  const handleDeleteReport = async (reportId) => {
    if (!window.confirm("Are you sure you want to delete this report? This cannot be undone.")) return;
    
    try {
      await deleteReport(reportId);
      // Remove the deleted report from the local state
      setEvents(prev => prev.filter(r => r._id !== reportId));
      setSelected(null); // Close the modal
      toast.success("Report deleted successfully");
      
      // If that was the last report in the active folder, close the folder
      if (activeFolder && groupedReports[activeFolder]?.length === 1) {
          setActiveFolder(null);
      }
    } catch (err) {
      console.error("[DELETE ERROR]", err);
      toast.error("Failed to delete report");
    }
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
              {user ? 'Dashboard' : 'Staff Login'}
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        
        {/* Navigation Breadcrumb */}
        {activeFolder && (
          <button 
            onClick={() => setActiveFolder(null)}
            className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 mb-6 font-medium transition-colors"
          >
            <ChevronLeft className="h-4 w-4" /> Back to Organizations
          </button>
        )}

        <div className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-3">
             {activeFolder ? `${activeFolder} Reports` : 'Discover Organizations'}
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl">
             {activeFolder 
               ? `Explore all highlights and success stories published by ${activeFolder}.` 
               : "Select an organization below to view their published event reports."}
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
        ) : !activeFolder ? (
          
          /* ================= FOLDER VIEW ================= */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.entries(groupedReports).map(([orgName, orgReports]) => {
              // Get the most recent report image to use as the folder thumbnail
              const latestReport = orgReports[0];
              const eventDoc = latestReport.event || latestReport;
              const fallbackPhotos = eventDoc.images || eventDoc.media || [];
              const folderThumbnail = latestReport.reportImage || fallbackPhotos[0]?.url || fallbackPhotos[0];

              return (
                <div 
                  key={orgName} 
                  onClick={() => setActiveFolder(orgName)}
                  className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer group"
                >
                  <div className="relative h-32 w-full bg-gray-100 dark:bg-gray-800">
                    <img 
                      src={getSafeImage(folderThumbnail?.url || folderThumbnail)} 
                      className="w-full h-full object-cover opacity-60 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
                      alt="Folder cover"
                      onError={handleImageError}
                    />
                    <div className="absolute inset-0 bg-linear-to-t from-gray-900/90 to-transparent"></div>
                    <div className="absolute bottom-4 left-4 flex items-center gap-3">
                       <div className="p-2.5 bg-indigo-500/20 backdrop-blur-md rounded-lg text-indigo-200">
                          <Folder className="h-5 w-5" />
                       </div>
                       <h3 className="text-xl font-bold text-white truncate max-w-50">{orgName}</h3>
                    </div>
                  </div>
                  <div className="p-4 flex items-center justify-between text-sm font-medium text-gray-600 dark:text-gray-400">
                    <span>{orgReports.length} {orgReports.length === 1 ? 'Report' : 'Reports'}</span>
                    <ArrowRight className="h-4 w-4 text-indigo-500 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              );
            })}
          </div>

        ) : (

          /* ================= REPORT GRID VIEW ================= */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {groupedReports[activeFolder].map((reportDoc) => {
              const eventDoc = reportDoc.event || reportDoc; 
              
              const { title: articleTitle, content: articleContent } = extractCleanContent(reportDoc, eventDoc);
              
              const fallbackPhotos = eventDoc.images || eventDoc.media || [];
              const heroImage = reportDoc.reportImage || fallbackPhotos[0]?.url || fallbackPhotos[0];
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
          <div className="bg-white dark:bg-gray-900 rounded-2xl overflow-hidden font-sans flex flex-col max-h-[90vh]">
            
            <div className="overflow-y-auto flex-1">
                {/* Modal Hero */}
                <div className="relative h-64 sm:h-80 w-full shrink-0">
                  <img 
                    src={getSafeImage(modalHero?.url || modalHero)} 
                    className="w-full h-full object-cover" 
                    alt="Event cover"
                  />
                  <div className="absolute inset-0 bg-linear-to-t from-gray-900/90 via-gray-900/20 to-transparent"></div>
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
                <div className="p-6 sm:p-8">
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

            {/* 🔥 NEW LOGIC: Admin Action Footer */}
            {user?.role === 'super_admin' && (
               <div className="shrink-0 p-4 bg-red-50 dark:bg-red-900/10 border-t border-red-100 dark:border-red-900/30 flex justify-end">
                 <button 
                   onClick={() => handleDeleteReport(selected._id)}
                   className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-semibold text-sm"
                 >
                   <Trash2 className="h-4 w-4" />
                   Delete Report
                 </button>
               </div>
            )}
          </div>
          )
        })()}
      </Modal>
    </div>
  );
}