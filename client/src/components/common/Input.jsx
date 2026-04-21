import { forwardRef } from 'react';
import clsx from 'clsx';

const Input = forwardRef(({ label, error, className, ...props }, ref) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">{label}</label>
      )}
      <input
        ref={ref}
        className={clsx(
          'block w-full rounded-lg border px-3 py-2 text-sm shadow-sm transition-colors bg-white dark:bg-gray-700',
          'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500',
          error
            ? 'border-red-300 text-red-900 placeholder-red-300 dark:border-red-600 dark:text-red-100 dark:placeholder-red-400'
            : 'border-gray-300 text-gray-900 placeholder-gray-400 dark:border-gray-600 dark:text-white dark:placeholder-gray-500',
          className
        )}
        {...props}
      />
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
});

Input.displayName = 'Input';
export default Input;
