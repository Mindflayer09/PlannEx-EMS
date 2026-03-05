import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllTasks } from '../../api/services/task.service';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Card from '../../components/common/Card';
import Spinner from '../../components/common/Spinner';
import { Upload } from 'lucide-react';
import { STATUS_COLORS, PRIORITY_COLORS } from '../../utils/constants';
import { formatDate, isDeadlinePassed } from '../../utils/helpers';

export default function MyTasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTasks = async () => {
      setLoading(true);
      try {
        const params = { limit: 100 };
        if (statusFilter) params.status = statusFilter;
        const res = await getAllTasks(params);
        setTasks(res.data.tasks);
      } catch (err) {
        console.error('Failed to load tasks:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchTasks();
  }, [statusFilter]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">My Tasks</h1>

      <div className="flex gap-2 mb-6 flex-wrap">
        {['', 'pending', 'submitted', 'approved', 'rejected'].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${
              statusFilter === s ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            {s || 'All'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : tasks.length === 0 ? (
        <Card><p className="text-gray-500 text-center py-8">No tasks assigned to you.</p></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tasks.map((task) => (
            <Card key={task._id}>
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-gray-900">{task.title}</h3>
                <Badge className={STATUS_COLORS[task.status]}>{task.status}</Badge>
              </div>
              <p className="text-sm text-gray-500 line-clamp-2 mb-3">{task.description}</p>
              <div className="space-y-1 text-xs text-gray-400 mb-3">
                <p>Event: {task.event?.title || '-'}</p>
                <p className={isDeadlinePassed(task.deadline) && task.status !== 'approved' ? 'text-red-500 font-medium' : ''}>
                  Deadline: {formatDate(task.deadline)}
                </p>
                <Badge className={PRIORITY_COLORS[task.priority]}>{task.priority}</Badge>
              </div>

              {task.rejectionReason && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-2 mb-3">
                  <p className="text-xs text-red-700"><strong>Rejected:</strong> {task.rejectionReason}</p>
                </div>
              )}

              {(task.status === 'pending' || task.status === 'rejected') && (
                <Button size="sm" onClick={() => navigate(`/volunteer/submit/${task._id}`)}>
                  <Upload className="h-3.5 w-3.5 mr-1 cursor-pointer" /> Submit
                </Button>
              )}

              {task.submissions?.length > 0 && (
                <p className="text-xs text-gray-400 mt-2">{task.submissions.length} submission(s)</p>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
