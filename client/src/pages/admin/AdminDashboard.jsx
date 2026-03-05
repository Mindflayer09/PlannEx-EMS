import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../../api/axios';
import Card from '../../components/common/Card';
import Spinner from '../../components/common/Spinner';
import GenerateReportButton from '../../components/reports/GenerateReportButton';
import { Users, Calendar, ClipboardList, UserCheck, FileText } from 'lucide-react';

export default function AdminDashboard() {
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    totalUsers: 0,
    pendingApprovals: 0,
    totalEvents: 0,
    totalTasks: 0,
  });
  
  // New state to hold events ready for reporting
  const [readyEvents, setReadyEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboardData = async () => {
    try {
      const selectedClub = localStorage.getItem('selectedClub');

      // 🚨 Block request if no club selected
      if (!selectedClub) {
        setError('No club selected');
        setLoading(false);
        return;
      }

      // Fetch stats and events simultaneously
      const [statsRes, eventsRes] = await Promise.all([
        axios.get('/admin/stats'),
        axios.get('/events') // Adjust this endpoint if your route is different
      ]);

      if (statsRes.success) {
        setStats(statsRes.data);
      } else {
        setError(statsRes.message || 'Failed to load stats');
      }

      // Filter events to only show those in the 'post-event' phase
      if (eventsRes.success) {
        const allEvents = eventsRes.data.events || eventsRes.data;
        const postEvents = allEvents.filter(event => event.phase === 'post-event');
        setReadyEvents(postEvents);
      }

    } catch (err) {
      setError(err.message || 'Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 15000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 text-red-500 font-medium">
        {error}
      </div>
    );
  }

  const cards = [
    {
      label: 'Total Users',
      value: stats.totalUsers,
      icon: Users,
      color: 'bg-blue-100 text-blue-600',
      route: '/admin/users',
    },
    {
      label: 'Pending Approvals',
      value: stats.pendingApprovals,
      icon: UserCheck,
      color: 'bg-yellow-100 text-yellow-600',
      route: '/admin/users?filter=pending',
    },
    {
      label: 'Total Events',
      value: stats.totalEvents,
      icon: Calendar,
      color: 'bg-green-100 text-green-600',
      route: '/admin/events',
    },
    {
      label: 'Total Tasks',
      value: stats.totalTasks,
      icon: ClipboardList,
      color: 'bg-purple-100 text-purple-600',
      route: '/admin/tasks',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Admin Dashboard
      </h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {cards.map(({ label, value, icon: Icon, color, route }) => (
          <Card
            key={label}
            onClick={() => navigate(route)}
            className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:-translate-y-1"
          >
            <div className="flex items-center gap-4">
              <div
                className={`h-12 w-12 rounded-lg flex items-center justify-center ${color}`}
              >
                <Icon className="h-6 w-6" />
              </div>

              <div>
                <p className="text-sm font-medium text-gray-500">{label}</p>
                <p className="text-2xl font-bold text-gray-900">{value}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Reports Generation Section */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <FileText className="h-6 w-6 text-indigo-600" />
          <h2 className="text-xl font-bold text-gray-900">Events Ready for Reporting</h2>
        </div>
        
        {readyEvents.length === 0 ? (
          <Card className="p-8 text-center bg-gray-50 border-dashed border-2">
            <p className="text-gray-500">No events are currently in the post-event phase.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {readyEvents.map(event => (
              <Card key={event._id} className="p-5 flex flex-col justify-between h-full">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-1">{event.title}</h3>
                  <p className="text-sm text-gray-500 mb-4 line-clamp-2">{event.description}</p>
                </div>
                
                <div className="mt-auto pt-4 border-t border-gray-100">
                  <GenerateReportButton 
                    eventId={event._id} 
                    onReportGenerated={() => fetchDashboardData()} 
                  />
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}