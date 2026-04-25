import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { 
  Sparkles, 
  Loader2, 
  Wand2, 
  Image as ImageIcon,
  FileText,
  Settings,
  Eye,
  Check,
  Newspaper
} from 'lucide-react';
import { getMediaCatalog, generateSocialMediaContent, updateReport, getPublicReports } from '../../api/services/report.service'; 
import Button from '../common/Button';
import Modal from '../common/Modal';

const MAX_IMAGES = 3;

// 🚀 Add the dictionary so the generator knows what NOT to highlight
const IGNORE_WORDS = new Set([
  'The', 'This', 'That', 'These', 'Those', 'With', 'From', 'Your', 'Have', 'Has', 'Had', 'Are', 'Were', 'Was', 'Been', 'Being', 'And', 'For', 'Not', 'But', 'She', 'Him', 'Her', 'His', 'Our', 'They', 'Them', 'Their', 'Its', 'All', 'Any', 'Both', 'Each', 'Few', 'More', 'Most', 'Some', 'Such', 'When', 'Where', 'Why', 'How', 'What', 'Which', 'Who', 'Whom', 'Whose', 'Then', 'Than', 'During', 'After', 'Before', 'While', 'Since', 'Until', 'Because', 'Although', 'Though', 'Even', 'If', 'Unless', 'As', 'So', 'Very', 'Too', 'Quite', 'Just', 'Already', 'Yet', 'Still', 'Always', 'Never', 'Often', 'Sometimes', 'Rarely', 'Usually', 'Mainly', 'Mostly', 'Only', 'Also', 'Furthermore', 'Moreover', 'However', 'Nevertheless', 'Nonetheless', 'Therefore', 'Thus', 'Hence', 'Consequently', 'Otherwise', 'Instead', 'Anyway', 'Besides', 'Meanwhile', 'Next', 'Finally', 'Eventually', 'Suddenly', 'Immediately', 'Ultimately', 'Initially', 'Actually', 'Basically', 'Literally', 'Simply', 'Main', 'A', 'An', 'In', 'On', 'At', 'To', 'Of', 'Is', 'It', 'By', 'Do', 'Go', 'He', 'Me', 'My', 'No', 'Or', 'Up', 'Us', 'We', 'Am'
]);

export default function AdvancedReportGenerator({ eventId, onReportGenerated }) {
  const [step, setStep] = useState(1); 
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  
  const [mediaCatalog, setMediaCatalog] = useState([]);
  const [selectedMedia, setSelectedMedia] = useState([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);

  const [platform, setPlatform] = useState('general');
  const [useCustomPrompt, setUseCustomPrompt] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  const [publishAfterGeneration, setPublishAfterGeneration] = useState(false);

  const [generatedContent, setGeneratedContent] = useState(null);
  const [publishing, setPublishing] = useState(false);

  const platforms = [
    { value: 'instagram', label: '📸 Instagram', desc: 'Hashtags & emojis' },
    { value: 'facebook', label: '👥 Facebook', desc: 'Friendly & professional' },
    { value: 'linkedin', label: '💼 LinkedIn', desc: 'Corporate focused' },
    { value: 'twitter', label: '🐦 Twitter', desc: 'Concise & impactful' },
    { value: 'general', label: '📱 General', desc: 'Multi-platform' }
  ];

  useEffect(() => {
    fetchMediaCatalog();
  }, [eventId]);

  const fetchMediaCatalog = async () => {
    setLoadingCatalog(true);
    try {
      const response = await getMediaCatalog(eventId);
      const rawCatalog = response.data?.data?.mediaCatalog || response.data?.mediaCatalog || [];
      const approvedTasks = response.data?.data?.approvedTasksCount || response.data?.approvedTasksCount || 0;

      const reportsRes = await getPublicReports({ eventId: eventId, limit: 100 }); 
      const existingReports = reportsRes?.data?.data?.reports || [];
      
      const usedImages = [];
      existingReports.forEach(report => {
         if (report.reportImage) usedImages.push(report.reportImage);
         if (report.galleryImages && Array.isArray(report.galleryImages)) {
             usedImages.push(...report.galleryImages);
         }
      });

      const availableMedia = rawCatalog.filter(media => !usedImages.includes(media.url));

      setMediaCatalog(availableMedia);

      if (availableMedia.length === 0) {
        if (approvedTasks === 0) {
          toast.error('No approved tasks found. Complete and approve tasks first.');
        } else if (rawCatalog.length > 0) {
          toast.error('All approved photos have already been published in existing reports.');
        } else {
          toast.error('Approved tasks found but no photos submitted.');
        }
      }
    } catch (error) {
      console.error('[MEDIA CATALOG FETCH ERROR]', error);
      const errorMsg = error.response?.data?.message || error.message || 'Failed to load media catalog';
      toast.error(errorMsg);
    } finally {
      setLoadingCatalog(false);
    }
  };

  const toggleMediaSelection = (url) => {
    setSelectedMedia(prev => {
      if (prev.includes(url)) {
        return prev.filter(m => m !== url);
      }
      if (prev.length >= MAX_IMAGES) {
        toast.error(`You can only select up to ${MAX_IMAGES} photos to avoid overloading the AI.`);
        return prev;
      }
      return [...prev, url];
    });
  };

  const selectAllMedia = () => {
    if (selectedMedia.length === mediaCatalog.length || selectedMedia.length === MAX_IMAGES) {
      setSelectedMedia([]);
    } else {
      setSelectedMedia(mediaCatalog.slice(0, MAX_IMAGES).map(m => m.url));
      if (mediaCatalog.length > MAX_IMAGES) {
        toast.success(`Selected the first ${MAX_IMAGES} photos due to AI limits.`);
      }
    }
  };

  // 🚀 THE PARSER: Safely unpacks the raw AI response for the preview window
  const formatPreviewContent = (rawText) => {
    let content = rawText;
    
    // 1. If it's wrapped in JSON (like your screenshot)
    if (typeof content === 'string') {
      const trimmed = content.trim();
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        try {
          let parsed = JSON.parse(trimmed);
          if (Array.isArray(parsed) && parsed.length > 0) parsed = parsed[0];
          content = parsed.content || content;
        } catch(e) {}
      }
    }

    // 2. Flatten Object if needed
    if (typeof content === 'object' && content !== null) {
        content = Object.values(content)
            .filter(val => val) 
            .map(val => typeof val === 'object' ? JSON.stringify(val) : String(val))
            .join('\n\n'); 
    }

    // 3. Find embedded arrays and apply ***Bold Italics*** to names and titles
    if (typeof content === 'string') {
        const embeddedJsonRegex = /\[\s*\{[\s\S]*?\}\s*\]/g;
        
        content = content.replace(embeddedJsonRegex, (match) => {
            try {
                const parsedArray = JSON.parse(match);
                if (Array.isArray(parsedArray)) {
                    return parsedArray.map(item => {
                        if (item.role && item.description) {
                            let desc = item.description.replace(/\b([A-Z][a-z]+)\b/g, (word) => {
                                // 🚀 Uses 3 asterisks to signal Bold+Italic to our renderer
                                return IGNORE_WORDS.has(word) ? word : `***${word}***`;
                            });
                            return `• ***${item.role}***: ${desc}`;
                        }
                        return "• " + Object.values(item).filter(Boolean).join(' - ');
                    }).join('\n\n');
                }
                return match;
            } catch(e) { return match; }
        });
    }

    if (typeof content === 'string') {
        content = content.replace(/\\n/g, '\n');
    }
    
    return String(content);
  };

  // 🚀 THE FORMATTER: Converts ***text*** to <strong className="italic">
  const renderFormattedText = (text) => {
    if (!text || typeof text !== 'string') return text;
    
    // Split by ***bold-italic*** OR **bold**
    const parts = text.split(/(\*\*\*.*?\*\*\*|\*\*.*?\*\*)/g);
    
    return parts.map((part, index) => {
      // Handle Bold + Italic
      if (part.startsWith('***') && part.endsWith('***')) {
        return (
          <strong key={index} className="font-extrabold italic text-gray-900 dark:text-white">
            {part.slice(3, -3)}
          </strong>
        );
      }
      // Handle Standard Bold
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={index} className="font-extrabold text-gray-900 dark:text-white">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
  };

  const handleGenerate = async () => {
    if (selectedMedia.length === 0) {
      toast.error('Please select at least one photo');
      return;
    }

    setGenerating(true);
    const toastId = toast.loading('AI is crafting your article...');

    try {
      const payload = {
        selectedMedia,
        customPrompt: useCustomPrompt ? customPrompt : null,
        platform,
        publish: publishAfterGeneration
      };

      const response = await generateSocialMediaContent(eventId, payload);
      
      const payloadData = response?.data?.data || response?.data || response || {};
      const parsedContent = payloadData.generatedContent || {};
      const report = payloadData.report || {};

      if (response?.status === 202 || payloadData.success === false || response?.success === false) {
        toast.success(payloadData.message || response?.message || 'Draft saved. You can publish or edit manually.', { id: toastId });
        
        setGeneratedContent({
          title: report.title || 'Draft Report',
          content: report.content || 'AI generation failed; draft saved. Edit or publish manually.',
          hashtags: Array.isArray(report.hashtags) ? report.hashtags : ["PlannEx"],
          cta: '',
          wordCount: report.wordCount || 0,
          platform: report.platform || platform,
          report: report
        });
        setStep(3);
        return;
      }

      const finalContentText = parsedContent.content || report.content || "Warning: The AI returned an empty text string. Try generating again or edit this text manually.";
      const finalTitleText = parsedContent.title || report.title || "PlannEx Exclusive Article";

      if (Object.keys(payloadData).length === 0) {
        throw new Error('Backend failed to return any data objects.');
      }

      setGeneratedContent({ 
        ...parsedContent, 
        title: finalTitleText,
        content: finalContentText, 
        hashtags: Array.isArray(parsedContent.hashtags) ? parsedContent.hashtags : ["PlannEx", "Event"], 
        report: report 
      });
      
      setStep(3);
      toast.success(publishAfterGeneration ? 'Article published!' : 'Article drafted successfully!', { id: toastId });

    } catch (error) {
      let errorMsg = 'Failed to generate content';
      const status = error.response?.status;
      const message = error.response?.data?.message || error.response?.message;

      if (status === 503) {
        errorMsg = 'AI service is overloaded. Please try again in 1-2 minutes.';
      } else if (status === 429) {
        errorMsg = 'Too many requests. Please wait a few moments or try a fresh API key.';
      } else if (message) {
        errorMsg = message;
      } else if (error.message) {
        errorMsg = error.message;
      }

      toast.error(errorMsg, { id: toastId, duration: 4000 });
      console.error('[GENERATE ERROR]', error);
    } finally {
      setGenerating(false);
    }
  };

  const handlePublish = async (reportId, onDone) => {
    if (!reportId) {
      toast.error('No report to publish');
      return;
    }
    setPublishing(true);
    const toastId = toast.loading('Publishing article to public feed...');
    try {
      const payload = { 
        status: 'published', 
        isPublic: true,
        title: generatedContent.title,
        content: generatedContent.content,
        hashtags: generatedContent.hashtags,
        reportImage: selectedMedia[0] || null, 
        galleryImages: selectedMedia.slice(1)  
      };

      await updateReport(reportId, payload);
      
      setGeneratedContent(prev => ({ 
        ...prev, 
        report: { 
          ...(prev.report || {}), 
          _id: reportId, 
          status: 'published', 
          isPublic: true,
          title: generatedContent.title,
          content: generatedContent.content,
          hashtags: generatedContent.hashtags,
          reportImage: selectedMedia[0] || null,
          galleryImages: selectedMedia.slice(1)
        } 
      }));
      
      toast.success('Article is now live in Public Reports!', { id: toastId });
      if (onDone) onDone();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to publish report';
      toast.error(msg, { id: toastId });
      console.error('[PUBLISH ERROR]', err);
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="w-full">
      <div className="mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-2">
          📰 Advanced Article Generator
        </h2>
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
          Curate an aesthetic, newspaper-style report of your event's best moments.
        </p>
      </div>

      <div className="flex gap-2 mb-8">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={`flex-1 h-2 rounded-full transition-colors ${
              s <= step ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-700'
            }`}
          />
        ))}
      </div>

      {step === 1 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-indigo-600 shrink-0" />
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                Step 1: Select Photos (Max {MAX_IMAGES})
              </h3>
            </div>
          </div>

          {loadingCatalog ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
          ) : mediaCatalog.length === 0 ? (
             <div className="text-center py-12 px-4">
               <ImageIcon className="h-10 w-10 sm:h-12 sm:w-12 text-gray-300 mx-auto mb-4" />
               <p className="text-gray-600 dark:text-gray-400 mb-4 font-medium text-sm sm:text-base">No photos available for report</p>
               <button onClick={fetchMediaCatalog} className="mt-4 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition w-full sm:w-auto">Refresh & Try Again</button>
             </div>
          ) : (
            <>
              <div className="mb-4 flex flex-wrap justify-between items-center gap-2">
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                  Selected: {selectedMedia.length} / {Math.min(mediaCatalog.length, MAX_IMAGES)}
                </p>
                <button onClick={selectAllMedia} className="text-xs sm:text-sm text-indigo-600 hover:underline font-medium">
                  {selectedMedia.length === Math.min(mediaCatalog.length, MAX_IMAGES) ? 'Deselect All' : 'Select Maximum'}
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 mb-6 max-h-[50vh] sm:max-h-96 overflow-y-auto p-1">
                {mediaCatalog.map((media, idx) => (
                  <div key={idx} onClick={() => toggleMediaSelection(media.url)} className={`relative cursor-pointer group ${!selectedMedia.includes(media.url) && selectedMedia.length >= MAX_IMAGES ? 'opacity-40 grayscale cursor-not-allowed' : ''}`}>
                    <img src={media.url} alt="Event Media" className={`w-full h-24 sm:h-28 object-cover rounded-lg transition-all ${selectedMedia.includes(media.url) ? 'ring-2 ring-indigo-600 opacity-100' : 'opacity-70 group-hover:opacity-100'}`} />
                    {selectedMedia.includes(media.url) && (
                      <div className="absolute inset-0 bg-indigo-600 bg-opacity-20 rounded-lg flex items-center justify-center">
                        <Check className="h-6 w-6 text-white" />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex gap-3 mt-4">
                <Button onClick={() => setStep(2)} disabled={selectedMedia.length === 0} className="w-full">
                  Continue to Settings
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-4">
            <Settings className="h-5 w-5 text-indigo-600 shrink-0" />
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">Step 2: Editorial Settings</h3>
          </div>
          
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-900 dark:text-white mb-3">📱 Target Platform</label>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
              {platforms.map(p => (
                <button key={p.value} onClick={() => setPlatform(p.value)} className={`p-2 sm:p-3 rounded-lg text-xs sm:text-sm font-medium transition-all flex flex-col items-center sm:items-start text-center sm:text-left ${platform === p.value ? 'bg-indigo-600 text-white ring-2 ring-indigo-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600'}`}>
                  <div className="mb-1">{p.label}</div>
                  <div className="text-[10px] sm:text-xs opacity-70 leading-tight">{p.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <label className="flex items-start sm:items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={useCustomPrompt} onChange={e => setUseCustomPrompt(e.target.checked)} className="w-4 h-4 mt-0.5 sm:mt-0 text-indigo-600 rounded shrink-0" />
              <span className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white leading-snug">Use custom prompt instead of default 1000+ word content</span>
            </label>
          </div>

          {useCustomPrompt && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">✍️ Your Custom Prompt</label>
              <textarea value={customPrompt} onChange={e => setCustomPrompt(e.target.value)} placeholder="Describe what kind of content you want..." className="w-full px-3 sm:px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent" rows={4} />
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 mt-8">
            <button onClick={() => setStep(1)} className="w-full sm:w-1/3 px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition">Back</button>
            <Button onClick={handleGenerate} loading={generating} className="w-full sm:w-2/3 flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-800 text-white py-2.5">
              <Newspaper className="h-4 w-4" />
              Draft Article
            </Button>
          </div>
        </div>
      )}

      {step === 3 && generatedContent && (
        <div className="bg-[#FAF9F6] dark:bg-gray-900 rounded-lg border border-gray-300 dark:border-gray-700 p-4 sm:p-6 md:p-8 shadow-2xl">
          
          <div className="border-b-4 border-double border-gray-900 dark:border-gray-400 pb-4 sm:pb-6 mb-6 text-center">
            <p className="text-[10px] sm:text-xs tracking-[0.2em] text-gray-500 uppercase mb-3 sm:mb-4">PlannEx Editorial</p>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-serif font-black text-gray-900 dark:text-white uppercase leading-tight mb-3 sm:mb-4">
              {generatedContent.title}
            </h1>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 font-serif italic">
              By Admin | {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>

          {selectedMedia.length > 0 && (
            <div className="mb-6 sm:mb-8">
              <img 
                src={selectedMedia[0]} 
                alt="Event Cover" 
                className="w-full h-48 sm:h-72 md:h-96 object-cover rounded shadow-lg"
              />
              <p className="text-right text-[10px] sm:text-xs text-gray-500 italic mt-2 border-b border-gray-300 dark:border-gray-700 pb-3 sm:pb-4">
                Exclusive coverage from the event floor.
              </p>
            </div>
          )}

          <div className="columns-1 md:columns-2 gap-6 sm:gap-8 text-gray-800 dark:text-gray-200 font-serif leading-relaxed mb-8 sm:mb-10 text-justify text-sm sm:text-base">
            <p className="whitespace-pre-wrap first-letter:text-5xl sm:first-letter:text-6xl first-letter:font-black first-letter:float-left first-letter:mr-2 sm:first-letter:mr-3 first-letter:mt-1 sm:first-letter:mt-2">
              {/* 🚀 Pass the raw content through the parser, then through the formatter! */}
              {renderFormattedText(formatPreviewContent(generatedContent.content))}
            </p>
          </div>

          {selectedMedia.length > 1 && (
            <div className="mb-8 sm:mb-10">
              <h4 className="text-center font-serif font-bold uppercase tracking-widest text-gray-500 mb-3 sm:mb-4 text-xs sm:text-sm">Event Gallery</h4>
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                {selectedMedia.slice(1).map((img, idx) => (
                  <img key={idx} src={img} className="w-full h-28 sm:h-40 object-cover rounded shadow-md grayscale hover:grayscale-0 transition-all duration-500" alt={`Event detail ${idx + 1}`} />
                ))}
              </div>
            </div>
          )}

          {Array.isArray(generatedContent.hashtags) && generatedContent.hashtags.length > 0 && (
             <div className="border-t border-gray-300 dark:border-gray-700 pt-4 mb-6 sm:mb-8 text-center">
                <p className="text-[10px] sm:text-xs font-serif text-gray-500 space-x-2 sm:space-x-3 flex flex-wrap justify-center gap-y-2">
                  {generatedContent.hashtags.map((tag, idx) => (
                    <span key={idx}>#{tag.replace('#', '')}</span>
                  ))}
                </p>
             </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mt-6 sm:mt-8 pt-5 sm:pt-6 border-t-2 border-gray-900 dark:border-gray-500">
            <button
              onClick={() => {
                setStep(2);
                setGeneratedContent(null);
              }}
              className="w-full sm:w-1/3 px-4 py-2.5 sm:py-3 rounded text-gray-900 dark:text-white font-serif text-xs sm:text-sm font-bold uppercase tracking-wider border-2 border-gray-900 dark:border-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
            >
              ← Revise
            </button>
            
            <div className="w-full sm:w-2/3">
              <button
                onClick={() => handlePublish(generatedContent.report?._id, () => {
                  if (onReportGenerated) onReportGenerated(generatedContent);
                  setStep(1);
                  setSelectedMedia([]);
                  setGeneratedContent(null);
                })}
                disabled={publishing || !generatedContent.report?._id}
                className={`w-full px-4 py-2.5 sm:py-3 rounded ${
                  publishing 
                    ? 'bg-gray-600 cursor-not-allowed' 
                    : 'bg-gray-900 hover:bg-black dark:bg-white dark:text-black dark:hover:bg-gray-200 cursor-pointer'
                } text-white font-serif text-xs sm:text-sm font-bold uppercase tracking-widest transition flex items-center justify-center gap-2`}
              >
                {publishing ? (
                  <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
                ) : generatedContent.report?.isPublic ? (
                  <Check className="h-4 w-4 sm:h-5 sm:w-5" />
                ) : (
                  <Newspaper className="h-4 w-4 sm:h-5 sm:w-5" />
                )}
                {generatedContent.report?.isPublic ? 'Update Live Article' : 'Publish Article'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}