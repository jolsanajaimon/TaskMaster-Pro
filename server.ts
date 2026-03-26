import "dotenv/config";
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import bcrypt from "bcrypt";
import mongoose, { Schema, Document } from "mongoose";
 
// --- MongoDB Connection ---
const MONGODB_URI = process.env.MONGODB_URI || "";
 
mongoose.connect(MONGODB_URI)
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
  tasks: [TaskSchema],
});
 
const User = mongoose.model<IUser>("User", UserSchema);
 
// --- Seed default users ---
async function seedDefaultUsers() {
  const adminExists = await User.findOne({ username: "admin" });
  if (!adminExists) {
    await User.create({
      username: "admin",
      password: await bcrypt.hash(process.env.ADMIN_PASSWORD || "admin123", 10),
      role: "admin",
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
    const { username, password, role } = req.body;
    const existing = await User.findOne({ username });
    if (existing) {
      return res.status(400).json({ error: "Username already exists" });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({ username, password: hashedPassword, role, tasks: [] });
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