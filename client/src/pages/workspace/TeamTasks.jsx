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
  rejectTask,
  delegateTask 
} from '../../api/services/task.service';
import { getAllEvents } from '../../api/services/event.service';
import { getAllUsers } from '../../api/services/user.service';

import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Card from '../../components/common/Card';
import Modal from '../../components/common/Modal';
import Input from '../../components/common/Input';
import Spinner from '../../components/common/Spinner';
import { STATUS_COLORS, PRIORITY_COLORS } from '../../utils/constants';

import { 
  Plus, 
  Trash2, 
  Edit, 
  Upload, 
  Eye, 
  ClipboardCheck,
  Share2,
  X,
  Loader2,
  Clock
} from 'lucide-react';

// 🚀 FIX: Extract Vite variables globally so the bundler can guarantee injection
const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

const taskSchema = z.object({
  title: z.string().min(3, 'Title is required'),
  description: z.string().min(5, 'Description is required'),
  event: z.string().min(1, 'Please select an event'),
  assignedTo: z.string().min(1, 'Please select a team member'),
  deadline: z.string().min(1, 'Deadline is required'),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  phase: z.string().min(1, 'Phase is required'), 
});

// Used to compare event phase vs task phase
const PHASE_ORDER = ['pre-event', 'during-event', 'post-event'];

export default function TeamTasks() {
  const { user: currentUser, isSuperAdmin } = useAuth();
  
  const isSubAdmin = currentUser?.role === 'sub-admin';
  const isAdmin = isSuperAdmin || currentUser?.role === 'admin';
  const isManagement = isAdmin || isSubAdmin;

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const [teamEvents, setTeamEvents] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);

  const [showManageModal, setShowManageModal] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showDelegateModal, setShowDelegateModal] = useState(false);
  
  const [activeTask, setActiveTask] = useState(null);
  const [submissionNotes, setSubmissionNotes] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]); 
  const [rejectionReason, setRejectionReason] = useState('');
  const [selectedVolunteer, setSelectedVolunteer] = useState('');
  
  const [isUploading, setIsUploading] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(taskSchema),
  });

  useEffect(() => {
    if (activeTask && showManageModal) {
      reset({
        title: activeTask.title,
        description: activeTask.description,
        event: activeTask.event?._id || activeTask.event,
        assignedTo: activeTask.assignedTo?._id || activeTask.assignedTo,
        deadline: activeTask.deadline ? activeTask.deadline.split('T')[0] : '',
        priority: activeTask.priority,
        phase: activeTask.phase || '', 
      });
    }
  }, [activeTask, showManageModal, reset]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const taskRes = await getAllTasks({ status: filter !== 'all' ? filter : undefined, limit: 100 });
      const fetchedTasks = Array.isArray(taskRes) ? taskRes : (taskRes?.tasks || taskRes?.data?.tasks || []);
      setTasks(fetchedTasks);

      if (isManagement) {
        const [eventsRes, usersRes] = await Promise.all([
          getAllEvents({ limit: 50 }),
          getAllUsers({ isApproved: 'true', limit: 100 })
        ]);
        
        const extractedEvents = Array.isArray(eventsRes) ? eventsRes : (eventsRes?.data?.events || eventsRes?.events || []);
        setTeamEvents(extractedEvents.filter(e => !e.isFinalized));
        
        const extractedUsers = Array.isArray(usersRes) ? usersRes : (usersRes?.data?.users || usersRes?.users || []);
        setTeamMembers(extractedUsers);
      }
    } catch (err) {
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [filter]);

  // --- ACTIONS ---

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

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setSelectedFiles((prev) => [...prev, ...files]);
  };

  const removeFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const onVolunteerSubmit = async (e) => {
    e.preventDefault();
    if (selectedFiles.length === 0) return toast.error("Please attach proof images");

    setIsUploading(true);
    const toastId = toast.loading('Uploading images and submitting work...');

    try {
      // 🚀 FIX: Use the globally extracted variables
      if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
        throw new Error("Missing Cloudinary config in Vercel settings!");
      }

      const uploadedMedia = [];

      for (const file of selectedFiles) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET); 
        
        // 🚀 FIX: Use the globally generated URL string
        const uploadRes = await fetch(CLOUDINARY_URL, {
          method: 'POST',
          body: formData,
        });

        const uploadData = await uploadRes.json();

        if (uploadData.secure_url) {
          uploadedMedia.push({
            url: uploadData.secure_url, 
            fileType: file.type,
            publicId: uploadData.public_id
          });
        } else {
          throw new Error(uploadData.error?.message || 'Failed to upload image to cloud');
        }
      }

      await submitTask(activeTask._id, { notes: submissionNotes, media: uploadedMedia });
      
      toast.success('Work submitted successfully!', { id: toastId });
      setShowSubmitModal(false);
      setSelectedFiles([]);
      setSubmissionNotes('');
      fetchData();
    } catch (err) {
      toast.error(err.message || 'Submission failed', { id: toastId });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelegateSubmit = async () => {
    if (!selectedVolunteer) return toast.error("Select a subordinate");
    try {
      await delegateTask(activeTask._id, { volunteerId: selectedVolunteer });
      toast.success("Task reassigned");
      setShowDelegateModal(false);
      fetchData();
    } catch (err) {
      toast.error(err.message || "Delegation failed");
    }
  };

  const onManageSubmit = async (data) => {
    try {
      if (activeTask) {
        await updateTask(activeTask._id, data);
        toast.success('Task updated');
      } else {
        await createTask(data);
        toast.success('Task assigned');
      }
      setShowManageModal(false);
      fetchData();
    } catch (err) {
      toast.error('Save failed');
    }
  };

  const getStatusStyle = (status) => {
    return STATUS_COLORS[status] || 'bg-gray-50 text-gray-700 dark:bg-gray-700 dark:text-white';
  };

  return (
    <div className="max-w-7xl mx-auto pb-12 px-4 sm:px-6">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-800">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg">
            <ClipboardCheck className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black dark:text-white text-gray-900">
              {isAdmin ? 'Admin Control' : isSubAdmin ? 'Sub-Admin Workspace' : 'My Assignments'}
            </h1>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mt-1">Workflow Tracking</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
                  <select className="rounded-2xl border-gray-100 shadow-sm text-sm bg-gray-50 dark:bg-slate-800 dark:border-slate-700 dark:text-white px-4 py-2 outline-none" value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">Filter: All</option>
            <option value="pending">🟡 Pending</option>
            <option value="submitted">🔵 Reviewing</option>
            <option value="approved">🟢 Completed</option>
            <option value="rejected">🔴 Redo</option>
          </select>
          {isAdmin && (
            <Button onClick={() => { setActiveTask(null); setShowManageModal(true); }} className="rounded-2xl">
              <Plus className="h-4 w-4 mr-2" /> Assign New
            </Button>
          )}
        </div>
      </div>

      {loading ? <Spinner size="lg" className="mx-auto mt-20" /> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {tasks.map((task) => {
            const isAssignedToMe = task.assignedTo?._id === currentUser?._id;
            const canDelegate = isSubAdmin && isAssignedToMe && task.status === 'pending';

            const eventPhaseIdx = PHASE_ORDER.indexOf(task.event?.phase || 'pre-event');
            const taskPhaseIdx = PHASE_ORDER.indexOf(task.phase || 'pre-event');
            const isPhaseReady = eventPhaseIdx >= taskPhaseIdx;

            return (
              <Card key={task._id} className="flex flex-col group hover:shadow-xl transition-all duration-500 rounded-3xl border-gray-100">
                <div className="flex justify-between items-center mb-5">
                  <Badge className={`${getStatusStyle(task.status)} px-3 py-1 text-[10px] font-bold rounded-lg uppercase border`}>{task.status}</Badge>
                  <span className="text-[10px] font-bold text-gray-300 uppercase">{task.priority}</span>
                </div>
                
                <h3 className="text-lg font-extrabold text-gray-900 mb-2 group-hover:text-indigo-600 transition-colors">{task.title}</h3>
                <p className="text-sm text-gray-500 mb-6 line-clamp-2">{task.description}</p>
                
                <div className="mt-auto space-y-2.5 text-[11px] bg-gray-50 dark:bg-slate-800 p-4 rounded-2xl mb-6 dark:border dark:border-slate-700">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 dark:text-gray-300 font-medium">Assignee</span>
                    <span className="font-bold text-gray-700 dark:text-white">{task.assignedTo?.name}</span>
                  </div>
                  {task.delegatedBy && (
                    <div className="flex justify-between border-t border-gray-200/50 dark:border-slate-700 pt-2 italic">
                      <span className="text-gray-400 dark:text-gray-300">Via Sub-Admin</span>
                      <span className="text-indigo-600 dark:text-indigo-400 font-bold">{task.delegatedBy.name}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-gray-200/50 dark:border-slate-700 pt-2">
                    <span className="text-gray-400 dark:text-gray-300 font-medium">Execution Phase</span>
                    <span className={`font-bold uppercase ${isPhaseReady ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-500 dark:text-amber-400'}`}>
                      {task.phase?.replace('-', ' ')}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-50">
                  
                  {/* 🚀 FIX: Only full Admins can review and approve submissions now */}
                  {isAdmin && task.status === 'submitted' && (
                    <Button size="sm" variant="success" className="w-full rounded-xl py-3 shadow-sm" onClick={() => { setActiveTask(task); setRejectionReason(''); setShowReviewModal(true); }}>
                      <Eye className="h-4 w-4 mr-2" /> Review Submission
                    </Button>
                  )}
                  
                  {isAssignedToMe && (task.status === 'pending' || task.status === 'rejected') && (
                    isPhaseReady ? (
                      <Button size="sm" className="flex-1 rounded-xl py-3" onClick={() => { setActiveTask(task); setSubmissionNotes(''); setShowSubmitModal(true); }}>
                        <Upload className="h-4 w-4 mr-2" /> Submit Proof
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" className="flex-1 rounded-xl py-3 opacity-60 cursor-not-allowed bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-50 hover:text-gray-500" title="This task cannot be submitted until the event reaches this phase.">
                        <Clock className="h-4 w-4 mr-2" /> Locked
                      </Button>
                    )
                  )}

                  {canDelegate && (
                    <Button size="sm" variant="outline" className="flex-1 rounded-xl py-3" onClick={() => { setActiveTask(task); setShowDelegateModal(true); }}>
                      <Share2 className="h-4 w-4 mr-2" /> Delegate
                    </Button>
                  )}
                  
                  {isAdmin && (
                    <div className="flex gap-2 ml-auto">
                      <button onClick={() => { setActiveTask(task); setShowManageModal(true); }} className="p-2 text-gray-400 hover:text-indigo-600"><Edit className="h-4 w-4" /></button>
                      <button onClick={() => handleDelete(task._id)} className="p-2 text-gray-400 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* MODAL 1: ADMIN MANAGE */}
      <Modal isOpen={showManageModal} onClose={() => setShowManageModal(false)} title={activeTask ? 'Modify Assignment' : 'New Assignment'}>
        <form onSubmit={handleSubmit(onManageSubmit)} className="space-y-4">
          <Input label="Task Title" placeholder="What needs to be done?" error={errors.title?.message} {...register('title')} />
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Description</label>
            <textarea rows={3} className="block w-full rounded-xl border border-gray-200 p-3 text-sm" {...register('description')} />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <select className="rounded-xl border border-gray-200 p-3 text-sm outline-none bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-white" {...register('event')}>
              <option value="">Select Event</option>
              {teamEvents.map(e => <option key={e._id} value={e._id}>{e.title}</option>)}
            </select>
            
            <select className="rounded-xl border border-gray-200 p-3 text-sm outline-none bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-white" {...register('assignedTo')}>
              <option value="">Select Assignee</option>
              {teamMembers
                .filter(m => ['sub-admin', 'volunteer', 'user'].includes(m.role))
                .map(m => (
                  <option key={m._id} value={m._id}>
                    {m.name} ({m.role.replace('-', ' ').toUpperCase()})
                  </option>
              ))}
            </select>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <Input type="date" label="Deadline" {...register('deadline')} />
              <select className="rounded-xl border border-gray-200 p-3 text-sm mt-6 outline-none bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-white" {...register('priority')}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
          <select className="w-full rounded-xl border border-gray-200 p-3 text-sm outline-none bg-white" {...register('phase')}>
            <option value="pre-event">Pre-Event</option>
            <option value="during-event">During Event</option>
            <option value="post-event">Post-Event</option>
          </select>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setShowManageModal(false)}>Cancel</Button>
            <Button type="submit">Confirm Task</Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: VOLUNTEER SUBMISSION */}
      <Modal isOpen={showSubmitModal} onClose={() => setShowSubmitModal(false)} title="Upload Completed Work">
        <form onSubmit={onVolunteerSubmit} className="space-y-6">
          <textarea rows={3} className="block w-full rounded-2xl border border-gray-100 p-4 text-sm bg-gray-50/50 dark:bg-slate-900 dark:border-slate-700 dark:text-white" placeholder="Work notes..." value={submissionNotes} onChange={(e) => setSubmissionNotes(e.target.value)} required />
          
          <div className="border-2 border-dashed border-gray-200 rounded-3xl p-8 text-center relative hover:bg-indigo-50/30 transition-all">
            <input type="file" multiple accept="image/*" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" disabled={isUploading} />
            <Upload className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p className="text-xs font-bold text-gray-400">Click to upload multiple images</p>
          </div>
          
          <div className="flex flex-wrap gap-3 mt-4">
            {selectedFiles.map((file, idx) => (
              <div key={idx} className="relative w-20 h-20 bg-white rounded-xl overflow-hidden border shadow-sm">
                <img src={URL.createObjectURL(file)} className="w-full h-full object-cover" />
                <button type="button" onClick={() => removeFile(idx)} className="absolute top-0 right-0 bg-rose-500 text-white p-0.5 rounded-bl" disabled={isUploading}>
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setShowSubmitModal(false)} disabled={isUploading}>Cancel</Button>
            <Button type="submit" disabled={selectedFiles.length === 0 || isUploading}>
              {isUploading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Uploading...</> : "Submit Proof"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 3: MANAGEMENT REVIEW */}
      <Modal isOpen={showReviewModal} onClose={() => setShowReviewModal(false)} title="Quality Review">
        <div className="space-y-6">
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
            <div className="text-xs font-bold text-indigo-600 uppercase mb-2">Volunteer's Notes</div>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{activeTask?.submissions?.[activeTask.submissions.length - 1]?.notes}</p>
            <div className="mt-4 flex flex-wrap gap-3">
              {activeTask?.submissions?.[activeTask.submissions.length - 1]?.media?.map((m, idx) => (
                <a key={idx} href={m.url} target="_blank" rel="noreferrer" className="w-24 h-24 rounded-xl overflow-hidden border-2 border-white shadow-sm block hover:scale-105 transition-transform">
                  <img src={m.url} className="w-full h-full object-cover" />
                </a>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-rose-600 uppercase mb-2">Rejection Feedback</label>
            <textarea rows={2} className="block w-full rounded-xl border border-gray-100 p-3 text-sm bg-gray-50/50" placeholder="Why is this rejected?" value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} />
          </div>
          <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
            <Button variant="outline" className="mr-auto" onClick={() => setShowReviewModal(false)}>Close</Button>
            <Button variant="danger" onClick={handleReject}>Reject</Button>
            <Button variant="success" onClick={handleApprove}>Approve</Button>
          </div>
        </div>
      </Modal>

      {/* MODAL 4: TASK DELEGATION */}
      <Modal isOpen={showDelegateModal} onClose={() => setShowDelegateModal(false)} title="Delegate Assignment">
        <div className="space-y-6">
          <select className="w-full rounded-2xl border border-gray-100 p-4 text-sm bg-gray-50/50 dark:bg-slate-900 dark:border-slate-700 dark:text-gray-100 outline-none" value={selectedVolunteer} onChange={(e) => setSelectedVolunteer(e.target.value)}>
            <option value="">Choose a member...</option>
            {teamMembers.filter(m => ['user', 'volunteer'].includes(m.role)).map(v => <option key={v._id} value={v._id}>{v.name}</option>)}
          </select>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowDelegateModal(false)}>Cancel</Button>
            <Button onClick={handleDelegateSubmit} variant="success">Confirm Delegation</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}