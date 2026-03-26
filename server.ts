import "dotenv/config";
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import bcrypt from "bcrypt";
import mongoose, { Schema, Document } from "mongoose";
import nodemailer from "nodemailer";
 
// --- MongoDB Connection ---
mongoose.connect(process.env.MONGODB_URI || "")
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));
 
// --- Schemas ---
interface ITask {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
  priority: "low" | "medium" | "high";
  category: string;
}
 
interface IUser extends Document {
  username: string;
  password: string;
  role: "user" | "admin";
  email: string;
  resetCode?: string;
  resetCodeExpiry?: number;
  tasks: ITask[];
}
 
const TaskSchema = new Schema<ITask>({
  id: String,
  text: String,
  completed: Boolean,
  createdAt: Number,
  priority: String,
  category: String,
});
 
const UserSchema = new Schema<IUser>({
  username: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["user", "admin"], required: true },
  email: { type: String, default: "" },
  resetCode: { type: String },
  resetCodeExpiry: { type: Number },
  tasks: [TaskSchema],
});
 
const User = mongoose.model<IUser>("User", UserSchema);
 
// --- Brevo SMTP Setup ---
const transporter = nodemailer.createTransport({
  host: "smtp-relay.brevo.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.BREVO_SMTP_USER,
    pass: process.env.BREVO_SMTP_PASS,
  },
});
 
// --- Seed default users ---
async function seedDefaultUsers() {
  const adminExists = await User.findOne({ username: "admin" });
  if (!adminExists) {
    await User.create({
      username: "admin",
      password: await bcrypt.hash(process.env.ADMIN_PASSWORD || "admin123", 10),
      role: "admin",
      email: "",
      tasks: [],
    });
    console.log("Default admin user created");
  }
 
  const userExists = await User.findOne({ username: "user" });
  if (!userExists) {
    await User.create({
      username: "user",
      password: await bcrypt.hash(process.env.USER_PASSWORD || "user123", 10),
      role: "user",
      email: "",
      tasks: [],
    });
    console.log("Default user created");
  }
}
 
async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || "3000", 10);
 
  app.use(express.json());
 
  // Auth: Register
  app.post("/api/auth/register", async (req, res) => {
    const { username, password, role, email } = req.body;
    const existing = await User.findOne({ username });
    if (existing) {
      return res.status(400).json({ error: "Username already exists" });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({ username, password: hashedPassword, role, email: email || "", tasks: [] });
    res.json({ username: newUser.username, role: newUser.role });
  });
 
  // Auth: Login
  app.post("/api/auth/login", async (req, res) => {
    const { username, password, role } = req.body;
    const user = await User.findOne({ username, role });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    res.json({ username: user.username, role: user.role, email: user.email });
  });
 
  // Auth: Send Reset Code
  app.post("/api/auth/forgot-password", async (req, res) => {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: "No account found with this email" });
    }
 
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = Date.now() + 600000;
 
    await User.findByIdAndUpdate(user._id, {
      resetCode: code,
      resetCodeExpiry: expiry,
    });
 
    await transporter.sendMail({
      from: `"TaskMaster Pro" <${process.env.BREVO_SMTP_USER}>`,
      to: email,
      subject: "TaskMaster Pro — Your Reset Code",
      html: `
        <div style="font-family: sans-serif; max-width: 400px; margin: auto; padding: 2rem; border: 1px solid #e2e8f0; border-radius: 16px;">
          <h2 style="color: #4f46e5;">Reset Your Password</h2>
          <p>Use the code below to reset your password. This code expires in <strong>10 minutes</strong>.</p>
          <div style="text-align: center; margin: 2rem 0;">
            <span style="font-size: 40px; font-weight: bold; letter-spacing: 12px; color: #4f46e5;">${code}</span>
          </div>
          <p style="color: #94a3b8; font-size: 12px;">If you didn't request this, ignore this email.</p>
        </div>
      `,
    });
 
    res.json({ success: true, message: "Reset code sent to your email" });
  });
 
  // Auth: Verify Code & Reset Password
  app.post("/api/auth/reset-password", async (req, res) => {
    const { email, code, password } = req.body;
    const user = await User.findOne({
      email,
      resetCode: code,
      resetCodeExpiry: { $gt: Date.now() },
    });
 
    if (!user) {
      return res.status(400).json({ error: "Invalid or expired code" });
    }
 
    const hashedPassword = await bcrypt.hash(password, 10);
    await User.findByIdAndUpdate(user._id, {
      password: hashedPassword,
      resetCode: undefined,
      resetCodeExpiry: undefined,
    });
 
    res.json({ success: true, message: "Password reset successfully" });
  });
 
  // Profile: Get
  app.get("/api/profile", async (req, res) => {
    const username = req.query.username as string;
    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ username: user.username, email: user.email, role: user.role });
  });
 
  // Profile: Update Email
  app.post("/api/profile/update-email", async (req, res) => {
    const { username, email } = req.body;
    const existing = await User.findOne({ email, username: { $ne: username } });
    if (existing) {
      return res.status(400).json({ error: "Email already in use by another account" });
    }
    await User.findOneAndUpdate({ username }, { email });
    res.json({ success: true, message: "Email updated successfully" });
  });
 
  // Profile: Change Password
  app.post("/api/profile/change-password", async (req, res) => {
    const { username, currentPassword, newPassword } = req.body;
    const user = await User.findOne({ username });
    if (!user || !(await bcrypt.compare(currentPassword, user.password))) {
      return res.status(401).json({ error: "Current password is incorrect" });
    }
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await User.findOneAndUpdate({ username }, { password: hashedPassword });
    res.json({ success: true, message: "Password changed successfully" });
  });
 
  // Tasks: Get
  app.get("/api/tasks", async (req, res) => {
    const username = req.query.username as string;
    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user.tasks);
  });
 
  // Tasks: Sync
  app.post("/api/tasks/sync", async (req, res) => {
    const { username, tasks } = req.body;
    const user = await User.findOneAndUpdate(
      { username },
      { tasks },
      { new: true }
    );
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ success: true });
  });
 
  // Vite / Static Files
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }
 
  app.listen(PORT, "0.0.0.0", async () => {
    console.log(`Server running on http://localhost:${PORT}`);
    try {
      await seedDefaultUsers();
    } catch (err) {
      console.error("Seed error:", err);
    }
  });
}
 
startServer();
 