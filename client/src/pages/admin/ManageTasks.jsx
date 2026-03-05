import { useState, useEffect } from 'react';
import { getAllTasks, createTask, updateTask, deleteTask, approveTask, rejectTask } from '../../api/services/task.service';
import { getAllEvents } from '../../api/services/event.service';
import { getAllUsers } from '../../api/services/user.service';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Card from '../../components/common/Card';
import Modal from '../../components/common/Modal';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import Spinner from '../../components/common/Spinner';
import toast from 'react-hot-toast';
import { Plus, Trash2, Check, X, Eye } from 'lucide-react';
import { STATUS_COLORS, PRIORITY_COLORS, PHASE_LABELS } from '../../utils/constants';
import { formatDate, isDeadlinePassed } from '../../utils/helpers';

const taskSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(5),
  event: z.string().min(1, 'Select an event'),
  assignedTo: z.string().min(1, 'Select a user'),
  deadline: z.string().min(1, 'Set a deadline'),
  priority: z.string().optional(),
  phase: z.string().min(1, 'Select a phase'),
});

export default function ManageTasks() {
  const [tasks, setTasks] = useState([]);
  const [events, setEvents] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetail, setShowDetail] = useState(null);
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(taskSchema),
  });

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [tasksRes, eventsRes, usersRes] = await Promise.all([
        getAllTasks({ limit: 100, status: statusFilter || undefined }),
        getAllEvents({ limit: 100 }),
        getAllUsers({ isApproved: 'true', limit: 100 }),
      ]);
      setTasks(tasksRes.data.tasks);
      setEvents(eventsRes.data.events);
      setUsers(usersRes.data.users);
    } catch (err) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, [statusFilter]);

  const onSubmit = async (data) => {
    try {
      await createTask(data);
      toast.success('Task created');
      setShowModal(false);
      reset();
      fetchAll();
    } catch (err) {
      toast.error(err.message || 'Failed to create task');
    }
  };

  const handleApprove = async (id) => {
    try {
      await approveTask(id);
      toast.success('Task approved');
      fetchAll();
    } catch (err) {
      toast.error(err.message || 'Failed to approve');
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) return toast.error('Provide a rejection reason');
    try {
      await rejectTask(rejectModal, { rejectionReason: rejectReason });
      toast.success('Task rejected');
      setRejectModal(null);
      setRejectReason('');
      fetchAll();
    } catch (err) {
      toast.error(err.message || 'Failed to reject');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this task?')) return;
    try {
      await deleteTask(id);
      toast.success('Task deleted');
      fetchAll();
    } catch (err) {
      toast.error(err.message || 'Failed to delete');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Manage Tasks</h1>
        <Button onClick={() => { reset({ title: '', description: '', event: '', assignedTo: '', deadline: '', priority: 'medium', phase: '' }); setShowModal(true); }}>
          <Plus className="h-4 w-4 mr-1 cursor-pointer" /> New Task
        </Button>
      </div>

      {/* Filters */}
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
        <Card><p className="text-gray-500 text-center py-8">No tasks found.</p></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tasks.map((task) => (
            <Card key={task._id}>
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-gray-900 line-clamp-1">{task.title}</h3>
                <Badge className={STATUS_COLORS[task.status]}>{task.status}</Badge>
              </div>
              <p className="text-sm text-gray-500 line-clamp-2 mb-2">{task.description}</p>
              <div className="space-y-1 text-xs text-gray-400 mb-3">
                <p>Event: {task.event?.title || '-'}</p>
                <p>Assigned to: {task.assignedTo?.name || '-'}</p>
                <p className={isDeadlinePassed(task.deadline) && task.status !== 'approved' ? 'text-red-500 font-medium' : ''}>
                  Deadline: {formatDate(task.deadline)}
                </p>
                <Badge className={PRIORITY_COLORS[task.priority]}>{task.priority}</Badge>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => setShowDetail(task)}>
                  <Eye className="h-3.5 w-3.5 mr-1" /> View
                </Button>
                {task.status === 'submitted' && (
                  <>
                    <Button size="sm" variant="success" onClick={() => handleApprove(task._id)}>
                      <Check className="h-3.5 w-3.5 mr-1" /> Approve
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => { setRejectModal(task._id); setRejectReason(''); }}>
                      <X className="h-3.5 w-3.5 mr-1" /> Reject
                    </Button>
                  </>
                )}
                <Button size="sm" variant="danger" onClick={() => handleDelete(task._id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Task Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Create Task" size="lg">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="Title" error={errors.title?.message} {...register('title')} />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea rows={3} className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" {...register('description')} />
            {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>}
          </div>
          <Select label="Event" placeholder="Select event" options={events.map((e) => ({ value: e._id, label: e.title }))} error={errors.event?.message} {...register('event')} />
          <Select label="Assign To" placeholder="Select user" options={users.map((u) => ({ value: u._id, label: `${u.name} (${u.role})` }))} error={errors.assignedTo?.message} {...register('assignedTo')} />
          <Input label="Deadline" type="datetime-local" error={errors.deadline?.message} {...register('deadline')} />
          <Select label="Priority" options={[{ value: 'low', label: 'Low' }, { value: 'medium', label: 'Medium' }, { value: 'high', label: 'High' }, { value: 'critical', label: 'Critical' }]} {...register('priority')} />
          <Select label="Phase" placeholder="Select phase" options={[{ value: 'pre-event', label: 'Pre-Event' }, { value: 'during-event', label: 'During Event' }, { value: 'post-event', label: 'Post-Event' }]} error={errors.phase?.message} {...register('phase')} />
          <div className="flex justify-end gap-2">
            <Button className="cursor-pointer" variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button className="cursor-pointer" type="submit">Create Task</Button>
          </div>
        </form>
      </Modal>

      {/* Detail Modal */}
      <Modal 
        isOpen={!!showDetail} 
        onClose={() => setShowDetail(null)} 
        title={showDetail?.title || 'Task Detail'} 
        size="lg"
      >
        {showDetail && (
          /* 🔥 Scrollable container for long submissions */
          <div className="space-y-6 max-h-[75vh] overflow-y-auto pr-2">
            
            {/* Task Overview */}
            <div>
              <p className="text-gray-700 leading-relaxed mb-4">{showDetail.description}</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase font-bold text-gray-400">Status</span>
                  <Badge className={STATUS_COLORS[showDetail.status]}>{showDetail.status}</Badge>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase font-bold text-gray-400">Priority</span>
                  <Badge className={PRIORITY_COLORS[showDetail.priority]}>{showDetail.priority}</Badge>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase font-bold text-gray-400">Deadline</span>
                  <span className="text-sm font-medium text-gray-700">{formatDate(showDetail.deadline)}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase font-bold text-gray-400">Assigned To</span>
                  <span className="text-sm font-medium text-gray-700">{showDetail.assignedTo?.name}</span>
                </div>
              </div>
            </div>

            {/* Rejection History */}
            {showDetail.rejectionReason && (
              <div className="bg-red-50 border-l-4 border-red-500 rounded-r-lg p-4">
                <p className="text-sm text-red-800"><strong>Admin Feedback:</strong> {showDetail.rejectionReason}</p>
              </div>
            )}

            {/* 🔥 NEW: Multi-Media Submission Gallery */}
            {showDetail.submissions?.length > 0 && (
              <div className="border-t border-gray-100 pt-6">
                <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  Volunteer Submissions 
                  <span className="bg-indigo-100 text-indigo-600 text-xs px-2 py-0.5 rounded-full">
                    {showDetail.submissions.length}
                  </span>
                </h4>
                
                <div className="space-y-6">
                  {showDetail.submissions.map((sub, i) => (
                    <div key={i} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                      {/* Submission Header */}
                      <div className="bg-gray-50 px-4 py-2 border-b border-gray-100 flex justify-between items-center">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Attempt #{i + 1}</span>
                        <span className="text-xs text-gray-400">{formatDate(sub.uploadedAt)}</span>
                      </div>
                      
                      {/* Note Content */}
                      {sub.notes && (
                        <div className="p-4 bg-indigo-50/30">
                          <p className="text-sm text-gray-600 italic">"{sub.notes}"</p>
                        </div>
                      )}

                      {/* Image/File Gallery Grid */}
                      <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {sub.media?.map((file, fileIdx) => {
                          const isImage = file.url.match(/\.(jpeg|jpg|gif|png|webp)/i) || file.fileType?.includes('image');
                          return (
                            <div key={fileIdx} className="group relative aspect-square bg-gray-100 rounded-lg overflow-hidden border border-gray-100">
                              {isImage ? (
                                <img 
                                  src={file.url} 
                                  className="w-full h-full object-cover transition-transform group-hover:scale-105" 
                                  alt="Submission" 
                                />
                              ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center">
                                  <FileText className="h-8 w-8 text-indigo-400 mb-1" />
                                  <span className="text-[10px] text-gray-500 truncate w-full px-2">Document</span>
                                </div>
                              )}
                              {/* Hover Overlay to view full size */}
                              <a 
                                href={file.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                              >
                                <Eye className="text-white h-5 w-5" />
                              </a>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Reject Modal */}
      <Modal isOpen={!!rejectModal} onClose={() => setRejectModal(null)} title="Reject Task">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason for rejection</label>
            <textarea
              rows={3}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Explain why this submission was rejected..."
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setRejectModal(null)}>Cancel</Button>
            <Button variant="danger" onClick={handleReject}>Reject</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
