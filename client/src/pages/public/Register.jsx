import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../../context/AuthContext';
import { getClubs } from '../../api/services/club.service';
import toast from 'react-hot-toast';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import Button from '../../components/common/Button';
import { Calendar, Eye, EyeOff } from 'lucide-react';

const schema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(8, 'Confirm Password is required'),
    club: z.string().min(1, 'Please select a club'),
    role: z.enum(['admin', 'sub-admin', 'volunteer'], { required_error: 'Please select a role' }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export default function Register() {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [clubs, setClubs] = useState([]);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { club: searchParams.get('club') || '' },
  });

  const watchRole = watch('role');

  useEffect(() => {
    const fetchClubs = async () => {
      try {
        const res = await getClubs();
        setClubs(res);
      } catch (err) {
        toast.error('Failed to load clubs');
      }
    };
    fetchClubs();
  }, []);

  useEffect(() => {
    const clubParam = searchParams.get('club');
    if (clubParam) setValue('club', clubParam);
  }, [searchParams, setValue]);

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      await registerUser(data);

      if (data.role === 'admin') {
        toast.success('Admin registered successfully! You can now login.');
      } else {
        toast.success('Registration successful! Please wait for admin approval.');
      }
      navigate('/login');
    } catch (err) {
      toast.error(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-indigo-50 via-white to-purple-50 px-4 py-8">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 text-2xl font-bold text-indigo-600">
            <Calendar className="h-7 w-7" />
            ClubEvents
          </Link>
          <h2 className="mt-4 text-2xl font-bold text-gray-900">Create your account</h2>
          <p className="mt-2 text-sm text-gray-500">
            Already have an account?{' '}
            <Link to="/login" className="text-indigo-600 hover:text-indigo-800 font-medium">
              Sign in
            </Link>
          </p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Full Name"
              placeholder="John Doe"
              error={errors.name?.message}
              {...register('name')}
            />
            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              error={errors.email?.message}
              {...register('email')}
            />

            {/* Password */}
            <div className="relative">
              <label className="block text-gray-700 font-medium mb-1">Password</label>
              <input
                type={passwordVisible ? 'text' : 'password'}
                placeholder="Min 8 characters"
                className={`border rounded px-3 py-2 w-full ${errors.password ? 'border-red-500' : 'border-gray-300'}`}
                {...register('password')}
              />
              <span
                className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-gray-500 hover:text-gray-700"
                onClick={() => setPasswordVisible(!passwordVisible)}
              >
                {passwordVisible ? <EyeOff size={20} /> : <Eye size={20} />}
              </span>
              {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password.message}</p>}
            </div>

            {/* Confirm Password */}
            <div className="relative">
              <label className="block text-gray-700 font-medium mb-1">Confirm Password</label>
              <input
                type={confirmVisible ? 'text' : 'password'}
                placeholder="Re-enter password"
                className={`border rounded px-3 py-2 w-full ${errors.confirmPassword ? 'border-red-500' : 'border-gray-300'}`}
                {...register('confirmPassword')}
              />
              <span
                className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-gray-500 hover:text-gray-700"
                onClick={() => setConfirmVisible(!confirmVisible)}
              >
                {confirmVisible ? <EyeOff size={20} /> : <Eye size={20} />}
              </span>
              {errors.confirmPassword && <p className="text-red-500 text-sm mt-1">{errors.confirmPassword.message}</p>}
            </div>

            {/* Club */}
            <Select
              label="Club"
              placeholder="Select a club"
              options={clubs.map((c) => ({ value: c._id, label: c.name }))}
              error={errors.club?.message}
              {...register('club')}
            />

            {/* Role */}
            <Select
              label="Role"
              placeholder="Select your role"
              options={[
                { value: 'volunteer', label: 'Volunteer' },
                { value: 'sub-admin', label: 'Sub-Admin' },
                { value: 'admin', label: 'Admin' },
              ]}
              error={errors.role?.message}
              {...register('role')}
            />

            <Button type="submit" loading={loading} className="w-full">
              Register
            </Button>
          </form>

          <p className="mt-4 text-xs text-gray-400 text-center">
            {watchRole === 'admin'
              ? 'Admins can login immediately after registration.'
              : 'After registration, an admin will review and approve your account.'}
          </p>
        </div>
      </div>
    </div>
  );
}