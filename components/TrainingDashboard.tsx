
import React, { useState, useMemo, useEffect } from 'react';
import { TrainingSession, User, TrainingScenario, TrainingRank, Role } from '../types';
import { 
  Award, CheckCircle2, Circle, Trophy, GraduationCap, 
  ArrowRight, Play, AlertOctagon, Timer, BarChart3, 
  ShieldCheck, XCircle, Star, FileCheck
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface TrainingDashboardProps {
  session: TrainingSession;
  user: User;
  onStartScenario: (scenario: TrainingScenario) => void;
  onExitTraining: () => void;
}

// Predefined Scenarios
const SCENARIOS: TrainingScenario[] = [
  {
    id: 'SCN-001',
    title: 'Urgent Electrical Fault',
    description: 'Machine GS2 has a critical electrical failure causing a full stop. Report it immediately.',
    difficulty: 'Easy',
    role: 'PRODUCTION',
    objectives: [
      { 
        stepId: 'create_ticket', 
        description: 'Create a Critical Ticket for GS2', 
        requiredAction: 'CREATE_TICKET_FULL',
        validationCriteria: (p: any) => p.machineName === 'GS2' && p.faultType === 'ELECTRICAL' && p.priority === 'CRITICAL' && p.downtimeType === 'FULL_STOP',
        points: 20
      }
    ]
  },
  {
    id: 'SCN-002',
    title: 'Maintenance Dispatch',
    description: 'A ticket is open for "BC1". Assign technicians and start the repair.',
    difficulty: 'Medium',
    role: 'MAINTENANCE',
    objectives: [
      {
        stepId: 'assign_tech',
        description: 'Dispatch 2 Technicians to BC1',
        requiredAction: 'TICKET_START',
        validationCriteria: (p: any) => p.technicians && p.technicians.length >= 2,
        points: 15
      }
    ]
  },
  {
    id: 'SCN-003',
    title: 'Safety Protocol: Machine Halt',
    description: 'You need to halt "Crane 30 Ton" for safety. Ensure you acknowledge the safety approval.',
    difficulty: 'Hard',
    role: 'ADMIN', // Or Production
    objectives: [
      {
        stepId: 'halt_machine',
        description: 'Set Crane 30 Ton to Out of Service with Safety Check',
        requiredAction: 'MACHINE_HALT',
        validationCriteria: (p: any) => p.machineName === '30 Ton' && p.safetyAcknowledged === true,
        points: 25
      }
    ]
  }
];

const TrainingDashboard: React.FC<TrainingDashboardProps> = ({ session, user, onStartScenario, onExitTraining }) => {
  const [activeTab, setActiveTab] = useState<'MY_TRAINING' | 'ADMIN_ANALYTICS'>('MY_TRAINING');
  const [elapsedTime, setElapsedTime] = useState(0);

  // Timer for active scenario
  useEffect(() => {
    let interval: number;
    if (session.isActive && session.scenarioId) {
      interval = window.setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - session.startTime) / 1000));
      }, 1000);
    } else {
      setElapsedTime(0);
    }
    return () => clearInterval(interval);
  }, [session.isActive, session.scenarioId, session.startTime]);

  // Derived State
  const activeScenario = SCENARIOS.find(s => s.id === session.scenarioId);
  const nextRankPoints = 100 * (['Cadet', 'Operator', 'Specialist', 'Supervisor', 'Expert'].indexOf(session.rank) + 1);
  const progressToNextRank = Math.min(100, (session.currentScore / nextRankPoints) * 100);

  const getBadgeColor = (rank: TrainingRank) => {
    switch (rank) {
      case 'Expert': return 'bg-purple-600 text-white border-purple-400';
      case 'Supervisor': return 'bg-yellow-500 text-white border-yellow-300';
      case 'Specialist': return 'bg-blue-500 text-white border-blue-300';
      case 'Operator': return 'bg-green-500 text-white border-green-300';
      default: return 'bg-slate-400 text-white border-slate-300';
    }
  };

  const handleStart = () => {
    // Filter scenarios by role if needed, or just random
    const relevantScenarios = SCENARIOS.filter(s => s.role === user.role || s.role === 'ADMIN'); 
    const randomScenario = relevantScenarios[Math.floor(Math.random() * relevantScenarios.length)] || SCENARIOS[0];
    onStartScenario(randomScenario);
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      
      {/* Header Card */}
      <div className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-6">
            <div className="bg-white/20 p-4 rounded-2xl backdrop-blur-sm border border-white/20">
              <GraduationCap className="w-12 h-12 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                 <h2 className="text-3xl font-black uppercase tracking-tight">Advanced Training Module</h2>
                 <span className="bg-black/20 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">Simulated</span>
              </div>
              <p className="text-white/80 font-bold uppercase tracking-widest text-xs">
                Master the system • Earn Certificates • Zero Risk
              </p>
            </div>
          </div>
          
          <div className="flex gap-3">
             {user.role === 'ADMIN' && (
                <button 
                  onClick={() => setActiveTab(activeTab === 'MY_TRAINING' ? 'ADMIN_ANALYTICS' : 'MY_TRAINING')}
                  className="bg-white/20 hover:bg-white/30 text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2"
                >
                   {activeTab === 'MY_TRAINING' ? <BarChart3 className="w-4 h-4" /> : <GraduationCap className="w-4 h-4" />}
                   {activeTab === 'MY_TRAINING' ? 'View Analytics' : 'My Training'}
                </button>
             )}
             <button 
                onClick={onExitTraining}
                className="bg-white text-orange-600 hover:bg-orange-50 px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg transition-all"
             >
                Exit Simulation
             </button>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
      </div>

      {activeTab === 'MY_TRAINING' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Training Area */}
          <div className="lg:col-span-2 space-y-8">
             
             {/* Active Scenario Card */}
             {session.isActive && activeScenario ? (
                <div className="bg-white rounded-3xl border-2 border-blue-500 shadow-xl overflow-hidden animate-in zoom-in-95">
                   <div className="bg-blue-600 px-8 py-4 flex justify-between items-center text-white">
                      <div className="flex items-center gap-3">
                         <Play className="w-5 h-5 fill-current animate-pulse" />
                         <span className="font-black uppercase tracking-widest text-sm">Simulation Active</span>
                      </div>
                      <div className="flex items-center gap-4 text-xs font-mono bg-blue-700 px-3 py-1 rounded-lg">
                         <Timer className="w-4 h-4" /> {formatTime(elapsedTime)}
                      </div>
                   </div>
                   <div className="p-8 space-y-6">
                      <div>
                         <h3 className="text-2xl font-black text-slate-800 mb-2">{activeScenario.title}</h3>
                         <p className="text-slate-600 font-medium leading-relaxed">{activeScenario.description}</p>
                      </div>
                      
                      <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
                         <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Mission Objectives</h4>
                         <div className="space-y-3">
                            {activeScenario.objectives.map((obj, idx) => (
                               <div key={idx} className="flex items-center gap-3">
                                  <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 ${
                                     session.completedStepIds.includes(obj.stepId) 
                                     ? 'bg-green-500 border-green-500 text-white' 
                                     : 'border-slate-300 text-slate-300'
                                  }`}>
                                     {session.completedStepIds.includes(obj.stepId) ? <CheckCircle2 className="w-4 h-4" /> : <span className="text-xs font-bold">{idx+1}</span>}
                                  </div>
                                  <span className={`text-sm font-bold ${session.completedStepIds.includes(obj.stepId) ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                                     {obj.description}
                                  </span>
                                  <span className="ml-auto text-xs font-black text-blue-600">+{obj.points} PTS</span>
                               </div>
                            ))}
                         </div>
                      </div>

                      <div className="flex gap-4">
                         <div className="flex-1 bg-red-50 rounded-xl p-4 border border-red-100 flex items-center gap-3">
                            <AlertOctagon className="w-8 h-8 text-red-500" />
                            <div>
                               <div className="text-2xl font-black text-red-600">{session.mistakes}</div>
                               <div className="text-[10px] font-bold text-red-400 uppercase">Critical Errors</div>
                            </div>
                         </div>
                         <div className="flex-1 bg-green-50 rounded-xl p-4 border border-green-100 flex items-center gap-3">
                            <Trophy className="w-8 h-8 text-green-500" />
                            <div>
                               <div className="text-2xl font-black text-green-600">{session.currentScore}</div>
                               <div className="text-[10px] font-bold text-green-400 uppercase">Current Score</div>
                            </div>
                         </div>
                      </div>
                   </div>
                </div>
             ) : (
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-12 text-center space-y-6">
                   <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto">
                      <GraduationCap className="w-10 h-10 text-blue-500" />
                   </div>
                   <div>
                      <h3 className="text-xl font-black text-slate-800">Ready to Upgrade Your Skills?</h3>
                      <p className="text-slate-500 mt-2 max-w-md mx-auto">Start a new dynamic scenario generated by the Smart Engine. Your actions will be scored in real-time.</p>
                   </div>
                   <button 
                      onClick={handleStart}
                      className="btn-industrial btn-primary px-10 py-5 shadow-2xl shadow-blue-500/30"
                   >
                      <Play className="w-5 h-5 fill-current" /> Initialize Scenario
                   </button>
                </div>
             )}

             {/* Certificate Section */}
             {session.rank === 'Expert' && (
                <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-3xl p-8 text-white relative overflow-hidden">
                   <div className="relative z-10 flex justify-between items-center">
                      <div>
                         <h3 className="text-xl font-black uppercase tracking-widest flex items-center gap-3 text-yellow-400">
                            <Star className="w-6 h-6 fill-current" /> Certification Unlocked
                         </h3>
                         <p className="text-slate-400 text-sm mt-2">You have reached Expert Level. Download your official certificate.</p>
                      </div>
                      <button className="btn-industrial bg-white text-slate-900 px-8 py-4 shadow-xl shadow-white/10">
                         <FileCheck className="w-4 h-4" /> Download PDF
                      </button>
                   </div>
                   <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-500/10 rounded-full blur-3xl"></div>
                </div>
             )}
          </div>

          {/* Sidebar Stats */}
          <div className="space-y-8">
             {/* Rank Card */}
             <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 flex flex-col items-center text-center relative overflow-hidden">
                <div className={`w-32 h-32 rounded-full flex items-center justify-center border-4 mb-6 shadow-xl ${getBadgeColor(session.rank)}`}>
                   <Trophy className="w-16 h-16" />
                </div>
                <h3 className="text-lg font-black text-slate-800 uppercase tracking-widest mb-1">Current Rank</h3>
                <div className="text-3xl font-black text-slate-800 uppercase tracking-tighter mb-6">{session.rank}</div>
                
                <div className="w-full space-y-2">
                   <div className="flex justify-between text-[10px] font-black uppercase text-slate-400">
                      <span>Progress to Next Level</span>
                      <span>{Math.round(progressToNextRank)}%</span>
                   </div>
                   <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-green-500 transition-all duration-1000" style={{ width: `${progressToNextRank}%` }}></div>
                   </div>
                </div>
             </div>

             {/* History */}
             <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                   <h4 className="font-black text-slate-800 text-sm uppercase tracking-widest">Recent Performance</h4>
                </div>
                <div className="divide-y divide-slate-100">
                   {session.history.length === 0 ? (
                      <div className="p-8 text-center text-slate-400 text-xs font-bold uppercase">No history yet</div>
                   ) : (
                      session.history.slice(0, 5).map((h, i) => (
                         <div key={i} className="p-4 flex justify-between items-center">
                            <div>
                               <div className="text-xs font-black text-slate-700">{h.scenarioId}</div>
                               <div className="text-[10px] text-slate-400">{new Date(h.date).toLocaleDateString()}</div>
                            </div>
                            <div className={`text-xs font-black px-2 py-1 rounded ${h.passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                               {h.score} PTS
                            </div>
                         </div>
                      ))
                   )}
                </div>
             </div>
          </div>
        </div>
      )}

      {activeTab === 'ADMIN_ANALYTICS' && user.role === 'ADMIN' && (
         <div className="space-y-8 animate-in slide-in-from-right-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                  <h4 className="font-black text-slate-400 text-xs uppercase tracking-widest mb-2">Total Certified Users</h4>
                  <div className="text-4xl font-black text-slate-800">12</div>
               </div>
               <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                  <h4 className="font-black text-slate-400 text-xs uppercase tracking-widest mb-2">Avg. Completion Score</h4>
                  <div className="text-4xl font-black text-blue-600">88.5</div>
               </div>
               <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                  <h4 className="font-black text-slate-400 text-xs uppercase tracking-widest mb-2">Most Common Error</h4>
                  <div className="text-xl font-black text-red-500">Skipping Safety Check</div>
               </div>
            </div>

            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm h-[400px] flex flex-col">
               <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest mb-6">Training Engagement by Department</h3>
               <div className="flex-1 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                     <BarChart data={[
                        { dept: 'Production', completion: 85 },
                        { dept: 'Maintenance', completion: 92 },
                        { dept: 'Planning', completion: 60 },
                        { dept: 'Store', completion: 75 }
                     ]}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="dept" fontSize={12} axisLine={false} tickLine={false} />
                        <YAxis fontSize={12} axisLine={false} tickLine={false} />
                        <Tooltip />
                        <Bar dataKey="completion" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={50} />
                     </BarChart>
                  </ResponsiveContainer>
               </div>
            </div>
         </div>
      )}
    </div>
  );
};

export default TrainingDashboard;
