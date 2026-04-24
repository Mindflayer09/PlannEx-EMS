import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import clsx from "clsx";

export default function Modal({ isOpen, onClose, title, children, size = "md" }) {
  const overlayRef = useRef(null);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") onClose();
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEsc);
      document.body.style.overflow = "hidden"; // Prevents background scrolling
    }

    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // 🚀 FIX: Added '2xl' and 'full' to support large newspaper/report UI
  const sizes = {
    sm: "sm:max-w-md",
    md: "sm:max-w-lg",
    lg: "sm:max-w-2xl",
    xl: "sm:max-w-4xl",
    "2xl": "sm:max-w-5xl",
    full: "sm:max-w-[95vw]",
  };

  return (
    <div
      ref={overlayRef}
      // 🚀 MOBILE UI: 'items-end' anchors it to the bottom on phones, 'sm:items-center' centers on desktop
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm sm:p-4 overflow-y-auto transition-all"
      onClick={(e) => e.target === overlayRef.current && onClose()}
    >
      <div
        className={clsx(
          "relative bg-white dark:bg-gray-900 w-full flex flex-col shadow-2xl transition-all",
          // 🚀 MOBILE UI: Rounded top corners only on phones (Bottom Sheet style)
          "rounded-t-2xl sm:rounded-2xl",
          // 🚀 MOBILE UI: 'dvh' ensures the mobile browser address bar doesn't cover the bottom of your modal
          "max-h-[90dvh] sm:max-h-[90vh]",
          sizes[size] || sizes.md 
        )}
      >
        {/* Header - Only renders if a title string is explicitly passed */}
        {title && (
          <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-100 dark:border-gray-800 shrink-0">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h3>

            <button
              onClick={onClose}
              className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300 transition-colors"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}

        {/* 🚀 MOBILE UX FIX: Floating close button for custom-header modals (like PublicReports) */}
        {!title && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-50 rounded-full bg-black/40 backdrop-blur-md p-2 text-white hover:bg-black/60 transition-colors shadow-lg"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        )}

        {/* Scrollable Content */}
        <div className="overflow-y-auto flex-1">
          {children}
        </div>
      </div>
    </div>
  );
}