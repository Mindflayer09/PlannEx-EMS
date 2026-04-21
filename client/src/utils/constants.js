export const ROLES = {
  ADMIN: 'admin',
  SUB_ADMIN: 'sub-admin',
  VOLUNTEER: 'volunteer',
};

export const EVENT_PHASES = {
  PRE: 'pre-event',
  DURING: 'during-event',
  POST: 'post-event',
};

export const TASK_STATUSES = {
  PENDING: 'pending',
  SUBMITTED: 'submitted',
  APPROVED: 'approved',
  REJECTED: 'rejected',
};

export const TASK_PRIORITIES = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
};

export const PHASE_LABELS = {
  'pre-event': 'Pre-Event',
  'during-event': 'During Event',
  'post-event': 'Post-Event',
};

export const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200',
  submitted: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-200',
  approved: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200',
  rejected: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-200',
};

export const PHASE_COLORS = {
  'pre-event': 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-200',
  'during-event': 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200',
  'post-event': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200',
};

export const PRIORITY_COLORS = {
  low: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
  medium: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-200',
  high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200',
  critical: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-200',
};

// 🎨 Additional Status Colors for Team Members
export const APPROVAL_COLORS = {
  approved: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200',
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200',
  rejected: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-200',
};

// 🎨 Event Status Colors
export const EVENT_STATUS_COLORS = {
  finalized: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200',
  active: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-200',
  archived: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
};
