import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getPublicEvents } from '../../api/services/event.service';
import { Calendar, MapPin, Image } from 'lucide-react';
import Spinner from '../../components/common/Spinner';
import Card from '../../components/common/Card';
import Modal from '../../components/common/Modal';
import { formatDate } from '../../utils/helpers';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function PublicReports() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const res = await getPublicEvents();
        setEvents(res.data.events);
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
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="text-xl font-bold text-indigo-600 flex items-center gap-2">
            <Calendar className="h-6 w-6" />
            ClubEvents
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/login" className="text-sm font-medium text-indigo-600 hover:text-indigo-800">
              Login
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Public Event Reports</h1>
        <p className="text-gray-500 mb-8">Browse finalized event reports from all clubs</p>

        {loading ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-20">
            <Image className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No published event reports yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => (
              <Card
                key={event._id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setSelected(event)}
              >
                {event.media?.[0] && (
                  <img
                    src={event.media[0].url}
                    alt={event.title}
                    className="w-full h-40 object-cover rounded-lg mb-4"
                  />
                )}
                <h3 className="text-lg font-semibold text-gray-900">{event.title}</h3>
                <p className="mt-1 text-sm text-gray-500 line-clamp-2">{event.description}</p>
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

      {/* Detail Modal */}
      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title={selected?.title} size="lg">
        {selected && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">{selected.description}</p>
            
            {/* 🔥 NEW: Render Markdown with Tailwind Typography */}
            {selected.report && (
              <div className="mt-6 border-t border-gray-100 pt-4">
                <h4 className="font-medium text-gray-900 mb-3">Post-Event Report</h4>
                <div className="prose prose-sm sm:prose-base prose-indigo max-w-none text-gray-700 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {selected.report}
                  </ReactMarkdown>
                </div>
              </div>
            )}

            {selected.budget > 0 && (
              <p className="text-sm text-gray-500 mt-4">
                <strong>Budget Utilized:</strong> Rs. {selected.budget}
              </p>
            )}

            {selected.media?.length > 0 && (
              <div className="mt-6">
                <h4 className="font-medium text-gray-900 mb-2">Gallery</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {selected.media.map((m, i) => (
                    <img
                      key={i}
                      src={m.url}
                      alt={`Media ${i + 1}`}
                      className="w-full h-32 object-cover rounded-lg shadow-sm"
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}