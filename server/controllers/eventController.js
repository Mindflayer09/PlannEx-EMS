const Event = require('../models/Event');
const Task = require('../models/Task');
const { PHASE_ORDER, EVENT_PHASES, TASK_PRIORITIES, TASK_STATUSES } = require('../utils/constants');
const { notifyPhaseChanged, notifyEventFinalized } = require('../services/notificationService');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// GET /api/events
exports.getAllEvents = async (req, res, next) => {
  try {
    const { phase, page = 1, limit = 20 } = req.query;
    const filter = { club: req.user.club };

    if (phase) filter.phase = phase;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const events = await Event.find(filter)
      .populate('club', 'name')
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

// GET /api/events/public
exports.getPublicEvents = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Only fetch events where the report is officially published
    const events = await Event.find({ isPublic: true, reportStatus: 'published' })
      .populate('club', 'name logo')
      .select('title description club media report budget createdAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Event.countDocuments({ isPublic: true, reportStatus: 'published' });

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

// GET /api/events/:id
exports.getEventById = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('club', 'name description logo')
      .populate('createdBy', 'name email');

    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
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

// POST /api/events
exports.createEvent = async (req, res, next) => {
  try {
    const { title, description, budget } = req.body;

    const event = await Event.create({
      title,
      description,
      club: req.user.club,
      createdBy: req.user._id,
      budget: budget || 0,
    });

    await event.populate('club', 'name');
    await event.populate('createdBy', 'name email');

    res.status(201).json({ success: true, data: { event } });
  } catch (error) {
    next(error);
  }
};

// PUT /api/events/:id
exports.updateEvent = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    if (event.isFinalized) {
      return res.status(400).json({ success: false, message: 'Cannot edit a finalized event' });
    }

    // Added aiDraft and reportStatus to allow saving edits before publishing
    const { title, description, report, budget, aiDraft, reportStatus } = req.body;
    
    if (title) event.title = title;
    if (description) event.description = description;
    if (report !== undefined) event.report = report;
    if (aiDraft !== undefined) event.aiDraft = aiDraft;
    if (reportStatus !== undefined) event.reportStatus = reportStatus;
    if (budget !== undefined) event.budget = budget;

    await event.save();
    await event.populate('club', 'name');
    await event.populate('createdBy', 'name email');

    res.json({ success: true, data: { event } });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/events/:id
exports.deleteEvent = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    // Delete all associated tasks
    await Task.deleteMany({ event: event._id });
    await Event.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: 'Event and associated tasks deleted' });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/events/:id/phase
exports.changePhase = async (req, res, next) => {
  try {
    const { phase: newPhase } = req.body;
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    if (event.isFinalized) {
      return res.status(400).json({ success: false, message: 'Event is already finalized' });
    }

    // Validate linear phase progression
    const currentIndex = PHASE_ORDER.indexOf(event.phase);
    const newIndex = PHASE_ORDER.indexOf(newPhase);

    if (newIndex !== currentIndex + 1) {
      return res.status(400).json({
        success: false,
        message: `Cannot transition from ${event.phase} to ${newPhase}. Phases must progress linearly.`,
      });
    }

    // If transitioning to post-event, check all critical tasks are approved
    if (newPhase === EVENT_PHASES.POST) {
      const unapprovedCritical = await Task.countDocuments({
        event: event._id,
        priority: TASK_PRIORITIES.CRITICAL,
        status: { $ne: TASK_STATUSES.APPROVED },
      });

      if (unapprovedCritical > 0) {
        return res.status(400).json({
          success: false,
          message: `Cannot move to post-event: ${unapprovedCritical} critical task(s) not yet approved.`,
        });
      }
    }

    event.phase = newPhase;
    await event.save();

    notifyPhaseChanged(event).catch(console.error);

    await event.populate('club', 'name');
    res.json({ success: true, message: `Phase changed to ${newPhase}`, data: { event } });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/events/:id/finalize
exports.finalizeEvent = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    if (event.phase !== EVENT_PHASES.POST) {
      return res.status(400).json({
        success: false,
        message: 'Event must be in post-event phase to finalize',
      });
    }

    if (event.isFinalized) {
      return res.status(400).json({ success: false, message: 'Event is already finalized' });
    }

    event.isFinalized = true;
    event.isPublic = true;
    event.reportStatus = 'published'; // Publish the report automatically when finalizing
    
    await event.save();

    notifyEventFinalized(event).catch(console.error);

    await event.populate('club', 'name');
    res.json({ success: true, message: 'Event finalized and published', data: { event } });
  } catch (error) {
    next(error);
  }
};

// POST /api/events/:id/media
exports.addMedia = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    if (event.isFinalized) {
      return res.status(400).json({ success: false, message: 'Cannot edit a finalized event' });
    }

    const { url, fileType, publicId } = req.body;
    event.media.push({ url, fileType, publicId });
    await event.save();

    res.json({ success: true, data: { event } });
  } catch (error) {
    next(error);
  }
};

// POST /api/events/:id/generate-report (NEW AI ROUTE)
exports.generateEventReport = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id).populate('club', 'name');
    
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    // 1. Fetch Approved Tasks for Context
    const tasks = await Task.find({ 
      event: event._id, 
      status: TASK_STATUSES.APPROVED 
    }).populate('assignedTo', 'name');

    // Extract first names only to protect volunteer privacy
    const taskSummaries = tasks.map(t => {
      const volunteerName = t.assignedTo ? t.assignedTo.name.split(' ')[0] : 'A volunteer';
      return `- ${t.title} (Completed by: ${volunteerName})`;
    }).join('\n');

    // 2. Construct the Prompt
    const prompt = `
      You are an expert Public Relations Officer for the club "${event.club.name}".
      Your job is to write a professional, engaging, and polished post-event report for the general public.

      Event Data:
      - Title: ${event.title}
      - Description: ${event.description}
      - Budget Utilized: $${event.budget}
      
      Key Accomplishments (Tasks Completed):
      ${taskSummaries || 'Routine event setup and execution.'}

      Rules:
      1. Use a formal, celebratory, and community-focused tone.
      2. NEVER invent or hallucinate metrics, numbers, names, or events. Only use the provided data.
      3. DO NOT include sensitive information or internal club disputes.
      4. Format the output in clean Markdown with headings (##), bullet points, and short paragraphs.
      5. End with a concluding sentence thanking the community.
    `;

    // 3. Initialize Gemini
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); 

    const result = await model.generateContent(prompt);
    const generatedDraft = result.response.text();

    // 4. Save to Database
    event.aiDraft = generatedDraft;
    event.reportStatus = 'draft';
    
    // Auto-populate the final report field with the draft so the admin has a starting point to edit
    event.report = generatedDraft; 
    
    await event.save();

    res.json({ 
      success: true, 
      message: 'AI Draft generated successfully', 
      data: { aiDraft: generatedDraft, report: generatedDraft, reportStatus: 'draft' } 
    });
    
  } catch (error) {
    console.error('AI Generation Error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate AI report' });
  }
};