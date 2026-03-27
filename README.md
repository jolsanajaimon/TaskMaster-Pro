# TaskMaster Pro

A full-stack task management app built with React, TypeScript, Express, and MongoDB. Features role-based authentication, an admin dashboard for managing users and assigning tasks, forgot password via email, dark mode, and real-time sync across all devices.

## 🚀 Live Demo

Check out the live site: https://taskmaster-pro-1ooi.onrender.com

---

## Screenshots

### Login Screen
![Login Screen](screenshots/login.png)

### Admin Dashboard
![Admin Dashboard](screenshots/admin.png)

### User Task Manager
![User Tasks](screenshots/user.png)

> To add screenshots: create a `screenshots/` folder, take screenshots of the app, save them and push to GitHub.

---

## Features

### Admin
- 👥 View all registered users with task statistics
- 📋 View any user's task list
- ➕ Assign tasks to specific users with priority and category
- 🗑️ Delete user accounts
- 🔑 Reset any user's password directly from the dashboard

### User
- ✅ Add, complete, and delete tasks
- 🏷️ Set priority (High, Medium, Low) and category
- 🔍 Search and filter tasks (All / Active / Completed)
- 👤 Edit profile — update email and change password
- 📧 Forgot password with 6-digit code via email
- 🌙 Dark mode with persistent preference

### App
- 💾 Data persists across devices (MongoDB Atlas)
- 🔐 Passwords hashed with bcrypt
- 📱 Accessible from any device worldwide
- 🚀 Deployed on Render with UptimeRobot keep-alive

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React, TypeScript, Tailwind CSS, Framer Motion |
| Backend | Express.js, TypeScript |
| Database | MongoDB Atlas (Mongoose) |
| Email | Brevo HTTP API |
| Build tool | Vite |
| Deployment | Render |
| Monitoring | UptimeRobot |

---

## Getting Started

### Prerequisites
- Node.js v18+
- npm
- MongoDB Atlas account
- Brevo account (for email)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/jolsanajaimon/TaskMaster-Pro.git
cd TaskMaster-Pro
```

2. Install dependencies:
```bash
npm install --include=dev
```

3. Create a `.env` file:
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/taskmaster
ADMIN_PASSWORD=your_admin_password
BREVO_API_KEY=your_brevo_api_key
APP_URL=http://localhost:3000
NODE_ENV=development
```

4. Run the server:
```bash
node dist-server/server.js
```

5. Open your browser at `http://localhost:3000`

---

## Default Credentials

| Role | Username | Password |
|------|----------|----------|
| Admin | admin | *(set in .env)* |

> Regular users register through the app.

---

## Role Permissions

| Feature | Admin | User |
|---------|-------|------|
| View all users | ✅ | ❌ |
| Assign tasks to users | ✅ | ❌ |
| Delete user accounts | ✅ | ❌ |
| Reset any user's password | ✅ | ❌ |
| Add own tasks | ❌ | ✅ |
| Complete tasks | ✅ | ✅ |
| Delete completed tasks | ✅ | ✅ |
| Edit own profile | ✅ | ✅ |
| Forgot password via email | ✅ | ✅ |

---

## Deployment

This app is deployed on [Render](https://render.com).

### Deploy your own instance:
1. Push your code to GitHub
2. Create a new **Web Service** on Render
3. Connect your GitHub repo
4. Set **Build Command:** `npm install --include=dev`
5. Set **Start Command:** `node dist-server/server.js`
6. Add all environment variables
7. Click **Deploy**

### Keep alive with UptimeRobot:
- Go to [uptimerobot.com](https://uptimerobot.com)
- Create a free HTTP monitor for your Render URL
- Set interval to 5 minutes
- Your app will stay awake 24/7 for free!

---

## Updating the App

After making changes locally:

```bash
npx vite build
./node_modules/.bin/tsc --outDir dist-server server.ts --module nodenext --moduleResolution nodenext --target es2020 --esModuleInterop --skipLibCheck
git add .
git commit -m "describe your changes"
git push
```

Render will auto-redeploy on every push.

---

## Roadmap

Here are the features planned for future versions of TaskMaster Pro:

- 📅 **Due dates** — set deadlines for tasks with reminders
- 🔔 **Email notifications** — notify users when a task is assigned to them
- 📊 **Analytics dashboard** — charts showing task completion rates over time
- 🏷️ **Custom categories** — let users create their own task categories
- 👥 **Team workspaces** — group users into teams with shared task boards
- 📎 **File attachments** — attach files or images to tasks
- 💬 **Task comments** — add notes or comments to individual tasks
- 📱 **Mobile app** — native iOS and Android apps
- 🌍 **Multi-language support** — support for multiple languages
- 🔗 **Task dependencies** — link tasks so one must be completed before another
```

*Built with ❤️ by Jolsana Jaimon*
