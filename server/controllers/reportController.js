const Report = require('../models/Report');
const Event = require('../models/Event');

// GET /api/reports/:id
exports.getReportById = async (req, res, next) => {
  try {
    const report = await Report.findById(req.params.id)
      .populate('event', 'title description')
      .populate('club', 'name')
      .populate('createdBy', 'name email');

    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    res.json({ success: true, data: { report } });
  } catch (error) {
    next(error);
  }
};

// GET /api/reports/event/:eventId
exports.getReportByEventId = async (req, res, next) => {
  try {
    const report = await Report.findOne({ event: req.params.eventId })
      .populate('event', 'title description')
      .populate('club', 'name')
      .populate('createdBy', 'name email');

    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found for this event' });
    }

    res.json({ success: true, data: { report } });
  } catch (error) {
    next(error);
  }
};

// GET /api/reports/public
exports.getPublicReports = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, clubId } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const filter = { isPublic: true, status: 'published' };
    if (clubId) filter.club = clubId;

    const reports = await Report.find(filter)
      .populate('event', 'title description media budget club')
      .populate('club', 'name logo')
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

// PUT /api/reports/:id
exports.updateReport = async (req, res, next) => {
  try {
    const { content, status, isPublic } = req.body;
    
    const report = await Report.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
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
    await report.populate('club', 'name');

    res.json({ success: true, message: 'Report updated', data: { report } });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/reports/:id
exports.deleteReport = async (req, res, next) => {
  try {
    const report = await Report.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
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
