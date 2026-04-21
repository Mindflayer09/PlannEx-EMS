import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Building2, UploadCloud, X } from 'lucide-react';

// Services
import { createTeam } from '../../api/services/team.service';
import { uploadFile } from '../../api/services/upload.service';

// Components
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Card from '../../components/common/Card';

const organizationSchema = z.object({
  name: z.string().min(3, 'Organization name must be at least 3 characters'),
  description: z.string().min(10, 'Provide a brief description (min 10 chars)'),
  // Add category if your backend requires it
  category: z.string().optional().default('General'),
});

export default function CreateOrganization() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [logoFile, setLogoFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null); // ✅ Added preview

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(organizationSchema),
  });

  // Handle file selection and preview
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        return toast.error("File size must be less than 5MB");
      }
      setLogoFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    try {
      let logoUrl = '';
      if (logoFile) {
        const uploadResult = await uploadFile(logoFile);
        logoUrl = uploadResult?.data?.url || '';
      }

      await createTeam({
        name: data.name,
        description: data.description,
        category: data.category,
        logo: logoUrl,
      });
      
      toast.success('Organization created successfully!');
      reset();
      setLogoFile(null);
      setPreviewUrl(null);
      navigate('/super-admin/dashboard');
      
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create organization');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 text-gray-900 dark:text-white">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Building2 className="h-6 w-6 text-indigo-600" />
          Create New Organization
        </h1>
        <p className="text-gray-500 dark:text-gray-300 mt-1">
          Launch a new workspace. Once created, you can assign an Admin to manage it.
        </p>
      </div>

      <Card className="p-6 bg-white dark:bg-slate-900">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          
          <Input 
            label="Organization Name" 
            placeholder="e.g., Tech Innovators Inc."
            error={errors.name?.message} 
            {...register('name')} 
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea 
              rows={4} 
              className={`block w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none ${
                errors.description ? 'border-red-500' : 'border-gray-300'
              }`} 
              placeholder="What does this organization do?"
              {...register('description')} 
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
            )}
          </div>

          {/* Logo Upload Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Organization Logo (Optional)
            </label>
            
            {!previewUrl ? (
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-indigo-400 hover:bg-indigo-50/30 transition-all cursor-pointer">
                <div className="space-y-1 text-center">
                  <UploadCloud className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="flex text-sm text-gray-600 justify-center">
                    <label htmlFor="logo-upload" className="relative cursor-pointer rounded-md font-medium text-indigo-600 hover:text-indigo-500">
                      <span>Upload a file</span>
                      <input id="logo-upload" type="file" className="sr-only" accept="image/*" onChange={handleFileChange} />
                    </label>
                  </div>
                  <p className="text-xs text-gray-500">PNG, JPG up to 5MB</p>
                </div>
              </div>
            ) : (
              <div className="mt-1 relative inline-block">
                <img src={previewUrl} alt="Preview" className="h-32 w-32 object-cover rounded-lg border shadow-sm" />
                <button 
                  type="button"
                  onClick={() => { setLogoFile(null); setPreviewUrl(null); }}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600"
                >
                  <X size={14} />
                </button>
              </div>
            )}
          </div>

          <div className="flex justify-end pt-4 border-t border-gray-100 gap-3">
            <Button variant="secondary" type="button" onClick={() => navigate(-1)}>
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              Create Organization
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}