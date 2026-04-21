import { Link } from 'react-router-dom';
import { Calendar } from 'lucide-react';
import ThemeToggle from '../components/common/ThemeToggle';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 transition-colors duration-200">
      <div className="text-center">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-center mb-8 gap-2">
          <Link to="/" className="inline-flex items-center gap-2 text-2xl font-bold text-indigo-600 dark:text-indigo-400">
            <Calendar className="h-7 w-7" />
            PlannEx
          </Link>
          <ThemeToggle />
        </div>
        
        <h1 className="text-6xl font-bold text-indigo-600 dark:text-indigo-400">404</h1>
        <p className="mt-4 text-xl text-gray-900 dark:text-white">Page not found</p>
        <p className="mt-2 text-gray-500 dark:text-gray-300">The page you're looking for doesn't exist.</p>
        <Link
          to="/"
          className="mt-6 inline-block bg-indigo-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
        >
          Go Home
        </Link>
      </div>
    </div>
  );
}
