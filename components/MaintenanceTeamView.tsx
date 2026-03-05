
import React, { useMemo } from 'react';
import { User, Ticket, TicketStatus } from '../types';
import { 
  Users, 
  Wrench, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Coffee, 
  Activity,
  Briefcase,
  UserCheck
} from 'lucide-react';

interface MaintenanceTeamViewProps {
  users: User[];
  tickets: Ticket[];
}

interface TechStatusData {
  status: string;
  ticket?: Ticket;
  activeTime: number;
  ticketsToday: number;
}

const MaintenanceTeamView: React.FC<MaintenanceTeamViewProps> = ({ users, tickets = [] }) => {
  const technicians = useMemo(() => users.filter(u => u.role === 'MAINTENANCE'), [users]);
  
  const techStatusMap = useMemo(() => {
    const map = new Map<string, TechStatusData>();
    const now = Date.now();
    const startOfDay = new Date().setHours(0,0,0,0);

    technicians.forEach(tech => {
      const activeTicket = tickets.find(t => 
        t.status !== 'CLOSED' && 
        t.assignedTechnicians && 
        t.assignedTechnicians.some(at => at.id === tech.id)
      );

      const completedToday = tickets.filter(t => 
        t.status === 'CLOSED' && 
        t.closedAt && t.closedAt > startOfDay &&
        t.assignedTechnicians && 
        t.assignedTechnicians.some(at => at.id === tech.id)
      ).length;

      // Safe calculation of active time
      const activeTimeMinutes = (completedToday * 45) + 
        (activeTicket ? Math.max(0, (now - (activeTicket.lastStatusChange || activeTicket.createdAt || now)) / 60000) : 0);

      let status = 'AVAILABLE';
      if (!tech.active) status = 'OFF_SHIFT';
      else if (activeTicket?.status === 'IN_PROGRESS') status = 'ASSIGNED';
      else if (activeTicket?.status === 'ON_HOLD') status = 'ON_HOLD';

      map.set(tech.id, {
        status,
        ticket: activeTicket,
        activeTime: isNaN(activeTimeMinutes) ? 0 : activeTimeMinutes,
        ticketsToday: completedToday
      });
    });

    return map;
  }, [technicians, tickets]);

  const kpis = useMemo(() => {
    const activeTechs = technicians.filter(t => techStatusMap.get(t.id)?.status !== 'OFF_SHIFT').length;
    const statusValues: TechStatusData[] = Array.from(techStatusMap.values());
    const busyTechs = statusValues.filter(s => s.status === 'ASSIGNED' || s.status === 'ON_HOLD').length;
    const utilization = activeTechs > 0 ? Math.round((busyTechs / activeTechs) * 100) : 0;
    const totalTicketsToday = statusValues.reduce((acc, curr) => acc + curr.ticketsToday, 0);
    return { activeTechs, busyTechs, utilization, totalTicketsToday };
  }, [technicians, techStatusMap]);

  return (
    <div className="space-y-8 pb-20">
      <div className="flex items-center justify-between bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="bg-slate-900 p-3 rounded-2xl text-white shadow-xl"><Users className="w-6 h-6" /></div>
          <div>
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Maintenance Team Monitor</h2>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Real-time Resource Allocation</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KPICard title="Staff Active" value={kpis.activeTechs} icon={<UserCheck className="text-blue-600" />} />
        <KPICard title="Repairing Now" value={kpis.busyTechs} icon={<Wrench className="text-amber-600" />} />
        <KPICard title="Utilization" value={`${kpis.utilization}%`} icon={<Activity className="text-purple-600" />} />
        <KPICard title="Completed (24h)" value={kpis.totalTicketsToday} icon={<CheckCircle2 className="text-green-600" />} />
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="table-responsive">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-[10px] uppercase text-slate-500 font-black tracking-widest border-b border-slate-100">
                <th className="px-6 py-5">Technician</th>
                <th className="px-6 py-5">Status</th>
                <th className="px-6 py-5">Assignment</th>
                <th className="px-6 py-5">Activity Level</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {technicians.map(tech => {
                const data = techStatusMap.get(tech.id) || { status: 'OFF_SHIFT', activeTime: 0, ticketsToday: 0 };
                const activeHours = (data.activeTime || 0) / 60;
                return (
                  <tr key={tech.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-black text-slate-500 text-xs border border-slate-200">
                           {tech.name?.charAt(0) || 'U'}
                        </div>
                        <div>
                           <div className="text-sm font-black text-slate-800">{tech.name}</div>
                           <div className="flex flex-wrap gap-1 mt-1.5">
                             {tech.maintenanceRole && (
                               <span className="text-[8px] font-black bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded border border-blue-100 uppercase tracking-tighter">
                                 {tech.maintenanceRole}
                               </span>
                             )}
                             {tech.specialization && (
                               <span className={`text-[8px] font-black px-1.5 py-0.5 rounded border uppercase tracking-tighter ${
                                 tech.specialization === 'ELECTRICAL' 
                                   ? 'bg-amber-50 text-amber-600 border-amber-100' 
                                   : 'bg-slate-50 text-slate-600 border-slate-200'
                               }`}>
                                 {tech.specialization}
                               </span>
                             )}
                             {!tech.maintenanceRole && !tech.specialization && (
                               <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">
                                 {tech.role}
                               </span>
                             )}
                           </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4"><StatusBadge status={data.status} /></td>
                    <td className="px-6 py-4">
                       {data.ticket ? (
                         <div className="flex flex-col">
                            <span className="text-xs font-black text-slate-800 truncate max-w-[150px]">{data.ticket.machineName}</span>
                            <span className="text-[9px] font-bold text-blue-500 uppercase">Active: #{data.ticket.id}</span>
                         </div>
                       ) : <span className="text-slate-300 text-[10px] font-black uppercase">- Ready -</span>}
                    </td>
                    <td className="px-6 py-4">
                       <div className="flex flex-col gap-1.5">
                          <div className="flex justify-between text-[8px] font-black uppercase text-slate-400">
                             <span>Work: {data.ticketsToday}</span>
                             <span>Load: {activeHours.toFixed(1)}h</span>
                          </div>
                          <div className="h-1.5 w-24 bg-slate-100 rounded-full overflow-hidden">
                             <div 
                               className={`h-full ${activeHours > 8 ? 'bg-red-500' : 'bg-blue-500'}`} 
                               style={{width: `${Math.min(100, (activeHours / 12) * 100)}%`}}
                             ></div>
                          </div>
                       </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const KPICard = ({ title, value, icon }: any) => (
  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">{icon}</div>
    <div>
       <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{title}</div>
       <div className="text-2xl font-black text-slate-800 leading-none">{value}</div>
    </div>
  </div>
);

const StatusBadge = ({ status }: { status: string }) => {
  const styles: any = { 
    'AVAILABLE': 'bg-green-100 text-green-700 border-green-200', 
    'ASSIGNED': 'bg-blue-100 text-blue-700 border-blue-200', 
    'ON_HOLD': 'bg-orange-100 text-orange-700 border-orange-200', 
    'OFF_SHIFT': 'bg-slate-100 text-slate-500 border-slate-200' 
  };
  const icons: any = { 
    'AVAILABLE': <CheckCircle2 className="w-3 h-3" />, 
    'ASSIGNED': <Activity className="w-3 h-3" />, 
    'ON_HOLD': <Coffee className="w-3 h-3" />, 
    'OFF_SHIFT': <Clock className="w-3 h-3" /> 
  };
  return (
    <span className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-[9px] font-black uppercase tracking-widest ${styles[status] || styles['OFF_SHIFT']}`}>
      {icons[status]} {status.replace('_', ' ')}
    </span>
  );
};

export default MaintenanceTeamView;
