const Event = require('../models/Event');
const Report = require('../models/Report');
const Task = require('../models/Task');
const Team = require('../models/Team');
const { PHASE_ORDER, EVENT_PHASES, TASK_PRIORITIES, TASK_STATUSES } = require('../utils/constants');
const { notifyPhaseChanged, notifyEventFinalized } = require('../services/notificationService');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { generateWithRetry } = require('../services/aiService');

// ==========================================
//  🛡️ HELPER: Verify Management Access 
// ==========================================
const verifyTeamAdmin = async (req, teamId) => {
  if (req.user.role === 'super_admin') return true;

  const targetTeamId = teamId && teamId._id ? teamId._id.toString() : teamId.toString();
  const userTeamId = req.user.team && req.user.team._id ? req.user.team._id.toString() : req.user.team?.toString();

  if (!userTeamId || userTeamId !== targetTeamId) return false;

  // Both Admins and Sub-Admins pass this general check for routing tasks/phases
  if (req.user.role === 'admin' || req.user.role === 'sub-admin') return true;

  const team = await Team.findById(targetTeamId);
  if (!team || !team.members) return false;
  
  const member = team.members.find(m => m.user.toString() === req.user._id.toString());
  return member ? member.accessLevel === 'admin' : false;
};

// ==========================================
// GET /api/events
// ==========================================
exports.getAllEvents = async (req, res, next) => {
  try {
    const { phase, page = 1, limit = 20 } = req.query;
    let filter = {};

    if (req.user.role !== 'super_admin') {
      if (!req.user.team) {
        return res.status(403).json({ success: false, message: "No organization associated with this account" });
      }
      filter.team = req.user.team;
    }

    if (phase) filter.phase = phase;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const events = await Event.find(filter)
      .populate('team', 'name')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Event.countDocuments(filter);

    res.json({
      success: true,
      data: {
        events,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalItems: total,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// GET /api/events/public
// ==========================================
exports.getPublicEvents = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const events = await Event.find({ isPublic: true, isFinalized: true })
      .populate('team', 'name logo') 
      .select('title description team media budget createdAt') 
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const eventIds = events.map(e => e._id);
    const reports = await Report.find({
      event: { $in: eventIds },
      isPublic: true,
      status: 'published'
    });

    const eventsWithReports = events.map((event) => {
      const report = reports.find((r) => r.event.toString() === event._id.toString());

      let images = [];
      if (report && report.galleryImages && report.galleryImages.length > 0) {
        images = report.galleryImages;
      } else if (event.media && event.media.length > 0) {
        images = event.media.map(m => m.url);
      }

      return {
        ...event.toObject(),
        report: report ? report.content : '',
        images
      };
    });

    const total = await Event.countDocuments({ isPublic: true, isFinalized: true });

    res.json({
      success: true,
      data: {
        events: eventsWithReports,
        pagination: { page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)), totalItems: total },
      },
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// GET /api/events/:id
// ==========================================
exports.getEventById = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('team', 'name description logo') 
      .populate('createdBy', 'name email');

    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });

    if (req.user.role !== 'super_admin' && event.team._id.toString() !== req.user.team?.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied to this organization\'s event' });
    }

    const tasks = await Task.find({ event: event._id })
      .populate('assignedTo', 'name email')
      .populate('assignedBy', 'name email')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: { event, tasks } });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// GET /api/events/:id/report
// ==========================================
exports.getEventReport = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });

    const report = await Report.findOne({ event: event._id });
    if (!report) return res.status(404).json({ success: false, message: 'Report not found for this event' });

    res.json({ success: true, data: { report } });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// POST /api/events
// ==========================================
exports.createEvent = async (req, res, next) => {
  try {
    const isAdmin = await verifyTeamAdmin(req, req.user.team);
    if (!isAdmin) {
      return res.status(403).json({ success: false, message: 'Only team administrators can create events.' });
    }

    const { title, description, budget } = req.body;

    const event = await Event.create({
      title,
      description,
      team: req.user.team, 
      createdBy: req.user._id,
      budget: budget || 0,
    });

    await event.populate('team', 'name'); 
    await event.populate('createdBy', 'name email');

    res.status(201).json({ success: true, data: { event } });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// PUT /api/events/:id
// ==========================================
exports.updateEvent = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });

    const isAdmin = await verifyTeamAdmin(req, event.team);
    if (!isAdmin) return res.status(403).json({ success: false, message: 'Only team administrators can edit events.' });
    
    if (event.isFinalized) return res.status(400).json({ success: false, message: 'Cannot edit a finalized event' });

    const { title, description, budget } = req.body;
    
    if (title) event.title = title;
    if (description) event.description = description;
    if (budget !== undefined) event.budget = budget;

    await event.save();
    await event.populate('team', 'name'); 
    await event.populate('createdBy', 'name email');

    res.json({ success: true, data: { event } });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// DELETE /api/events/:id
// ==========================================
exports.deleteEvent = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });

    const isAdmin = await verifyTeamAdmin(req, event.team);
    if (!isAdmin) return res.status(403).json({ success: false, message: 'Only team administrators can delete events.' });

    console.log(`[DELETE EVENT] Deleting event: ${event.title} (${event._id})`);
    
    // Delete all associated tasks
    const tasksDeleted = await Task.deleteMany({ event: event._id });
    console.log(`[DELETE EVENT] Deleted ${tasksDeleted.deletedCount} associated tasks`);
    
    // Delete associated reports
    const reportsDeleted = await Report.deleteMany({ event: event._id });
    console.log(`[DELETE EVENT] Deleted ${reportsDeleted.deletedCount} associated reports`);
    
    // Delete the event
    await Event.findByIdAndDelete(req.params.id);
    console.log(`[DELETE EVENT] Event deleted successfully`);

    res.json({ 
      success: true, 
      message: 'Event, tasks, and reports deleted successfully',
      data: {
        tasksDeleted: tasksDeleted.deletedCount,
        reportsDeleted: reportsDeleted.deletedCount
      }
    });
  } catch (error) {
    console.error(`[DELETE EVENT ERROR]`, error.message);
    next(error);
  }
};

// ==========================================
// PATCH /api/events/:id/phase
// ==========================================
exports.changePhase = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });

    const isAdmin = await verifyTeamAdmin(req, event.team);
    if (!isAdmin) return res.status(403).json({ success: false, message: 'Only team administrators can change event phases.' });

    const { phase: newPhase } = req.body;
    if (event.isFinalized) return res.status(400).json({ success: false, message: 'Event is already finalized' });

    const currentIndex = PHASE_ORDER.indexOf(event.phase);
    const newIndex = PHASE_ORDER.indexOf(newPhase);

    if (newIndex !== currentIndex + 1) {
      return res.status(400).json({ success: false, message: `Cannot transition from ${event.phase} to ${newPhase}. Phases must progress linearly.` });
    }

    if (newPhase === EVENT_PHASES.POST) {
      const unapprovedCritical = await Task.countDocuments({
        event: event._id,
        priority: TASK_PRIORITIES.CRITICAL,
        status: { $ne: TASK_STATUSES.APPROVED },
      });

      if (unapprovedCritical > 0) {
        return res.status(400).json({ success: false, message: `Cannot move to post-event: ${unapprovedCritical} critical task(s) not yet approved.` });
      }
    }

    event.phase = newPhase;
    await event.save();

    notifyPhaseChanged(event).catch(console.error);

    await event.populate('team', 'name'); 
    res.json({ success: true, message: `Phase changed to ${newPhase}`, data: { event } });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// PATCH /api/events/:id/finalize
// ==========================================
exports.finalizeEvent = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });

    const isAdmin = await verifyTeamAdmin(req, event.team);
    if (!isAdmin) return res.status(403).json({ success: false, message: 'Unauthorized access.' });

    // 🚀 SECURITY BLOCK: Sub-Admins cannot finalize events
    if (req.user.role === 'sub-admin') {
      return res.status(403).json({ success: false, message: 'Sub-Admins cannot finalize events. Only Full Admins have this permission.' });
    }

    if (event.phase !== EVENT_PHASES.POST) return res.status(400).json({ success: false, message: 'Event must be in post-event phase to finalize' });
    if (event.isFinalized) return res.status(400).json({ success: false, message: 'Event is already finalized' });

    event.isFinalized = true;
    event.isPublic = true;
    event.reportStatus = 'published';
    await event.save();

    const report = await Report.findOne({ event: event._id });
    if (report) {
      report.isPublic = true;
      report.status = 'published';
      await report.save();
    }

    notifyEventFinalized(event).catch(console.error);

    await event.populate('team', 'name'); 
    res.json({ success: true, message: 'Event finalized and published', data: { event } });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// POST /api/events/:id/media
// ==========================================
exports.addMedia = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
    if (event.isFinalized) return res.status(400).json({ success: false, message: 'Cannot edit a finalized event' });

    const { url, fileType, publicId } = req.body;
    event.media.push({ url, fileType, publicId });
    await event.save();

    res.json({ success: true, data: { event } });
  } catch (error) {
    next(error);
  }
};

/// ==========================================
// POST /api/events/:id/generate-report (BULLETPROOF)
// ==========================================
exports.generateEventReport = async (req, res, next) => {
  try {
    // 1. Check for API Key before doing anything
    if (!process.env.GEMINI_API_KEY) {
      console.error("CRITICAL: GEMINI_API_KEY is missing from backend .env file");
      return res.status(500).json({ success: false, message: 'Server misconfiguration: AI key missing.' });
    }

    const event = await Event.findById(req.params.id).populate('team', 'name'); 
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });

    const isAdmin = await verifyTeamAdmin(req, event.team._id);
    if (!isAdmin) return res.status(403).json({ success: false, message: 'Unauthorized access.' });

    if (req.user.role === 'sub-admin') {
      return res.status(403).json({ success: false, message: 'Sub-Admins cannot generate AI reports. Only Full Admins have this permission.' });
    }

    if (!event.isFinalized) {
      return res.status(400).json({ success: false, message: 'The event must be officially Finalized before the AI can generate the public report.' });
    }

    const tasks = await Task.find({ 
      event: event._id, 
      status: TASK_STATUSES.APPROVED 
    }).populate('assignedTo', 'name');

    if (tasks.length === 0) {
      return res.status(400).json({ success: false, message: 'No approved tasks found. Volunteers must submit proof of work before AI can generate a report.' });
    }

    // 2. Safely extract images and task details
    const allImages = [];
    const taskDetails = tasks.map(t => {
      if (t.submissions && Array.isArray(t.submissions)) {
        t.submissions.forEach(sub => {
          if (sub.media && Array.isArray(sub.media)) {
            sub.media.forEach(m => { if (m.url) allImages.push(m.url); });
          }
        });
      }
      const volunteerName = t.assignedTo ? t.assignedTo.name.split(' ')[0] : 'Volunteer';
      return `- ${t.title} (Completed by: ${volunteerName})`;
    }).join('\n');

    const prompt = `
      Write a professional PR report for the event: "${event.title}".
      Description: ${event.description}
      Organization: ${event.team.name}
      Highlights:
      ${taskDetails}

      Instructions:
      1. Keep a celebratory and engaging tone.
      2. Return ONLY a pure JSON object. Do not include markdown formatting or backticks.
      {
        "headline": "A news-style headline",
        "leadParagraph": "A short engaging summary",
        "teamHighlights": [{ "role": "Task Name", "description": "1 sentence recap" }]
      }
    `;

    // 3 & 4. Generate Content using the Retry Service
    // 🚀 FIXED: Calling the helper function instead of initializing Gemini directly
    const result = await generateWithRetry(prompt);
    
    // 5. Fault-Tolerant JSON Parsing
    let generatedJSON;
    try {
      let rawText = result.response.text();
      // Strip markdown backticks if Gemini accidentally includes them
      rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
      generatedJSON = JSON.parse(rawText);
    } catch (parseError) {
      console.error('JSON Parse Error:', result.response.text());
      return res.status(500).json({ success: false, message: 'AI generated invalid data format. Please try again.' });
    }
    
    // 6. Database Save
    let report = await Report.findOne({ event: event._id });
    const reportImageFallback = allImages.length > 0 ? allImages[0] : (event.media?.[0]?.url || "https://images.unsplash.com/photo-1540575467063-178a50c2df87");

    if (!report) {
      report = new Report({
        event: event._id,
        team: event.team._id, 
        content: generatedJSON, 
        createdBy: req.user._id,
        status: 'published',
        isPublic: true,
        reportImage: reportImageFallback,
        galleryImages: allImages
      });
    } else {
      report.content = generatedJSON; 
      report.status = 'published';
      report.isPublic = true;
      report.reportImage = reportImageFallback;
      report.galleryImages = allImages;
    }

    await report.save(); 

    res.json({ success: true, message: 'AI Report created successfully!', data: { report } });
    
  } catch (error) {
    // 7. Catch everything else and print it clearly
    console.error('FATAL AI ROUTE ERROR:', error);
    
    // Provide user-friendly error messages
    let statusCode = 500;
    let userMessage = 'Failed to generate report';

    if (error.status === 503 || error.message?.includes('503') || error.message?.includes('Service Unavailable')) {
      statusCode = 503;
      userMessage = 'AI service is currently overloaded. Please try again in a minute or two.';
    } else if (error.status === 429 || error.message?.includes('429') || error.message?.includes('Rate limit')) {
      statusCode = 429;
      userMessage = 'Too many requests to AI service. Please wait a few moments and try again.';
    } else if (error.message?.includes('invalid') || error.message?.includes('Invalid')) {
      statusCode = 400;
      userMessage = 'Generated content format was invalid. Please try again.';
    } else if (error.message?.includes('No approved tasks')) {
      statusCode = 400;
      userMessage = error.message;
    }

    res.status(statusCode).json({ 
      success: false, 
      message: userMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ==========================================
// GET /api/events/:id/media-catalog
// ==========================================
// Admin can browse all media from approved tasks for report generation
exports.getMediaCatalog = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id).populate('team', 'name');
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });

    const isAdmin = await verifyTeamAdmin(req, event.team._id);
    if (!isAdmin) return res.status(403).json({ success: false, message: 'Unauthorized access.' });

    console.log(`[MEDIA CATALOG] Fetching media for event: ${event.title} (${event._id})`);

    // Get all approved tasks with their submissions
    const tasks = await Task.find({
      event: event._id,
      status: TASK_STATUSES.APPROVED
    })
      .populate('assignedTo', 'name email')
      .lean(); // Use lean() for better performance

    console.log(`[MEDIA CATALOG] Found ${tasks.length} approved tasks`);

    // Extract all media with metadata
    const mediaItems = [];
    tasks.forEach(task => {
      if (task.submissions && Array.isArray(task.submissions)) {
        console.log(`[MEDIA CATALOG] Task "${task.title}" has ${task.submissions.length} submissions`);
        
        task.submissions.forEach((submission, subIdx) => {
          if (submission.media && Array.isArray(submission.media)) {
            console.log(`[MEDIA CATALOG] Submission ${subIdx} has ${submission.media.length} media items`);
            
            submission.media.forEach((media, mediaIdx) => {
              if (media.url) {
                mediaItems.push({
                  url: media.url,
                  fileType: media.fileType,
                  publicId: media.publicId,
                  uploadedBy: task.assignedTo?._id,
                  uploadedByName: task.assignedTo?.name || 'Unknown',
                  taskTitle: task.title,
                  uploadedAt: submission.uploadedAt,
                  notes: submission.notes || ''
                });
              }
            });
          }
        });
      }
    });

    console.log(`[MEDIA CATALOG] Total media items extracted: ${mediaItems.length}`);

    res.json({
      success: true,
      data: {
        mediaCatalog: mediaItems,
        total: mediaItems.length,
        approvedTasksCount: tasks.length,
        eventId: event._id,
        eventTitle: event.title
      }
    });
  } catch (error) {
    console.error(`[MEDIA CATALOG ERROR]`, error);
    next(error);
  }
};

// ==========================================
// POST /api/events/:id/generate-social-content
// ==========================================
// Generate social media optimized content from selected photos and optional custom prompt
exports.generateSocialMediaContent = async (req, res, next) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ success: false, message: 'Server misconfiguration: AI key missing.' });
    }

    const event = await Event.findById(req.params.id).populate('team', 'name');
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });

    const isAdmin = await verifyTeamAdmin(req, event.team._id);
    if (!isAdmin) return res.status(403).json({ success: false, message: 'Unauthorized access.' });

    if (req.user.role === 'sub-admin') {
      return res.status(403).json({ success: false, message: 'Sub-Admins cannot generate social content. Only Full Admins have this permission.' });
    }

    const { selectedMedia = [], customPrompt = null, platform = 'general', publish = false } = req.body;

    if (!selectedMedia || selectedMedia.length === 0) {
      return res.status(400).json({ success: false, message: 'Please select at least one photo for the report.' });
    }

    // Get task details for context
    const tasks = await Task.find({
      event: event._id,
      status: TASK_STATUSES.APPROVED
    }).populate('assignedTo', 'name');

    const taskSummary = tasks.map(t => {
      const volunteerName = t.assignedTo ? t.assignedTo.name : 'Volunteer';
      return `${t.title} (${volunteerName})`;
    }).join(', ');

    // Create prompt based on custom input or default
    let prompt;
    const platformGuides = {
      instagram: 'optimized for Instagram with hashtags and emojis',
      facebook: 'suitable for Facebook with a professional yet friendly tone',
      linkedin: 'professional and corporate-focused',
      twitter: 'concise and impactful under 280 characters per tweet (multiple tweets)',
      general: 'suitable for general social media platforms'
    };

    if (customPrompt) {
      // Use custom prompt but enforce word count requirement
      prompt = `
        Event: "${event.title}"
        Organization: ${event.team.name}
        Description: ${event.description}
        Activities: ${taskSummary}
        Selected Photos: ${selectedMedia.length} images
        
        Custom Requirement: ${customPrompt}
        
        IMPORTANT: The content must be at least 1000 words.
        Write engaging, social media-ready content that highlights the event and selected photos.
        Format the output as JSON:
        {
          "title": "Catchy headline",
          "content": "Full content here (minimum 1000 words)",
          "hashtags": ["tag1", "tag2", "tag3"],
          "wordCount": number,
          "cta": "Call to action"
        }
      `;
    } else {
      // Default: Generate 1000+ word social media content
      prompt = `
        You are a professional social media content writer. Create engaging content ${platformGuides[platform]}.
        
        Event: "${event.title}"
        Organization: ${event.team.name}
        Description: ${event.description}
        Key Activities: ${taskSummary}
        Number of Photos: ${selectedMedia.length}
        
        Requirements:
        1. Content must be EXACTLY 1000-1500 words
        2. Write in an engaging, celebratory tone
        3. Make it suitable for social media posting
        4. Include multiple paragraphs with clear sections
        5. Highlight team efforts and volunteer contributions
        6. End with an inspiring call-to-action
        7. Platform: ${platform}
        
        Format the output as valid JSON (no markdown):
        {
          "title": "Catchy, engaging headline",
          "content": "Full content here (1000-1500 words, well-structured with multiple paragraphs)",
          "hashtags": ["relevant", "hashtags", "for", platform],
          "wordCount": number,
          "platform": "${platform}",
          "cta": "Inspirational call to action"
        }
      `;
    }

    // Generate content using Gemini
    let generatedContent = null;
    try {
      const result = await generateWithRetry(prompt);
      try {
        let rawText = result.response.text();
        rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
        generatedContent = JSON.parse(rawText);

        // Validate word count
        const wordCount = generatedContent.content.split(/\s+/).length;
        if (wordCount < 1000 && !customPrompt) {
          console.warn(`Generated content has only ${wordCount} words, requesting regeneration`);
          return res.status(400).json({
            success: false,
            message: `Generated content has only ${wordCount} words. Minimum 1000 words required. Please try again.`
          });
        }
        generatedContent.wordCount = wordCount;
      } catch (parseError) {
        console.error('Content Parse Error:', (result && result.response && result.response.text) ? result.response.text() : parseError.message);
        // fallthrough to handle as generation failure
        generatedContent = null;
      }
    } catch (aiError) {
      // AI service failed (rate limit / 503 etc.) - handle gracefully below
      console.error('AI generation error:', aiError.message || aiError);
      generatedContent = null;
    }

    // Save or update report with social media content
    let report = await Report.findOne({ event: event._id });

    const reportStatus = publish ? 'published' : 'draft';
    const reportIsPublic = !!publish;
    const reportImage = selectedMedia && selectedMedia.length > 0 ? selectedMedia[0] : (event.media?.[0]?.url || '');

    if (!report) {
      report = new Report({
        event: event._id,
        team: event.team._id,
        createdBy: req.user._id,
        selectedMedia: selectedMedia.map(url => ({ url })),
        customPrompt,
        platform,
        socialMediaContent: generatedContent ? generatedContent.content : null,
        wordCount: generatedContent ? generatedContent.wordCount : 0,
        reportImage: reportImage,
        status: generatedContent ? reportStatus : 'draft',
        isPublic: generatedContent ? reportIsPublic : false
      });
    } else {
      report.selectedMedia = selectedMedia.map(url => ({ url }));
      report.customPrompt = customPrompt;
      report.platform = platform;
      report.socialMediaContent = generatedContent ? generatedContent.content : report.socialMediaContent;
      report.wordCount = generatedContent ? generatedContent.wordCount : report.wordCount;
      report.reportImage = reportImage || report.reportImage;
      report.status = generatedContent ? reportStatus : report.status;
      report.isPublic = generatedContent ? reportIsPublic : report.isPublic;
    }

    await report.save();

    // If publishing publicly, optionally update event metadata (non-destructive)
    if (publish) {
      try {
        event.reportStatus = 'published';
        await event.save();
      } catch (e) {
        console.warn('[SOCIAL CONTENT] Failed to update event metadata for publish:', e.message);
      }
    }

    res.json({
      success: true,
      message: 'Social media content generated successfully!',
      data: {
        report,
        generatedContent: {
          ...generatedContent,
          reportId: report._id
        }
      }
    });
  } catch (error) {
    console.error('Social Content Generation Error:', error);
    
    // Provide user-friendly error messages
    let statusCode = 500;
    let userMessage = 'Failed to generate social media content';

    if (error.status === 503 || error.message?.includes('503') || error.message?.includes('Service Unavailable')) {
      statusCode = 503;
      userMessage = 'AI service is currently overloaded. Please try again in a minute or two.';
    } else if (error.status === 429 || error.message?.includes('429') || error.message?.includes('Rate limit')) {
      statusCode = 429;
      userMessage = 'Too many requests to AI service. Please wait a few moments and try again.';
    } else if (error.message?.includes('invalid') || error.message?.includes('Invalid')) {
      statusCode = 400;
      userMessage = 'Generated content format was invalid. Please try again.';
    }

    res.status(statusCode).json({ 
      success: false, 
      message: userMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};