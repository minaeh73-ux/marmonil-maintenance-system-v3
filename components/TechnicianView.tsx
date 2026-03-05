
import React, { useMemo } from 'react';
import { User, Ticket } from '../types';
import { UserCheck, Star, Clock, Wrench, BarChart2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface TechnicianViewProps {
  users: User[];
  tickets: Ticket[];
}

const TechnicianView: React.FC<TechnicianViewProps> = ({ users, tickets }) => {
  const techs = users.filter(u => u.role === 'MAINTENANCE');

  const stats = useMemo(() => {
    return techs.map(tech => {
      const myTickets = tickets.filter(t => t.status === 'CLOSED' && t.assignedTechnicians.some(at => at.id === tech.id));
      const totalTickets = myTickets.length;
      const totalTime = myTickets.reduce((acc, t) => acc + (t.actualDowntimeMinutes || 0), 0);
      const avgTime = totalTickets > 0 ? Math.round(totalTime / totalTickets) : 0;
      
      // Calculate Efficiency Score (Lower MTTR is better)
      // Base score 100, deduct for high MTTR
      const efficiency = Math.max(0, 100 - (avgTime / 2)); 

      return {
        id: tech.id,
        name: tech.name,
        totalTickets,
        avgTime,
        efficiency: Math.round(efficiency),
        specialty: tech.specialization || 'General'
      };
    }).sort((a,b) => b.efficiency - a.efficiency);
  }, [users, tickets]);

  return (
    <div className="space-y-8 pb-20">
      <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm flex items-center gap-6">
         <div className="bg-slate-900 p-4 rounded-2xl text-white">
            <UserCheck className="w-8 h-8" />
         </div>
         <div>
            <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Technician Performance</h2>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Efficiency Ranking & Analytics</p>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         <div className="space-y-4">
            {stats.map((tech, idx) => (
               <div key={tech.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between hover:border-blue-300 transition-all">
                  <div className="flex items-center gap-4">
                     <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-lg ${
                        idx === 0 ? 'bg-yellow-100 text-yellow-600' : 
                        idx === 1 ? 'bg-slate-200 text-slate-600' : 
                        idx === 2 ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 text-slate-400'
                     }`}>
                        {idx + 1}
                     </div>
                     <div>
                        <h3 className="font-black text-slate-800">{tech.name}</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">{tech.specialty}</p>
                     </div>
                  </div>
                  <div className="flex items-center gap-6 text-right">
                     <div>
                        <div className="text-xs font-bold text-slate-400 uppercase">Tickets</div>
                        <div className="text-lg font-black text-slate-800">{tech.totalTickets}</div>
                     </div>
                     <div>
                        <div className="text-xs font-bold text-slate-400 uppercase">MTTR</div>
                        <div className="text-lg font-black text-blue-600">{tech.avgTime}m</div>
                     </div>
                     <div className="w-16">
                        <div className="text-xs font-bold text-slate-400 uppercase mb-1">Score</div>
                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                           <div className={`h-full ${tech.efficiency > 80 ? 'bg-green-500' : tech.efficiency > 60 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{width: `${tech.efficiency}%`}}></div>
                        </div>
                     </div>
                  </div>
               </div>
            ))}
         </div>

         <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm h-[500px] flex flex-col">
            <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest mb-6 flex items-center gap-2">
               <BarChart2 className="w-5 h-5 text-blue-600" /> Comparative Throughput
            </h3>
            <div className="flex-1 w-full text-xs font-bold">
               <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats} layout="vertical" margin={{left: 30}}>
                     <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                     <XAxis type="number" hide />
                     <YAxis dataKey="name" type="category" width={100} tick={{fill: '#64748b'}} />
                     <Tooltip cursor={{fill: '#f8fafc'}} />
                     <Bar dataKey="totalTickets" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={30} />
                  </BarChart>
               </ResponsiveContainer>
            </div>
         </div>
      </div>
    </div>
  );
};

export default TechnicianView;
