import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl border border-gray-200 dark:border-gray-700 w-fit">
      
      <button
        onClick={() => setTheme('light')}
        className={`p-2 rounded-lg flex items-center justify-center transition-all duration-200 ${
          theme === 'light' 
            ? 'bg-white text-amber-500 shadow-sm dark:bg-gray-700' 
            : 'text-gray-500 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white'
        }`}
        title="Light Mode"
      >
        <Sun className="w-4 h-4" />
      </button>

      <button
        onClick={() => setTheme('system')}
        className={`p-2 rounded-lg flex items-center justify-center transition-all duration-200 ${
          theme === 'system' 
            ? 'bg-white text-indigo-600 shadow-sm dark:bg-gray-700 dark:text-indigo-400' 
            : 'text-gray-500 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white'
        }`}
        title="System Preference"
      >
        <Monitor className="w-4 h-4" />
      </button>

      <button
        onClick={() => setTheme('dark')}
        className={`p-2 rounded-lg flex items-center justify-center transition-all duration-200 ${
          theme === 'dark' 
            ? 'bg-white text-indigo-500 shadow-sm dark:bg-gray-700' 
            : 'text-gray-500 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white'
        }`}
        title="Dark Mode"
      >
        <Moon className="w-4 h-4" />
      </button>

    </div>
  );
}