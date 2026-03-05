import React, { useState, useEffect, useRef } from 'react';
import { User, Role } from '../types';
import { 
  Factory, Lock, User as UserIcon, ArrowRight, HardHat, ShieldAlert, 
  ShieldX, ShieldCheck, Info, Zap, Server, Database, Activity, 
  MessageSquare, Send, X, Bot, Loader2, ChevronRight, Sparkles,
  Briefcase, Mail, Phone, IdCard, UserPlus, LogIn, ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { chatWithAI } from '../services/geminiService';
import { DEPARTMENTS, SYSTEM_ROLES } from '../constants';

interface LoginProps {
  users: User[];
  onLogin: (username: string, success: boolean, user?: User) => void;
  onRegister: (userData: Partial<User>) => void;
  forcePasswordChange: boolean;
}

const Login: React.FC<LoginProps> = ({ users, onLogin, onRegister, forcePasswordChange }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [regData, setRegData] = useState({
    name: '',
    employeeId: '',
    department: '',
    role: 'VIEWER' as Role,
    username: '',
    password: '',
    email: '',
    phone: ''
  });

  // AI Bot State
  const [isBotOpen, setIsBotOpen] = useState(false);
  const [botInput, setBotInput] = useState('');
  const [botMessages, setBotMessages] = useState<{role: 'user' | 'model', text: string}[]>([
    { role: 'model', text: 'Welcome to Marmonil Support. I can help with system navigation, troubleshooting, and safety procedures. How can I assist you today?' }
  ]);
  const [isBotLoading, setIsBotLoading] = useState(false);
  const botEndRef = useRef<HTMLDivElement>(null);

  // What's New Accordion State
  const [expandedUpdateIndex, setExpandedUpdateIndex] = useState<number | null>(0);

  const WHATS_NEW = [
    { 
      title: "Added Maintenance AI Assistant", 
      desc: "The AI assistant helps engineers diagnose machine issues, provide troubleshooting steps, and guide maintenance procedures in real time.", 
      date: "Mar 2026" 
    },
    { 
      title: "Improved Work Order Tracking", 
      desc: "Work orders now have better lifecycle tracking, status visibility, and faster assignment for maintenance teams.", 
      date: "Feb 2026" 
    },
    { 
      title: "New Calibration Module", 
      desc: "The calibration module tracks measurement tools, schedules calibration tasks, and alerts engineers before calibration deadlines.", 
      date: "Jan 2026" 
    },
    { 
      title: "Faster Machine Diagnostics", 
      desc: "Improved diagnostic engine for faster detection of machine faults and maintenance alerts.", 
      date: "Dec 2025" 
    },
    { 
      title: "UI Performance Improvements", 
      desc: "Smoother transitions and faster load times across all modules.", 
      date: "Nov 2025" 
    }
  ];

  useEffect(() => {
    if (forcePasswordChange) {
      setError('IMPORTANT: Please change your password immediately after logging in.');
    }
  }, [forcePasswordChange]);

  useEffect(() => {
    if (isBotOpen) {
      botEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [botMessages, isBotOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());
    
    if (user) {
      if (user.isLocked) {
        setError('CRITICAL: Account locked due to security policy. Contact administrator.');
        onLogin(username, false, user);
        return;
      }
      if (!user.active) {
        setError('Authorization pending or revoked. Access denied.');
        onLogin(username, false, user);
        return;
      }
      if (user.password === password) {
        onLogin(username, true, user);
      } else {
        setError(`Invalid credentials. Attempt ${user.failedAttempts + 1} of 5.`);
        onLogin(username, false, user);
        setPassword('');
      }
    } else {
      setError('Unknown identifier. Access denied.');
      setPassword('');
    }
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (!regData.username || !regData.password || !regData.name || !regData.employeeId) {
        throw new Error('Please fill in all required fields.');
      }
      onRegister(regData);
      setSuccessMessage('Registration request submitted successfully! Please wait for administrator approval.');
      setIsRegistering(false);
      // Clear form
      setRegData({
        name: '',
        employeeId: '',
        department: '',
        role: 'VIEWER' as Role,
        username: '',
        password: '',
        email: '',
        phone: ''
      });
    } catch (err: any) {
      setError(err.message || 'Registration failed.');
    }
  };

  const handleBotSend = async () => {
    if (!botInput.trim()) return;
    const userMsg = botInput;
    setBotMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setBotInput('');
    setIsBotLoading(true);

    try {
      const response = await chatWithAI(
        `You are a login assistant for the Marmonil Maintenance System. 
        Help the user with system navigation, troubleshooting, work orders, machine alarms, and safety.
        User asked: ${userMsg}`,
        botMessages.slice(-5)
      );
      setBotMessages(prev => [...prev, { role: 'model', text: response || "I'm sorry, I couldn't process that request." }]);
    } catch (err) {
      setBotMessages(prev => [...prev, { role: 'model', text: "Connection error. Please try again later." }]);
    } finally {
      setIsBotLoading(false);
    }
  };

  return (
    <div className="w-full max-w-6xl flex flex-col lg:flex-row gap-8 items-stretch animate-in fade-in zoom-in duration-700">
      {/* Left Side: Login Form */}
      <motion.div 
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        className="w-full lg:w-1/2 bg-white/40 backdrop-blur-3xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col border border-white/30"
      >
        <div className="p-10 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full opacity-5">
             <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg"><defs><pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M 20 0 L 0 0 0 20" fill="none" stroke="white" strokeWidth="1"/></pattern></defs><rect width="100%" height="100%" fill="url(#grid)" /></svg>
          </div>
          <div className="relative z-10 flex flex-col items-center">
            <div className="bg-slate-900/10 p-4 rounded-3xl backdrop-blur-md border border-slate-900/10 mb-6 shadow-xl">
              <Factory className="w-10 h-10 text-slate-900" />
            </div>
            <h1 className="text-5xl font-black text-slate-900 mb-2 tracking-tighter">MARMONIL</h1>
            <div className="flex items-center gap-2 text-blue-600 font-black tracking-[0.3em] text-[10px] uppercase">
              <span className="w-8 h-[2px] bg-blue-600"></span>
              <span>Secure Engine v5.5</span>
              <span className="w-8 h-[2px] bg-blue-600"></span>
            </div>
          </div>
        </div>

        <div className="p-10 flex-1 flex flex-col">
          <AnimatePresence mode="wait">
            {!isRegistering ? (
              <motion.div
                key="login-form"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex-1 flex flex-col"
              >
                <form onSubmit={handleSubmit} className="space-y-6 flex-1">
                  {error && (
                    <div className="bg-red-500/10 backdrop-blur-md border border-red-500/20 p-4 rounded-2xl animate-in fade-in slide-in-from-top-2">
                      <p className="text-[10px] text-red-900 font-black flex items-center uppercase tracking-widest">
                        {error.includes('LOCKED') ? <ShieldX className="w-4 h-4 mr-2" /> : <ShieldAlert className="w-4 h-4 mr-2" />} 
                        {error}
                      </p>
                    </div>
                  )}

                  {successMessage && (
                    <div className="bg-emerald-500/10 backdrop-blur-md border border-emerald-500/20 p-4 rounded-2xl animate-in fade-in slide-in-from-top-2">
                      <p className="text-[10px] text-emerald-900 font-black flex items-center uppercase tracking-widest">
                        <ShieldCheck className="w-4 h-4 mr-2" /> 
                        {successMessage}
                      </p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-900/40 ml-1">Access Token (Username)</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><UserIcon className="h-5 w-5 text-slate-900/30" /></div>
                      <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="block w-full pl-12 pr-4 py-4 bg-white/10 border border-white/20 rounded-2xl font-bold text-slate-900 placeholder:text-slate-900/20 focus:ring-4 focus:ring-blue-500/20 focus:border-blue-400 transition-all outline-none" placeholder="e.g. ahmed_m" required />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-900/40 ml-1">Master Key (Password)</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Lock className="h-5 w-5 text-slate-900/30" /></div>
                      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="block w-full pl-12 pr-4 py-4 bg-white/10 border border-white/20 rounded-2xl font-bold text-slate-900 placeholder:text-slate-900/20 focus:ring-4 focus:ring-blue-500/20 focus:border-blue-400 transition-all outline-none" placeholder="••••••••" required />
                    </div>
                  </div>

                  <div className="flex flex-col gap-4">
                    <button type="submit" className="w-full btn-liquid-glass py-6 flex items-center justify-center gap-3">
                      <span className="text-sm font-black uppercase tracking-[0.2em]">Authorize Session</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                    
                    <button 
                      type="button" 
                      onClick={() => {
                        setIsRegistering(true);
                        setError('');
                        setSuccessMessage('');
                      }}
                      className="w-full py-4 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:text-blue-600 transition-colors"
                    >
                      <UserPlus className="w-4 h-4" />
                      New Employee? Request Registration
                    </button>
                  </div>
                </form>
              </motion.div>
            ) : (
              <motion.div
                key="register-form"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex-1 flex flex-col"
              >
                <form onSubmit={handleRegisterSubmit} className="space-y-4 flex-1">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-black text-slate-900 tracking-tight uppercase">Employee Registration</h2>
                    <button 
                      type="button" 
                      onClick={() => setIsRegistering(false)}
                      className="p-2 hover:bg-slate-900/5 rounded-full transition-colors"
                    >
                      <X className="w-5 h-5 text-slate-400" />
                    </button>
                  </div>

                  {error && (
                    <div className="bg-red-500/10 backdrop-blur-md border border-red-500/20 p-4 rounded-2xl">
                      <p className="text-[10px] text-red-900 font-black flex items-center uppercase tracking-widest">
                        <ShieldAlert className="w-4 h-4 mr-2" /> 
                        {error}
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block text-[8px] font-black uppercase tracking-widest text-slate-900/40 ml-1">Full Name *</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><UserIcon className="h-4 w-4 text-slate-900/30" /></div>
                        <input type="text" value={regData.name} onChange={(e) => setRegData({...regData, name: e.target.value})} className="block w-full pl-10 pr-3 py-3 bg-white/10 border border-white/20 rounded-xl font-bold text-xs text-slate-900 outline-none" placeholder="John Doe" required />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[8px] font-black uppercase tracking-widest text-slate-900/40 ml-1">Employee ID *</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><IdCard className="h-4 w-4 text-slate-900/30" /></div>
                        <input type="text" value={regData.employeeId} onChange={(e) => setRegData({...regData, employeeId: e.target.value})} className="block w-full pl-10 pr-3 py-3 bg-white/10 border border-white/20 rounded-xl font-bold text-xs text-slate-900 outline-none" placeholder="EMP-001" required />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block text-[8px] font-black uppercase tracking-widest text-slate-900/40 ml-1">Department *</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Briefcase className="h-4 w-4 text-slate-900/30" /></div>
                        <select 
                          value={regData.department} 
                          onChange={(e) => setRegData({...regData, department: e.target.value})} 
                          className="block w-full pl-10 pr-10 py-3 bg-white/10 border border-white/20 rounded-xl font-bold text-xs text-slate-900 outline-none appearance-none cursor-pointer focus:bg-white/20 transition-all"
                          required
                        >
                          <option value="" disabled className="text-slate-400">Select Sector</option>
                          {DEPARTMENTS.map(dept => (
                            <option key={dept} value={dept} className="text-slate-900 bg-white">{dept}</option>
                          ))}
                        </select>
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-900/30"><ChevronDown className="w-4 h-4" /></div>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[8px] font-black uppercase tracking-widest text-slate-900/40 ml-1">Requested Role *</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><ShieldCheck className="h-4 w-4 text-slate-900/30" /></div>
                        <select 
                          value={regData.role} 
                          onChange={(e) => setRegData({...regData, role: e.target.value as Role})} 
                          className="block w-full pl-10 pr-10 py-3 bg-white/10 border border-white/20 rounded-xl font-bold text-xs text-slate-900 outline-none appearance-none cursor-pointer focus:bg-white/20 transition-all"
                          required
                        >
                          {SYSTEM_ROLES.map(role => (
                            <option key={role.id} value={role.id} className="text-slate-900 bg-white">{role.name}</option>
                          ))}
                        </select>
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-900/30"><ChevronDown className="w-4 h-4" /></div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block text-[8px] font-black uppercase tracking-widest text-slate-900/40 ml-1">Username *</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><UserIcon className="h-4 w-4 text-slate-900/30" /></div>
                        <input type="text" value={regData.username} onChange={(e) => setRegData({...regData, username: e.target.value})} className="block w-full pl-10 pr-3 py-3 bg-white/10 border border-white/20 rounded-xl font-bold text-xs text-slate-900 outline-none" placeholder="j_doe" required />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[8px] font-black uppercase tracking-widest text-slate-900/40 ml-1">Password *</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Lock className="h-4 w-4 text-slate-900/30" /></div>
                        <input type="password" value={regData.password} onChange={(e) => setRegData({...regData, password: e.target.value})} className="block w-full pl-10 pr-3 py-3 bg-white/10 border border-white/20 rounded-xl font-bold text-xs text-slate-900 outline-none" placeholder="••••••••" required />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block text-[8px] font-black uppercase tracking-widest text-slate-900/40 ml-1">Email (Optional)</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Mail className="h-4 w-4 text-slate-900/30" /></div>
                        <input type="email" value={regData.email} onChange={(e) => setRegData({...regData, email: e.target.value})} className="block w-full pl-10 pr-3 py-3 bg-white/10 border border-white/20 rounded-xl font-bold text-xs text-slate-900 outline-none" placeholder="john@marmonil.com" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[8px] font-black uppercase tracking-widest text-slate-900/40 ml-1">Phone (Optional)</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Phone className="h-4 w-4 text-slate-900/30" /></div>
                        <input type="tel" value={regData.phone} onChange={(e) => setRegData({...regData, phone: e.target.value})} className="block w-full pl-10 pr-3 py-3 bg-white/10 border border-white/20 rounded-xl font-bold text-xs text-slate-900 outline-none" placeholder="+20..." />
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-4 pt-4">
                    <button type="submit" className="w-full btn-liquid-glass py-4 flex items-center justify-center gap-3">
                      <span className="text-xs font-black uppercase tracking-[0.2em]">Submit Request</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                    
                    <button 
                      type="button" 
                      onClick={() => setIsRegistering(false)}
                      className="w-full py-2 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:text-blue-600 transition-colors"
                    >
                      <LogIn className="w-4 h-4" />
                      Back to Login
                    </button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-12 pt-8 border-t border-slate-900/10 text-center">
            <div className="flex flex-col items-center justify-center space-y-2">
               <p className="text-[8px] uppercase tracking-[0.3em] text-slate-900/30 font-black">Industrial Security Framework</p>
               <div className="flex items-center space-x-3 bg-slate-900/5 px-4 py-2 rounded-2xl border border-slate-900/10">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-black text-slate-900/60 uppercase tracking-widest">TLS 1.3 Certified</span>
               </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Right Side: Info Panels */}
      <motion.div 
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        className="w-full lg:w-1/2 flex flex-col gap-6"
      >
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* System Information Panel */}
          <div className="bg-white/30 backdrop-blur-2xl rounded-[2.5rem] border border-white/20 p-8 shadow-xl flex flex-col">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-blue-600 p-2 rounded-xl text-white">
                <Info className="w-5 h-5" />
              </div>
              <h3 className="font-black text-slate-800 uppercase tracking-tight">System Information</h3>
            </div>
            
            <div className="grid grid-cols-2 gap-4 flex-1">
              <div className="bg-white/40 p-4 rounded-2xl border border-white/20">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">System Name</p>
                <p className="text-xs font-bold text-slate-800">Marmonil Maintenance System</p>
              </div>
              <div className="bg-white/40 p-4 rounded-2xl border border-white/20">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Current Version</p>
                <p className="text-xs font-bold text-slate-800">V5.5</p>
              </div>
              <div className="bg-white/40 p-4 rounded-2xl border border-white/20">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Last Update</p>
                <p className="text-xs font-bold text-slate-800">March 04, 2026</p>
              </div>
              <div className="bg-white/40 p-4 rounded-2xl border border-white/20">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Server Status</p>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <p className="text-xs font-bold text-slate-800">Online</p>
                </div>
              </div>
              <div className="bg-white/40 p-4 rounded-2xl border border-white/20">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Database</p>
                <div className="flex items-center gap-2">
                  <Database className="w-3 h-3 text-blue-600" />
                  <p className="text-xs font-bold text-slate-800">Connected</p>
                </div>
              </div>
              <div className="bg-white/40 p-4 rounded-2xl border border-white/20">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Factory Status</p>
                <div className="flex items-center gap-2">
                  <Activity className="w-3 h-3 text-emerald-600" />
                  <p className="text-xs font-bold text-slate-800">Running</p>
                </div>
              </div>
            </div>
          </div>

          {/* System Engineer Panel */}
          <div className="bg-white/30 backdrop-blur-2xl rounded-[2.5rem] border border-white/20 p-8 shadow-xl flex flex-col">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-slate-900 p-2 rounded-xl text-white">
                <UserIcon className="w-5 h-5" />
              </div>
              <h3 className="font-black text-slate-800 uppercase tracking-tight">System Engineer</h3>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-4 flex-1">
              <div className="bg-white/40 p-4 rounded-2xl border border-white/20">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Name</p>
                <p className="text-xs font-bold text-slate-800">Eng. Mina Ehab</p>
              </div>
              <div className="bg-white/40 p-4 rounded-2xl border border-white/20">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Role</p>
                <p className="text-xs font-bold text-slate-800">Maintenance Engineer</p>
              </div>
              <div className="bg-white/40 p-4 rounded-2xl border border-white/20">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Department</p>
                <p className="text-xs font-bold text-slate-800">Marmonil Factory Operations</p>
              </div>
              <div className="bg-white/40 p-4 rounded-2xl border border-white/20">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Responsibility</p>
                <p className="text-xs font-bold text-slate-800 leading-relaxed">Developed & Maintained the Marmonil Maintenance System</p>
              </div>
            </div>
          </div>
        </div>

        {/* What's New Panel */}
        <div className="bg-slate-900/90 backdrop-blur-2xl rounded-[2.5rem] border border-white/10 p-8 shadow-2xl flex-1">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-blue-600 p-2 rounded-xl text-white">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="font-black text-white uppercase tracking-tight">What's New</h3>
          </div>

          <div className="space-y-2">
            {WHATS_NEW.map((item, i) => (
              <div key={i} className="group">
                <button 
                  onClick={() => setExpandedUpdateIndex(expandedUpdateIndex === i ? null : i)}
                  className="w-full text-left flex justify-between items-start py-3 focus:outline-none"
                >
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                      <h4 className={`text-[11px] font-black transition-colors uppercase tracking-tight ${expandedUpdateIndex === i ? 'text-blue-400' : 'text-white group-hover:text-blue-400'}`}>
                        {item.title}
                      </h4>
                      <span className="text-[8px] font-black text-slate-500 uppercase ml-2">{item.date}</span>
                    </div>
                  </div>
                  <motion.div
                    animate={{ rotate: expandedUpdateIndex === i ? 90 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="ml-2 mt-0.5"
                  >
                    <ChevronRight className={`w-3 h-3 ${expandedUpdateIndex === i ? 'text-blue-400' : 'text-slate-500'}`} />
                  </motion.div>
                </button>
                
                <AnimatePresence initial={false}>
                  {expandedUpdateIndex === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: 'easeInOut' }}
                      className="overflow-hidden"
                    >
                      <p className="text-[10px] text-slate-400 leading-relaxed pb-4">
                        {item.desc}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
                
                {i < WHATS_NEW.length - 1 && <div className="h-[1px] bg-white/5"></div>}
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* AI Help Bot Floating */}
      <div className="fixed bottom-8 right-8 z-[100]">
        <AnimatePresence>
          {isBotOpen && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.9 }}
              className="bg-white w-[350px] h-[500px] rounded-[2.5rem] shadow-2xl border border-slate-200 flex flex-col overflow-hidden mb-4"
            >
              <div className="bg-slate-900 p-6 text-white flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-600 p-2 rounded-xl">
                    <Bot className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-xs uppercase tracking-tight">Marmonil AI Help</h3>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Always Online</p>
                  </div>
                </div>
                <button onClick={() => setIsBotOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50 custom-scrollbar">
                {botMessages.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] p-4 rounded-3xl text-xs font-medium ${
                      msg.role === 'user' 
                        ? 'bg-blue-600 text-white rounded-tr-none' 
                        : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none shadow-sm'
                    }`}>
                      {msg.text}
                    </div>
                  </div>
                ))}
                {isBotLoading && (
                  <div className="flex justify-start">
                    <div className="bg-white p-4 rounded-3xl rounded-tl-none border border-slate-100 shadow-sm">
                      <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                    </div>
                  </div>
                )}
                <div ref={botEndRef} />
              </div>

              <div className="p-6 bg-white border-t border-slate-100">
                <div className="relative flex items-center gap-2">
                  <input 
                    type="text"
                    value={botInput}
                    onChange={(e) => setBotInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleBotSend()}
                    placeholder="Ask for help..."
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3 text-xs font-bold focus:outline-none focus:border-blue-500 transition-colors pr-12"
                  />
                  <button 
                    onClick={handleBotSend}
                    disabled={isBotLoading || !botInput.trim()}
                    className="absolute right-2 p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 transition-all"
                  >
                    <Send className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsBotOpen(!isBotOpen)}
          className="bg-slate-900 text-white p-5 rounded-full shadow-2xl hover:bg-black transition-all group relative"
        >
          {isBotOpen ? <X className="w-7 h-7" /> : <MessageSquare className="w-7 h-7" />}
          {!isBotOpen && (
            <div className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-blue-500 border-2 border-white"></span>
            </div>
          )}
        </motion.button>
      </div>

      {/* Professional Footer */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center text-center space-y-1 opacity-70 pointer-events-none">
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Marmonil Factory Operations</p>
        <p className="text-[8px] font-bold uppercase tracking-[0.2em] text-slate-400">Maintenance System V5.5</p>
        <p className="text-[9px] font-medium uppercase tracking-widest text-slate-400">Developed & Maintained by Eng. Mina Ehab</p>
      </div>
    </div>
  );
};

export default Login;
