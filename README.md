📅 PlannEx - Event Management Platform
A comprehensive, full-stack MERN application engineered to streamline operations for university and college organizations. PlannEx manages the entire event lifecycle—from pre-event task delegation to post-event public reports—featuring role-based dashboards, passwordless authentication, automated SendGrid email notifications, and AI-generated event summaries.

✨ Key Features
Passwordless Authentication: Frictionless and secure login/registration flow using email-based OTP (One-Time Password) verification.

Role-Based Access Control (RBAC): Dedicated workflows, permissions, and dashboards for Organization Admins, Sub-Admins, and Volunteers.

Approval Workflows: Secure gatekeeping system requiring Admin approval for new users before granting workspace access.

Event Lifecycle Management: Seamlessly track and transition events through pre-event, during-event, and post-event phases.

Task Delegation & Tracking: Assign actionable tasks to volunteers complete with priority levels, strict deadlines, and image submission capabilities.

AI-Powered Reporting: Native integration with Google Gemini AI to automatically synthesize approved tasks and budget data into professional, Markdown-formatted post-event reports.

Public Event Gallery: A responsive, public-facing portal where visitors can view finalized event reports and media galleries.

Automated Email Notifications: Real-time, asynchronous email alerts powered by Twilio SendGrid for account approvals, task assignments, and milestone updates.

Cloud Media Storage: Secure, optimized image uploading and management utilizing Cloudinary.

🛠️ Tech Stack
Frontend:

React (Vite)

Tailwind CSS v4

React Router DOM

React Hook Form + Zod (Schema Validation)

Lucide React (Icons)

React Markdown + Tailwind Typography

Backend:

Node.js & Express.js

MongoDB & Mongoose

JSON Web Tokens (JWT) for session management

Twilio SendGrid API (Transactional Emails)

Google Generative AI SDK (Gemini 1.5 Flash)

Cloudinary & Multer (Media Storage)

🚀 Getting Started
Prerequisites
Ensure you have Node.js and Git installed on your machine, along with a MongoDB database (e.g., MongoDB Atlas).

1. Clone the repository
Bash
git clone https://github.com/Mindflayer09/PlannEx-EMS.git
cd PlannEx-EMS
2. Backend Setup
Navigate to the backend directory, install the required dependencies, and configure your environment variables.

Bash
cd backend
npm install
Create a .env file in the root of the backend directory:

Code snippet
# Server Configuration
PORT=5000
NODE_ENV=development

# Database
MONGO_URI=your_mongodb_connection_string

# Authentication
JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRE=30d

# Cloudinary (Media Uploads)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Twilio SendGrid (Email Notifications & OTP)
SENDGRID_API_KEY=SG.your_sendgrid_api_key
SENDGRID_VERIFIED_SENDER=your_verified_email@domain.com

# Google Gemini AI (Automated Reports)
GEMINI_API_KEY=your_google_ai_studio_api_key
Start the backend development server:

Bash
npm run dev
3. Frontend Setup
Open a new terminal window, navigate to the frontend directory, install dependencies, and link it to your local API.

Bash
cd frontend
npm install
Create a .env file in the root of the frontend directory:

Code snippet
VITE_API_URL=http://localhost:5000
Start the Vite development server:

Bash
npm run dev
🌐 Deployment Notes
Frontend (Vercel/Netlify): Ensure you add a vercel.json or _redirects file to handle React Router's SPA routing. This prevents 404 Not Found errors upon page refresh.

Backend (Render/Heroku): Add all backend .env variables to your cloud provider's environment dashboard. If using MongoDB Atlas, verify your Network Access IP is set to 0.0.0.0/0 to permit external cloud connections.

🤝 Contributing
Contributions, issues, and feature requests are highly welcome! Feel free to check the issues page if you want to contribute.

📝 License
This project is open-source and available under the MIT License.
