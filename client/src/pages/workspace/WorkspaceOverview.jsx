import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getAllEvents } from '../../api/services/event.service';
import { getAllTasks } from '../../api/services/task.service';
import { getAllUsers } from '../../api/services/user.service';

import Card from '../../components/common/Card';
import Spinner from '../../components/common/Spinner';
import Button from '../../components/common/Button';
import GenerateReportButton from '../../components/reports/generateButton';
import { 
  Users, 
  Calendar, 
  ClipboardList, 
  UserCheck, 
  FileText, 
  LayoutDashboard, 
  Clock,
  CheckCircle2
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function WorkspaceOverview() {
  const navigate = useNavigate();
  const { user, isSuperAdmin, logout } = useAuth();

  // 🛡️ ROLE & APPROVAL CHECKS
  const isApproved = user?.isApproved || isSuperAdmin;
  const isTeamAdmin = isSuperAdmin || user?.role === 'admin' || user?.teamRole === 'admin';

  const [stats, setStats] = useState({
    totalUsers: 0,
    pendingApprovals: 0,
    totalEvents: 0,
    totalTasks: 0,
  });
  
  const [readyEvents, setReadyEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    if (!isApproved) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [eventsRes, tasksRes] = await Promise.all([
        getAllEvents({ limit: 100 }),
        getAllTasks({ limit: 100 })
      ]);

      const events = Array.isArray(eventsRes) ? eventsRes : (eventsRes?.events || eventsRes?.data?.events || []);
      const tasks = Array.isArray(tasksRes) ? tasksRes : (tasksRes?.tasks || tasksRes?.data?.tasks || []);

      let users = [];
      let pendingCount = 0;

      if (isTeamAdmin) {
        try {
          const usersRes = await getAllUsers({ limit: 100 });
          users = Array.isArray(usersRes) ? usersRes : (usersRes?.users || usersRes?.data?.users || []);
          pendingCount = users.filter(u => !u.isApproved).length;
        } catch (uErr) {
          console.warn("Could not fetch user list - might be restricted.");
        }
      }

      setStats({
        totalUsers: users.length,
        pendingApprovals: pendingCount,
        totalEvents: events.length,
        totalTasks: tasks.length,
      });

      const postEvents = events.filter(event => event.phase === 'post-event' && !event.isFinalized);
      setReadyEvents(postEvents);

    } catch (err) {
      console.error(err);
      toast.error('Session error or failed to sync workspace data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    if (isApproved) {
      const interval = setInterval(fetchDashboardData, 30000);
      return () => clearInterval(interval);
    }
  }, [isApproved]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[70vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  // 🛑 PENDING APPROVAL SCREEN
  if (!isApproved) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <Card className="max-w-xl w-full text-center p-8 sm:p-12 shadow-xl border-t-4 border-t-yellow-400">
          <div className="h-20 w-20 bg-yellow-50 text-yellow-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
            <Clock className="h-10 w-10" />
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900 mb-3 tracking-tight">Awaiting Approval</h1>
          <p className="text-gray-500 text-lg mb-8 leading-relaxed">
            Welcome to <span className="font-semibold text-indigo-600">{user?.team?.name || 'the organization'}</span>! 
            <br className="hidden sm:block" /> Your account is currently pending approval by an administrator.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button onClick={logout} variant="outline" className="w-full sm:w-auto">Sign Out</Button>
            <Button onClick={() => window.location.reload()} className="w-full sm:w-auto">Refresh Status</Button>
          </div>
        </Card>
      </div>
    );
  }

  // ✅ APPROVED DASHBOARD CONTENT
  const cards = [
    ...(isTeamAdmin ? [
      { label: 'Total Members', value: stats.totalUsers, icon: Users, color: 'bg-blue-50 text-blue-600', route: '/workspace/members' },
      { label: 'Pending Approvals', value: stats.pendingApprovals, icon: UserCheck, color: stats.pendingApprovals > 0 ? 'bg-orange-100 text-orange-600' : 'bg-yellow-50 text-yellow-600', route: '/workspace/members' }
    ] : []),
    { label: 'Team Events', value: stats.totalEvents, icon: Calendar, color: 'bg-emerald-50 text-emerald-600', route: '/workspace/events' },
    { label: 'Active Tasks', value: stats.totalTasks, icon: ClipboardList, color: 'bg-purple-50 text-purple-600', route: '/workspace/tasks' },
  ];

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 sm:pb-12">
      {/* Header Section */}
      <div className="flex items-center gap-4 mb-8 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="p-3 bg-indigo-50 rounded-xl">
          <LayoutDashboard className="h-8 w-8 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            {isTeamAdmin ? 'Workspace Admin' : 'My Workspace'}
          </h1>
          <p className="text-sm text-gray-500 font-medium mt-1">
            Organization: <span className="text-indigo-600 font-semibold">{user?.team?.name}</span>
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-12">
        {cards.map(({ label, value, icon: Icon, color, route }) => (
          <Card 
            key={label} 
            onClick={() => navigate(route)} 
            className="cursor-pointer border-transparent hover:border-indigo-100 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 group"
          >
            <div className="flex items-center gap-4">
              <div className={`h-14 w-14 rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110 ${color}`}>
                <Icon className="h-7 w-7" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">{label}</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Admin Events Section */}
      {isTeamAdmin && (
        <div className="mt-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-indigo-50 rounded-lg">
              <FileText className="h-5 w-5 text-indigo-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 tracking-tight">Events Ready for Reporting</h2>
          </div>
          
          {readyEvents.length === 0 ? (
            <Card className="p-12 text-center bg-gray-50/50 border-dashed border-2 border-gray-200 flex flex-col items-center justify-center">
              <CheckCircle2 className="h-12 w-12 text-gray-300 mb-3" />
              <p className="text-gray-600 font-medium text-lg">You're all caught up!</p>
              <p className="text-gray-400 text-sm mt-1">No events are currently pending final PR reports.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {readyEvents.map(event => (
                <Card 
                  key={event._id} 
                  className="p-6 flex flex-col justify-between h-full border-l-4 border-l-indigo-500 hover:shadow-md transition-shadow"
                >
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2 leading-tight">{event.title}</h3>
                    <p className="text-sm text-gray-500 mb-6 line-clamp-3 leading-relaxed">{event.description}</p>
                  </div>
                  <div className="mt-auto pt-5 border-t border-gray-100">
                    <GenerateReportButton eventId={event._id} onReportGenerated={fetchDashboardData} />
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}