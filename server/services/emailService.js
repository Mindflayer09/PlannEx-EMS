const createTransporter = require('../config/email');
const Notification = require('../models/Notification');

let transporter = null;

const getTransporter = () => {
  if (!transporter) {
    transporter = createTransporter();
  }
  return transporter;
};

const sendEmail = async (to, subject, html) => {
  try {
    const mail = getTransporter();
    await mail.sendMail({
      from: process.env.EMAIL_FROM || process.env.SMTP_USER,
      to,
      subject,
      html,
    });
    return true;
  } catch (error) {
    console.error(`Email send failed to ${to}:`, error.message);
    throw error;
  }
};

const sendWithRetry = async (notification, maxRetries = 3) => {
  try {
    await sendEmail(notification.recipient, notification.subject, notification.body);
    notification.status = 'sent';
    notification.sentAt = new Date();
    await notification.save();
  } catch (error) {
    notification.retryCount += 1;
    notification.error = error.message;

    if (notification.retryCount >= maxRetries) {
      notification.status = 'failed';
    }
    await notification.save();
  }
};

// Email templates
const templates = {
  userApproved: (userName) => ({
    subject: 'Account Approved - Club Event Management',
    body: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
        <h2>Welcome, ${userName}!</h2>
        <p>Your account has been approved. You can now log in and start using the platform.</p>
        <p>Best regards,<br>Club Event Management Team</p>
      </div>
    `,
  }),

  // 🔥 NEW: User Deleted Template
  userDeleted: (userName) => ({
    subject: 'Account Removed - Club Event Management',
    body: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
        <h2>Hello, ${userName}</h2>
        <p>Your account has been removed from the platform by an administrator.</p>
        <p>If you believe this is a mistake, please reach out to your club leadership.</p>
        <p>Best regards,<br>Club Event Management Team</p>
      </div>
    `,
  }),

  taskAssigned: (taskTitle, deadline, assignedBy) => ({
    subject: `New Task Assigned: ${taskTitle}`,
    body: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
        <h2>New Task Assigned</h2>
        <p><strong>Task:</strong> ${taskTitle}</p>
        <p><strong>Deadline:</strong> ${new Date(deadline).toLocaleDateString()}</p>
        <p><strong>Assigned by:</strong> ${assignedBy}</p>
        <p>Please log in to view details and submit your work.</p>
      </div>
    `,
  }),

  taskSubmitted: (taskTitle, submittedBy) => ({
    subject: `Task Submitted: ${taskTitle}`,
    body: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
        <h2>Task Submission Received</h2>
        <p><strong>Task:</strong> ${taskTitle}</p>
        <p><strong>Submitted by:</strong> ${submittedBy}</p>
        <p>Please log in to review the submission.</p>
      </div>
    `,
  }),

  taskApproved: (taskTitle) => ({
    subject: `Task Approved: ${taskTitle}`,
    body: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
        <h2>Task Approved</h2>
        <p>Your submission for <strong>${taskTitle}</strong> has been approved.</p>
      </div>
    `,
  }),

  taskRejected: (taskTitle, reason) => ({
    subject: `Task Rejected: ${taskTitle}`,
    body: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
        <h2>Task Rejected</h2>
        <p>Your submission for <strong>${taskTitle}</strong> has been rejected.</p>
        <p><strong>Reason:</strong> ${reason}</p>
        <p>Please review and resubmit.</p>
      </div>
    `,
  }),

  phaseChanged: (eventTitle, newPhase) => ({
    subject: `Event Phase Updated: ${eventTitle}`,
    body: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
        <h2>Event Phase Changed</h2>
        <p>The event <strong>${eventTitle}</strong> has moved to <strong>${newPhase}</strong> phase.</p>
      </div>
    `,
  }),

  eventFinalized: (eventTitle) => ({
    subject: `Event Finalized: ${eventTitle}`,
    body: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
        <h2>Event Finalized</h2>
        <p>The event <strong>${eventTitle}</strong> has been finalized and is now publicly visible.</p>
      </div>
    `,
  }),
};

module.exports = { sendEmail, sendWithRetry, templates };