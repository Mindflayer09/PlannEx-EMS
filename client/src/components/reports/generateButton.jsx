import { useState } from 'react';
import toast from 'react-hot-toast';
import { Sparkles, Loader2 } from 'lucide-react';
import { generateEventReport } from '../../api/services/report.service';

export default function GenerateReportButton({ eventId, onReportGenerated }) {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    // Prevent accidental clicks
    if (!window.confirm('Generate a new AI report for this event? This will summarize all completed tasks.')) {
      return;
    }

    setIsGenerating(true);
    try {
      const res = await generateEventReport(eventId);
      toast.success('Report generated successfully!');
      
      // Pass the new report data back up to the parent component to update the UI
      if (onReportGenerated) {
        onReportGenerated(res.data);
      }
    } catch (error) {
      console.error('Failed to generate report:', error);
      toast.error(error.response?.data?.message || 'Failed to generate report');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <button
      onClick={handleGenerate}
      disabled={isGenerating}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-white transition-all shadow-sm
        ${isGenerating 
          ? 'bg-indigo-400 cursor-not-allowed' 
          : 'bg-linear-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 hover:shadow-md'
        }`}
    >
      {isGenerating ? (
        <>
          <Loader2 className="h-5 w-5 animate-spin" />
          Generating AI Report...
        </>
      ) : (
        <>
          <Sparkles className="h-5 w-5" />
          Generate Report
        </>
      )}
    </button>
  );
}