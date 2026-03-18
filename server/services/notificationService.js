const Notification = require('../models/Notification');
const User = require('../models/User');
const { sendWithRetry, templates } = require('./emailService');
const { NOTIFICATION_TYPES } = require('../utils/constants');

/**
 *  HELPER: Create and Queue Notification
 * Now saves team and user references for strict data isolation and in-app tracking.
 */
const createAndSendNotification = async (recipient, type, template, relatedEntity, teamId, userId) => {
  const notification = await Notification.create({
    recipient,
    subject: template.subject,
    body: template.body,
    type,
    relatedEntity,
    team: teamId, 
    user: userId, 
  });

  sendWithRetry(notification).catch(console.error);
};

exports.notifyUserApproved = async (user) => {
  // Pass team name for professional branding
  const orgName = user.team?.name || 'your organization';
  const template = templates.userApproved(user.name, orgName);
  
  await createAndSendNotification(
    user.email,
    NOTIFICATION_TYPES.USER_APPROVED,
    template,
    { entityType: 'User', entityId: user._id },
    user.team?._id || user.team, // teamId
    user._id // userId
  );
};

exports.notifyUserDeleted = async (user) => {
  const orgName = user.team?.name || 'your organization';
  const template = templates.userDeleted(user.name, orgName);
  
  await createAndSendNotification(
    user.email,
    NOTIFICATION_TYPES.USER_DELETED,
    template,
    { entityType: 'User', entityId: user._id },
    user.team?._id || user.team,
    user._id
  );
};

exports.notifyTaskAssigned = async (task) => {
  // Ensure we have the team name for the template
  const orgName = task.team?.name || 'the organization';
  
  const template = templates.taskAssigned(
    task.title,
    task.deadline,
    task.assignedBy?.name || 'An Admin',
    orgName
  );

  await createAndSendNotification(
    task.assignedTo.email,
    NOTIFICATION_TYPES.TASK_ASSIGNED,
    template,
    { entityType: 'Task', entityId: task._id },
    task.team?._id || task.team,
    task.assignedTo._id
  );
};

exports.notifyTaskSubmitted = async (task) => {
  const template = templates.taskSubmitted(task.title, task.assignedTo.name);
  
  await createAndSendNotification(
    task.assignedBy.email,
    NOTIFICATION_TYPES.TASK_SUBMITTED,
    template,
    { entityType: 'Task', entityId: task._id },
    task.team?._id || task.team,
    task.assignedBy._id
  );
};

exports.notifyTaskApproved = async (task) => {
  const template = templates.taskApproved(task.title);
  
  await createAndSendNotification(
    task.assignedTo.email,
    NOTIFICATION_TYPES.TASK_APPROVED,
    template,
    { entityType: 'Task', entityId: task._id },
    task.team?._id || task.team,
    task.assignedTo._id
  );
};

exports.notifyTaskRejected = async (task) => {
  const template = templates.taskRejected(task.title, task.rejectionReason);
  
  await createAndSendNotification(
    task.assignedTo.email,
    NOTIFICATION_TYPES.TASK_REJECTED,
    template,
    { entityType: 'Task', entityId: task._id },
    task.team?._id || task.team,
    task.assignedTo._id
  );
};

/**
 * 📣 BROADCAST: Phase Changed
 * Swapped 'club' for 'team' to match the new schema.
 */
exports.notifyPhaseChanged = async (event) => {
  // Fetch all approved members of THIS specific organization
  const users = await User.find({ team: event.team, isApproved: true });
  const template = templates.phaseChanged(event.title, event.phase);

  for (const user of users) {
    await createAndSendNotification(
      user.email,
      NOTIFICATION_TYPES.PHASE_CHANGED,
      template,
      { entityType: 'Event', entityId: event._id },
      event.team,
      user._id
    );
  }
};

/**
 * 📣 BROADCAST: Event Finalized
 */
exports.notifyEventFinalized = async (event) => {
  const users = await User.find({ team: event.team, isApproved: true });
  const template = templates.eventFinalized(event.title);

  for (const user of users) {
    await createAndSendNotification(
      user.email,
      NOTIFICATION_TYPES.EVENT_FINALIZED,
      template,
      { entityType: 'Event', entityId: event._id },
      event.team,
      user._id
    );
  }
};