// src/pages/public/ResetPassword.jsx
import React, { useState } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';

const ResetPassword = () => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { token } = useParams(); 
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      return setError('Passwords do not match!');
    }
    if (newPassword.length < 8) {
      return setError('Password must be at least 8 characters.');
    }

    setIsLoading(true);
    setMessage('');
    setError('');

    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/auth/reset-password/${token}`, { 
        newPassword 
      });
      
      setMessage(response.data.message);
      
      setTimeout(() => {
        navigate('/login');
      }, 3000);

    } catch (err) {
      setError(err.response?.data?.message || 'Invalid or expired token.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 font-sans">
      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl">
        
        <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">Create New Password</h2>
        <p className="text-sm text-gray-500 mb-8 text-center">
          Your new password must be different from previously used passwords.
        </p>
        
        <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
          
          <div className="flex flex-col text-left">
            <label htmlFor="newPassword" className="text-sm font-medium text-gray-700 mb-1.5">
              New Password
            </label>
            <input 
              id="newPassword"
              type="password" 
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm"
              placeholder="Minimum 8 characters" 
              value={newPassword} 
              onChange={(e) => setNewPassword(e.target.value)} 
              required 
            />
          </div>

          <div className="flex flex-col text-left">
            <label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700 mb-1.5">
              Confirm Password
            </label>
            <input 
              id="confirmPassword"
              type="password" 
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm"
              placeholder="Must match new password" 
              value={confirmPassword} 
              onChange={(e) => setConfirmPassword(e.target.value)} 
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
              'Reset Password'
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

export default ResetPassword;