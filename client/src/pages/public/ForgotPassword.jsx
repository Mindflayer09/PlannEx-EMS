// src/pages/public/ForgotPassword.jsx
import React, { useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { Calendar } from 'lucide-react';
import ThemeToggle from '../../components/common/ThemeToggle';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');
    setError('');

    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/auth/forgot-password`, { email });
      setMessage(response.data.message);
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4 font-sans transition-colors duration-200">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-2">
          <Link to="/" className="inline-flex items-center gap-2 text-2xl font-bold text-indigo-600 dark:text-indigo-400">
            <Calendar className="h-7 w-7" />
            PlannEx
          </Link>
          <ThemeToggle />
        </div>
        
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 text-center">Forgot Password?</h2>
        <p className="text-sm text-gray-500 dark:text-gray-300 mb-8 text-center">
          No worries, we'll send you reset instructions.
        </p>
        
        <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
          <div className="flex flex-col text-left">
            <label htmlFor="email" className="text-sm font-medium text-gray-700 dark:text-white mb-1.5">
              Email Address
            </label>
            <input 
              id="email"
              type="email" 
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="e.g. name@company.com" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
            />
          </div>
          
          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full bg-indigo-600 text-white font-semibold py-3 rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-indigo-400 disabled:cursor-not-allowed flex items-center justify-center mt-2"
          >
            {isLoading ? (
              <span className="animate-spin inline-block w-5 h-5 border-[3px] border-current border-t-transparent rounded-full" />
            ) : (
              'Send Reset Link'
            )}
          </button>
        </form>

        {message && (
          <div className="mt-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-sm font-medium text-center">
            {message}
          </div>
        )}
        
        {error && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm font-medium text-center">
            {error}
          </div>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;