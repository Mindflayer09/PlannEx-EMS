import { useState } from 'react';
import { Zap } from 'lucide-react';
import Modal from '../common/Modal';
import AdvancedReportGenerator from './AdvancedReportGenerator';

export default function GenerateReportButton({ eventId, onReportGenerated }) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <>
      <div className="w-full">
        {/* Main Generate Button (Advanced Only) */}
        <button
          type="button"
          onClick={() => setShowAdvanced(true)}
          className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-3xl font-black text-white bg-linear-to-br from-cyan-600 to-blue-600 hover:shadow-blue-200 hover:scale-[1.02] active:scale-95 transition-all duration-500 shadow-xl"
        >
          <Zap className="h-5 w-5" />
          <span className="uppercase tracking-widest text-[10px]">Generate Advanced Report</span>
        </button>
      </div>

      {/* Advanced Report Generator Modal */}
      {showAdvanced && (
        <Modal
          isOpen={showAdvanced}
          title="Advanced Report Generator"
          onClose={() => setShowAdvanced(false)}
          size="large"
        >
          <AdvancedReportGenerator
            eventId={eventId}
            onReportGenerated={(report) => {
              setShowAdvanced(false);
              if (onReportGenerated) {
                onReportGenerated(report);
              }
            }}
          />
        </Modal>
      )}
    </>
  );
}