# 📅 ClubEvents - Event Management Platform

A full-stack MERN application designed to streamline university and college club operations. ClubEvents manages the entire event lifecycle—from pre-event task delegation to post-event public reports—featuring role-based dashboards, automated email notifications, and AI-generated event summaries.

## ✨ Key Features

* **Role-Based Access Control (RBAC):** Dedicated workflows and dashboards for Admins, Sub-Admins, and Volunteers.
* **Approval Workflows:** Secure registration system where Sub-Admins and Volunteers must be approved by an Admin before accessing the platform.
* **Event Lifecycle Management:** Track events through `pre-event`, `during-event`, and `post-event` phases.
* **Task Delegation:** Assign tasks to volunteers with priority levels, deadlines, and image submission capabilities.
* **AI-Powered Reporting:** Integrates with Google Gemini AI to automatically generate professional, Markdown-formatted post-event reports based on approved tasks and utilized budgets.
* **Public Event Gallery:** A public-facing portal where anyone can view finalized event reports and image galleries.
* **Automated Email Notifications:** Sends real-time alerts via Nodemailer for account approvals, account deletions, task assignments, and event phase changes.
* **Cloud Media Storage:** Secure image uploading and management using Cloudinary.

## 🛠️ Tech Stack

**Frontend:**
* React (Vite)
* Tailwind CSS v4
* React Router DOM
* React Hook Form + Zod (Validation)
* Lucide React (Icons)
* React Markdown + Tailwind Typography (Report Rendering)

**Backend:**
* Node.js & Express.js
* MongoDB & Mongoose
* JSON Web Tokens (JWT) for Authentication
* Google Generative AI SDK (Gemini 1.5 Flash)
* Cloudinary & Multer (Memory Storage)
* Nodemailer (SMTP via Google App Passwords)

## 🚀 Getting Started

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) and [Git](https://git-scm.com/) installed on your machine. You will also need a MongoDB database (like MongoDB Atlas).

### 1. Clone the repository
\`\`\`bash
git clone https://github.com/Mindflayer09/Event-Management-Jims-
cd clubevents
\`\`\`

### 2. Backend Setup
Navigate to the backend directory, install dependencies, and set up your environment variables.

\`\`\`bash
cd backend
npm install
\`\`\`

Create a `.env` file in the `backend` folder and add the following keys:
\`\`\`env
# Server Setup
PORT=5000
NODE_ENV=development

# Database
MONGO_URI=your_mongodb_connection_string

# Authentication
JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRE=30d

# Cloudinary (Image Uploads)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Nodemailer (Email Notifications)
SMTP_USER=your_gmail_address@gmail.com
SMTP_PASS=your_16_character_google_app_password
EMAIL_FROM=your_gmail_address@gmail.com

# Google Gemini AI (Automated Reports)
GEMINI_API_KEY=your_google_ai_studio_api_key
\`\`\`

Start the backend server:
\`\`\`bash
npm run dev
\`\`\`

### 3. Frontend Setup
Open a new terminal, navigate to the frontend directory, install dependencies, and set up your environment variables.

\`\`\`bash
cd frontend
npm install
\`\`\`

Create a `.env` file in the `frontend` folder:
\`\`\`env
VITE_API_URL=http://localhost:5000/api
\`\`\`

Start the Vite development server:
\`\`\`bash
npm run dev
\`\`\`

## 🌐 Deployment Notes

* **Frontend (Vercel/Netlify):** Ensure you add a `vercel.json` or `_redirects` file to handle React Router's single-page application routing to prevent `404 Not Found` errors on page refresh.
* **Backend (Render/Heroku):** Do not forget to add all backend `.env` variables to your hosting provider's Environment Variables dashboard. If using MongoDB Atlas, ensure your Network Access IP is set to `0.0.0.0/0` to allow external cloud connections.

## 🤝 Contributing
Contributions, issues, and feature requests are welcome! 

## 📝 License
This project is open-source and available under the [MIT License](LICENSE).
