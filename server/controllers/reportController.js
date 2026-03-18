const Report = require('../models/Report');
const Event = require('../models/Event');
const Team = require('../models/Team'); 

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
// GET /api/reports/:id
// ==========================================
exports.getReportById = async (req, res, next) => {
  try {
    const report = await Report.findById(req.params.id)
      .populate('event', 'title description')
      .populate('team', 'name') // 🔄 CHANGED: club -> team
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
    const report = await Report.findOne({ event: req.params.eventId })
      .populate('event', 'title description')
      .populate('team', 'name') // 🔄 CHANGED: club -> team
      .populate('createdBy', 'name email');

    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found for this event' });
    }

    res.json({ success: true, data: { report } });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// GET /api/reports/public
// ==========================================
exports.getPublicReports = async (req, res, next) => {
  try {
    // 🔄 CHANGED: clubId -> teamId
    const { page = 1, limit = 20, teamId } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const filter = { isPublic: true, status: 'published' };
    if (teamId) filter.team = teamId; // 🔄 CHANGED: club -> team

    const reports = await Report.find(filter)
      .populate('event', 'title description media budget team') // 🔄 CHANGED: club -> team
      .populate('team', 'name logo') // 🔄 CHANGED: club -> team
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
    const { content, status, isPublic } = req.body;
    
    const report = await Report.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    // 🛡️ PERMISSION CHECK
    // Allow if user is Super Admin or an Admin of the team that owns the report
    const isTeamAdmin = await verifyTeamAdmin(report.team, req.user._id);
    if (!isTeamAdmin && req.user.role !== 'super_admin') {
      return res.status(403).json({ success: false, message: 'Only team administrators can edit reports.' });
    }

    // Only allow updating content and status
    if (content !== undefined) report.content = content;
    if (status && ['draft', 'published'].includes(status)) report.status = status;
    if (isPublic !== undefined) report.isPublic = isPublic;

    await report.save();

    // If status is being updated to published, also update the event
    if (status === 'published') {
      const event = await Event.findById(report.event);
      if (event) {
        event.reportStatus = 'published';
        await event.save();
      }
    }

    await report.populate('event', 'title description');
    await report.populate('team', 'name'); // 🔄 CHANGED: club -> team

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

    // Reset event report status when deleting the report
    const event = await Event.findById(report.event);
    if (event) {
      event.reportStatus = 'none';
      await event.save();
    }

    await Report.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: 'Report deleted' });
  } catch (error) {
    next(error);
  }
};