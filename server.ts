import "dotenv/config";
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import bcrypt from "bcrypt";
import mongoose, { Schema, Document } from "mongoose";
import nodemailer from "nodemailer";
import crypto from "crypto";
 
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
  resetToken?: string;
  resetTokenExpiry?: number;
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
  resetToken: { type: String },
  resetTokenExpiry: { type: Number },
  tasks: [TaskSchema],
});
 
const User = mongoose.model<IUser>("User", UserSchema);
 
// --- Nodemailer Setup ---
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
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
    res.json({ username: user.username, role: user.role });
  });
 
  // Auth: Forgot Password
  app.post("/api/auth/forgot-password", async (req, res) => {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: "No account found with this email" });
    }
 
    const token = crypto.randomBytes(32).toString("hex");
    const expiry = Date.now() + 3600000; // 1 hour
 
    await User.findByIdAndUpdate(user._id, {
      resetToken: token,
      resetTokenExpiry: expiry,
    });
 
    const resetUrl = `${process.env.APP_URL}/reset-password?token=${token}`;
 
    await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: email,
      subject: "TaskMaster Pro — Password Reset",
      html: `
        <div style="font-family: sans-serif; max-width: 400px; margin: auto; padding: 2rem; border: 1px solid #e2e8f0; border-radius: 16px;">
          <h2 style="color: #4f46e5;">Reset Your Password</h2>
          <p>Click the button below to reset your password. This link expires in 1 hour.</p>
          <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background: #4f46e5; color: white; border-radius: 8px; text-decoration: none; font-weight: bold;">Reset Password</a>
          <p style="color: #94a3b8; font-size: 12px; margin-top: 1rem;">If you didn't request this, ignore this email.</p>
        </div>
      `,
    });
 
    res.json({ success: true, message: "Reset link sent to your email" });
  });
 
  // Auth: Reset Password
  app.post("/api/auth/reset-password", async (req, res) => {
    const { token, password } = req.body;
    const user = await User.findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: Date.now() },
    });
 
    if (!user) {
      return res.status(400).json({ error: "Invalid or expired reset link" });
    }
 
    const hashedPassword = await bcrypt.hash(password, 10);
    await User.findByIdAndUpdate(user._id, {
      password: hashedPassword,
      resetToken: undefined,
      resetTokenExpiry: undefined,
    });
 
    res.json({ success: true, message: "Password reset successfully" });
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