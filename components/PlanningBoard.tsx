

import React, { useState, useEffect, useMemo } from 'react';
import { MACHINE_CATEGORIES } from '../constants';
import { Ticket, Machine } from '../types';
import { 
  AlertTriangle, 
  User, 
  Clock, 
  Ban, 
  Activity, 
  PauseCircle, 
  ShieldCheck,
  Timer,
  Coffee,
  AlertOctagon
} from 'lucide-react';

interface PlanningBoardProps {
  machines: Machine[]; // These should now be pre-filtered for active+approved versions
  tickets: Ticket[];
}

const PlanningBoard: React.FC<PlanningBoardProps> = ({ tickets, machines }) => {
  const [now, setNow] = useState(Date.now());

  // Update timers every second for live feedback
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const formatDuration = (start: number) => {
    const diff = Math.max(0, now - start);
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getDisplayStatus = (machine: Machine) => {
    // 1. Grey: Out of Service (Highest Priority override)
    if (machine.status === 'OUT_OF_SERVICE') {
      return { 
        label: 'Out of Service', 
        color: 'bg-slate-500', 
        bg: 'bg-slate-50',
        border: 'border-l-slate-500',
        text: 'text-slate-600',
        state: 'OUT',
        icon: <Ban className="w-4 h-4" />
      };
    }

    const activeTicket = tickets.find(t => t.machineId === machine.id && t.status !== 'CLOSED');
    
    // 2. Green: Running (No active tickets)
    if (!activeTicket) {
      return { 
        label: 'Running', 
        color: 'bg-green-600', 
        bg: 'bg-white',
        border: 'border-l-green-600',
        text: 'text-green-700',
        state: 'RUNNING',
        icon: <ShieldCheck className="w-4 h-4" />
      };
    }

    // 3. Orange: On Hold
    if (activeTicket.status === 'ON_HOLD') {
      return { 
        label: 'On Hold', 
        color: 'bg-orange-500', 
        bg: 'bg-orange-50/50',
        border: 'border-l-orange-500',
        text: 'text-orange-700',
        state: 'HOLD',
        icon: <PauseCircle className="w-4 h-4" />
      };
    }

    // 4. Red: Full Stop
    if (activeTicket.downtimeType === 'FULL_STOP') {
      return { 
        label: 'Full Stop', 
        color: 'bg-red-600', 
        bg: 'bg-red-50/50',
        border: 'border-l-red-600',
        text: 'text-red-700',
        state: 'DOWN',
        icon: <AlertOctagon className="w-4 h-4" />
      };
    }

    // 5. Yellow: Partial Stop
    return { 
      label: 'Partial Stop', 
      color: 'bg-yellow-500', 
      bg: 'bg-yellow-50/50',
      border: 'border-l-yellow-500',
      text: 'text-yellow-700',
      state: 'PARTIAL',
      icon: <Activity className="w-4 h-4" />
    };
  };

  const getTimerData = (ticket: Ticket) => {
    const elapsedMinutes = (now - (ticket.lastStatusChange || ticket.createdAt)) / 60000;
    let valueMs = 0;
    
    if (ticket.status === 'IN_PROGRESS') {
      valueMs = (ticket.totalActiveMinutes + elapsedMinutes) * 60000;
    } else if (ticket.status === 'ON_HOLD') {
      valueMs = (ticket.totalHoldMinutes + elapsedMinutes) * 60000;
    } else {
      // Waiting/Open - show time since creation
      valueMs = now - ticket.createdAt;
    }

    const hours = valueMs / 3600000;
    return hours.toFixed(1);
  };

  const machineCategories = useMemo(() => Array.from(new Set(machines.map(m => m.category))), [machines]);


  return (
    <div className="space-y-8 pb-10">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {machineCategories.map(category => {
          const machinesInCategory = machines.filter(m => m.category === category);
          return (
            <div key={category} className="card-industrial flex flex-col border-2 border-slate-100 shadow-xl shadow-slate-200/50">
              <div className="bg-slate-900 px-6 py-4 flex justify-between items-center border-b border-slate-800">
                <h3 className="font-black text-white text-[10px] uppercase tracking-[0.2em]">{category}</h3>
                <span className="text-[9px] bg-slate-800 text-slate-400 px-3 py-1 rounded-full font-black uppercase">
                  {machinesInCategory.length} Units
                </span>
              </div>

              <div className="divide-y divide-slate-100 flex-1 overflow-y-auto custom-scrollbar">
                {machinesInCategory.map(machine => {
                  const status = getDisplayStatus(machine);
                  const activeTicket = tickets.find(t => t.machineId === machine.id && t.status !== 'CLOSED');
                  
                  return (
                    <div 
                      key={machine.id} 
                      className={`p-5 border-l-[6px] transition-all relative ${status.border} ${status.bg} hover:bg-slate-50 flex flex-col gap-4`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="min-w-0">
                           <span className={`block font-black text-base tracking-tight truncate ${status.state === 'OUT' ? 'text-slate-400' : 'text-slate-800'}`}>
                             {machine.name}
                           </span>
                           <div className={`flex items-center gap-1.5 mt-1 ${status.text}`}>
                             {status.icon}
                             <span className="uppercase text-[10px] font-black tracking-widest">
                               {status.label}
                             </span>
                           </div>
                        </div>
                        <div className={`w-3.5 h-3.5 rounded-full ${status.color} shadow-[0_0_10px_rgba(0,0,0,0.1)] shrink-0 mt-1`}></div>
                      </div>
                      
                      {status.state === 'OUT' && machine.outOfServiceSince && (
                        <div className="bg-slate-200/50 p-3 rounded-2xl border border-slate-300 flex items-center justify-center gap-3">
                           <Clock className="w-4 h-4 text-slate-500 animate-pulse" />
                           <span className="font-mono font-black text-sm text-slate-800 tracking-tighter">{formatDuration(machine.outOfServiceSince)}</span>
                        </div>
                      )}

                      {activeTicket && (
                        <div className="space-y-2">
                          <div className={`flex items-center gap-3 p-3 rounded-2xl border-2 transition-all justify-between ${
                            activeTicket.status === 'IN_PROGRESS' 
                              ? 'bg-white border-blue-100 shadow-sm' 
                              : activeTicket.status === 'ON_HOLD'
                                ? 'bg-orange-50 border-orange-100 text-orange-800'
                                : 'bg-slate-50 border-slate-100 text-slate-600'
                          }`}>
                            <div className="flex items-center gap-3 min-w-0 overflow-hidden">
                              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                                activeTicket.status === 'IN_PROGRESS' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-slate-200 text-slate-500'
                              }`}>
                                <User className="w-4 h-4" />
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none mb-1">Eng. Response</span>
                                <span className="text-xs font-black truncate text-slate-800">
                                  {activeTicket.technicianName || (activeTicket.assignedTechnicians?.[0]?.name) || 'Dispatching...'}
                                </span>
                              </div>
                            </div>
                            
                            <div className="flex flex-col items-end shrink-0 pl-2 border-l-2 border-slate-100">
                              <div className="flex items-center gap-1.5 mb-1">
                                {activeTicket.status === 'ON_HOLD' ? (
                                  <Coffee className="w-3 h-3 text-orange-500" />
                                ) : (
                                  <Timer className={`w-3 h-3 ${activeTicket.status === 'IN_PROGRESS' ? 'text-blue-600 animate-spin' : 'text-slate-400'}`} />
                                )}
                                <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Active</span>
                              </div>
                              <span className="text-sm font-mono font-black ${activeTicket.status === 'IN_PROGRESS' ? 'text-blue-700' : 'text-slate-700'}">
                                {getTimerData(activeTicket)}H
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {status.state === 'RUNNING' && (
                        <div className="flex flex-col gap-2">
                           <div className="flex justify-between items-center">
                             <span className="text-[9px] text-green-600 font-black uppercase tracking-widest opacity-60">Uptime Nominal</span>
                             <span className="text-[9px] text-green-600 font-black uppercase tracking-widest">100%</span>
                           </div>
                           <div className="flex-1 h-1.5 bg-green-100 rounded-full overflow-hidden">
                             <div className="h-full bg-green-600 w-1/3 animate-[progress_2s_infinite_linear]"></div>
                           </div>
                        </div>
                      )}

                      {status.state === 'OUT' && !machine.outOfServiceSince && (
                        <div className="text-[10px] text-slate-500 font-black uppercase tracking-widest flex items-center gap-2 bg-slate-200/50 p-3 rounded-2xl border border-slate-300 shadow-inner">
                          <AlertTriangle className="w-4 h-4 text-slate-400" />
                          {machine.outOfServiceReason || 'Decommissioned'}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      <style>{`
        @keyframes progress {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(300%); }
        }
      `}</style>
    </div>
  );
};

export default PlanningBoard;