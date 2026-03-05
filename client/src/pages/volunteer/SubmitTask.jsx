import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getTaskById, submitTask } from '../../api/services/task.service';
import { uploadFile } from '../../api/services/upload.service';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Card from '../../components/common/Card';
import Spinner from '../../components/common/Spinner';
import toast from 'react-hot-toast';
import { ArrowLeft, UploadCloud, X, FileText } from 'lucide-react';
import { STATUS_COLORS, PRIORITY_COLORS } from '../../utils/constants';
import { formatDate } from '../../utils/helpers';

export default function SubmitTask() {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [files, setFiles] = useState([]); // Now correctly stores an array of files
  const [notes, setNotes] = useState('');

  useEffect(() => {
    const fetchTask = async () => {
      try {
        const res = await getTaskById(taskId);
        setTask(res.data.task);
      } catch (err) {
        toast.error('Failed to load task');
        navigate('/volunteer/tasks');
      } finally {
        setLoading(false);
      }
    };
    fetchTask();
  }, [taskId, navigate]);

  // Handle file selection (append new files to the array)
  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setFiles((prev) => [...prev, ...selectedFiles]);
  };

  // Remove a specific file from the preview
  const removeFile = (indexToRemove) => {
    setFiles((prev) => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!files.length) return toast.error('Please select at least one file');

    setSubmitting(true);
    try {
      // 1. Upload ALL files to Cloudinary in parallel for faster processing
      const uploadPromises = files.map(file => uploadFile(file));
      const uploadResponses = await Promise.all(uploadPromises);

      // 2. Map the responses into an array of media objects
      const uploadedMedia = uploadResponses.map(res => ({
        url: res.data.url,
        publicId: res.data.publicId,
        fileType: res.data.fileType
      }));

      // 3. Submit task with the array of uploaded media
      // NOTE: Your backend 'submitTask' controller MUST be updated to accept an array (e.g., 'media' instead of 'fileUrl')
      await submitTask(taskId, { media: uploadedMedia, notes });
      
      toast.success('Task submitted successfully!');
      navigate('/volunteer/tasks');
    } catch (err) {
      toast.error(err.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="flex justify-center py-12"><Spinner size="lg" /></div>;
  if (!task) return null;

  return (
    <div className="max-w-2xl mx-auto py-8">
      <button
        onClick={() => navigate('/volunteer/tasks')}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6"
      >
        <ArrowLeft className="h-4 w-4" /> Back to tasks
      </button>

      <h1 className="text-2xl font-bold text-gray-900 mb-6">Submit Task</h1>

      {/* Task Info */}
      <Card className="mb-6">
        <div className="flex items-start justify-between mb-2">
          <h2 className="text-lg font-semibold text-gray-900">{task.title}</h2>
          <Badge className={STATUS_COLORS[task.status]}>{task.status}</Badge>
        </div>
        <p className="text-sm text-gray-600 mb-3">{task.description}</p>
        <div className="flex flex-wrap gap-4 text-sm text-gray-500">
          <span>Deadline: {formatDate(task.deadline)}</span>
          <Badge className={PRIORITY_COLORS[task.priority]}>{task.priority}</Badge>
        </div>
        {task.rejectionReason && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-700"><strong>Previous rejection:</strong> {task.rejectionReason}</p>
          </div>
        )}
      </Card>

      {/* Submit Form */}
      <Card>
        <h3 className="font-medium text-gray-900 mb-4">New Submission</h3>
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Multiple File Upload Dropzone */}
          <div>
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:bg-gray-50 transition-colors relative">
              <input 
                type="file" 
                multiple 
                accept="image/*, application/pdf, application/msword, application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <UploadCloud className="h-10 w-10 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 font-medium">Drag & drop files, or click to browse</p>
              <p className="text-xs text-gray-400 mt-1">You can select multiple files</p>
            </div>

            {/* Selected Files Preview Grid */}
            {files.length > 0 && (
              <div className="mt-4 grid grid-cols-3 sm:grid-cols-4 gap-3">
                {files.map((file, index) => {
                  const isImage = file.type.startsWith('image/');
                  return (
                    <div key={index} className="relative group rounded-lg overflow-hidden border border-gray-200 shadow-sm bg-gray-50 aspect-square flex items-center justify-center">
                      {isImage ? (
                        <img 
                          src={URL.createObjectURL(file)} 
                          alt={`Preview ${index}`} 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="text-center p-2">
                          <FileText className="h-8 w-8 text-indigo-400 mx-auto mb-1" />
                          <p className="text-[10px] text-gray-500 truncate w-16 mx-auto">{file.name}</p>
                        </div>
                      )}
                      
                      {/* Remove Button */}
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-md hover:bg-red-600"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
            <textarea
              rows={3}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about your submission..."
            />
          </div>
          
          <Button type="submit" loading={submitting} className="w-full">
            {submitting ? 'Uploading & Submitting...' : `Submit Task (${files.length} files)`}
          </Button>
        </form>
      </Card>
    </div>
  );
}