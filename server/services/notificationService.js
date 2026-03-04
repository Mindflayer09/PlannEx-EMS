const Notification = require('../models/Notification');
const User = require('../models/User');
const { sendWithRetry, templates } = require('./emailService');
const { NOTIFICATION_TYPES } = require('../utils/constants');

const createAndSendNotification = async (recipient, type, template, relatedEntity) => {
  const notification = await Notification.create({
    recipient,
    subject: template.subject,
    body: template.body,
    type,
    relatedEntity,
  });

  sendWithRetry(notification).catch(console.error);
};

exports.notifyUserApproved = async (user) => {
  const template = templates.userApproved(user.name);
  await createAndSendNotification(
    user.email,
    NOTIFICATION_TYPES.USER_APPROVED,
    template,
    { entityType: 'User', entityId: user._id }
  );
};

// 🔥 NEW: notifyUserDeleted function
exports.notifyUserDeleted = async (user) => {
  const template = templates.userDeleted(user.name);
  await createAndSendNotification(
    user.email,
    NOTIFICATION_TYPES.USER_DELETED,
    template,
    { entityType: 'User', entityId: user._id }
  );
};

exports.notifyTaskAssigned = async (task) => {
  const template = templates.taskAssigned(
    task.title,
    task.deadline,
    task.assignedBy.name
  );
  await createAndSendNotification(
    task.assignedTo.email,
    NOTIFICATION_TYPES.TASK_ASSIGNED,
    template,
    { entityType: 'Task', entityId: task._id }
  );
};

exports.notifyTaskSubmitted = async (task) => {
  const template = templates.taskSubmitted(task.title, task.assignedTo.name);
  await createAndSendNotification(
    task.assignedBy.email,
    NOTIFICATION_TYPES.TASK_SUBMITTED,
    template,
    { entityType: 'Task', entityId: task._id }
  );
};

exports.notifyTaskApproved = async (task) => {
  const template = templates.taskApproved(task.title);
  await createAndSendNotification(
    task.assignedTo.email,
    NOTIFICATION_TYPES.TASK_APPROVED,
    template,
    { entityType: 'Task', entityId: task._id }
  );
};

exports.notifyTaskRejected = async (task) => {
  const template = templates.taskRejected(task.title, task.rejectionReason);
  await createAndSendNotification(
    task.assignedTo.email,
    NOTIFICATION_TYPES.TASK_REJECTED,
    template,
    { entityType: 'Task', entityId: task._id }
  );
};

exports.notifyPhaseChanged = async (event) => {
  const users = await User.find({ club: event.club, isApproved: true });
  const template = templates.phaseChanged(event.title, event.phase);

  for (const user of users) {
    await createAndSendNotification(
      user.email,
      NOTIFICATION_TYPES.PHASE_CHANGED,
      template,
      { entityType: 'Event', entityId: event._id }
    );
  }
};

exports.notifyEventFinalized = async (event) => {
  const users = await User.find({ club: event.club, isApproved: true });
  const template = templates.eventFinalized(event.title);

  for (const user of users) {
    await createAndSendNotification(
      user.email,
      NOTIFICATION_TYPES.EVENT_FINALIZED,
      template,
      { entityType: 'Event', entityId: event._id }
    );
  }
};