import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAllTasks } from '../../api/services/task.service';
import { useAuth } from '../../context/AuthContext';
import Card from '../../components/common/Card';
import Spinner from '../../components/common/Spinner';
import { ClipboardList, CheckCircle, Clock } from 'lucide-react';

export default function VolunteerDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ total: 0, completed: 0, pending: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [allRes, approvedRes, pendingRes] = await Promise.all([
          getAllTasks({ limit: 1 }),
          getAllTasks({ status: 'approved', limit: 1 }),
          getAllTasks({ status: 'pending', limit: 1 }),
        ]);
        setStats({
          total: allRes.data.pagination.totalItems,
          completed: approvedRes.data.pagination.totalItems,
          pending: pendingRes.data.pagination.totalItems,
        });
      } catch (err) {
        console.error('Failed to fetch stats:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) return <div className="flex justify-center py-12"><Spinner size="lg" /></div>;

  // Added routing links and distinct border colors to the configuration array
  const cards = [
    { 
      label: 'Total Tasks', 
      value: stats.total, 
      icon: ClipboardList, 
      color: 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100', 
      borderColor: 'border-indigo-500',
      link: '/volunteer/tasks' 
    },
    { 
      label: 'Completed', 
      value: stats.completed, 
      icon: CheckCircle, 
      color: 'bg-green-50 text-green-600 group-hover:bg-green-100', 
      borderColor: 'border-green-500',
      link: '/volunteer/tasks?status=approved' 
    },
    { 
      label: 'Pending', 
      value: stats.pending, 
      icon: Clock, 
      color: 'bg-yellow-50 text-yellow-600 group-hover:bg-yellow-100', 
      borderColor: 'border-yellow-500',
      link: '/volunteer/tasks?status=pending' 
    },
  ];

  return (
    <div className="max-w-6xl mx-auto p-2 sm:p-6">
      
      {/* Dynamic Gradient Header */}
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 mb-2 pb-1">
          Welcome back, {user?.name?.split(' ')[0] || 'Volunteer'}!
        </h1>
        <p className="text-gray-500 text-lg">Here is your current task overview.</p>
      </div>

      {/* Clickable Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {cards.map(({ label, value, icon: Icon, color, borderColor, link }) => (
          <Link to={link} key={label} className="block group h-full">
            <Card className={`p-6 border-l-4 ${borderColor} transform transition-all duration-200 group-hover:-translate-y-1 group-hover:shadow-md cursor-pointer h-full`}>
              <div className="flex items-center gap-5">
                <div className={`p-4 rounded-xl transition-colors ${color}`}>
                  <Icon className="h-8 w-8" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
                  <p className="text-4xl font-bold text-gray-900 mt-1">{value}</p>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}