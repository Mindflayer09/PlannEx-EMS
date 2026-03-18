const Task = require('../models/Task');
const Event = require('../models/Event');
const Team = require('../models/Team'); 
const mongoose = require('mongoose'); 
const { TASK_STATUSES } = require('../utils/constants');
const {
  notifyTaskAssigned,
  notifyTaskSubmitted,
  notifyTaskApproved,
  notifyTaskRejected,
} = require('../services/notificationService');

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
// GET /api/tasks
// ==========================================
exports.getAllTasks = async (req, res, next) => {
  try {
    const { event, status, assignedTo, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (status) filter.status = status;

    // 1. Fetch all events belonging to the user's current Team/Organization
    const teamEvents = await Event.find({ team: req.user.team }).select('_id');
    const teamEventIds = teamEvents.map((e) => e._id);

    // 2. Check their dynamic Team Access Level
    const isAdmin = await verifyTeamAdmin(req.user.team, req.user._id);

    if (!isAdmin) {
      // Regular Team Members (Volunteers) only see their own tasks
      filter.assignedTo = req.user._id;
      filter.event = event ? event : { $in: teamEventIds };
    } else {
      // Team Admins (Directors, etc.) see all tasks for their team
      filter.event = event ? event : { $in: teamEventIds };
      if (assignedTo) filter.assignedTo = assignedTo;
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
        pagination: { page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)), totalItems: total },
      },
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// GET /api/tasks/:id
// ==========================================
exports.getTaskById = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('event', 'title phase team') // 🔄 Changed club to team
      .populate('assignedTo', 'name email')
      .populate('assignedBy', 'name email');

    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    const isAdmin = await verifyTeamAdmin(req.user.team, req.user._id);

    // Security: Only Team Admins or the assigned user can view the specific task
    if (!isAdmin && task.assignedTo._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    res.json({ success: true, data: { task } });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// POST /api/tasks
// ==========================================
exports.createTask = async (req, res, next) => {
  try {
    // 🛡️ Ensure only Team Admins can create tasks
    const isAdmin = await verifyTeamAdmin(req.user.team, req.user._id);
    if (!isAdmin) return res.status(403).json({ success: false, message: 'Only team admins can assign tasks' });

    const { title, description, event: eventId, assignedTo, deadline, priority, phase } = req.body;

    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
    if (event.isFinalized) return res.status(400).json({ success: false, message: 'Cannot add tasks to a finalized event' });

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

// ==========================================
// PUT /api/tasks/:id
// ==========================================
exports.updateTask = async (req, res, next) => {
  try {
    const isAdmin = await verifyTeamAdmin(req.user.team, req.user._id);
    if (!isAdmin) return res.status(403).json({ success: false, message: 'Only team admins can edit tasks' });

    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    if (task.status === TASK_STATUSES.APPROVED) return res.status(400).json({ success: false, message: 'Cannot edit an approved task' });

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

// ==========================================
// DELETE /api/tasks/:id
// ==========================================
exports.deleteTask = async (req, res, next) => {
  try {
    const isAdmin = await verifyTeamAdmin(req.user.team, req.user._id);
    if (!isAdmin) return res.status(403).json({ success: false, message: 'Only team admins can delete tasks' });

    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    await Task.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Task deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// POST /api/tasks/:id/submit
// ==========================================
exports.submitTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { media, notes } = req.body;
    const safeMedia = Array.isArray(media) ? media : [];

    const task = await Task.findById(id);
    if (!task) return res.status(404).json({ success: false, message: "Task not found" });
    if (task.assignedTo.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    // 🚀 THE BUG FIX: Using direct Mongo driver update to prevent the Mongoose "validate" crash!
    const mongoId = new mongoose.Types.ObjectId(id);
    
    await Task.collection.updateOne(
      { _id: mongoId },
      {
        $push: {
          submissions: {
            media: safeMedia,
            notes: notes || "",
            uploadedAt: new Date()
          }
        },
        $set: {
          status: TASK_STATUSES.SUBMITTED,
          rejectionReason: ""
        }
      }
    );

    // Re-fetch to trigger notifications and send back populated data
    const updatedTask = await Task.findById(id)
      .populate("assignedTo", "name email")
      .populate("assignedBy", "name email")
      .populate("event", "title phase");

    notifyTaskSubmitted(updatedTask).catch(console.error);

    res.json({ success: true, message: "Task submitted successfully!", data: { task: updatedTask } });
  } catch (error) {
    console.error("❌ SUBMIT TASK ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// PATCH /api/tasks/:id/approve
// ==========================================
exports.approveTask = async (req, res, next) => {
  try {
    const isAdmin = await verifyTeamAdmin(req.user.team, req.user._id);
    if (!isAdmin) return res.status(403).json({ success: false, message: 'Only team admins can approve tasks' });

    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    if (task.status !== TASK_STATUSES.SUBMITTED) return res.status(400).json({ success: false, message: 'Only submitted tasks can be approved' });

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

// ==========================================
// PATCH /api/tasks/:id/reject
// ==========================================
exports.rejectTask = async (req, res, next) => {
  try {
    const isAdmin = await verifyTeamAdmin(req.user.team, req.user._id);
    if (!isAdmin) return res.status(403).json({ success: false, message: 'Only team admins can reject tasks' });

    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    if (task.status !== TASK_STATUSES.SUBMITTED) return res.status(400).json({ success: false, message: 'Only submitted tasks can be rejected' });

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