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
      from: `"PlannEx Platform" <${process.env.EMAIL_FROM || process.env.SMTP_USER}>`,
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

// 🎨 Professional Email Wrapper 
const emailWrapper = (content) => `
  <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333; line-height: 1.6;">
    <div style="background-color: #4f46e5; padding: 20px; border-radius: 10px 10px 0 0; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 24px;">PlannEx</h1>
    </div>
    <div style="padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px; bg-color: #ffffff;">
      ${content}
      <hr style="border: none; border-top: 1px solid #eee; margin: 25px 0;" />
      <p style="font-size: 12px; color: #9ca3af; text-align: center;">
        This is an automated message from the PlannEx Event Management Platform.
      </p>
    </div>
  </div>
`;

// 📧 Updated Multi-Tenant Templates
const templates = {
  userApproved: (userName, orgName = 'your organization') => ({
    subject: `Account Approved - Welcome to ${orgName}`,
    body: emailWrapper(`
      <h2 style="color: #111827;">Welcome, ${userName}!</h2>
      <p>Great news! Your account for <strong>${orgName}</strong> has been approved by an administrator.</p>
      <p>You can now log in to the dashboard to view events, manage tasks, and collaborate with your team.</p>
      <div style="margin-top: 25px; text-align: center;">
        <a href="${process.env.FRONTEND_URL}/login" style="background-color: #4f46e5; color: white; padding: 12px 25px; text-decoration: none; border-radius: 6px; font-weight: bold;">Login to Dashboard</a>
      </div>
    `),
  }),

  userDeleted: (userName, orgName = 'your organization') => ({
    subject: `Account Access Update - ${orgName}`,
    body: emailWrapper(`
      <h2 style="color: #111827;">Hello ${userName},</h2>
      <p>Your account access for <strong>${orgName}</strong> has been removed by an administrator.</p>
      <p>If you believe this was done in error, please contact your team lead or organization administrator.</p>
    `),
  }),

  taskAssigned: (taskTitle, deadline, assignedBy, orgName) => ({
    subject: `New Task: ${taskTitle} (${orgName})`,
    body: emailWrapper(`
      <h2 style="color: #111827;">New Assignment</h2>
      <p>You have been assigned a new task in <strong>${orgName}</strong>.</p>
      <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 5px 0;"><strong>Task:</strong> ${taskTitle}</p>
        <p style="margin: 5px 0;"><strong>Deadline:</strong> ${new Date(deadline).toLocaleDateString()}</p>
        <p style="margin: 5px 0;"><strong>Assigned by:</strong> ${assignedBy}</p>
      </div>
      <p>Please log in to review the details and start your submission.</p>
    `),
  }),

  taskSubmitted: (taskTitle, submittedBy) => ({
    subject: `Action Required: Task Submission for ${taskTitle}`,
    body: emailWrapper(`
      <h2 style="color: #111827;">Review Needed</h2>
      <p>A new submission has been received for the task: <strong>${taskTitle}</strong>.</p>
      <p><strong>Submitted by:</strong> ${submittedBy}</p>
      <p>Please log in to the admin dashboard to approve or provide feedback on this work.</p>
    `),
  }),

  taskApproved: (taskTitle) => ({
    subject: `Task Approved! - ${taskTitle}`,
    body: emailWrapper(`
      <h2 style="color: #059669;">✔ Task Approved</h2>
      <p>Your submission for <strong>${taskTitle}</strong> has been reviewed and approved. Great work!</p>
    `),
  }),

  taskRejected: (taskTitle, reason) => ({
    subject: `Revision Needed: ${taskTitle}`,
    body: emailWrapper(`
      <h2 style="color: #dc2626;">⚠ Revision Required</h2>
      <p>Your submission for <strong>${taskTitle}</strong> was not approved and requires changes.</p>
      <div style="background-color: #fef2f2; padding: 15px; border-radius: 8px; border-left: 4px solid #dc2626; margin: 20px 0;">
        <strong>Feedback from Admin:</strong><br/>
        ${reason}
      </div>
      <p>Please review the feedback and resubmit your work via the dashboard.</p>
    `),
  }),

  phaseChanged: (eventTitle, newPhase) => ({
    subject: `Phase Update: ${eventTitle}`,
    body: emailWrapper(`
      <h2 style="color: #111827;">Event Milestone Reached</h2>
      <p>The event <strong>${eventTitle}</strong> has successfully transitioned to the <strong>${newPhase}</strong> phase.</p>
    `),
  }),

  eventFinalized: (eventTitle) => ({
    subject: `Success! ${eventTitle} is Finalized`,
    body: emailWrapper(`
      <h2 style="color: #4f46e5;">✨ Event Finalized</h2>
      <p>The event <strong>${eventTitle}</strong> is now officially finalized and the public PR report has been published.</p>
    `),
  }),
};

module.exports = { sendEmail, sendWithRetry, templates };