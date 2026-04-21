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
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizes = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
  };

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto"
      onClick={(e) => e.target === overlayRef.current && onClose()}
    >
      <div
        className={clsx(
          "bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full flex flex-col",
          sizes[size],
          "max-h-[90vh]"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>

          <button
            onClick={onClose}
            className="text-gray-400 dark:text-gray-300 hover:text-gray-600 dark:hover:text-white transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}