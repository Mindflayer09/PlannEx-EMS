const Notification = require('../models/Notification');
const User = require('../models/User');
const { sendWithRetry, templates } = require('./emailService');
const { NOTIFICATION_TYPES } = require('../utils/constants');

const createAndSendNotification = async (recipient, type, template, relatedEntity, teamId, userId) => {
  try {
    const notification = await Notification.create({
      recipient,
      subject: template.subject,
      body: template.body,
      type,
      relatedEntity,
      team: teamId, 
      user: userId, 
    });
    sendWithRetry(notification).catch(err => 
      console.error(`[Notification Background Error]: ${err.message}`)
    );
  } catch (err) {
    console.error(`[Notification Creation Failed]: ${err.message}`);
  }
};

exports.notifyUserApproved = async (user) => {
  // Defensive check for populated team
  const orgName = (user.team && typeof user.team === 'object') ? user.team.name : 'your organization';
  const template = templates.userApproved(user.name, orgName);
  
  await createAndSendNotification(
    user.email,
    NOTIFICATION_TYPES.USER_APPROVED,
    template,
    { entityType: 'User', entityId: user._id },
    user.team?._id || user.team,
    user._id 
  );
};

exports.notifyUserDeleted = async (user) => {
  const orgName = (user.team && typeof user.team === 'object') ? user.team.name : 'your organization';
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
  const orgName = (task.team && typeof task.team === 'object') ? task.team.name : 'the organization';
  const assignerName = (task.assignedBy && typeof task.assignedBy === 'object') ? task.assignedBy.name : 'An Admin';

  const template = templates.taskAssigned(
    task.title,
    task.deadline,
    assignerName,
    orgName
  );

  await createAndSendNotification(
    task.assignedTo.email,
    NOTIFICATION_TYPES.TASK_ASSIGNED,
    template,
    { entityType: 'Task', entityId: task._id },
    task.team?._id || task.team,
    task.assignedTo._id || task.assignedTo
  );
};

exports.notifyTaskSubmitted = async (task) => {
  const volunteerName = (task.assignedTo && typeof task.assignedTo === 'object') ? task.assignedTo.name : 'A Volunteer';

  const template = templates.taskSubmitted(task.title, volunteerName);
  
  await createAndSendNotification(
    task.assignedBy.email,
    NOTIFICATION_TYPES.TASK_SUBMITTED,
    template,
    { entityType: 'Task', entityId: task._id },
    task.team?._id || task.team,
    task.assignedBy._id || task.assignedBy
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
    task.assignedTo._id || task.assignedTo
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
    task.assignedTo._id || task.assignedTo
  );
};

exports.notifyPhaseChanged = async (event) => {
  const users = await User.find({ team: event.team, isApproved: true });
  const template = templates.phaseChanged(event.title, event.phase);
  await Promise.all(users.map(user => 
    createAndSendNotification(
      user.email,
      NOTIFICATION_TYPES.PHASE_CHANGED,
      template,
      { entityType: 'Event', entityId: event._id },
      event.team?._id || event.team,
      user._id
    )
  ));
};

exports.notifyEventFinalized = async (event) => {
  const users = await User.find({ team: event.team, isApproved: true });
  const template = templates.eventFinalized(event.title);

  await Promise.all(users.map(user => 
    createAndSendNotification(
      user.email,
      NOTIFICATION_TYPES.EVENT_FINALIZED,
      template,
      { entityType: 'Event', entityId: event._id },
      event.team?._id || event.team,
      user._id
    )
  ));
};