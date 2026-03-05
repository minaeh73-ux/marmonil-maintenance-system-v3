
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Ticket, User, HoldCategory, HoldDetails, AssignedTechnician, SparePart, ConsumedSpare, SparePartRequest, MaintenanceRoleType, FaultType } from '../types';
import { 
  Clock, Play, Pause, CheckCircle, Timer, Wrench, Search, 
  X, Users, Box, AlertCircle, Plus, Minus, Check, ClipboardList, ShieldCheck,
  Coffee, HardHat, Zap, ChevronRight, Filter, ShieldAlert, BrainCircuit, Loader2, Camera
} from 'lucide-react';
import { analyzeImage, chatWithAI } from '../services/geminiService';

interface MaintenanceViewProps {
  tickets: Ticket[];
  currentUser: User;
  allUsers: User[];
  onUpdateTicket: (ticketId: string, action: string, payload?: any) => void;
  spareParts: SparePart[];
  spareRequests: SparePartRequest[];
}

const ROLE_BADGES: Record<MaintenanceRoleType, string> = {
  'TECHNICIAN': 'TCH',
  'ENGINEER': 'ENG',
  'SUPERVISOR': 'SUP',
  'SECTION_HEAD': 'SH',
  'MAINTENANCE_MANAGER': 'MM'
};

const MaintenanceView: React.FC<MaintenanceViewProps> = ({ tickets, currentUser, allUsers, onUpdateTicket, spareParts, spareRequests }) => {
  const [now, setNow] = useState(Date.now());
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [selectedTechs, setSelectedTechs] = useState<AssignedTechnician[]>([]);
  const [staffFilter, setStaffFilter] = useState<'ALL' | 'ENG' | 'LEADS' | 'SH'>('ALL');
  
  const [holdingId, setHoldingId] = useState<string | null>(null);
  const [holdForm, setHoldForm] = useState<Partial<HoldDetails>>({ category: 'SPARE_PART_NOT_AVAILABLE', description: '' });
  
  const [closingId, setClosingId] = useState<string | null>(null);
  const [closeNote, setCloseNote] = useState('');
  const [sparesUsed, setSparesUsed] = useState<ConsumedSpare[]>([]);
  const [spareSearch, setSpareSearch] = useState('');

  // AI Analysis State
  const [analyzingTicketId, setAnalyzingTicketId] = useState<string | null>(null);
  const [aiAnalysisResult, setAiAnalysisResult] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const handleAIAnalyze = async (imageBase64: string) => {
    setIsAnalyzing(true);
    setAiAnalysisResult(null);
    try {
      const result = await analyzeImage(imageBase64);
      setAiAnalysisResult(result || "Analysis failed.");
    } catch (error) {
      console.error("AI Analysis Error:", error);
      setAiAnalysisResult("Error performing AI analysis.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        handleAIAnalyze(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const activeTickets = tickets.filter(t => t.status !== 'CLOSED').sort((a, b) => {
    if (a.priority === 'CRITICAL') return -1;
    if (b.priority === 'CRITICAL') return 1;
    return b.createdAt - a.createdAt;
  });
  
  const formatDuration = (ms: number) => {
    const totalSecs = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    const s = totalSecs % 60;
    return `${h}h ${m}m ${s}s`;
  };

  const currentTicketForAssignment = useMemo(() => 
    tickets.find(t => t.id === assigningId), [tickets, assigningId]
  );

  const assignableStaff = useMemo(() => {
    if (!currentTicketForAssignment) return [];
    
    return allUsers.filter(u => {
      const isMaint = u.role === 'MAINTENANCE';
      const isAvailable = u.availableForAssignment && u.active;
      // Dynamic Logic: Specialization Matching
      const matchesSpec = u.technicalSpecialization === 'MULTI_SKILLED' || u.technicalSpecialization === currentTicketForAssignment.faultType;
      
      let passRoleFilter = true;
      if (staffFilter === 'ENG') passRoleFilter = u.maintenanceRoleType === 'ENGINEER';
      if (staffFilter === 'LEADS') passRoleFilter = u.maintenanceRoleType === 'SUPERVISOR';
      if (staffFilter === 'SH') passRoleFilter = u.maintenanceRoleType === 'SECTION_HEAD';

      return isMaint && isAvailable && matchesSpec && passRoleFilter;
    });
  }, [allUsers, currentTicketForAssignment, staffFilter]);

  const handleStartRepair = (ticketId: string) => {
    if (selectedTechs.length === 0) {
      alert("At least one specialist must be assigned.");
      return;
    }
    onUpdateTicket(ticketId, 'START', { technicians: selectedTechs });
    setAssigningId(null);
    setSelectedTechs([]);
  };

  return (
    <div className="space-y-8 pb-20">
      <div className="flex justify-between items-center no-print">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tighter uppercase flex items-center gap-3">
             <div className="bg-slate-900 p-2 rounded-xl text-white shadow-xl shadow-slate-200">
                <Wrench className="w-6 h-6" />
             </div>
             Unified Dispatch Console
          </h2>
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Specialized Maintenance Assignment Protocol</p>
        </div>
        <div className="flex gap-4">
           <button 
             onClick={() => fileInputRef.current?.click()}
             className="btn-liquid-glass px-6 py-3 flex items-center gap-3"
           >
              <BrainCircuit className="w-5 h-5" />
              AI Fault Diagnosis
           </button>
           <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" />
           <div className="bg-white px-5 py-3 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
              <HardHat className="w-5 h-5 text-blue-600" />
              <div className="text-right">
                 <div className="text-lg font-black text-slate-800 leading-none">{allUsers.filter(u => u.availableForAssignment && u.active).length}</div>
                 <div className="text-[8px] font-black text-slate-400 uppercase">Available specialists</div>
              </div>
           </div>
        </div>
      </div>

      {isAnalyzing && (
        <div className="card-industrial p-10 flex flex-col items-center justify-center space-y-4 animate-pulse">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
          <p className="text-sm font-black text-slate-800 uppercase tracking-widest">Smart Engine AI Analyzing Component...</p>
        </div>
      )}

      {aiAnalysisResult && (
        <div className="card-industrial p-8 bg-blue-50 border-blue-200 relative animate-in slide-in-from-top-4 duration-500">
          <button onClick={() => setAiAnalysisResult(null)} className="absolute top-4 right-4 p-2 hover:bg-blue-100 rounded-full text-blue-600">
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-blue-600 p-2 rounded-xl text-white">
              <BrainCircuit className="w-6 h-6" />
            </div>
            <h3 className="font-black text-slate-800 text-lg uppercase tracking-tight">AI Technical Assessment</h3>
          </div>
          <div className="prose prose-sm max-w-none text-slate-700 font-medium whitespace-pre-line bg-white p-6 rounded-3xl border border-blue-100 shadow-sm">
            {aiAnalysisResult}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {activeTickets.map(ticket => {
          const isHold = ticket.status === 'ON_HOLD';
          const isInProgress = ticket.status === 'IN_PROGRESS';
          const isElectrical = ticket.faultType === 'ELECTRICAL';
          
          const elapsedMs = now - (ticket.lastStatusChange || ticket.createdAt);
          const activeMsLive = (ticket.totalActiveMinutes * 60000) + (isInProgress ? elapsedMs : 0);
          const holdMsLive = (ticket.totalHoldMinutes * 60000) + (isHold ? elapsedMs : 0);
          
          return (
            <div key={ticket.id} className={`bg-white/10 backdrop-blur-3xl rounded-[3rem] shadow-2xl border transition-all relative overflow-hidden ${
              isInProgress ? (isElectrical ? 'border-blue-500/50 shadow-blue-500/10' : 'border-orange-500/50 shadow-orange-500/10') : isHold ? 'border-white/10 opacity-80' : 'border-white/20'
            }`}>
              <div className={`px-8 py-5 flex justify-between items-center ${
                isInProgress ? (isElectrical ? 'bg-blue-600/80' : 'bg-orange-600/80') : isHold ? 'bg-slate-500/80' : 'bg-slate-900/80'
              } backdrop-blur-md text-white`}>
                <div className="flex items-center gap-4">
                  <div className={`w-3 h-3 rounded-full ${isInProgress ? 'bg-white animate-pulse shadow-[0_0_10px_white]' : 'bg-white/40'}`}></div>
                  <div>
                    <h4 className="font-black text-sm uppercase tracking-tight">{ticket.machineName}</h4>
                    <span className="text-[9px] font-black uppercase tracking-widest opacity-60">#{ticket.id} • {ticket.category}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest border ${isElectrical ? 'bg-blue-500/20 border-blue-400' : 'bg-orange-500/20 border-orange-400'}`}>
                    {ticket.faultType}
                  </span>
                  <div className={`text-[9px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest border-2 ${
                    ticket.priority === 'CRITICAL' ? 'bg-red-600 border-red-500 animate-bounce' : 'bg-white/10 border-white/20'
                  }`}>{ticket.priority}</div>
                </div>
              </div>

              <div className="p-8 space-y-8">
                 <div className="grid grid-cols-2 gap-6">
                    <div className={`p-6 rounded-[2rem] border transition-all ${isInProgress ? (isElectrical ? 'bg-blue-500/10 border-blue-400/20' : 'bg-orange-500/10 border-orange-400/20') : 'bg-white/5 border-white/10'}`}>
                       <div className="flex items-center gap-2 mb-2">
                          <Timer className={`w-4 h-4 ${isInProgress ? (isElectrical ? 'text-blue-600' : 'text-orange-600') : 'text-slate-400'}`} />
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Active Repair</span>
                       </div>
                       <span className={`text-2xl font-mono font-black tracking-tighter ${isInProgress ? (isElectrical ? 'text-slate-900' : 'text-slate-900') : 'text-slate-400'}`}>
                          {formatDuration(activeMsLive)}
                       </span>
                    </div>
                    <div className="p-6 rounded-[2rem] border border-white/10 bg-white/5">
                       <div className="flex items-center gap-2 mb-2">
                          <Coffee className="w-4 h-4 text-slate-400" />
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Wait Time</span>
                       </div>
                       <span className="text-2xl font-mono font-black tracking-tighter text-slate-400">
                          {formatDuration(holdMsLive)}
                       </span>
                    </div>
                 </div>

                  <div className="space-y-4">
                    <div className="bg-white/5 p-6 rounded-[2rem] border border-white/10">
                       <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-3">Fault Assessment</span>
                       <p className="text-sm font-bold text-slate-700 leading-snug">{ticket.description}</p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                       {ticket.assignedTechnicians.length > 0 ? (
                          ticket.assignedTechnicians.map(t => (
                             <span key={t.id} className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black text-slate-600 shadow-sm transition-transform hover:scale-105">
                                <span className={`px-1.5 py-0.5 rounded text-[8px] font-black ${t.specialization === 'ELECTRICAL' ? 'bg-blue-500/20 text-blue-600' : 'bg-orange-500/20 text-orange-600'}`}>[{ROLE_BADGES[t.roleType]}]</span>
                                {t.name}
                             </span>
                          ))
                       ) : (
                          <div className="w-full flex items-center gap-3 p-4 bg-red-500/10 border border-dashed border-red-500/30 rounded-2xl text-red-600">
                             <ShieldAlert className="w-5 h-5 animate-pulse" />
                             <span className="text-[10px] font-black uppercase tracking-widest">Pending Specialized Dispatch</span>
                          </div>
                       )}
                    </div>
                 </div>

                 <div className="flex flex-col gap-4 pt-2">
                    <button 
                      onClick={async () => {
                        setIsAnalyzing(true);
                        setAiAnalysisResult(null);
                        try {
                          const result = await chatWithAI(`Analyze this ticket: Machine: ${ticket.machineName}, Fault: ${ticket.faultType}, Description: ${ticket.description}. Provide a technical assessment and risk level.`);
                          setAiAnalysisResult(result || "Analysis failed.");
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        } catch (e) {
                          setAiAnalysisResult("Error analyzing ticket.");
                        } finally {
                          setIsAnalyzing(false);
                        }
                      }}
                      className="w-full btn-liquid-glass py-4 !text-blue-300"
                    >
                      <BrainCircuit className="w-4 h-4" /> AI Technical Insight
                    </button>
                    <div className="flex gap-4">
                    {!isInProgress ? (
                       <button 
                         onClick={() => { setAssigningId(ticket.id); setSelectedTechs([]); }} 
                         className={`flex-1 btn-industrial h-16 ${isElectrical ? 'bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-blue-500/20' : 'bg-gradient-to-br from-orange-500 to-orange-700 text-white shadow-orange-500/20'} border border-white/20`}
                       >
                          <Play className="w-4 h-4 fill-current" /> {isHold ? 'Resume Task' : 'Dispatch Specialist'}
                       </button>
                    ) : (
                       <button 
                         onClick={() => onUpdateTicket(ticket.id, 'HOLD', { details: { category: 'OTHER', description: 'Paused by user' } })} 
                         className="flex-1 btn-liquid-glass h-16"
                       >
                          <Pause className="w-4 h-4 fill-current" /> Pause
                       </button>
                    )}
                    <button 
                      onClick={() => onUpdateTicket(ticket.id, 'CLOSE', { solution: 'Fixed' })} 
                      className="flex-1 btn-industrial btn-secondary h-16"
                    >
                       <ShieldCheck className="w-5 h-5" /> Close Order
                    </button>
                 </div>
              </div>
            </div>
          </div>
        );
      })}
      </div>

      {assigningId && currentTicketForAssignment && (
         <div className="fixed inset-0 z-[150] bg-slate-950/80 flex items-center justify-center p-4 backdrop-blur-md">
            <div className="bg-white/10 backdrop-blur-3xl w-full max-w-xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 border border-white/20">
               <div className={`${currentTicketForAssignment.faultType === 'ELECTRICAL' ? 'bg-blue-600/80' : 'bg-orange-600/80'} p-10 text-white flex justify-between items-center backdrop-blur-md`}>
                  <div className="flex items-center gap-5">
                     <div className="bg-white/20 p-3 rounded-2xl shadow-inner"><Users className="w-6 h-6" /></div>
                     <div>
                        <h2 className="text-xl font-black uppercase tracking-tight text-white">Staff Assignment</h2>
                        <p className="text-white/60 text-[9px] font-black uppercase tracking-[0.2em]">Asset: {currentTicketForAssignment.machineName} ({currentTicketForAssignment.faultType})</p>
                     </div>
                  </div>
                  <button onClick={() => setAssigningId(null)} className="p-3 hover:bg-white/10 rounded-full transition-colors"><X className="w-6 h-6 text-white" /></button>
               </div>
               <div className="p-10 space-y-8">
                  <div className="flex gap-2 overflow-x-auto pb-2 scroll-hide">
                     {(['ALL', 'ENG', 'LEADS', 'SH'] as const).map(f => (
                       <button key={f} onClick={() => setStaffFilter(f)} className={`px-4 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest border transition-all ${staffFilter === f ? 'bg-slate-900 text-white border-slate-900 shadow-lg shadow-slate-900/20' : 'bg-slate-100 border-slate-200 text-slate-400 hover:border-slate-300'}`}>{f}</button>
                     ))}
                  </div>

                  <div className="max-h-[350px] overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                     {assignableStaff.length > 0 ? assignableStaff.map(staff => {
                        const isSel = selectedTechs.some(t => t.id === staff.id);
                        return (
                           <button 
                             key={staff.id} 
                             onClick={() => {
                                if(isSel) setSelectedTechs(selectedTechs.filter(t => t.id !== staff.id));
                                else setSelectedTechs([...selectedTechs, { id: staff.id, name: staff.name, roleType: staff.maintenanceRoleType!, specialization: staff.technicalSpecialization! }]);
                             }}
                             className={`w-full flex items-center justify-between p-5 rounded-3xl border transition-all ${
                               isSel ? (staff.technicalSpecialization === 'ELECTRICAL' ? 'border-blue-500/50 bg-blue-500/20' : 'border-orange-500/50 bg-orange-500/20') : 'border-slate-100 hover:border-slate-200 bg-slate-50/50'
                             }`}
                           >
                              <div className="text-left flex items-center gap-4">
                                 <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs ${isSel ? (staff.technicalSpecialization === 'ELECTRICAL' ? 'bg-blue-600' : 'bg-orange-600') : 'bg-slate-200 text-slate-400'} text-white`}>
                                    {staff.name.charAt(0)}
                                 </div>
                                 <div>
                                    <div className="text-sm font-black text-slate-800">{staff.name}</div>
                                    <div className="flex gap-2 items-center mt-1">
                                       <span className="text-[8px] font-black bg-white border border-slate-200 px-1.5 py-0.5 rounded uppercase text-slate-500">{staff.skillLevel || 'JUNIOR'}</span>
                                       <span className="text-[8px] font-black text-slate-400 uppercase">[{ROLE_BADGES[staff.maintenanceRoleType!]}]</span>
                                    </div>
                                 </div>
                              </div>
                              <div className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-colors ${isSel ? 'bg-slate-900 border-slate-900 shadow-lg shadow-slate-900/20' : 'border-slate-200'}`}>
                                 {isSel && <Check className="w-3.5 h-3.5 text-white" />}
                              </div>
                           </button>
                        );
                     }) : (
                        <div className="py-20 text-center text-slate-300">
                           <ShieldAlert className="w-12 h-12 mx-auto opacity-20 mb-4" />
                           <p className="text-[10px] font-black uppercase tracking-widest">No available {currentTicketForAssignment.faultType} staff</p>
                        </div>
                     )}
                  </div>
                  <button 
                    disabled={selectedTechs.length === 0}
                    onClick={() => handleStartRepair(assigningId)}
                    className={`w-full py-6 !text-sm rounded-[2rem] font-black uppercase tracking-[0.2em] transition-all ${currentTicketForAssignment.faultType === 'ELECTRICAL' ? 'bg-blue-600 shadow-blue-500/30' : 'bg-orange-600 shadow-orange-500/30'} text-white shadow-xl border border-white/20 disabled:opacity-30`}
                  >
                     Authorize Deployment ({selectedTechs.length})
                  </button>
               </div>
            </div>
         </div>
      )}
    </div>
  );
};

export default MaintenanceView;