import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';

import { 
  getAllTasks, 
  createTask, 
  updateTask, 
  deleteTask, 
  submitTask, 
  approveTask, 
  rejectTask 
} from '../../api/services/task.service';
import { getAllEvents } from '../../api/services/event.service';
import { getAllUsers } from '../../api/services/user.service';

import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Card from '../../components/common/Card';
import Modal from '../../components/common/Modal';
import Input from '../../components/common/Input';
import Spinner from '../../components/common/Spinner';

import { 
  Plus, 
  Trash2, 
  Edit, 
  CheckCircle, 
  XCircle, 
  Upload, 
  Eye, 
  Clock,
  ClipboardCheck,
  AlertCircle
} from 'lucide-react';
import { formatDate } from '../../utils/helpers';

const taskSchema = z.object({
  title: z.string().min(3, 'Title is required'),
  description: z.string().min(5, 'Description is required'),
  event: z.string().min(1, 'Please select an event'),
  assignedTo: z.string().min(1, 'Please select a team member'),
  deadline: z.string().min(1, 'Deadline is required'),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
});

export default function TeamTasks() {
  const { user: currentUser, isSuperAdmin } = useAuth();
  const isTeamAdmin = isSuperAdmin || currentUser?.role === 'admin' || currentUser?.teamRole === 'admin';

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const [teamEvents, setTeamEvents] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);

  const [showManageModal, setShowManageModal] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  
  const [activeTask, setActiveTask] = useState(null);
  const [submissionNotes, setSubmissionNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(taskSchema),
  });

  // ✅ NEW: Populate form when editing
  useEffect(() => {
    if (activeTask && showManageModal) {
      reset({
        title: activeTask.title,
        description: activeTask.description,
        event: activeTask.event?._id || activeTask.event,
        assignedTo: activeTask.assignedTo?._id || activeTask.assignedTo,
        deadline: activeTask.deadline ? activeTask.deadline.split('T')[0] : '',
        priority: activeTask.priority,
      });
    }
  }, [activeTask, showManageModal, reset]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const taskRes = await getAllTasks({ status: filter !== 'all' ? filter : undefined, limit: 100 });
      
      // ✅ FIX: Robust Unpacking
      const fetchedTasks = Array.isArray(taskRes) ? taskRes : (taskRes?.tasks || taskRes?.data?.tasks || []);
      setTasks(fetchedTasks);

      if (isTeamAdmin) {
        const [eventsRes, usersRes] = await Promise.all([
          getAllEvents({ limit: 50 }),
          getAllUsers({ isApproved: 'true', limit: 100 })
        ]);
        
        const fetchedEvents = Array.isArray(eventsRes) ? eventsRes : (eventsRes?.events || eventsRes?.data?.events || []);
        const fetchedUsers = Array.isArray(usersRes) ? usersRes : (usersRes?.users || usersRes?.data?.users || []);

        setTeamEvents(fetchedEvents.filter(e => !e.isFinalized));
        setTeamMembers(fetchedUsers);
      }
    } catch (err) {
      toast.error('Failed to load tasks data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [filter]);

  const openCreate = () => {
    setActiveTask(null);
    reset({ title: '', description: '', event: '', assignedTo: '', deadline: '', priority: 'medium' });
    setShowManageModal(true);
  };

  const onManageSubmit = async (data) => {
    try {
      if (activeTask) {
        await updateTask(activeTask._id, data);
        toast.success('Task updated');
      } else {
        await createTask(data);
        toast.success('Task assigned successfully');
      }
      setShowManageModal(false);
      fetchData();
    } catch (err) {
      toast.error(err.message || 'Failed to save task');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this task?')) return;
    try {
      await deleteTask(id);
      toast.success('Task deleted');
      fetchData();
    } catch (err) {
      toast.error('Failed to delete task');
    }
  };

  const handleApprove = async () => {
    try {
      await approveTask(activeTask._id);
      toast.success('Task approved!');
      setShowReviewModal(false);
      fetchData();
    } catch (err) {
      toast.error('Failed to approve task');
    }
  };

  const handleReject = async () => {
    if (!rejectionReason) return toast.error('Please provide a reason for rejection');
    try {
      await rejectTask(activeTask._id, { rejectionReason });
      toast.success('Task sent back for revision');
      setShowReviewModal(false);
      fetchData();
    } catch (err) {
      toast.error('Failed to reject task');
    }
  };

  const onVolunteerSubmit = async (e) => {
    e.preventDefault();
    try {
      await submitTask(activeTask._id, {
        notes: submissionNotes,
        media: [] 
      });
      toast.success('Work submitted successfully!');
      setShowSubmitModal(false);
      fetchData();
    } catch (err) {
      toast.error(err.message || 'Failed to submit task');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-amber-100 text-amber-700 border border-amber-200',
      submitted: 'bg-blue-100 text-blue-700 border border-blue-200',
      approved: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
      rejected: 'bg-rose-100 text-rose-700 border border-rose-200',
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="max-w-7xl mx-auto pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-50 rounded-lg">
            <ClipboardCheck className="h-6 w-6 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              {isTeamAdmin ? 'Team Management Tasks' : 'My Assignments'}
            </h1>
            <p className="text-sm text-gray-500">Track and manage project deliverables</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <select 
            className="rounded-xl border-gray-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm bg-gray-50 px-4 py-2 cursor-pointer outline-none"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">All Tasks</option>
            <option value="pending">🟡 Pending</option>
            <option value="submitted">🔵 Awaiting Review</option>
            <option value="approved">🟢 Approved</option>
            <option value="rejected">🔴 Rejected</option>
          </select>

          {isTeamAdmin && (
            <Button onClick={openCreate} className="shadow-md hover:shadow-lg transition-shadow">
              <Plus className="h-4 w-4 mr-2" /> Assign Task
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : tasks.length === 0 ? (
        <Card className="text-center py-16 border-dashed border-2 bg-gray-50/50">
          <div className="h-16 w-16 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-8 w-8" />
          </div>
          <p className="text-gray-600 font-medium text-lg">No tasks found</p>
          <p className="text-gray-400 text-sm mt-1">There are currently no tasks matching this filter.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tasks.map((task) => (
            <Card key={task._id} className="flex flex-col group hover:border-indigo-200 transition-all duration-300 hover:shadow-md">
              <div className="flex justify-between items-start mb-4">
                <Badge className={getStatusColor(task.status)}>{task.status.toUpperCase()}</Badge>
                <Badge className={
                  task.priority === 'critical' ? 'bg-rose-50 text-rose-700 border border-rose-100' : 
                  task.priority === 'high' ? 'bg-orange-50 text-orange-700 border border-orange-100' : 'bg-slate-100 text-slate-700'
                }>
                  {task.priority}
                </Badge>
              </div>
              
              <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-indigo-600 transition-colors">{task.title}</h3>
              <p className="text-sm text-gray-500 mb-6 line-clamp-2 leading-relaxed">{task.description}</p>
              
              <div className="mt-auto space-y-2.5 text-xs bg-gray-50 p-3 rounded-xl mb-6">
                <div className="flex justify-between">
                  <span className="text-gray-400">Event</span>
                  <span className="font-semibold text-gray-700">{task.event?.title || 'General'}</span>
                </div>
                {isTeamAdmin && (
                  <div className="flex justify-between border-t border-gray-100 pt-2">
                    <span className="text-gray-400">Owner</span>
                    <span className="font-semibold text-gray-700">{task.assignedTo?.name || 'Unassigned'}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-gray-100 pt-2">
                  <span className="text-gray-400">Deadline</span>
                  <span className="flex items-center font-bold text-indigo-600 italic">
                    <Clock className="h-3 w-3 mr-1"/> {formatDate(task.deadline)}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-100">
                {isTeamAdmin ? (
                  <>
                    {task.status === 'submitted' && (
                      <Button size="sm" variant="success" className="w-full flex justify-center py-2.5" onClick={() => { setActiveTask(task); setRejectionReason(''); setShowReviewModal(true); }}>
                        <Eye className="h-4 w-4 mr-2" /> Review Work
                      </Button>
                    )}
                    {task.status !== 'approved' && task.status !== 'submitted' && (
                      <Button size="sm" variant="outline" className="flex-1" onClick={() => { setActiveTask(task); setShowManageModal(true); }}>
                        <Edit className="h-4 w-4 mr-2" /> Edit
                      </Button>
                    )}
                    <Button size="sm" variant="danger" className={task.status === 'approved' ? 'w-full' : ''} onClick={() => handleDelete(task._id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    {(task.status === 'pending' || task.status === 'rejected') && (
                      <Button size="sm" className="w-full flex justify-center py-2.5" onClick={() => { setActiveTask(task); setSubmissionNotes(''); setShowSubmitModal(true); }}>
                        <Upload className="h-4 w-4 mr-2" /> {task.status === 'rejected' ? 'Fix & Resubmit' : 'Submit My Work'}
                      </Button>
                    )}
                    {task.status === 'rejected' && (
                      <div className="w-full p-3 bg-rose-50 text-rose-700 text-xs rounded-xl mt-2 border border-rose-100 flex gap-2">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        <div><strong>Feedback:</strong> {task.rejectionReason}</div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* MODAL 1: ADMIN CREATE/EDIT */}
      <Modal isOpen={showManageModal} onClose={() => setShowManageModal(false)} title={activeTask ? 'Modify Assignment' : 'New Task Assignment'}>
        <form onSubmit={handleSubmit(onManageSubmit)} className="space-y-5 p-2">
          <Input label="Task Title" placeholder="e.g., Design Event Posters" error={errors.title?.message} {...register('title')} />
          
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Description & Requirements</label>
            <textarea rows={4} className="block w-full rounded-xl border-gray-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm border p-3 outline-none" placeholder="Provide detailed instructions..." {...register('description')} />
            {errors.description && <p className="text-rose-500 text-xs mt-1">{errors.description.message}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Event Context</label>
              <select className="block w-full rounded-xl border-gray-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm border p-3 bg-white outline-none" {...register('event')}>
                <option value="">Select Event...</option>
                {teamEvents.map(e => <option key={e._id} value={e._id}>{e.title}</option>)}
              </select>
              {errors.event && <p className="text-rose-500 text-xs mt-1">{errors.event.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Assignee</label>
              <select className="block w-full rounded-xl border-gray-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm border p-3 bg-white outline-none" {...register('assignedTo')}>
                <option value="">Select Member...</option>
                {teamMembers.map(m => <option key={m._id} value={m._id}>{m.name}</option>)}
              </select>
              {errors.assignedTo && <p className="text-rose-500 text-xs mt-1">{errors.assignedTo.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Deadline" type="date" error={errors.deadline?.message} {...register('deadline')} />
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Priority Level</label>
              <select className="block w-full rounded-xl border-gray-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm border p-3 bg-white outline-none" {...register('priority')}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-8">
            <Button variant="outline" onClick={() => setShowManageModal(false)}>Cancel</Button>
            <Button type="submit">{activeTask ? 'Save Changes' : 'Confirm Assignment'}</Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: VOLUNTEER SUBMISSION */}
      <Modal isOpen={showSubmitModal} onClose={() => setShowSubmitModal(false)} title="Submit Completed Work">
        <form onSubmit={onVolunteerSubmit} className="space-y-5">
          <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 flex items-center gap-3">
            <ClipboardCheck className="h-5 w-5 text-indigo-600" />
            <span className="text-sm font-bold text-indigo-900">{activeTask?.title}</span>
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Submission Notes</label>
            <textarea 
              rows={5} 
              className="block w-full rounded-xl border-gray-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm border p-3 outline-none" 
              placeholder="List what you've accomplished or include links to cloud assets (Drive, Figma, etc)..."
              value={submissionNotes}
              onChange={(e) => setSubmissionNotes(e.target.value)}
              required
            />
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" onClick={() => setShowSubmitModal(false)}>Cancel</Button>
            <Button type="submit">Send for Approval</Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 3: ADMIN REVIEW */}
      <Modal isOpen={showReviewModal} onClose={() => setShowReviewModal(false)} title="Task Quality Review">
        <div className="space-y-6">
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
            <div className="flex items-center gap-2 mb-3 text-indigo-600">
              <Plus className="h-4 w-4 rotate-45" /> 
              <span className="text-xs font-bold uppercase tracking-wider">{activeTask?.assignedTo?.name}'s Update</span>
            </div>
            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
              {activeTask?.submissions?.[activeTask.submissions.length - 1]?.notes || 'No specific notes provided.'}
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1.5 text-rose-600">Rejection Feedback (Internal Only)</label>
            <textarea 
              rows={3} 
              className="block w-full rounded-xl border-gray-200 shadow-sm focus:border-rose-500 focus:ring-rose-500 text-sm border p-3 outline-none" 
              placeholder="Tell the volunteer exactly what needs to be fixed if rejecting..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
            />
          </div>

          <div className="flex flex-col sm:flex-row justify-end gap-3 mt-8 pt-6 border-t border-gray-100">
            <Button variant="outline" className="sm:mr-auto" onClick={() => setShowReviewModal(false)}>Close</Button>
            <Button variant="danger" className="px-6" onClick={handleReject}><XCircle className="h-4 w-4 mr-2"/> Return for Fixes</Button>
            <Button variant="success" className="px-6 shadow-sm" onClick={handleApprove}><CheckCircle className="h-4 w-4 mr-2"/> Final Approval</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}