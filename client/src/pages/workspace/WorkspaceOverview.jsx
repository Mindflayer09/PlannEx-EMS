import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getAllEvents } from '../../api/services/event.service';
import { getAllTasks } from '../../api/services/task.service';
import { getAllUsers } from '../../api/services/user.service';

import Card from '../../components/common/Card';
import Spinner from '../../components/common/Spinner';
import Badge from '../../components/common/Badge';
import GenerateReportButton from '../../components/reports/generateButton'; 

import { 
  Users, 
  Calendar, 
  ClipboardList, 
  UserCheck, 
  LayoutDashboard, 
  Clock,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function WorkspaceOverview() {
  const navigate = useNavigate();
  const { user, isSuperAdmin } = useAuth();

  // 🛡️ Hierarchy & Approval
  const isApproved = user?.isApproved || isSuperAdmin;
  const isSubAdmin = user?.role === 'sub-admin';
  const isAdmin = isSuperAdmin || user?.role === 'admin';
  const isManagement = isAdmin || isSubAdmin;

  const [stats, setStats] = useState({
    totalUsers: 0,
    pendingApprovals: 0,
    totalEvents: 0,
    totalTasks: 0,
  });
  
  const [readyEvents, setReadyEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
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

      if (isManagement) {
        try {
          const usersRes = await getAllUsers({ limit: 100 });
          users = Array.isArray(usersRes) ? usersRes : (usersRes?.users || usersRes?.data?.users || []);
          pendingCount = users.filter(u => !u.isApproved).length;
        } catch (err) { console.warn("User stats restricted"); }
      }

      setStats({
        totalUsers: users.length,
        pendingApprovals: pendingCount,
        totalEvents: events.length,
        totalTasks: tasks.length,
      });

      // 🚀 FIXED: We specifically want Finalized events here so the Admin can generate their public AI reports!
      const finalizedEvents = events.filter(e => e.isFinalized);
      setReadyEvents(finalizedEvents);

    } catch (err) {
      toast.error('Failed to sync workspace');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [isApproved]);

  if (loading) return <div className="flex justify-center items-center min-h-[70vh]"><Spinner size="lg" /></div>;

  // 🛑 PENDING VIEW
  if (!isApproved) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <Card className="max-w-xl w-full text-center p-12 shadow-2xl border-t-4 border-t-yellow-400 rounded-3xl">
          <Clock className="h-16 w-16 text-yellow-500 mx-auto mb-6" />
          <h1 className="text-2xl font-black text-gray-900 mb-2">Awaiting Approval</h1>
          <p className="text-gray-500">Your account for <span className="font-bold text-indigo-600">{user?.team?.name}</span> is being reviewed.</p>
        </Card>
      </div>
    );
  }

  const cards = [
    ...(isManagement ? [
      { label: 'Members', value: stats.totalUsers, icon: Users, color: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-300', route: '/workspace/members' },
      { label: 'Pending', value: stats.pendingApprovals, icon: UserCheck, color: 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-300', route: '/workspace/members' }
    ] : []),
    { label: 'Events', value: stats.totalEvents, icon: Calendar, color: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-300', route: '/workspace/events' },
    { label: 'Tasks', value: stats.totalTasks, icon: ClipboardList, color: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-300', route: '/workspace/tasks' },
  ];

  return (
    <div className="max-w-7xl mx-auto pb-12 px-4 sm:px-6 lg:px-8">
      {/* HEADER */}
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center items-start justify-between mb-10 bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-800">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg">
            <LayoutDashboard className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-gray-900 dark:text-white">
              {isAdmin ? 'Admin Panel' : isSubAdmin ? 'Sub-Admin Workspace' : 'My Dashboard'}
            </h1>
            <p className="text-xs font-bold text-gray-400 dark:text-white uppercase tracking-widest">{user?.team?.name}</p>
          </div>
        </div>
      </div>

      {/* STATS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
        {cards.map(({ label, value, icon: Icon, color, route }) => (
          <Card key={label} onClick={() => navigate(route)} className="cursor-pointer border-transparent hover:border-indigo-100 transition-all rounded-3xl group">
            <div className="flex flex-col items-center text-center gap-3">
              <div className={`h-12 w-12 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform ${color}`}>
                <Icon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">{label}</p>
                <p className="text-2xl font-black dark:text-white text-gray-900">{value}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* 🤖 REPORTING SECTION (RESTRICTED TO FULL ADMINS) */}
      {isAdmin && (
        <div className="mt-12">
          <div className="flex items-center gap-3 mb-8">
            <Sparkles className="h-5 w-5 text-purple-600" />
            <h2 className="text-lg font-black dark:text-white text-gray-900 uppercase tracking-tight">Public Event Reports</h2>
          </div>
          
          {readyEvents.length === 0 ? (
            <Card className="py-16 text-center bg-gray-50/50 border-dashed border-2 border-gray-200 rounded-3xl">
              <CheckCircle2 className="h-10 w-10 text-emerald-200 mx-auto mb-3" />
              <p className="text-gray-400 font-bold">No finalized events awaiting reports.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {readyEvents.map(event => (
                <Card key={event._id} className="p-6 flex flex-col justify-between border-gray-100 hover:border-purple-200 transition-all rounded-3xl">
                  <div>
                    <Badge className="bg-emerald-50 text-emerald-700 mb-4 border-emerald-100 uppercase text-[9px] font-black">Finalized</Badge>
                    <h3 className="text-lg font-black text-gray-900 mb-2 leading-tight">{event.title}</h3>
                    <p className="text-sm text-gray-500 mb-8 line-clamp-2 leading-relaxed">{event.description}</p>
                  </div>
                  <div className="mt-auto">
                    {/* The Button triggers Gemini to build the public PR report and populate the gallery */}
                    <GenerateReportButton eventId={event._id} onReportGenerated={fetchData} />
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