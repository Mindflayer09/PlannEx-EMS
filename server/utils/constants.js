const ROLES = {
  ADMIN: 'admin',
  SUB_ADMIN: 'sub-admin',
  VOLUNTEER: 'volunteer',
};

const EVENT_PHASES = {
  PRE: 'pre-event',
  DURING: 'during-event',
  POST: 'post-event',
};

const PHASE_ORDER = [EVENT_PHASES.PRE, EVENT_PHASES.DURING, EVENT_PHASES.POST];

const TASK_STATUSES = {
  PENDING: 'pending',
  SUBMITTED: 'submitted',
  APPROVED: 'approved',
  REJECTED: 'rejected',
};

const TASK_PRIORITIES = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
};

const NOTIFICATION_TYPES = {
  TASK_ASSIGNED: 'task_assigned',
  TASK_SUBMITTED: 'task_submitted',
  TASK_APPROVED: 'task_approved',
  TASK_REJECTED: 'task_rejected',
  PHASE_CHANGED: 'phase_changed',
  EVENT_FINALIZED: 'event_finalized',
  USER_APPROVED: 'user_approved',
  USER_DELETED: 'user_deleted', 
};

const NOTIFICATION_STATUSES = {
  PENDING: 'pending',
  SENT: 'sent',
  FAILED: 'failed',
};

module.exports = {
  ROLES,
  EVENT_PHASES,
  PHASE_ORDER,
  TASK_STATUSES,
  TASK_PRIORITIES,
  NOTIFICATION_TYPES,
  NOTIFICATION_STATUSES,
};