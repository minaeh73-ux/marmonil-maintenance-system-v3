
import React, { useMemo } from 'react';
import { Ticket, Machine } from '../types';
import { BrainCircuit, AlertOctagon, CalendarClock, History, ArrowRight } from 'lucide-react';

interface PredictiveViewProps {
  tickets: Ticket[];
  machines: Machine[];
  onSchedule: (machineId: string) => void;
}

const PredictiveView: React.FC<PredictiveViewProps> = ({ tickets, machines, onSchedule }) => {
  const analysis = useMemo(() => {
    return machines.map(machine => {
      const mTickets = tickets.filter(t => t.machineId === machine.id).sort((a,b) => b.createdAt - a.createdAt);
      
      // Calculate MTBF (Mean Time Between Failures)
      let totalTime = 0;
      let breakdownCount = mTickets.length;
      
      if (breakdownCount > 1) {
        // Time between first and last ticket
        const first = mTickets[mTickets.length - 1].createdAt;
        const last = mTickets[0].createdAt;
        totalTime = last - first;
      }
      
      const mtbfDays = breakdownCount > 1 ? Math.round((totalTime / (breakdownCount - 1)) / (1000 * 60 * 60 * 24)) : 30; // Default 30
      
      // Predict Next Failure
      const lastFailure = mTickets[0]?.createdAt || Date.now();
      const nextFailureDate = new Date(lastFailure + (mtbfDays * 24 * 60 * 60 * 1000));
      const daysToNext = Math.ceil((nextFailureDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

      // Risk Calculation
      // Factors: Low MTBF, High Frequency, Recent Critical Faults
      const criticalFaults = mTickets.filter(t => t.priority === 'CRITICAL').length;
      let riskScore = 0;
      if (mtbfDays < 7) riskScore += 40;
      else if (mtbfDays < 14) riskScore += 20;
      
      if (criticalFaults > 2) riskScore += 30;
      if (daysToNext < 3) riskScore += 30;

      const riskLevel = riskScore > 60 ? 'HIGH' : riskScore > 30 ? 'MEDIUM' : 'LOW';

      return {
        ...machine,
        mtbfDays,
        nextFailureDate,
        daysToNext,
        riskLevel,
        riskScore,
        lastFault: mTickets[0]?.faultType || 'N/A'
      };
    }).sort((a,b) => b.riskScore - a.riskScore);
  }, [machines, tickets]);

  return (
    <div className="space-y-8 pb-20">
      <div className="bg-gradient-to-r from-violet-600 to-indigo-600 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden">
         <div className="relative z-10 flex items-center gap-6">
            <div className="bg-white/20 p-4 rounded-2xl backdrop-blur-sm border border-white/20">
               <BrainCircuit className="w-10 h-10 text-white" />
            </div>
            <div>
               <h2 className="text-3xl font-black uppercase tracking-tight">Predictive Intelligence</h2>
               <p className="text-xs font-bold text-indigo-200 uppercase tracking-widest mt-1">AI-Driven Failure Forecasting</p>
            </div>
         </div>
         <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         {analysis.map(item => (
            <div key={item.id} className={`bg-white rounded-3xl border-2 p-6 shadow-sm flex flex-col justify-between transition-all hover:shadow-xl ${
               item.riskLevel === 'HIGH' ? 'border-red-500 shadow-red-100' : 
               item.riskLevel === 'MEDIUM' ? 'border-amber-400 shadow-amber-100' : 'border-slate-200'
            }`}>
               <div className="flex justify-between items-start mb-6">
                  <div>
                     <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">{item.name}</h3>
                     <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.category}</span>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                     item.riskLevel === 'HIGH' ? 'bg-red-100 text-red-600' : 
                     item.riskLevel === 'MEDIUM' ? 'bg-amber-100 text-amber-600' : 'bg-green-100 text-green-600'
                  }`}>
                     {item.riskLevel} Risk
                  </div>
               </div>

               <div className="space-y-4 mb-6">
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                     <div className="flex items-center gap-3">
                        <History className="w-4 h-4 text-slate-400" />
                        <span className="text-[10px] font-bold text-slate-500 uppercase">MTBF</span>
                     </div>
                     <span className="text-sm font-black text-slate-800">{item.mtbfDays} Days</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                     <div className="flex items-center gap-3">
                        <CalendarClock className="w-4 h-4 text-slate-400" />
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Next Predicted Breakdown</span>
                     </div>
                     <div className="text-right">
                        <div className="text-sm font-black text-slate-800">{item.nextFailureDate.toLocaleDateString()}</div>
                        <div className={`text-[9px] font-black uppercase ${item.daysToNext < 3 ? 'text-red-500' : 'text-slate-400'}`}>
                           In {item.daysToNext} Days
                        </div>
                     </div>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                     <div className="flex items-center gap-3">
                        <AlertOctagon className="w-4 h-4 text-slate-400" />
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Likely Fault</span>
                     </div>
                     <span className="text-xs font-black text-slate-800">{item.lastFault}</span>
                  </div>
               </div>

               <button 
                 onClick={() => onSchedule(item.id)}
                 className="w-full btn-industrial btn-secondary py-4"
               >
                  Schedule Preventive <ArrowRight className="w-3 h-3" />
               </button>
            </div>
         ))}
      </div>
    </div>
  );
};

export default PredictiveView;
