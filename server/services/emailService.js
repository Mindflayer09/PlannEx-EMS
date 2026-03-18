const createTransporter = require('../config/email');
const Notification = require('../models/Notification');

let transporter = null;

const getTransporter = () => {
  if (!transporter) {
    transporter = createTransporter();
  }
  return transporter;
};

/**
 * 📧 Core Email Dispatcher
 */
const sendEmail = async (to, subject, html) => {
  try {
    const mail = getTransporter();
    
    // ✅ GMAIL FIX: Using your authenticated user email as the primary sender 
    // to prevent Gmail from blocking the message as "spoofed".
    const senderEmail = process.env.SMTP_USER;

    await mail.sendMail({
      from: `"PlannEx Platform" <${senderEmail}>`,
      to,
      subject,
      html,
    });
    return true;
  } catch (error) {
    console.error(`❌ Email send failed to ${to}:`, error.message);
    throw error;
  }
};

/**
 * 🔄 Queue & Retry Logic
 */
const sendWithRetry = async (notification, maxRetries = 3) => {
  // Prevent re-sending if already marked as sent
  if (notification.status === 'sent') return;

  try {
    await sendEmail(notification.recipient, notification.subject, notification.body);
    
    notification.status = 'sent';
    notification.sentAt = new Date();
    notification.error = null; // Clear any previous errors on success
    await notification.save();
  } catch (error) {
    notification.retryCount += 1;
    notification.error = error.message;

    // ✅ LOGIC FIX: Keep as 'pending' so a worker can try again later, 
    // unless we've hit the retry ceiling.
    if (notification.retryCount >= maxRetries) {
      notification.status = 'failed';
    } else {
      notification.status = 'pending'; 
    }
    
    await notification.save();
  }
};

/**
 * 🎨 Professional HTML Email Wrapper 
 */
const emailWrapper = (content) => `
  <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
    <div style="background-color: #4f46e5; padding: 30px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 28px; letter-spacing: -1px;">PlannEx</h1>
    </div>
    <div style="padding: 40px; background-color: #ffffff;">
      ${content}
      <hr style="border: none; border-top: 1px solid #f3f4f6; margin: 30px 0;" />
      <p style="font-size: 11px; color: #9ca3af; text-align: center; margin: 0;">
        This is an automated system message from the PlannEx Event Management Platform.
      </p>
      <p style="font-size: 11px; color: #9ca3af; text-align: center; margin: 4px 0 0 0;">
        Please do not reply directly to this email.
      </p>
    </div>
  </div>
`;

/**
 * 📧 Multi-Tenant Email Templates
 */
const templates = {
  userApproved: (userName, orgName = 'your organization') => ({
    subject: `✔ Account Approved - Welcome to ${orgName}`,
    body: emailWrapper(`
      <h2 style="color: #111827; margin-bottom: 16px;">Welcome, ${userName}!</h2>
      <p style="font-size: 16px;">Great news! Your account for <strong>${orgName}</strong> has been approved by an administrator.</p>
      <p style="font-size: 16px; margin-bottom: 30px;">You can now log in to your workspace and start collaborating with your team.</p>
      <div style="text-align: center;">
        <a href="${process.env.CLIENT_URL}/login" style="background-color: #4f46e5; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">Login to Dashboard</a>
      </div>
    `),
  }),

  userDeleted: (userName, orgName = 'your organization') => ({
    subject: `Account Access Update - ${orgName}`,
    body: emailWrapper(`
      <h2 style="color: #111827; margin-bottom: 16px;">Hello ${userName},</h2>
      <p style="font-size: 16px;">Your account access for <strong>${orgName}</strong> has been removed by an administrator.</p>
      <p style="font-size: 14px; color: #6b7280; margin-top: 20px;">If you believe this was done in error, please reach out to your team lead.</p>
    `),
  }),

  taskAssigned: (taskTitle, deadline, assignedBy, orgName) => {
    // ✅ SAFETY: Guard against invalid dates
    const formattedDate = deadline ? new Date(deadline).toLocaleDateString() : 'TBD';
    
    return {
      subject: `📌 New Task: ${taskTitle} (${orgName})`,
      body: emailWrapper(`
        <h2 style="color: #111827; margin-bottom: 16px;">New Assignment</h2>
        <p style="font-size: 16px;">You have been assigned a new task in <strong>${orgName}</strong>.</p>
        <div style="background-color: #f8fafc; padding: 20px; border-radius: 10px; border: 1px solid #e2e8f0; margin: 25px 0;">
          <p style="margin: 0 0 10px 0;"><strong>Task:</strong> ${taskTitle}</p>
          <p style="margin: 0 0 10px 0;"><strong>Deadline:</strong> <span style="color: #ef4444; font-weight: bold;">${formattedDate}</span></p>
          <p style="margin: 0;"><strong>Assigned by:</strong> ${assignedBy}</p>
        </div>
        <p style="font-size: 16px;">Please log in to review the details and start your submission.</p>
      `),
    };
  },

  taskSubmitted: (taskTitle, submittedBy) => ({
    subject: `Action Required: Task Submission for ${taskTitle}`,
    body: emailWrapper(`
      <h2 style="color: #111827; margin-bottom: 16px;">Review Needed</h2>
      <p style="font-size: 16px;">A new submission has been received for: <strong>${taskTitle}</strong>.</p>
      <p style="font-size: 16px;"><strong>Submitted by:</strong> ${submittedBy}</p>
      <p style="font-size: 16px;">Please log in to the admin dashboard to review the work.</p>
    `),
  }),

  taskApproved: (taskTitle) => ({
    subject: `✅ Task Approved - ${taskTitle}`,
    body: emailWrapper(`
      <h2 style="color: #059669; margin-bottom: 16px;">Excellent Work!</h2>
      <p style="font-size: 16px;">Your submission for <strong>${taskTitle}</strong> has been reviewed and approved.</p>
    `),
  }),

  taskRejected: (taskTitle, reason) => ({
    subject: `⚠ Revision Needed: ${taskTitle}`,
    body: emailWrapper(`
      <h2 style="color: #dc2626; margin-bottom: 16px;">Revision Required</h2>
      <p style="font-size: 16px;">Your submission for <strong>${taskTitle}</strong> was not approved and requires changes.</p>
      <div style="background-color: #fef2f2; padding: 20px; border-radius: 10px; border-left: 5px solid #dc2626; margin: 25px 0;">
        <strong style="color: #991b1b;">Feedback from Admin:</strong><br/>
        <p style="margin-top: 8px; color: #b91c1c;">${reason || 'Please check the dashboard for details.'}</p>
      </div>
      <p style="font-size: 16px;">Please review the feedback and resubmit your work.</p>
    `),
  }),

  phaseChanged: (eventTitle, newPhase) => ({
    subject: `Phase Update: ${eventTitle}`,
    body: emailWrapper(`
      <h2 style="color: #111827; margin-bottom: 16px;">Event Milestone</h2>
      <p style="font-size: 16px;">The event <strong>${eventTitle}</strong> has successfully transitioned to the <span style="color: #4f46e5; font-weight: bold;">${newPhase}</span> phase.</p>
    `),
  }),

  eventFinalized: (eventTitle) => ({
    subject: `✨ Success! ${eventTitle} is Finalized`,
    body: emailWrapper(`
      <h2 style="color: #4f46e5; margin-bottom: 16px;">Mission Accomplished!</h2>
      <p style="font-size: 16px;">The event <strong>${eventTitle}</strong> is now officially finalized and the public report has been published.</p>
    `),
  }),
};

module.exports = { sendEmail, sendWithRetry, templates };