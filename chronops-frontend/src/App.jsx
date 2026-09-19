import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Sparkles, Clock, AlertCircle, Search, Plus, Radio, Shield, Users, CheckCircle2 } from 'lucide-react';

const API_BASE = "http://127.0.0.1:8000";

export default function App() {
  const [sessions, setSessions] = useState([
    { id: 1, title: "Opening Ceremony", start_time: "9:00 AM", status: "completed" },
    { id: 2, title: "Guest Speaker: Dr. Gupta", start_time: "9:15 AM", status: "live" },
    { id: 3, title: "Workshop", start_time: "9:45 AM", status: "upcoming" }
  ]);
  
  const [tasks, setTasks] = useState([
    { id: 1, title: "Welcome back! HackGenesis 2026", status: "backlog", assignee: "Priya" },
    { id: 2, title: "Benamed park with resectly updates", status: "backlog", assignee: "Rahul" },
    { id: 3, title: "Consrinued derinder I: fintching", status: "todo", assignee: "Amit" },
    { id: 4, title: "Record: event marteting", status: "todo", assignee: "Sneha" },
    { id: 5, title: "Event host product", status: "todo", assignee: "Priya" },
    { id: 6, title: "Complesanten toaigo", status: "in_progress", assignee: "Rahul" },
    { id: 7, title: "Volunteer email tasks", status: "in_progress", assignee: "Amit" },
    { id: 8, title: "Conscribed: HackGenesis 20", status: "done", assignee: "Sneha" }
  ]);

  const [rawNotes, setRawNotes] = useState('');
  const [loadingAI, setLoadingAI] = useState(false);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/tasks`);
      if (res.data && res.data.length > 0) {
        // Map backend tasks to Kanban status format if available
        const mapped = res.data.map(t => ({ ...t, status: t.status || 'todo' }));
        setTasks(prev => [...mapped, ...prev]);
      }
    } catch (err) {
      console.log("Backend offline or empty tasks, using default UI state.");
    }
  };

  const handleSimulateDelay = async (minutes) => {
    try {
      const res = await axios.post(`${API_BASE}/api/sessions/simulate-delay`, {
        session_id: 2,
        delay_minutes: minutes
      });
      if (res.data.sessions) {
        setSessions(res.data.sessions);
      }
    } catch (err) {
      alert(`Simulated cascade delay of +${minutes}m applied to live stage flow!`);
    }
  };

  const handleParseNotes = async () => {
    if (!rawNotes.trim()) return;
    setLoadingAI(true);
    try {
      const res = await axios.post(`${API_BASE}/api/meetings/parse`, { raw_text: rawNotes });
      if (res.data.tasks) {
        const newItems = res.data.tasks.map((t, idx) => ({
          id: Date.now() + idx,
          title: t.title,
          status: 'todo',
          assignee: t.assigned_to
        }));
        setTasks(prev => [...newItems, ...prev]);
        setRawNotes('');
      }
    } catch (err) {
      alert("Error parsing notes with Gemini. Ensure backend is running.");
    } finally {
      setLoadingAI(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans">
      {/* Top Header Bar */}
      <header className="bg-slate-950 border-b border-slate-800 px-6 py-3 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2 text-indigo-400 font-bold text-lg">
            <div className="bg-indigo-600 text-white p-1.5 rounded-lg">⚡</div>
            <span>ClubOps Studio</span>
          </div>
          <nav className="flex space-x-2">
            <button className="px-3 py-1.5 bg-slate-800 text-slate-200 rounded-lg text-xs font-medium flex items-center space-x-1.5 border border-slate-700">
              <Shield size={14} />
              <span>Operations</span>
            </button>
            <button className="px-3 py-1.5 bg-slate-900 text-slate-400 hover:text-slate-200 rounded-lg text-xs font-medium flex items-center space-x-1.5">
              <Radio size={14} className="text-emerald-400" />
              <span>Live Stage</span>
            </button>
          </nav>
        </div>

        <div className="flex items-center space-x-4">
          <button className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 shadow-lg shadow-indigo-600/20">
            <Radio size={14} />
            <span>Go Live</span>
          </button>
          <div className="relative">
            <Search className="absolute left-3 top-2 text-slate-500" size={14} />
            <input 
              type="text" 
              placeholder="Global Search" 
              className="bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-4 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500 w-48"
            />
          </div>
          <button className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium flex items-center space-x-1 border border-slate-700">
            <Plus size={14} />
            <span>Add New</span>
          </button>
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-xs font-bold text-white shadow">
            P
          </div>
        </div>
      </header>

      {/* Sub-header Controls */}
      <div className="max-w-[1600px] mx-auto px-6 py-4 flex justify-between items-center border-b border-slate-800/60">
        <div className="flex items-center space-x-2 text-lg font-bold">
          <Clock className="text-indigo-400" size={20} />
          <span>Dashboard</span>
        </div>
        <div className="flex space-x-3">
          <button className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium border border-slate-700 flex items-center space-x-1">
            <Plus size={13} />
            <span>Add Plan</span>
          </button>
          <button className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 border border-indigo-500/30 rounded-lg text-xs font-medium flex items-center space-x-1">
            <Users size={13} />
            <span>Edit Stage</span>
          </button>
        </div>
      </div>

      {/* 3-Column Dashboard Grid Layout */}
      <main className="max-w-[1600px] mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Column 1: Club Intelligence & Health Radars (3 Cols) */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-4 shadow-xl">
            <div className="flex items-center space-x-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              <Sparkles size={14} className="text-indigo-400" />
              <span>Club Intelligence</span>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-3.5 space-y-3">
              <div className="flex items-center space-x-2 text-sm font-semibold text-indigo-300">
                <span>🎙️ Voice command</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Welcome back! What are we organizing today? Tap the mic or type notes below.
              </p>
              <textarea 
                rows={2}
                value={rawNotes}
                onChange={(e) => setRawNotes(e.target.value)}
                placeholder="Paste notes for Gemini AI..."
                className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 resize-none"
              />
              <button 
                onClick={handleParseNotes}
                disabled={loadingAI}
                className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-medium transition shadow">
                {loadingAI ? "Processing AI..." : "Extract Tasks with AI"}
              </button>
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-4 shadow-xl space-y-4">
            <div className="flex items-center space-x-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              <Shield size={14} className="text-emerald-400" />
              <span>Event Health Radar</span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 text-center">
              <p className="text-xs text-slate-400 mb-1">Task Completion</p>
              <div className="text-2xl font-bold text-emerald-400">78%</div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                <div className="bg-emerald-500 h-full w-[78%]"></div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 text-center">
                <p className="text-[11px] text-slate-400 mb-1">Risk Level</p>
                <div className="text-sm font-bold text-amber-400">Low (12%)</div>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 text-center">
                <p className="text-[11px] text-slate-400 mb-1">Volunteer Allocation</p>
                <div className="text-sm font-bold text-indigo-400">94%</div>
              </div>
            </div>
          </div>
        </div>

        {/* Column 2: Kanban Workflow Board (6 Cols) */}
        <div className="lg:col-span-6 bg-slate-950 border border-slate-800/80 rounded-xl p-5 shadow-xl">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-sm">Workflow: HackGenesis 2026</span>
            </div>
            <div className="flex items-center space-x-2 text-slate-400">
              <Search size={14} />
              <span className="text-xs">...</span>
            </div>
          </div>

          {/* Kanban Columns Grid */}
          <div className="grid grid-cols-4 gap-3">
            
            {/* Backlog */}
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-lg p-2.5 space-y-2.5">
              <div className="bg-indigo-950/60 border border-indigo-800/40 text-indigo-300 text-xs font-semibold px-2 py-1 rounded">
                Backlog
              </div>
              {tasks.filter(t => t.status === 'backlog').map(t => (
                <div key={t.id} className="bg-slate-950 border border-slate-800 p-2.5 rounded shadow text-xs">
                  <p className="font-medium text-slate-200 mb-1">{t.title}</p>
                  <span className="text-[10px] text-indigo-400">@{t.assignee || 'Unassigned'}</span>
                </div>
              ))}
            </div>

            {/* To Do */}
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-lg p-2.5 space-y-2.5">
              <div className="bg-sky-950/60 border border-sky-800/40 text-sky-300 text-xs font-semibold px-2 py-1 rounded">
                To Do
              </div>
              {tasks.filter(t => t.status === 'todo').map(t => (
                <div key={t.id} className="bg-slate-950 border border-slate-800 p-2.5 rounded shadow text-xs">
                  <p className="font-medium text-slate-200 mb-1">{t.title}</p>
                  <span className="text-[10px] text-indigo-400">@{t.assignee || 'Unassigned'}</span>
                </div>
              ))}
            </div>

            {/* In Progress */}
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-lg p-2.5 space-y-2.5">
              <div className="bg-amber-950/60 border border-amber-800/40 text-amber-300 text-xs font-semibold px-2 py-1 rounded">
                In Progress
              </div>
              {tasks.filter(t => t.status === 'in_progress').map(t => (
                <div key={t.id} className="bg-slate-950 border border-slate-800 p-2.5 rounded shadow text-xs">
                  <p className="font-medium text-slate-200 mb-1">{t.title}</p>
                  <span className="text-[10px] text-indigo-400">@{t.assignee || 'Unassigned'}</span>
                </div>
              ))}
            </div>

            {/* Done */}
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-lg p-2.5 space-y-2.5">
              <div className="bg-emerald-950/60 border border-emerald-800/40 text-emerald-300 text-xs font-semibold px-2 py-1 rounded">
                Done
              </div>
              {tasks.filter(t => t.status === 'done').map(t => (
                <div key={t.id} className="bg-slate-950 border border-slate-800 p-2.5 rounded shadow text-xs">
                  <p className="font-medium text-slate-200 mb-1">{t.title}</p>
                  <span className="text-[10px] text-emerald-400">✓ Completed</span>
                </div>
              ))}
            </div>

          </div>
        </div>

        {/* Column 3: Live Flow Preview & Quick AI Tools (3 Cols) */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-4 shadow-xl space-y-3">
            <div className="flex items-center space-x-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              <Clock size={14} className="text-indigo-400" />
              <span>Live Flow Preview</span>
            </div>

            <div className="space-y-2">
              <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-lg flex justify-between items-center text-xs">
                <div>
                  <p className="font-semibold text-slate-200">9:00 AM - Opening</p>
                </div>
                <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-[10px]">Completed</span>
              </div>

              <div className="bg-slate-900 border border-indigo-500/40 p-2.5 rounded-lg space-y-1 text-xs shadow-md">
                <div className="flex justify-between items-center">
                  <p className="font-semibold text-indigo-300">9:15 AM - Dr. Gupta</p>
                  <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded text-[10px]">Live</span>
                </div>
                <p className="text-[11px] text-slate-400">Phonetic: Dr. GOOP-ta</p>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-lg flex justify-between items-center text-xs">
                <div>
                  <p className="font-semibold text-slate-400">9:45 AM - Workshop</p>
                </div>
                <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded text-[10px]">Up Next</span>
              </div>
            </div>

            {/* Cascade Delay Trigger Buttons */}
            <div className="pt-2 border-t border-slate-800">
              <p className="text-[11px] text-slate-400 mb-2 font-medium">Cascade Delay Simulator</p>
              <div className="flex space-x-2">
                <button 
                  onClick={() => handleSimulateDelay(5)} 
                  className="flex-1 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded text-xs font-semibold transition">
                  +5m Delay
                </button>
                <button 
                  onClick={() => handleSimulateDelay(10)} 
                  className="flex-1 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded text-xs font-semibold transition">
                  +10m Delay
                </button>
              </div>
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-4 shadow-xl space-y-3">
            <div className="flex items-center space-x-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              <Sparkles size={14} className="text-purple-400" />
              <span>Quick AI Tools</span>
            </div>
            <div className="space-y-2">
              <button className="w-full text-left bg-slate-900 hover:bg-slate-800 border border-slate-800 p-2.5 rounded-lg text-xs font-medium text-slate-200 transition">
                ✨ Generate 1-Min Filler Script
              </button>
              <button className="w-full text-left bg-slate-900 hover:bg-slate-800 border border-slate-800 p-2.5 rounded-lg text-xs font-medium text-slate-200 transition">
                ✉️ Draft Volunteer Email
              </button>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}