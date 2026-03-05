

import React, { useMemo } from 'react';
import { Ticket, Machine } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Zap, Timer, HeartPulse, ShieldCheck, AlertOctagon } from 'lucide-react';

interface KPIProps {
  tickets: Ticket[];
  machines: Machine[]; // These should now be pre-filtered for active+approved versions
}

const KPIs: React.FC<KPIProps> = ({ tickets, machines }) => {
  const metrics = useMemo(() => {
    const total = tickets.length;
    const closed = tickets.filter(t => t.status === 'CLOSED');
    
    const totalDowntime = closed.reduce((acc, t) => acc + (t.totalActiveMinutes + t.totalHoldMinutes), 0);
    const mttr = closed.length > 0 ? Math.round(totalDowntime / closed.length) : 0;

    const factoryOperationHours = machines.reduce((sum, m) => sum + (m.plannedHours || 168), 0); // Use filtered machines
    const mtbf = total > 0 ? Math.round(factoryOperationHours / total) : factoryOperationHours;

    let repeats = 0;
    closed.forEach(t => {
       const subsequentFault = tickets.find(next => next.machineId === t.machineId && next.createdAt > t.closedAt! && (next.createdAt - t.closedAt!) < 48 * 60 * 60 * 1000);
       if(subsequentFault) repeats++;
    });
    const repeatRatio = total > 0 ? Math.round((repeats / total) * 100) : 0;

    return { total, mttr, mtbf, repeatRatio };
  }, [tickets, machines]);

  return (
    <div className="space-y-6 md:space-y-8">
      {/* 4 cols on XL, 2 on MD, 1 on small */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6">
        <KPICard title="MTTR (Repair)" value={`${metrics.mttr}m`} sub="Avg. intervention" icon={<Timer className="text-blue-600" />} />
        <KPICard title="MTBF (Uptime)" value={`${metrics.mtbf}h`} sub="Avg. time between" icon={<Zap className="text-amber-600" />} />
        <KPICard title="Repeat Faults" value={`${metrics.repeatRatio}%`} sub="Within 48h window" icon={<AlertOctagon className="text-red-600" />} />
        <KPICard title="Reliability" value="94.2%" sub="Global availability" icon={<ShieldCheck className="text-green-600" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 min-h-[400px]">
        <div className="card-industrial p-4 md:p-6 flex flex-col">
           <h4 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
             <HeartPulse className="w-5 h-5 text-red-500" /> Availability Trends
           </h4>
           <div className="flex-1 min-h-[250px] w-full">
             <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={[
                  {day: 'Mon', val: 92}, {day: 'Tue', val: 95}, {day: 'Wed', val: 88}, 
                  {day: 'Thu', val: 91}, {day: 'Fri', val: 96}, {day: 'Sat', val: 98}, {day: 'Sun', val: 94}
                ]}>
                  <defs>
                    <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="day" fontSize={11} axisLine={false} tickLine={false} tick={{fill: '#94a3b8'}} />
                  <YAxis hide domain={[80, 100]} />
                  <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                  <Area type="monotone" dataKey="val" stroke="#3b82f6" fillOpacity={1} fill="url(#colorVal)" strokeWidth={3} />
                </AreaChart>
             </ResponsiveContainer>
           </div>
        </div>
        
        <div className="card-industrial p-4 md:p-6 flex flex-col">
          <h4 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
            <Zap className="w-5 h-5 text-blue-500" /> Technician Load
          </h4>
           <div className="flex-1 min-h-[250px] w-full">
             <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[
                  {name: 'Eng. Hanna', tickets: 12}, {name: 'Eng. Ahmed', tickets: 8}, 
                  {name: 'Eng. Mina', tickets: 15}, {name: 'Eng. Mohamed', tickets: 6}
                ]} margin={{left: -20}}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} tick={{fill: '#94a3b8'}} />
                  <YAxis fontSize={10} axisLine={false} tickLine={false} tick={{fill: '#94a3b8'}} />
                  <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                  <Bar dataKey="tickets" fill="#334155" radius={[6, 6, 0, 0]} barSize={40} />
                </BarChart>
             </ResponsiveContainer>
           </div>
        </div>
      </div>
    </div>
  );
};

const KPICard = ({ title, value, sub, icon }: any) => (
  <div className="card-industrial p-5 flex items-center gap-4 transition-transform hover:scale-[1.02] duration-200">
    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex-shrink-0">{icon}</div>
    <div className="min-w-0">
       <h5 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest truncate">{title}</h5>
       <div className="text-2xl font-black text-slate-800 leading-none my-1">{value}</div>
       <p className="text-[10px] text-slate-500 font-bold truncate">{sub}</p>
    </div>
  </div>
);

export default KPIs;