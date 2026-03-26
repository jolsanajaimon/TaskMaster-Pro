import React, { useState, useMemo, useEffect } from "react";
import { 
  Plus, Trash2, CheckCircle2, Circle, ListTodo, Search, Filter, 
  Calendar, Tag, AlertCircle, Sparkles, Moon, Sun, LogOut, ShieldCheck, User as UserIcon, LogIn
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface Task {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
  priority: "low" | "medium" | "high";
  category: string;
}

type FilterType = "all" | "active" | "completed";
type UserRole = "user" | "admin" | null;

interface AuthUser {
  username: string;
  role: UserRole;
}

interface UserCredentials {
  username: string;
  password: string;
  role: UserRole;
}

const CATEGORIES = ["Personal", "Work", "Shopping", "Health", "Other"];
const PRIORITIES = [
  { value: "low", label: "Low", color: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700" },
  { value: "medium", label: "Medium", color: "bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800" },
  { value: "high", label: "High", color: "bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-800" },
];

export default function App() {
  // --- Auth & Theme State ---
  const [user, setUser] = useState<AuthUser | null>(() => {
    const saved = localStorage.getItem("taskmaster_user");
    return saved ? JSON.parse(saved) : null;
  });

  // Login Form State
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem("taskmaster_theme");
    return saved === "dark";
  });

  // --- Task State ---
  const [tasks, setTasks] = useState<Task[]>([]);
  
  const [inputValue, setInputValue] = useState("");
  const [priority, setPriority] = useState<Task["priority"]>("medium");
  const [category, setCategory] = useState("Personal");
  const [filter, setFilter] = useState<FilterType>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // --- Effects ---
  
  // Fetch tasks on login
  useEffect(() => {
    if (user) {
      fetch(`/api/tasks?username=${user.username}`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setTasks(data);
          }
        })
        .catch(err => console.error("Failed to fetch tasks:", err));
    } else {
      setTasks([]);
    }
  }, [user]);

  // Sync tasks to server
  useEffect(() => {
    if (user && tasks.length > 0) {
      setIsSyncing(true);
      const timer = setTimeout(() => {
        fetch("/api/tasks/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: user.username, tasks })
        })
        .finally(() => setIsSyncing(false));
      }, 500); // Debounce sync
      return () => clearTimeout(timer);
    }
  }, [tasks, user]);

  useEffect(() => {
    localStorage.setItem("taskmaster_user", JSON.stringify(user));
  }, [user]);

  useEffect(() => {
    localStorage.setItem("taskmaster_theme", isDarkMode ? "dark" : "light");
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
      document.body.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
      document.body.classList.remove("dark");
    }
  }, [isDarkMode]);

  // --- Handlers ---
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: loginUsername, password: loginPassword, role: selectedRole })
      });
      const data = await res.json();
      if (res.ok) {
        setUser(data);
      } else {
        setLoginError(data.error || "Login failed");
      }
    } catch (err) {
      setLoginError("Server connection failed");
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");

    if (loginPassword.length < 6) {
      setLoginError("Password must be at least 6 characters");
      return;
    }

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: loginUsername, password: loginPassword, role: selectedRole })
      });
      const data = await res.json();
      if (res.ok) {
        setIsRegistering(false);
        setLoginError("Account created! Please sign in.");
        setLoginUsername("");
        setLoginPassword("");
      } else {
        setLoginError(data.error || "Registration failed");
      }
    } catch (err) {
      setLoginError("Server connection failed");
    }
  };

  const handleLogout = () => {
    setUser(null);
    setLoginUsername("");
    setLoginPassword("");
    setSelectedRole(null);
  };

  const addTask = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (inputValue.trim()) {
      const newTask: Task = {
        id: crypto.randomUUID(),
        text: inputValue.trim(),
        completed: false,
        createdAt: Date.now(),
        priority,
        category,
      };
      setTasks([newTask, ...tasks]);
      setInputValue("");
    }
  };

  const toggleTask = (id: string) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const deleteTask = (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    // Admin can delete anything, User can only delete completed tasks
    if (user?.role === "admin" || task.completed) {
      setTasks(tasks.filter(t => t.id !== id));
    }
  };

  const bulkComplete = () => {
    if (user?.role === "admin") {
      setTasks(tasks.map(t => ({ ...t, completed: true })));
    }
  };

  const clearCompleted = () => {
    setTasks(tasks.filter(t => !t.completed));
  };

  const filteredTasks = useMemo(() => {
    return tasks
      .filter(t => {
        if (filter === "active") return !t.completed;
        if (filter === "completed") return t.completed;
        return true;
      })
      .filter(t => t.text.toLowerCase().includes(searchQuery.toLowerCase()))
      .sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        const priorityMap = { high: 0, medium: 1, low: 2 };
        if (a.priority !== b.priority) return priorityMap[a.priority] - priorityMap[b.priority];
        return b.createdAt - a.createdAt;
      });
  }, [tasks, filter, searchQuery]);

  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const active = total - completed;
    return { total, completed, active };
  }, [tasks]);

  // --- Login Screen ---
  if (!user) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 bg-slate-50 dark:bg-slate-950 transition-colors duration-300 ${isDarkMode ? "dark" : ""}`}>
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-2xl shadow-slate-200/80 dark:shadow-none border border-slate-100 dark:border-slate-800"
        >
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center p-3 bg-indigo-600 rounded-2xl shadow-xl shadow-indigo-200 dark:shadow-none mb-4">
              <ListTodo className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-2">
              {selectedRole 
                ? (isRegistering ? `${selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)} Sign Up` : `${selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)} Login`)
                : "Welcome Back"}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 font-medium">
              {selectedRole ? (isRegistering ? "Create your account" : "Enter your credentials") : "Please select your login type"}
            </p>
          </div>

          {!selectedRole ? (
            <div className="space-y-4">
              <button 
                onClick={() => setSelectedRole("admin")}
                className="w-full flex items-center justify-between p-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl transition-all group shadow-lg shadow-indigo-200 dark:shadow-none"
              >
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-indigo-500 rounded-xl">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div className="text-left">
                    <div className="font-bold">Admin Login</div>
                    <div className="text-xs text-indigo-100">Full access to all features</div>
                  </div>
                </div>
                <LogIn className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>

              <button 
                onClick={() => setSelectedRole("user")}
                className="w-full flex items-center justify-between p-5 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-500 text-slate-700 dark:text-slate-200 rounded-2xl transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-xl">
                    <UserIcon className="w-6 h-6" />
                  </div>
                  <div className="text-left">
                    <div className="font-bold">User Login</div>
                    <div className="text-xs text-slate-400">Manage your personal tasks</div>
                  </div>
                </div>
                <LogIn className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            </div>
          ) : (
            <form onSubmit={isRegistering ? handleRegister : handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Username</label>
                <input 
                  type="text"
                  required
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  className="w-full px-5 py-3 bg-slate-100 dark:bg-slate-800 border-transparent focus:bg-white dark:focus:bg-slate-700 focus:ring-2 focus:ring-indigo-500/20 rounded-2xl text-sm outline-none transition-all font-medium text-slate-700 dark:text-slate-200"
                  placeholder={selectedRole === "admin" ? "admin" : "user"}
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Password</label>
                <input 
                  type="password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full px-5 py-3 bg-slate-100 dark:bg-slate-800 border-transparent focus:bg-white dark:focus:bg-slate-700 focus:ring-2 focus:ring-indigo-500/20 rounded-2xl text-sm outline-none transition-all font-medium text-slate-700 dark:text-slate-200"
                  placeholder="••••••••"
                />
              </div>

              {loginError && (
                <motion.p 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`text-xs font-bold ml-1 ${loginError.includes("Account created") ? "text-emerald-500" : "text-rose-500"}`}
                >
                  {loginError}
                </motion.p>
              )}

              <div className="flex gap-3 pt-2">
                <button 
                  type="button"
                  onClick={() => {
                    setSelectedRole(null);
                    setIsRegistering(false);
                    setLoginError("");
                  }}
                  className="flex-1 px-5 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                >
                  Back
                </button>
                <button 
                  type="submit"
                  className="flex-[2] px-5 py-3 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 dark:shadow-none transition-all"
                >
                  {isRegistering ? "Sign Up" : "Sign In"}
                </button>
              </div>

              <div className="text-center pt-2">
                <button 
                  type="button"
                  onClick={() => {
                    setIsRegistering(!isRegistering);
                    setLoginError("");
                  }}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-700 transition-colors"
                >
                  {isRegistering ? "Already have an account? Sign In" : "Don't have an account? Sign Up"}
                </button>
              </div>
            </form>
          )}

          <div className="mt-8 text-center">
             <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-3 text-slate-400 hover:text-indigo-500 transition-colors"
            >
              {isDarkMode ? <Sun className="w-6 h-6" /> : <Moon className="w-6 h-6" />}
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // --- Main App Screen ---
  return (
    <div className={`min-h-screen py-8 px-4 sm:px-6 lg:px-8 bg-slate-50 dark:bg-slate-950 transition-colors duration-300 ${isDarkMode ? "dark" : ""}`}>
      <div className="max-w-3xl mx-auto">
        {/* Header Section */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-200 dark:shadow-none">
              <ListTodo className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Task Master <span className="text-indigo-600">Pro</span>
              </h1>
              <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
                {user.role === "admin" ? <ShieldCheck className="w-3 h-3 text-indigo-500" /> : <UserIcon className="w-3 h-3 text-slate-400" />}
                {user.username}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isSyncing && (
              <div className="flex items-center gap-1 text-[10px] font-bold text-indigo-500 uppercase tracking-widest bg-indigo-50 dark:bg-indigo-900/20 px-2 py-1 rounded-lg">
                <Sparkles className="w-3 h-3 animate-spin" />
                Syncing
              </div>
            )}
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl text-slate-400 hover:text-indigo-500 hover:border-indigo-100 dark:hover:border-indigo-900 transition-all shadow-sm"
            >
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <button 
              onClick={handleLogout}
              className="p-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl text-slate-400 hover:text-rose-500 hover:border-rose-100 dark:hover:border-rose-900 transition-all shadow-sm"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <motion.div whileHover={{ y: -4 }} className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm text-center">
            <div className="text-3xl font-bold text-slate-900 dark:text-white">{stats.total}</div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Total</div>
          </motion.div>
          <motion.div whileHover={{ y: -4 }} className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm text-center">
            <div className="text-3xl font-bold text-indigo-600">{stats.active}</div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Active</div>
          </motion.div>
          <motion.div whileHover={{ y: -4 }} className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm text-center">
            <div className="text-3xl font-bold text-emerald-600">{stats.completed}</div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Done</div>
          </motion.div>
        </div>

        {/* Main Card */}
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl shadow-slate-200/80 dark:shadow-none border border-slate-100 dark:border-slate-800 overflow-hidden">
          {/* Input Area */}
          <div className="p-8 bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
            <form onSubmit={addTask} className="space-y-4">
              <div className="relative group">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Add a new task..."
                  className="w-full pl-6 pr-14 py-5 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all text-lg text-slate-700 dark:text-slate-200 placeholder:text-slate-400 font-medium shadow-sm"
                />
                <button
                  type="submit"
                  disabled={!inputValue.trim()}
                  className="absolute right-3 top-3 bottom-3 px-5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 transition-all shadow-lg shadow-indigo-200 dark:shadow-none flex items-center justify-center active:scale-95"
                >
                  <Plus className="w-6 h-6" />
                </button>
              </div>

              <div className="flex flex-wrap gap-3">
                <div className="flex items-center gap-2 bg-white dark:bg-slate-900 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                  <AlertCircle className="w-4 h-4 text-slate-400" />
                  <select 
                    value={priority} 
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="text-sm font-semibold text-slate-600 dark:text-slate-400 outline-none bg-transparent cursor-pointer"
                  >
                    <option value="low">Low Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="high">High Priority</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 bg-white dark:bg-slate-900 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                  <Tag className="w-4 h-4 text-slate-400" />
                  <select 
                    value={category} 
                    onChange={(e) => setCategory(e.target.value)}
                    className="text-sm font-semibold text-slate-600 dark:text-slate-400 outline-none bg-transparent cursor-pointer"
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>
            </form>
          </div>

          {/* Controls */}
          <div className="px-8 py-5 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row gap-5 items-center justify-between">
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl w-full md:w-auto">
              {(["all", "active", "completed"] as FilterType[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`flex-1 md:flex-none px-6 py-2 rounded-xl text-sm font-bold capitalize transition-all ${
                    filter === f
                      ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-md"
                      : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
            
            <div className="flex items-center gap-4 w-full md:w-auto">
              <div className="relative flex-grow md:w-64">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search tasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-11 pr-4 py-2.5 bg-slate-100 dark:bg-slate-800 border-transparent focus:bg-white dark:focus:bg-slate-700 focus:ring-2 focus:ring-indigo-500/20 rounded-2xl text-sm outline-none transition-all font-medium text-slate-700 dark:text-slate-200"
                />
              </div>
              
              {stats.completed > 0 && (
                <button 
                  onClick={clearCompleted}
                  className="p-2.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-all flex-shrink-0"
                  title="Clear completed tasks"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
              
              {user.role === "admin" && stats.active > 0 && (
                <button 
                  onClick={bulkComplete}
                  className="p-2.5 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-xl transition-all flex-shrink-0"
                  title="Admin: Bulk complete all tasks"
                >
                  <CheckCircle2 className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          {/* Task List */}
          <div className="max-h-[600px] overflow-y-auto p-8">
            <ul className="space-y-4">
              <AnimatePresence mode="popLayout">
                {filteredTasks.length > 0 ? (
                  filteredTasks.map((t) => {
                    const priorityStyle = PRIORITIES.find(p => p.value === t.priority);
                    return (
                      <motion.li
                        key={t.id}
                        layout
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -40 }}
                        className={`group flex items-center gap-5 p-5 rounded-[1.5rem] border-2 transition-all ${
                          t.completed
                            ? "bg-slate-50/50 dark:bg-slate-800/30 border-slate-100 dark:border-slate-800"
                            : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-indigo-100 dark:hover:border-indigo-900 hover:shadow-xl hover:shadow-indigo-500/5"
                        }`}
                      >
                        <button
                          onClick={() => toggleTask(t.id)}
                          className={`flex-shrink-0 transition-all transform active:scale-90 ${
                            t.completed ? "text-emerald-500" : "text-slate-300 dark:text-slate-600 group-hover:text-indigo-400"
                          }`}
                        >
                          {t.completed ? (
                            <CheckCircle2 className="w-8 h-8" />
                          ) : (
                            <Circle className="w-8 h-8" />
                          )}
                        </button>
                        
                        <div className="flex-grow min-w-0">
                          <div className="flex items-center gap-3 mb-1.5 flex-wrap">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${priorityStyle?.color}`}>
                              {priorityStyle?.label}
                            </span>
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800">
                              {t.category}
                            </span>
                            <span className="text-[10px] font-bold text-slate-300 dark:text-slate-600 flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(t.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <span
                            className={`block text-base font-semibold transition-all truncate ${
                              t.completed ? "text-slate-400 dark:text-slate-600 line-through" : "text-slate-700 dark:text-slate-200"
                            }`}
                          >
                            {t.text}
                          </span>
                        </div>

                        {(user.role === "admin" || t.completed) && (
                          <button
                            onClick={() => deleteTask(t.id)}
                            className="flex-shrink-0 p-3 text-slate-300 dark:text-slate-600 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-2xl transition-all opacity-0 group-hover:opacity-100"
                            title={user.role === "admin" ? "Admin: Delete task" : "Delete completed task"}
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        )}
                      </motion.li>
                    );
                  })
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="py-20 text-center"
                  >
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-full mb-6">
                      <Filter className="w-10 h-10 text-slate-200 dark:text-slate-700" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">No tasks found</h3>
                    <p className="text-slate-400 dark:text-slate-500 font-medium">
                      {searchQuery ? "Try a different search term" : "Start by adding your first task above"}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </ul>
          </div>
          
          {/* Footer */}
          <div className="px-8 py-6 bg-slate-50/50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <p className="text-[10px] font-extrabold text-slate-400 dark:text-slate-600 uppercase tracking-[0.3em]">
              Task Master Pro
            </p>
            <div className="flex gap-4">
               <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
               <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse delay-75" />
               <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse delay-150" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
