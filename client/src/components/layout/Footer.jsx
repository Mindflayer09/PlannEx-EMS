export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    // Adjusted to py-4 on mobile so it's not overly tall, and py-6 on desktop
    <footer className="bg-white dark:bg-gray-900 py-4 sm:py-6 border-t border-gray-200 dark:border-gray-800 transition-colors duration-200 z-10 relative mt-auto">
      {/* Added gap-1 for consistent mobile spacing when stacked */}
      <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-center text-center gap-1 sm:gap-0">
        
        {/* Brand Promise */}
        <span className="text-sm font-bold text-gray-900 dark:text-white tracking-tight">
          Choose Privacy. Choose PlannEx.
        </span>

        {/* Separator (Hides on mobile, shows on desktop) */}
        <span className="hidden sm:inline-block mx-3 text-gray-300 dark:text-gray-600">
          |
        </span>

        {/* Copyright */}
        <span className="text-[11px] sm:text-xs font-medium text-gray-500 dark:text-gray-400">
          © {currentYear}, PlannEx EMS. All Rights Reserved.
        </span>

      </div>
    </footer>
  );
}