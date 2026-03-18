const Event = require('../models/Event');
const Report = require('../models/Report');
const Task = require('../models/Task');
const Team = require('../models/Team');
const { PHASE_ORDER, EVENT_PHASES, TASK_PRIORITIES, TASK_STATUSES } = require('../utils/constants');
const { notifyPhaseChanged, notifyEventFinalized } = require('../services/notificationService');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// ==========================================
//  🛡️ HELPER: Verify Team Admin Access
// ==========================================
// Checks if the user is a Super Admin OR holds an 'admin' accessLevel in the target team
const verifyTeamAdmin = async (req, teamId) => {
  // 1. Super Admin Bypass
  if (req.user.role === 'super_admin') return true;

  // 2. Prevent cross-tenant modification
  if (!req.user.team || req.user.team.toString() !== teamId.toString()) return false;

  // 3. Verify Team Admin status in DB
  const team = await Team.findById(teamId);
  if (!team) return false;
  
  const member = team.members.find(m => m.user.toString() === req.user._id.toString());
  return member && (member.accessLevel === 'admin' || req.user.role === 'admin');
};

// ==========================================
// GET /api/events
// ==========================================
exports.getAllEvents = async (req, res, next) => {
  try {
    const { phase, page = 1, limit = 20 } = req.query;
    let filter = {};

    // ✅ THE FIX: Super Admins see everything. Regular users only see their team.
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

    const eventsWithReports = await Promise.all(
      events.map(async (event) => {
        const report = reports.find((r) => r.event.toString() === event._id.toString());

        const tasks = await Task.find({
          event: event._id,
          status: TASK_STATUSES.APPROVED
        }).select('submissions');
        
        const images = [];
        tasks.forEach(task => {
          if (task.submissions && Array.isArray(task.submissions)) {
            task.submissions.forEach(sub => {
              if (sub.media && Array.isArray(sub.media)) {
                sub.media.forEach(m => {
                  if (m.url) images.push(m.url);
                });
              }
            });
          }
        });

        return {
          ...event.toObject(),
          report: report ? report.content : '',
          images
        };
      })
    );

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

    // 🛡️ Ensure users can't snoop on other teams' private events
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

    // ✅ SECURED: Fetch event first, THEN check if user is admin of THAT event's team
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

    // ✅ SECURED
    const isAdmin = await verifyTeamAdmin(req, event.team);
    if (!isAdmin) return res.status(403).json({ success: false, message: 'Only team administrators can delete events.' });

    await Task.deleteMany({ event: event._id });
    await Event.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: 'Event and associated tasks deleted' });
  } catch (error) {
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

    // ✅ SECURED
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

    // ✅ SECURED
    const isAdmin = await verifyTeamAdmin(req, event.team);
    if (!isAdmin) return res.status(403).json({ success: false, message: 'Only team administrators can finalize events.' });

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

// ==========================================
// POST /api/events/:id/generate-report
// ==========================================
exports.generateEventReport = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id).populate('team', 'name'); 
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });

    // ✅ SECURED
    const isAdmin = await verifyTeamAdmin(req, event.team._id);
    if (!isAdmin) return res.status(403).json({ success: false, message: 'Only team administrators can generate PR reports.' });

    const tasks = await Task.find({ 
      event: event._id, 
      status: TASK_STATUSES.APPROVED 
    }).populate('assignedTo', 'name');

    const taskSummaries = tasks.map(t => {
      const volunteerName = t.assignedTo ? t.assignedTo.name.split(' ')[0] : 'A volunteer';
      return `- ${t.title} (Completed by: ${volunteerName})`;
    }).join('\n');

    const prompt = `
      You are an expert Public Relations Officer for the organization "${event.team.name}".
      Your job is to write a professional, engaging, and polished post-event report for the general public.

      Event Data:
      - Title: ${event.title}
      - Description: ${event.description}
      
      Key Accomplishments (Tasks Completed):
      ${taskSummaries || 'Routine event setup and execution.'}

      Rules:
      1. Use a formal, celebratory, and community-focused tone.
      2. NEVER invent or hallucinate metrics, numbers, names, or events. Only use the provided data.
      3. DO NOT include sensitive information, internal disputes, or financial/budget details.
      4. You MUST return the response strictly as a JSON object with the following structure:
         {
           "headline": "A catchy, news-style headline",
           "leadParagraph": "A 2-3 sentence engaging summary of the event",
           "teamHighlights": [
             { "role": "Task Title", "description": "1 sentence describing the contribution and naming the volunteer" }
           ]
         }
    `;

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      generationConfig: { responseMimeType: "application/json" } 
    });

    const result = await model.generateContent(prompt);
    const generatedJSON = JSON.parse(result.response.text());
    
    let report = await Report.findOne({ event: event._id });
    
    if (!report) {
      report = new Report({
        event: event._id,
        team: event.team._id, 
        content: generatedJSON, 
        createdBy: req.user._id,
        status: 'published',
        isPublic: 'true',
      });
    } else {
      report.content = generatedJSON; 
      report.status = 'published';
      report.isPublic = 'true';
    }
    await report.save();

    event.reportStatus = event.targetStatus;
    await event.save();

    res.json({ 
      success: true, 
      message: 'AI Draft generated successfully', 
      data: { 
        report: { _id: report._id, content: generatedJSON, status: event.targetStatus, isPublic: event.targetIsPublic }
      } 
    });
    
  } catch (error) {
    console.error('AI Generation Error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate AI report' });
  }
};