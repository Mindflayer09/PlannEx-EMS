import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getPublicEvents } from '../../api/services/event.service';
import { Calendar, MapPin, Image } from 'lucide-react';
import Spinner from '../../components/common/Spinner';
import Card from '../../components/common/Card';
import Modal from '../../components/common/Modal';
import { formatDate } from '../../utils/helpers';

export default function PublicReports() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const res = await getPublicEvents({ limit: 100 });
        setEvents(res.data.events);
        console.log('Fetched public events:', res.data.events);
      } catch (err) {
        console.error('Failed to load public events:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, []);

  return (
    <div className="min-h-screen bg-linear-to-br from-indigo-50 via-white to-purple-50">
      
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="text-xl font-bold text-indigo-600 flex items-center gap-2">
            <Calendar className="h-6 w-6" />
            ClubEvents
          </Link>
          <Link to="/login" className="text-sm font-medium text-indigo-600 hover:text-indigo-800">
            Login
          </Link>
        </div>
      </header>

      {/* Page Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Public Event Reports
        </h1>
        <p className="text-gray-500 mb-8">
          Browse finalized event reports from all clubs
        </p>

        {loading ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>

        ) : events.length === 0 ? (
          <div className="text-center py-20">
            <Image className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">
              No published event reports yet.
            </p>
          </div>

        ) : (

          /* Event Cards */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">

            {events.map((event) => (

              <Card
                key={event._id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setSelected(event)}
              >

                {/* Event Preview Image */}
                <img
                  src={
                    event.images?.length > 0
                      ? event.images[0]
                      : event.media?.[0]?.url ||
                        "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&q=80&w=1000"
                  }
                  alt={event.title}
                  className="w-full h-40 object-cover rounded-lg mb-4"
                />

                <h3 className="text-lg font-semibold text-gray-900">
                  {event.title}
                </h3>

                <p className="mt-1 text-sm text-gray-500 line-clamp-2">
                  {event.description}
                </p>

                <div className="mt-3 flex items-center gap-2 text-xs text-gray-400">
                  <MapPin className="h-3 w-3" />
                  {event.club?.name}
                  <span className="mx-1">-</span>
                  {formatDate(event.createdAt)}
                </div>

              </Card>
            ))}

          </div>
        )}
      </div>


      {/* ================= MODAL ================= */}

      <Modal
        isOpen={!!selected}
        onClose={() => setSelected(null)}
        size="lg"
      >

        {selected && (

          <div className="max-h-[75vh] overflow-y-auto pr-2 space-y-6">

            {/* Hero Image */}
            <div className="relative h-48 sm:h-64 w-full bg-gray-200 rounded-xl overflow-hidden mb-6 shrink-0">
              
              <img
                src={
                  selected.images?.length > 0
                    ? selected.images[0]
                    : selected.media?.[0]?.url ||
                      "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&q=80&w=1000"
                }
                alt={selected.title}
                className="object-cover w-full h-full"
              />

              <div className="absolute top-4 left-4 bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide shadow-sm">
                Event Recap
              </div>

            </div>


            {/* 🔥 Event Image Gallery */}
            {selected.images?.length > 0 && (

              <div>

                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Event Highlights
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">

                  {selected.images.map((img, i) => (

                    <img
                      key={i}
                      src={img}
                      alt="Event"
                      className="w-full h-32 object-cover rounded-lg hover:scale-105 transition-transform"
                    />

                  ))}

                </div>

              </div>

            )}


            {/* Headline */}
            <div className="border-b border-gray-100 pb-4 mb-4">

              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 leading-tight mb-3">
                {selected.report?.headline || selected.title}
              </h1>

              <div className="flex flex-wrap items-center text-sm text-gray-500">

                <span className="font-medium text-gray-700">
                  By {selected.club?.name || 'Club'}
                </span>

                <span className="mx-2">•</span>

                <time>{formatDate(selected.createdAt)}</time>

                <span className="mx-2">•</span>

                <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 px-2 py-0.5 rounded text-xs font-semibold border border-purple-100 mt-2 sm:mt-0">

                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"></path>
                  </svg>

                  AI Generated

                </span>

              </div>

            </div>


            {/* Article Content */}

            {selected.report ? (

              <>
                {selected.report.leadParagraph && (

                  <p className="text-lg text-gray-700 leading-relaxed font-medium">
                    {selected.report.leadParagraph}
                  </p>

                )}

                {selected.report.teamHighlights &&
                  selected.report.teamHighlights.length > 0 && (

                  <div className="bg-indigo-50 border-l-4 border-indigo-500 p-5 rounded-r-lg my-6">

                    <h3 className="text-lg font-bold text-indigo-900 mb-4">
                      Spotlight on Teamwork
                    </h3>

                    <div className="space-y-3">

                      {selected.report.teamHighlights.map((highlight, index) => (

                        <div
                          key={index}
                          className="bg-white p-3 rounded-md shadow-sm border border-indigo-100"
                        >

                          <p className="text-gray-800 text-sm">
                            <span className="font-bold text-indigo-600">
                              {highlight.role}:
                            </span>{" "}
                            {highlight.description}
                          </p>

                        </div>

                      ))}

                    </div>

                  </div>

                )}
              </>

            ) : (

              <p className="text-sm text-gray-600">
                {selected.description}
              </p>

            )}

          </div>

        )}

      </Modal>

    </div>
  );
}