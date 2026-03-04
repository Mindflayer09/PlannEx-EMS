import { useState, useEffect } from 'react';
import { getAllEvents, createEvent, updateEvent, deleteEvent, changeEventPhase, finalizeEvent, generateEventReport } from '../../api/services/event.service';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Card from '../../components/common/Card';
import Modal from '../../components/common/Modal';
import Input from '../../components/common/Input';
import Spinner from '../../components/common/Spinner';
import toast from 'react-hot-toast';

import { Plus, Trash2, Edit, ArrowRight, Lock, Sparkles, FileText } from 'lucide-react';
import { PHASE_COLORS, PHASE_LABELS } from '../../utils/constants';
import { formatDate } from '../../utils/helpers';

const eventSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  budget: z.coerce.number().min(0).optional(),
});

const PHASE_ORDER = ['pre-event', 'during-event', 'post-event'];

export default function ManageEvents() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Standard Create/Edit Event State
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);

  // 🔥 NEW AI Report State
  const [showReportModal, setShowReportModal] = useState(false);
  const [activeReportEvent, setActiveReportEvent] = useState(null);
  const [reportText, setReportText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(eventSchema),
  });

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const res = await getAllEvents({ limit: 100 });
      setEvents(res.data.events);
    } catch (err) {
      toast.error('Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchEvents(); }, []);

  const openCreate = () => {
    setEditing(null);
    reset({ title: '', description: '', budget: 0 });
    setShowModal(true);
  };

  const openEdit = (event) => {
    setEditing(event);
    reset({ title: event.title, description: event.description, budget: event.budget || 0 });
    setShowModal(true);
  };

  // 🔥 Open the AI Report Modal
  const openReportModal = (event) => {
    setActiveReportEvent(event);
    // Load existing report or draft if it exists
    setReportText(event.report || event.aiDraft || '');
    setShowReportModal(true);
  };

  const onSubmit = async (data) => {
    try {
      if (editing) {
        await updateEvent(editing._id, data);
        toast.success('Event updated');
      } else {
        await createEvent(data);
        toast.success('Event created');
      }
      setShowModal(false);
      fetchEvents();
    } catch (err) {
      toast.error(err.message || 'Failed to save event');
    }
  };

  // 🔥 Handle AI Generation
  const handleGenerateAI = async () => {
    setIsGenerating(true);
    try {
      const res = await generateEventReport(activeReportEvent._id);
      // Populate the textarea with the AI's response
      setReportText(res.data.report || res.data.aiDraft);
      toast.success('AI Draft generated successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to generate AI report');
    } finally {
      setIsGenerating(false);
    }
  };

  // 🔥 Handle Saving the Report edits
  const handleSaveReport = async () => {
    try {
      await updateEvent(activeReportEvent._id, { 
        report: reportText, 
        reportStatus: 'draft' 
      });
      toast.success('Report saved successfully');
      setShowReportModal(false);
      fetchEvents();
    } catch (err) {
      toast.error(err.message || 'Failed to save report');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this event and all its tasks?')) return;
    try {
      await deleteEvent(id);
      toast.success('Event deleted');
      fetchEvents();
    } catch (err) {
      toast.error(err.message || 'Failed to delete');
    }
  };

  const handlePhaseChange = async (id, currentPhase) => {
    const currentIdx = PHASE_ORDER.indexOf(currentPhase);
    if (currentIdx >= PHASE_ORDER.length - 1) return;
    const nextPhase = PHASE_ORDER[currentIdx + 1];
    if (!window.confirm(`Move event to "${PHASE_LABELS[nextPhase]}"?`)) return;
    try {
      await changeEventPhase(id, { phase: nextPhase });
      toast.success(`Phase changed to ${PHASE_LABELS[nextPhase]}`);
      fetchEvents();
    } catch (err) {
      toast.error(err.message || 'Failed to change phase');
    }
  };

  const handleFinalize = async (id) => {
    if (!window.confirm('Finalize this event? It will become public and read-only.')) return;
    try {
      await finalizeEvent(id);
      toast.success('Event finalized and published');
      fetchEvents();
    } catch (err) {
      toast.error(err.message || 'Failed to finalize');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Manage Events</h1>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" /> New Event
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : events.length === 0 ? (
        <Card><p className="text-gray-500 text-center py-8">No events yet. Create your first event!</p></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {events.map((event) => (
            <Card key={event._id}>
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900 line-clamp-1">{event.title}</h3>
                <Badge className={PHASE_COLORS[event.phase]}>{PHASE_LABELS[event.phase]}</Badge>
              </div>
              <p className="text-sm text-gray-500 line-clamp-2 mb-3">{event.description}</p>
              <p className="text-xs text-gray-400 mb-4">Created {formatDate(event.createdAt)}</p>

              <div className="flex flex-wrap gap-2">
                {!event.isFinalized && (
                  <>
                    <Button size="sm" variant="outline" onClick={() => openEdit(event)}>
                      <Edit className="h-3.5 w-3.5 mr-1" /> Edit
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => handleDelete(event._id)}>
                      <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                    </Button>
                    {PHASE_ORDER.indexOf(event.phase) < PHASE_ORDER.length - 1 && (
                      <Button size="sm" variant="secondary" onClick={() => handlePhaseChange(event._id, event.phase)}>
                        <ArrowRight className="h-3.5 w-3.5 mr-1" /> Next Phase
                      </Button>
                    )}
                    
                    {/* 🔥 NEW: Report button only shows in post-event phase */}
                    {event.phase === 'post-event' && (
                      <Button size="sm" variant="outline" className="border-purple-200 text-purple-700 hover:bg-purple-50" onClick={() => openReportModal(event)}>
                        <FileText className="h-3.5 w-3.5 mr-1" /> Report
                      </Button>
                    )}

                    {event.phase === 'post-event' && (
                      <Button size="sm" variant="success" onClick={() => handleFinalize(event._id)}>
                        <Lock className="h-3.5 w-3.5 mr-1" /> Finalize
                      </Button>
                    )}
                  </>
                )}
                {event.isFinalized && (
                  <Badge className="bg-green-100 text-green-800">Finalized & Public</Badge>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Basic Create/Edit Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Event' : 'Create Event'}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="Title" error={errors.title?.message} {...register('title')} />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              rows={4}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              {...register('description')}
            />
            {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>}
          </div>
          <Input label="Budget (optional)" type="number" error={errors.budget?.message} {...register('budget')} />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit">{editing ? 'Update' : 'Create'}</Button>
          </div>
        </form>
      </Modal>

      {/* 🔥 NEW: AI Report Modal */}
      <Modal isOpen={showReportModal} onClose={() => setShowReportModal(false)} title="Post-Event Report">
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-purple-50 p-3 rounded-lg border border-purple-100">
            <p className="text-sm text-purple-800">
              Generate a public report using event data and completed tasks.
            </p>
            <Button size="sm" onClick={handleGenerateAI} disabled={isGenerating} className="bg-purple-600 hover:bg-purple-700 text-white flex items-center whitespace-nowrap ml-4">
              {isGenerating ? <Spinner size="sm" className="mr-2 border-white" /> : <Sparkles className="h-4 w-4 mr-2" />}
              {isGenerating ? 'Generating...' : 'Auto-Generate AI Draft'}
            </Button>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Public Report Content (Markdown supported)</label>
            <textarea
              rows={12}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono"
              value={reportText}
              onChange={(e) => setReportText(e.target.value)}
              placeholder="Click 'Auto-Generate' above, or type your report here..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
            <Button variant="outline" onClick={() => setShowReportModal(false)}>Cancel</Button>
            <Button onClick={handleSaveReport}>Save Draft</Button>
          </div>
        </div>
      </Modal>

    </div>
  );
}