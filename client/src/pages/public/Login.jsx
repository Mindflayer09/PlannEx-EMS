import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import { Calendar, Eye, EyeOff } from 'lucide-react';
import GoogleAuthButton from '../../components/auth/GoogleAuthButton';

const schema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export default function Login({ onSuccess, switchToRegister }) {
  const { login, user: currentUser } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
  });

  const handleCentralRedirect = () => {
    navigate('/dashboard', { replace: true });
  };

  // Redirect if already logged in
  useEffect(() => {
    if (currentUser) {
      handleCentralRedirect();
    }
  }, [currentUser]);

  // ==========================================
  // Manual Email/Password Login
  // ==========================================
  const onSubmit = async (data) => {
    setLoading(true);
    try {
      await login(data.email, data.password);

      toast.success('Welcome back!');

      if (onSuccess) {
        onSuccess(); // Close modal if used in Home page
      }
      
      handleCentralRedirect();

    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // Google Login Hand-off
  // ==========================================
  const handleGoogleSuccess = (googleData) => {
    if (googleData && googleData.token) {
      // 1. Save the token exactly like your old Google button did
      localStorage.setItem('token', googleData.token);
      
      toast.success('Welcome back!');
      
      if (onSuccess) {
        onSuccess(); 
      }

      // 2. We use window.location here instead of navigate() to force a hard reload. 
      // This guarantees your AuthContext re-runs its initialization and sees the new token!
      window.location.href = '/dashboard';
    } else {
      toast.error('Google login failed: No valid session found.');
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Header */}
      <div className="text-center mb-6">
        <Link to="/" className="inline-flex items-center gap-2 text-2xl font-bold text-indigo-600">
          <Calendar className="h-7 w-7" />
          PlannEx
        </Link>
        <h2 className="mt-4 text-2xl font-bold text-gray-900">Sign in to your account</h2>
        <p className="mt-2 text-sm text-gray-500">
          Don't have an account?{" "}
          <button
            onClick={switchToRegister || (() => navigate('/register'))}
            className="text-indigo-600 font-medium hover:underline cursor-pointer"
          >
            Register
          </button>
        </p>
      </div>

      {/* Form */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          
          <Input
            label="Email"
            type="email"
            placeholder="you@example.com"
            error={errors.email?.message}
            {...register('email')}
          />

          <div className="relative">
            <Input
              label="Password"
              type={passwordVisible ? 'text' : 'password'}
              placeholder="Enter your password"
              error={errors.password?.message}
              {...register('password')}
            />
            <button
              type="button"
              className="absolute right-3 top-9 text-gray-400 hover:text-indigo-600 cursor-pointer"
              onClick={() => setPasswordVisible(!passwordVisible)}
            >
              {passwordVisible ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <div className="text-right text-sm">
            <Link to="/forgot-password" size="sm" className="text-indigo-600 hover:text-indigo-800 font-medium">
              Forgot Password?
            </Link>
          </div>

          <Button type="submit" loading={loading} className="w-full py-3 shadow-md hover:shadow-lg transition-all">
            Sign In
          </Button>
        </form>
        <GoogleAuthButton 
          actionText="Continue with Google" 
          onGoogleSuccess={handleGoogleSuccess} 
        />
      </div>
    </div>
  );
}