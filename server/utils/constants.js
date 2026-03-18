const ROLES = {
  SUPER_ADMIN: 'super_admin', // Platform Owner
  ADMIN: 'admin',             // Team / Organization Owner
  SUB_ADMIN: 'sub-admin',     // Team Manager
  VOLUNTEER: 'volunteer',     // Standard Team Member
  USER: 'user'                // Default / Fallback
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
  // Task & Event
  TASK_ASSIGNED: 'task_assigned',
  TASK_SUBMITTED: 'task_submitted',
  TASK_APPROVED: 'task_approved',
  TASK_REJECTED: 'task_rejected',
  PHASE_CHANGED: 'phase_changed',
  EVENT_FINALIZED: 'event_finalized',
  
  NEW_USER_APPLIED: 'new_user_applied', 
  USER_APPROVED: 'user_approved',
  USER_REJECTED: 'user_rejected',       
  USER_DELETED: 'user_deleted', 
  TEAM_CREATED: 'team_created'         
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