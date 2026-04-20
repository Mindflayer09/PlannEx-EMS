import { 
  Mail, 
  Linkedin, 
  Instagram, 
  ShieldCheck,
  Lock,
  FileCheck,
  Award
} from 'lucide-react';
export default function Footer() {
  return (
    <footer className="bg-[#f4f4f5] dark:bg-gray-800 py-3 border-t border-gray-200 dark:border-gray-700 transition-colors duration-200">
        <div className="text-center">
          <p className="text-sm text-gray-900 dark:text-gray-100">
            <span className="font-semibold text-medium">Choose Privacy. Choose PlannEx.</span>
            <span className="mx-2 text-gray-400 dark:text-gray-600">|</span>
            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
              © 2026, PlannEx EMS. All Rights Reserved.
            </span>
          </p>
        </div>
    </footer>
  );
}