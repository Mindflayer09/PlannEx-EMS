const dns = require('node:dns');
const nodemailer = require("nodemailer");
const Notification = require('../models/Notification');

let transporter = null;
const createTransporter = () => {
  console.log(`📡 SMTP: Forcing strict IPv4 lookup...`);

  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, 
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    
    //
    family: 4,
    lookup: (hostname, options, callback) => {
      dns.lookup(hostname, { family: 4 }, (err, address, family) => {
        callback(err, address, family);
      });
    },

    pool: true,
    maxConnections: 3,
    tls: {
      rejectUnauthorized: false,
      minVersion: "TLSv1.2",
    },
    connectionTimeout: 5000,
    greetingTimeout: 5000,
  });
};

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
    const sender = `"PlannEx Platform" <${process.env.SMTP_USER}>`;

    const info = await mail.sendMail({
      from: sender,
      to,
      subject,
      html,
    });
    
    console.log(`✅ Email sent to ${to}: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error(`❌ SMTP Failed: ${error.message}`);
    throw error;
  }
};

/**
 * 🔄 Queue & Retry Logic
 */
const sendWithRetry = async (notification, maxRetries = 3) => {
  if (notification.status === 'sent') return;

  try {
    await sendEmail(notification.recipient, notification.subject, notification.body);
    
    notification.status = 'sent';
    notification.sentAt = new Date();
    notification.error = null;
    await notification.save();
  } catch (error) {
    notification.retryCount += 1;
    notification.error = error.message;
    
    // Status stays 'pending' until maxRetries is hit
    notification.status = notification.retryCount >= maxRetries ? 'failed' : 'pending';
    
    await notification.save();
    console.log(`🔄 Notification ${notification._id} status: ${notification.status} (Retry ${notification.retryCount}/${maxRetries})`);
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
      <p style="font-size: 16px;">Great news! Your account for <strong>${orgName}</strong> has been approved.</p>
      <div style="margin-top: 30px; text-align: center;">
        <a href="${process.env.CLIENT_URL}/login" style="background-color: #4f46e5; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">Login to Dashboard</a>
      </div>
    `),
  }),

  userDeleted: (userName, orgName = 'your organization') => ({
    subject: `Account Access Update - ${orgName}`,
    body: emailWrapper(`
      <h2 style="color: #111827; margin-bottom: 16px;">Hello ${userName},</h2>
      <p style="font-size: 16px;">Your account access for <strong>${orgName}</strong> has been removed by an administrator.</p>
    `),
  }),

  taskAssigned: (taskTitle, deadline, assignedBy, orgName) => {
    const formattedDate = deadline ? new Date(deadline).toLocaleDateString() : 'TBD';
    return {
      subject: `📌 New Task: ${taskTitle} (${orgName})`,
      body: emailWrapper(`
        <h2 style="color: #111827; margin-bottom: 16px;">New Assignment</h2>
        <div style="background-color: #f8fafc; padding: 20px; border-radius: 10px; border: 1px solid #e2e8f0; margin: 25px 0;">
          <p style="margin: 0 0 10px 0;"><strong>Task:</strong> ${taskTitle}</p>
          <p style="margin: 0 0 10px 0;"><strong>Deadline:</strong> <span style="color: #ef4444; font-weight: bold;">${formattedDate}</span></p>
          <p style="margin: 0;"><strong>Assigned by:</strong> ${assignedBy}</p>
        </div>
      `),
    };
  },

  taskSubmitted: (taskTitle, submittedBy) => ({
    subject: `Action Required: Task Submission for ${taskTitle}`,
    body: emailWrapper(`
      <h2 style="color: #111827; margin-bottom: 16px;">Review Needed</h2>
      <p style="font-size: 16px;">A submission has been received from <strong>${submittedBy}</strong> for the task: <strong>${taskTitle}</strong>.</p>
    `),
  }),

  taskApproved: (taskTitle) => ({
    subject: `✅ Task Approved - ${taskTitle}`,
    body: emailWrapper(`
      <h2 style="color: #059669; margin-bottom: 16px;">Excellent Work!</h2>
      <p style="font-size: 16px;">Your submission for <strong>${taskTitle}</strong> has been approved.</p>
    `),
  }),

  taskRejected: (taskTitle, reason) => ({
    subject: `⚠ Revision Needed: ${taskTitle}`,
    body: emailWrapper(`
      <h2 style="color: #dc2626; margin-bottom: 16px;">Revision Required</h2>
      <div style="background-color: #fef2f2; padding: 20px; border-radius: 10px; border-left: 5px solid #dc2626; margin: 25px 0;">
        <strong style="color: #991b1b;">Feedback from Admin:</strong><br/>
        <p style="margin-top: 8px; color: #b91c1c;">${reason || 'Please check the dashboard for details.'}</p>
      </div>
    `),
  }),

  phaseChanged: (eventTitle, newPhase) => ({
    subject: `Phase Update: ${eventTitle}`,
    body: emailWrapper(`
      <h2 style="color: #111827; margin-bottom: 16px;">Event Milestone</h2>
      <p style="font-size: 16px;">The event <strong>${eventTitle}</strong> has moved to the <span style="color: #4f46e5; font-weight: bold;">${newPhase}</span> phase.</p>
    `),
  }),

  eventFinalized: (eventTitle) => ({
    subject: `✨ Success! ${eventTitle} is Finalized`,
    body: emailWrapper(`
      <h2 style="color: #4f46e5; margin-bottom: 16px;">Mission Accomplished!</h2>
      <p style="font-size: 16px;">The event <strong>${eventTitle}</strong> is now officially finalized.</p>
    `),
  }),
};

module.exports = { 
  sendEmail, 
  sendWithRetry, 
  templates 
};