const Task = require('../models/Task');
const Event = require('../models/Event');
const { TASK_STATUSES } = require('../utils/constants');
const {
  notifyTaskAssigned,
  notifyTaskSubmitted,
  notifyTaskApproved,
  notifyTaskRejected,
} = require('../services/notificationService');

// GET /api/tasks
exports.getAllTasks = async (req, res, next) => {
  try {
    const { event, status, assignedTo, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (event) filter.event = event;
    if (status) filter.status = status;

    // Volunteers only see their own tasks
    if (req.user.role === 'volunteer') {
      filter.assignedTo = req.user._id;
    } else if (assignedTo) {
      filter.assignedTo = assignedTo;
    }

    // Sub-admins see only their club's tasks
    if (req.user.role === 'sub-admin') {
      const clubEvents = await Event.find({ club: req.user.club }).select('_id');
      filter.event = { $in: clubEvents.map((e) => e._id) };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const tasks = await Task.find(filter)
      .populate('event', 'title phase')
      .populate('assignedTo', 'name email')
      .populate('assignedBy', 'name email')
      .sort({ deadline: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Task.countDocuments(filter);

    res.json({
      success: true,
      data: {
        tasks,
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

// GET /api/tasks/:id
exports.getTaskById = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('event', 'title phase club')
      .populate('assignedTo', 'name email')
      .populate('assignedBy', 'name email');

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    // Volunteers can only view their own tasks
    if (
      req.user.role === 'volunteer' &&
      task.assignedTo._id.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    res.json({ success: true, data: { task } });
  } catch (error) {
    next(error);
  }
};

// POST /api/tasks
exports.createTask = async (req, res, next) => {
  try {
    const { title, description, event: eventId, assignedTo, deadline, priority, phase } = req.body;

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    if (event.isFinalized) {
      return res.status(400).json({ success: false, message: 'Cannot add tasks to a finalized event' });
    }

    const task = await Task.create({
      title,
      description,
      event: eventId,
      assignedTo,
      assignedBy: req.user._id,
      deadline,
      priority: priority || 'medium',
      phase,
    });

    await task.populate('assignedTo', 'name email');
    await task.populate('assignedBy', 'name email');
    await task.populate('event', 'title phase');

    notifyTaskAssigned(task).catch(console.error);

    res.status(201).json({ success: true, data: { task } });
  } catch (error) {
    next(error);
  }
};

// PUT /api/tasks/:id
exports.updateTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    if (task.status === TASK_STATUSES.APPROVED) {
      return res.status(400).json({ success: false, message: 'Cannot edit an approved task' });
    }

    const { title, description, assignedTo, deadline, priority } = req.body;
    if (title) task.title = title;
    if (description) task.description = description;
    if (assignedTo) task.assignedTo = assignedTo;
    if (deadline) task.deadline = deadline;
    if (priority) task.priority = priority;

    await task.save();
    await task.populate('assignedTo', 'name email');
    await task.populate('assignedBy', 'name email');
    await task.populate('event', 'title phase');

    res.json({ success: true, data: { task } });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/tasks/:id
exports.deleteTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    await Task.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Task deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// POST /api/tasks/:id/submit
exports.submitTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { media, notes } = req.body;

    const safeMedia = Array.isArray(media) ? media : [];

    const task = await Task.findById(id);

    if (!task) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }

    if (task.assignedTo.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    task.submissions.push({
      media: safeMedia,
      notes: notes || "",
      uploadedAt: new Date(),
    });

    task.status = TASK_STATUSES.SUBMITTED;
    task.rejectionReason = "";

    await task.save();

    await task.populate("assignedTo", "name email");
    await task.populate("assignedBy", "name email");
    await task.populate("event", "title phase");

    notifyTaskSubmitted(task).catch(console.error);

    res.json({
      success: true,
      message: "Task submitted successfully!",
      data: { task },
    });

  } catch (error) {
    console.error("❌ SUBMIT TASK ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// PATCH /api/tasks/:id/approve
exports.approveTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    if (task.status !== TASK_STATUSES.SUBMITTED) {
      return res.status(400).json({ success: false, message: 'Only submitted tasks can be approved' });
    }

    task.status = TASK_STATUSES.APPROVED;
    await task.save();

    await task.populate('assignedTo', 'name email');
    await task.populate('event', 'title phase');

    notifyTaskApproved(task).catch(console.error);

    res.json({ success: true, message: 'Task approved', data: { task } });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/tasks/:id/reject
exports.rejectTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    if (task.status !== TASK_STATUSES.SUBMITTED) {
      return res.status(400).json({ success: false, message: 'Only submitted tasks can be rejected' });
    }

    const { rejectionReason } = req.body;
    task.status = TASK_STATUSES.REJECTED;
    task.rejectionReason = rejectionReason;
    await task.save();

    await task.populate('assignedTo', 'name email');
    await task.populate('event', 'title phase');

    notifyTaskRejected(task).catch(console.error);

    res.json({ success: true, message: 'Task rejected', data: { task } });
  } catch (error) {
    next(error);
  }
};