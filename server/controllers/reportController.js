const Report = require('../models/Report');
const Event = require('../models/Event');
const Team = require('../models/Team'); 
const { generateWithRetry } = require('../services/aiService'); 
const axios = require('axios');

// ==========================================
//  HELPER: Verify Team Admin Access
// ==========================================
const verifyTeamAdmin = async (teamId, userId) => {
  const team = await Team.findById(teamId);
  if (!team) return false;
  const member = team.members.find(m => m.user.toString() === userId.toString());
  return member && member.accessLevel === 'admin';
};

// ==========================================
//  🚀 UPGRADED: XML-based Extractor
// ==========================================
const extractTag = (text, tag) => {
  if (!text) return null;
  // Matches everything between <tag> and </tag> across multiple lines
  const regex = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'i');
  const match = text.match(regex);
  return match ? match[1].trim() : null;
};

// ==========================================
// POST /api/reports/event/:eventId/generate
// ==========================================
exports.generateReportContent = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const { selectedMedia, customPrompt, platform, publish } = req.body;

    const event = await Event.findById(eventId).populate('team');
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    // 🛡️ PERMISSION CHECK
    const isTeamAdmin = await verifyTeamAdmin(event.team._id, req.user._id);
    if (!isTeamAdmin && req.user.role !== 'super_admin') {
      return res.status(403).json({ success: false, message: 'Only team administrators can generate reports.' });
    }

    // 1. Construct the AI Prompt (XML VERSION)
    let promptText = customPrompt
      ? `Write a social media post based on this instruction: "${customPrompt}". The event is called "${event.title}".`
      : `Write an engaging, professional social media post for the platform: ${platform}. The event is called "${event.title}". Include relevant emojis and a call to action.`;

    promptText += `\n\nCRITICAL FORMATTING INSTRUCTIONS:
    Do NOT output JSON. You MUST structure your response EXACTLY using the following XML-style tags. 
    This allows you to write freely with quotes and newlines inside the content.

    <title>Write a catchy title here</title>
    <content>Write the full 1000-1200 word article text here. You can use multiple paragraphs and quotes.</content>
    <hashtags>#tag1, #tag2, #tag3</hashtags>
    <cta>Write the call to action here</cta>`;

    // 2. Prepare Payload
    const imageParts = await Promise.all(
      (selectedMedia || []).map(async (imageUrl) => {
        try {
          const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
          return {
            inlineData: {
              data: Buffer.from(response.data, 'binary').toString('base64'),
              mimeType: response.headers['content-type'] || 'image/jpeg'
            }
          };
        } catch (err) {
          console.error(`[IMAGE FETCH ERROR] Skipping image: ${imageUrl}`);
          return null;
        }
      })
    );

    const promptPayload = [promptText, ...imageParts.filter(p => p !== null)];

    try {
      // 3. Call the AI Service
      const aiResult = await generateWithRetry(promptPayload);
      const rawText = aiResult.response.text();

      // ==========================================
      // 🔄 BULLETPROOF PARSING
      // ==========================================
      let parsedContent = {
        title: extractTag(rawText, 'title') || `${event.title} Report`,
        content: extractTag(rawText, 'content'),
        hashtags: [],
        cta: extractTag(rawText, 'cta') || ''
      };

      // Fallback: If AI ignored tags entirely, dump the whole text into content
      if (!parsedContent.content) {
         console.warn('[EXTRACTION WARNING] AI ignored XML tags. Using raw output.');
         parsedContent.content = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
      }

      // Format Hashtags
      const rawHashtags = extractTag(rawText, 'hashtags');
      if (rawHashtags) {
        parsedContent.hashtags = rawHashtags.split(',').map(t => t.trim().replace(/^#/, '')).filter(t => t);
      } else {
        parsedContent.hashtags = ["PlannEx"];
      }

      parsedContent.wordCount = parsedContent.content.split(/\s+/).length;

      // 4. 🔥 NEW LOGIC: ALWAYS SAVE AS A NEW REPORT INSTEAD OF OVERWRITING
      const report = new Report({
        event: eventId,
        team: event.team._id,
        createdBy: req.user._id,
        content: parsedContent.content || "No content generated",
        title: parsedContent.title || `${event.title} Report`,
        platform: platform,
        wordCount: parsedContent.wordCount || parsedContent.content.split(' ').length,
        hashtags: parsedContent.hashtags && Array.isArray(parsedContent.hashtags) ? parsedContent.hashtags : ["PlannEx"],
        status: publish ? 'published' : 'draft',
        isPublic: publish || false
      });

      await report.save();

      if (publish) {
        event.reportStatus = 'published';
        await event.save();
      }

      // Always return 200/success:true so the frontend doesn't crash
      return res.status(200).json({
        success: true,
        data: {
          report,
          generatedContent: parsedContent
        }
      });

    } catch (aiError) {
      console.error('[AI PROCESSING ERROR]', aiError.message);

      // 🔥 NEW LOGIC: Save failed generation as a new draft
      const draftReport = new Report({
        event: eventId,
        team: event.team._id,
        createdBy: req.user._id,
        title: `${event.title} - Draft (AI Failed)`,
        content: "The AI service was unable to generate the content. Please try again or edit manually.",
        status: 'draft',
        isPublic: false
      });
      await draftReport.save();

      return res.status(200).json({
        success: true, 
        message: `Gemini API Error: ${aiError.message}`,
        data: { 
          report: draftReport,
          generatedContent: {
             title: draftReport.title,
             content: draftReport.content,
             wordCount: 0
          }
        }
      });
    }

  } catch (error) {
    next(error);
  }
};

// ==========================================
// GET /api/reports/:id
// ==========================================
exports.getReportById = async (req, res, next) => {
  try {
    const report = await Report.findById(req.params.id)
      .populate('event', 'title description')
      .populate('team', 'name')
      .populate('createdBy', 'name email');

    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    res.json({ success: true, data: { report } });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// GET /api/reports/event/:eventId
// ==========================================
exports.getReportByEventId = async (req, res, next) => {
  try {
    // 🔥 NEW LOGIC: Use .find() instead of .findOne() to get ALL reports for the event
    const reports = await Report.find({ event: req.params.eventId })
      .populate('event', 'title description')
      .populate('team', 'name')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 }); // Newest first

    if (!reports || reports.length === 0) {
      return res.status(404).json({ success: false, message: 'No reports found for this event' });
    }

    res.json({ success: true, data: { reports } }); // Changed key to 'reports'
  } catch (error) {
    next(error);
  }
};

// ==========================================
// GET /api/reports/public
// ==========================================
exports.getPublicReports = async (req, res, next) => {
  try {
    const { page = 1, limit = 100, teamId, eventId } = req.query; // Added eventId to query params
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const filter = { isPublic: true, status: 'published' };
    if (teamId) filter.team = teamId;
    if (eventId) filter.event = eventId; // Allow filtering by eventId for our exclusivity check

    const reports = await Report.find(filter)
      .populate('event', 'title description media budget team')
      .populate('team', 'name logo')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Report.countDocuments(filter);

    res.json({
      success: true,
      data: {
        reports,
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
// PUT /api/reports/:id
// ==========================================
exports.updateReport = async (req, res, next) => {
  try {
    const { title, content, hashtags, status, isPublic, reportImage, galleryImages } = req.body;
    
    const report = await Report.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    // 🛡️ PERMISSION CHECK
    const isTeamAdmin = await verifyTeamAdmin(report.team, req.user._id);
    if (!isTeamAdmin && req.user.role !== 'super_admin') {
      return res.status(403).json({ success: false, message: 'Only team administrators can edit reports.' });
    }

    if (title !== undefined) report.title = title;
    if (content !== undefined) report.content = content;
    if (hashtags !== undefined) report.hashtags = hashtags;
    
    if (reportImage !== undefined) report.reportImage = reportImage;
    if (galleryImages !== undefined) report.galleryImages = galleryImages;
    
    if (status && ['draft', 'published'].includes(status)) report.status = status;
    if (isPublic !== undefined) report.isPublic = isPublic;

    await report.save();

    if (status === 'published') {
      const event = await Event.findById(report.event);
      if (event) {
        event.reportStatus = 'published';
        await event.save();
      }
    }

    await report.populate('event', 'title description');
    await report.populate('team', 'name');

    res.json({ success: true, message: 'Report updated', data: { report } });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// DELETE /api/reports/:id
// ==========================================
exports.deleteReport = async (req, res, next) => {
  try {
    const report = await Report.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    // 🛡️ PERMISSION CHECK
    const isTeamAdmin = await verifyTeamAdmin(report.team, req.user._id);
    if (!isTeamAdmin && req.user.role !== 'super_admin') {
      return res.status(403).json({ success: false, message: 'Only team administrators can delete reports.' });
    }

    const event = await Event.findById(report.event);
    
    await Report.findByIdAndDelete(req.params.id);
    
    // Check if any other published reports exist for this event
    if (event) {
        const remainingReports = await Report.countDocuments({ event: event._id, isPublic: true });
        if (remainingReports === 0) {
            event.reportStatus = 'none';
            await event.save();
        }
    }

    res.json({ success: true, message: 'Report deleted' });
  } catch (error) {
    next(error);
  }
};