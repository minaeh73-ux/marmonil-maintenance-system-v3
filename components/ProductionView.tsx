
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Machine, Ticket, Priority, FaultType, DowntimeType, TicketMedia } from '../types';
import { MACHINE_CATEGORIES, SLA_THRESHOLDS } from '../constants';
import { 
  AlertTriangle, 
  Send, 
  Activity, 
  XCircle, 
  AlertOctagon, 
  Clock, 
  TrendingDown, 
  History, 
  ShieldCheck, 
  Camera, 
  Video, 
  X,
  Plus,
  Zap,
  DollarSign,
  Gauge,
  Image as ImageIcon,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

interface ProductionViewProps {
  machines: Machine[]; // These should now be pre-filtered for active+approved versions
  tickets: Ticket[];
  onCreateTicket: (ticket: Omit<Ticket, 'id' | 'status' | 'logs' | 'createdAt' | 'totalActiveMinutes' | 'totalHoldMinutes' | 'lastStatusChange' | 'slaDeadline' | 'isEscalated'>) => void;
}

const ProductionView: React.FC<ProductionViewProps> = ({ machines, tickets, onCreateTicket }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedMachineId, setSelectedMachineId] = useState<string>('');
  const [faultType, setFaultType] = useState<FaultType>('ELECTRICAL');
  const [priority, setPriority] = useState<Priority>('NORMAL');
  const [downtimeType, setDowntimeType] = useState<DowntimeType>('FULL_STOP');
  const [description, setDescription] = useState('');
  const [media, setMedia] = useState<TicketMedia[]>([]);
  
  const [now, setNow] = useState(Date.now());
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (downtimeType === 'FULL_STOP' && selectedMachineId) {
      timerRef.current = window.setInterval(() => setNow(Date.now()), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setNow(Date.now());
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [downtimeType, selectedMachineId]);

  const selectedMachine = useMemo(() => machines.find(m => m.id === selectedMachineId), [machines, selectedMachineId]);
  const filteredMachines = machines.filter(m => m.category === selectedCategory);

  // --- Real-time Impact Logic ---
  const [simulatedStart] = useState(Date.now());
  const elapsedSecs = Math.floor((now - simulatedStart) / 1000);

  // --- Machine History Preview ---
  const machineHistory = useMemo(() => {
    if (!selectedMachineId) return null;
    const monthAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const mTickets = tickets.filter(t => t.machineId === selectedMachineId && t.createdAt > monthAgo);
    const downtimeHrs = mTickets.reduce((acc, t) => acc + (t.actualDowntimeMinutes || 0), 0) / 60;
    const closed = mTickets.filter(t => t.status === 'CLOSED');
    const mttr = closed.length > 0 ? (closed.reduce((acc, t) => acc + (t.actualDowntimeMinutes || 0), 0) / closed.length) : 0;
    
    // Last 3 images from history
    const historyImages = mTickets
      .flatMap(t => t.media || [])
      .filter(m => m.type === 'image')
      .slice(0, 3);

    return {
      count: mTickets.length,
      lastType: mTickets[0]?.faultType || 'NONE',
      mttr: mttr.toFixed(1),
      downtime: downtimeHrs.toFixed(1),
      risk: mTickets.length > 5 ? 'HIGH' : mTickets.length > 2 ? 'MEDIUM' : 'LOW',
      images: historyImages
    };
  }, [selectedMachineId, tickets]);

  const performance = useMemo(() => {
    if (!selectedMachine) return null;
    const weekStart = Date.now() - (7 * 24 * 60 * 60 * 1000);
    const mTickets = tickets.filter(t => t.machineId === selectedMachine.id && t.createdAt > weekStart);
    const downtimeHrs = mTickets.reduce((acc, t) => acc + (t.actualDowntimeMinutes || (t.status !== 'CLOSED' ? (now - t.createdAt)/60000 : 0)), 0) / 60;
    const expected = selectedMachine.plannedHours || 168;
    // Fix: Replaced 'breakdownHrs' with 'downtimeHrs' as 'breakdownHrs' was undefined.
    const actual = Math.max(0, expected - downtimeHrs);
    const utilization = (actual / expected) * 100;

    return { expected, actual, downtimeHrs, utilization };
  }, [selectedMachine, tickets, now]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video') => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("File size exceeds 5MB limit.");
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const url = event.target?.result as string;
        setMedia(prev => [...prev, { url, type, name: file.name }]);
      };
      reader.readAsDataURL(file);
    }
  };

  const isFormValid = useMemo(() => {
    const basic = !!selectedMachine && !!description;
    const photoRequired = downtimeType === 'FULL_STOP' && media.filter(m => m.type === 'image').length === 0;
    return basic && !photoRequired;
  }, [selectedMachine, description, downtimeType, media]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;
    
    onCreateTicket({
      machineId: selectedMachine!.id,
      machineName: selectedMachine!.name,
      category: selectedMachine!.category,
      priority,
      faultType,
      downtimeType,
      description,
      media,
      assignedTechnicians: [],
      sparePartsConsumed: []
    });

    setSelectedMachineId('');
    setDescription('');
    setMedia([]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* System Health Indicator */}
      <div className="bg-white/10 backdrop-blur-3xl rounded-[2rem] shadow-2xl border border-white/20 p-6 flex items-center justify-between no-print">
         <div className="flex items-center gap-4">
            <div className="flex flex-col">
               <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">System Health</span>
               <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full animate-pulse ${tickets.filter(t => t.status !== 'CLOSED' && t.priority === 'CRITICAL').length > 0 ? 'bg-red-500 shadow-[0_0_10px_red]' : 'bg-green-500 shadow-[0_0_10px_green]'}`}></div>
                  <span className="text-sm font-black text-slate-800">
                    {tickets.filter(t => t.status !== 'CLOSED' && t.priority === 'CRITICAL').length > 0 ? 'CRITICAL CONDITION' : 'OPERATIONAL STABLE'}
                  </span>
               </div>
            </div>
         </div>
         <div className="flex items-center gap-6">
            <div className="text-right">
               <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Active Incidents</span>
               <div className="text-lg font-black text-slate-900">{tickets.filter(t => t.status !== 'CLOSED').length}</div>
            </div>
            <div className="h-8 w-[1px] bg-slate-200"></div>
            <div className="text-right">
               <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Avg Response</span>
               <div className="text-lg font-black text-blue-600">14m</div>
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
          <div className={`bg-white/10 backdrop-blur-3xl rounded-[3rem] shadow-2xl border transition-all duration-500 overflow-hidden ${downtimeType === 'FULL_STOP' ? 'border-red-500/50' : 'border-white/20'}`}>
            <div className={`px-8 py-6 flex items-center justify-between ${downtimeType === 'FULL_STOP' ? 'bg-red-600/80 backdrop-blur-md' : 'bg-slate-900/80 backdrop-blur-md'}`}>
              <div className="flex items-center gap-4">
                <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-md">
                  <AlertTriangle className="text-white w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white uppercase tracking-tight">Smart Incident Management</h3>
                  <p className="text-white/60 text-[10px] font-black uppercase tracking-widest">Enterprise Reporting Protocol</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Workcenter Area</label>
                  <select 
                    id="tour-machine-category"
                    value={selectedCategory}
                    onChange={(e) => { setSelectedCategory(e.target.value); setSelectedMachineId(''); }}
                    className="w-full rounded-2xl border-slate-200 bg-white/50 py-4 px-4 border font-bold text-slate-900 outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none"
                    required
                  >
                    <option value="">-- SELECT AREA --</option>
                    {Array.from(new Set(machines.map(m => m.category))).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Target Asset</label>
                  <select 
                    id="tour-machine-select"
                    value={selectedMachineId}
                    onChange={(e) => setSelectedMachineId(e.target.value)}
                    className="w-full rounded-2xl border-slate-200 bg-white/50 py-4 px-4 border font-bold text-slate-900 outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none disabled:opacity-30"
                    disabled={!selectedCategory}
                    required
                  >
                    <option value="">-- SELECT MACHINE --</option>
                    {filteredMachines.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-4">
                 <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Operational Impact</label>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button
                      id="tour-full-stop"
                      type="button"
                      onClick={() => setDowntimeType('FULL_STOP')}
                      className={`flex items-center gap-4 p-5 rounded-3xl border transition-all ${
                        downtimeType === 'FULL_STOP' 
                        ? 'border-red-500/50 bg-red-500/10 ring-4 ring-red-500/10' 
                        : 'border-slate-200 hover:border-red-500/30 bg-white/50'
                      }`}
                    >
                      <div className={`p-3 rounded-2xl ${downtimeType === 'FULL_STOP' ? 'bg-red-600 text-white shadow-lg shadow-red-500/40' : 'bg-slate-200 text-slate-400'}`}>
                         <XCircle className="w-6 h-6" />
                      </div>
                      <div className="text-left">
                         <span className={`block font-black text-sm uppercase ${downtimeType === 'FULL_STOP' ? 'text-red-700' : 'text-slate-500'}`}>Full Stop</span>
                         <span className="text-[10px] font-bold text-slate-400">Photo Evidence Mandatory</span>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDowntimeType('PARTIAL_STOP')}
                      className={`flex items-center gap-4 p-5 rounded-3xl border transition-all ${
                        downtimeType === 'PARTIAL_STOP' 
                        ? 'border-green-500/50 bg-green-500/10 ring-4 ring-green-500/10' 
                        : 'border-slate-200 hover:border-green-500/30 bg-white/50'
                      }`}
                    >
                      <div className={`p-3 rounded-2xl ${downtimeType === 'PARTIAL_STOP' ? 'bg-green-600 text-white shadow-lg shadow-green-500/40' : 'bg-slate-200 text-slate-400'}`}>
                         <Activity className="w-6 h-6" />
                      </div>
                      <div className="text-left">
                         <span className={`block font-black text-sm uppercase ${downtimeType === 'PARTIAL_STOP' ? 'text-green-700' : 'text-slate-500'}`}>Partial Stop</span>
                         <span className="text-[10px] font-bold text-slate-400">Reduced Production</span>
                      </div>
                    </button>
                 </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Fault Classification</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['ELECTRICAL', 'MECHANICAL', 'HYDRAULIC', 'SOFTWARE', 'OTHER'] as FaultType[]).map((type) => (
                      <button
                        key={type} type="button" onClick={() => setFaultType(type)}
                        className={`px-2 py-3 rounded-2xl transition-all border ${
                          faultType === type ? 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-500/40' : 'bg-white/50 border-slate-200 text-slate-500 hover:border-blue-400/30'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-4">
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Incident Priority</label>
                  <div id="tour-priority" className="grid grid-cols-4 gap-2">
                    {(['LOW', 'NORMAL', 'HIGH', 'CRITICAL'] as Priority[]).map((p) => (
                      <button
                        key={p} type="button" onClick={() => setPriority(p)}
                        className={`py-3 rounded-2xl transition-all border ${
                          priority === p 
                            ? (p === 'CRITICAL' ? 'bg-red-600 border-red-400 text-white shadow-lg shadow-red-500/40 animate-pulse' : 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-500/40') 
                            : 'bg-white/50 border-slate-200 text-slate-500 hover:border-blue-400/30'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                   <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Visual Evidence (Media Upload)</label>
                   {downtimeType === 'FULL_STOP' && media.length === 0 && (
                      <span className="text-[10px] font-black text-red-500 flex items-center gap-1 animate-pulse">
                         <AlertCircle className="w-3 h-3" /> REQUIRED FOR FULL STOP
                      </span>
                   )}
                </div>
                <div className="flex flex-wrap gap-4">
                   <label className="cursor-pointer group">
                      <input type="file" accept="image/*" className="hidden" onChange={e => handleFileUpload(e, 'image')} />
                      <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-400 group-hover:border-blue-400 group-hover:text-blue-500 transition-all bg-slate-50">
                         <Camera className="w-8 h-8" />
                      </div>
                   </label>
                   {media.map((m, idx) => (
                      <div key={idx} className="relative w-20 h-20 rounded-2xl overflow-hidden group border border-slate-200 shadow-sm">
                         {m.type === 'image' ? <img src={m.url} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-slate-900 flex items-center justify-center"><Video className="w-8 h-8 text-white" /></div>}
                         <button onClick={() => setMedia(media.filter((_, i) => i !== idx))} className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <X className="w-3 h-3" />
                         </button>
                      </div>
                   ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Incident Details</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="w-full rounded-[2rem] border-slate-200 bg-white/50 p-6 font-bold text-slate-900 outline-none focus:border-blue-500 transition-all placeholder:text-slate-300 shadow-inner"
                  placeholder="Describe failure symptoms clearly..."
                  required
                ></textarea>
              </div>

              <button
                id="tour-submit-ticket"
                type="submit"
                disabled={!isFormValid}
                className={`w-full btn-industrial py-6 ${
                  !isFormValid 
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200' 
                    : (downtimeType === 'FULL_STOP' 
                        ? 'bg-gradient-to-br from-red-500 to-red-700 text-white shadow-[0_15px_30px_-10px_rgba(220,38,38,0.5)] border border-red-400' 
                        : 'btn-liquid-glass')
                }`}
              >
                <Send className="w-5 h-5" />
                <span>Submit Maintenance Request</span>
              </button>
            </form>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-8">
           <div className="bg-white/10 backdrop-blur-3xl rounded-[3rem] shadow-2xl border border-white/20 overflow-hidden">
              <div className="p-6 border-b border-slate-200 bg-white/50 flex items-center gap-3">
                 <Gauge className="w-5 h-5 text-blue-600" />
                 <h3 className="font-black text-slate-800 text-[10px] uppercase tracking-[0.2em]">Live Asset KPI</h3>
              </div>
              <div className="p-6 space-y-6">
                 {performance ? (
                    <>
                       <div className="grid grid-cols-2 gap-4">
                          <div className="bg-white/50 p-4 rounded-2xl border border-slate-200 text-center">
                             <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest block mb-1">Weekly Plan</span>
                             <span className="text-lg font-black text-slate-900">{performance.expected}h</span>
                          </div>
                          <div className="bg-white/50 p-4 rounded-2xl border border-slate-200 text-center">
                             <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest block mb-1">Actual Run</span>
                             <span className="text-lg font-black text-blue-600">{performance.actual.toFixed(1)}h</span>
                          </div>
                       </div>
                       <div className="space-y-2">
                          <div className="flex justify-between items-center text-[10px] font-black uppercase">
                             <span className="text-slate-500">Utilization Rate</span>
                             <span className={performance.utilization < 70 ? 'text-red-600' : 'text-green-600'}>{performance.utilization.toFixed(1)}%</span>
                          </div>
                          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                             <div className={`h-full transition-all duration-1000 ${performance.utilization < 70 ? 'bg-red-500' : 'bg-green-500'}`} style={{ width: `${performance.utilization}%` }}></div>
                          </div>
                       </div>
                    </>
                 ) : (
                    <div className="py-8 text-center text-slate-400">
                       <Zap className="w-10 h-10 mx-auto opacity-20 mb-3" />
                       <p className="text-[10px] font-black uppercase">Select asset to view stats</p>
                    </div>
                 )}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default ProductionView;