
import React, { useState, useMemo } from 'react';
import { Ticket, Machine, User } from '../types';
import { 
  History, 
  Search, 
  Filter, 
  Download, 
  AlertTriangle, 
  BarChart3, 
  Wrench, 
  Calendar,
  Layers,
  CheckCircle2,
  Clock
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface FailureHistoryViewProps {
  tickets: Ticket[];
  machines: Machine[];
  users: User[];
}

const FailureHistoryView: React.FC<FailureHistoryViewProps> = ({ tickets = [], machines, users }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMachine, setFilterMachine] = useState('');
  const [filterFault, setFilterFault] = useState('');
  const [filterDateStart, setFilterDateStart] = useState('');
  const [filterDateEnd, setFilterDateEnd] = useState('');

  const filteredData = useMemo(() => {
    return tickets.filter(t => {
      const matchesSearch = 
        (t.id?.toLowerCase().includes(searchTerm.toLowerCase()) || false) || 
        (t.description?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
        (t.solution?.toLowerCase().includes(searchTerm.toLowerCase()) || false);
      
      const matchesMachine = filterMachine ? t.machineId === filterMachine : true;
      const matchesFault = filterFault ? t.faultType === filterFault : true;
      
      const date = t.createdAt;
      const start = filterDateStart ? new Date(filterDateStart).getTime() : 0;
      const end = filterDateEnd ? new Date(filterDateEnd).setHours(23,59,59) : Date.now();
      const matchesDate = date >= start && date <= end;

      return matchesSearch && matchesMachine && matchesFault && matchesDate;
    }).sort((a, b) => b.createdAt - a.createdAt);
  }, [tickets, searchTerm, filterMachine, filterFault, filterDateStart, filterDateEnd]);

  const kpis = useMemo(() => {
    if (filteredData.length === 0) return { avgDowntime: 0, topFault: 'N/A', topMachine: 'N/A', closedCount: 0 };

    const totalDowntime = filteredData.reduce((acc, t) => {
      const duration = t.actualDowntimeMinutes || (t.totalActiveMinutes + t.totalHoldMinutes) || 0;
      return acc + duration;
    }, 0);
    
    const avgDowntime = Math.round(totalDowntime / filteredData.length);
    const closedCount = filteredData.filter(t => t.status === 'CLOSED').length;

    const faultCounts: Record<string, number> = {};
    const machineCounts: Record<string, number> = {};
    
    filteredData.forEach(t => {
       if (t.faultType) faultCounts[t.faultType] = (faultCounts[t.faultType] || 0) + 1;
       if (t.machineName) machineCounts[t.machineName] = (machineCounts[t.machineName] || 0) + 1;
    });

    const topFault = Object.entries(faultCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';
    const topMachine = Object.entries(machineCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

    return { avgDowntime, topFault, topMachine, closedCount };
  }, [filteredData]);

  const handleExport = () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(filteredData.map(t => ({
       'ID': t.id,
       'Date': new Date(t.createdAt).toLocaleDateString(),
       'Machine': t.machineName,
       'Workcenter': t.category,
       'Fault Type': t.faultType,
       'Priority': t.priority,
       'Description': t.description,
       'Solution': t.solution || '',
       'Tech': t.technicianName || '',
       'Downtime (Min)': t.actualDowntimeMinutes || (t.totalActiveMinutes + t.totalHoldMinutes) || 0
    })));
    XLSX.utils.book_append_sheet(wb, ws, "Failure History");
    XLSX.writeFile(wb, `Failure_History_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="space-y-8 pb-20">
      <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm flex flex-col xl:flex-row justify-between gap-8">
         <div className="flex items-start gap-4">
            <div className="bg-slate-900 p-3 rounded-2xl text-white shadow-xl">
               <History className="w-6 h-6" />
            </div>
            <div>
               <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Technical Failure Log</h2>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Historical Asset Reliability Data</p>
            </div>
         </div>

         <div className="flex flex-col md:flex-row gap-4 flex-1 xl:justify-end">
            <div className="relative flex-1 max-w-md">
               <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
               <input 
                  type="text" 
                  placeholder="Search symptoms or solutions..." 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none"
               />
            </div>
            <button onClick={handleExport} className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg flex items-center gap-2 transition-all active:scale-95">
               <Download className="w-4 h-4" /> Export Excel
            </button>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
         <KPICard title="Total Records" value={filteredData.length} icon={<Layers className="text-blue-500" />} />
         <KPICard title="Critical Asset" value={kpis.topMachine} icon={<AlertTriangle className="text-amber-500" />} />
         <KPICard title="Most Common Fault" value={kpis.topFault} icon={<Wrench className="text-red-500" />} />
         <KPICard title="Avg MTTR" value={`${kpis.avgDowntime}m`} icon={<Clock className="text-purple-500" />} />
      </div>

      <div className="flex flex-wrap gap-4 bg-white p-4 rounded-2xl border border-slate-200 items-center no-print">
         <div className="flex items-center gap-2 text-xs font-black uppercase text-slate-400 mr-2">
            <Filter className="w-4 h-4" /> Filters:
         </div>
         <select 
            value={filterMachine} 
            onChange={e => setFilterMachine(e.target.value)}
            className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold outline-none"
         >
            <option value="">All Machines</option>
            {machines.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
         </select>
         <select 
            value={filterFault} 
            onChange={e => setFilterFault(e.target.value)}
            className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold outline-none"
         >
            <option value="">All Fault Types</option>
            {['ELECTRICAL', 'MECHANICAL', 'HYDRAULIC', 'SOFTWARE', 'OTHER'].map(f => <option key={f} value={f}>{f}</option>)}
         </select>
         {(filterMachine || filterFault || filterDateStart || searchTerm) && (
            <button onClick={() => {setFilterMachine(''); setFilterFault(''); setFilterDateStart(''); setFilterDateEnd(''); setSearchTerm('');}} className="text-[10px] font-black uppercase text-red-500 hover:underline ml-auto">Reset Filters</button>
         )}
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
         <div className="table-responsive">
            <table className="w-full text-left">
               <thead>
                  <tr className="bg-slate-50 text-[10px] font-black uppercase text-slate-500 tracking-widest border-b border-slate-100">
                     <th className="px-6 py-4">ID / Date</th>
                     <th className="px-6 py-4">Machine</th>
                     <th className="px-6 py-4">Classification</th>
                     <th className="px-6 py-4">Resolution Summary</th>
                     <th className="px-6 py-4 text-right">Impact</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                  {filteredData.map(t => (
                     <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                           <div className="text-xs font-black text-slate-800">#{t.id}</div>
                           <div className="text-[9px] font-bold text-slate-400 mt-1">{new Date(t.createdAt).toLocaleDateString()}</div>
                        </td>
                        <td className="px-6 py-4">
                           <div className="text-sm font-black text-slate-800">{t.machineName}</div>
                           <div className="text-[9px] font-bold text-slate-400 uppercase">{t.category}</div>
                        </td>
                        <td className="px-6 py-4">
                           <span className={`inline-block px-2 py-1 rounded text-[9px] font-black uppercase ${
                              t.faultType === 'ELECTRICAL' ? 'bg-amber-100 text-amber-700' :
                              t.faultType === 'MECHANICAL' ? 'bg-slate-200 text-slate-700' : 'bg-blue-100 text-blue-700'
                           }`}>
                              {t.faultType}
                           </span>
                        </td>
                        <td className="px-6 py-4">
                           <div className="text-xs font-bold text-slate-600 line-clamp-2 max-w-sm">
                              {t.solution ? t.solution : <span className="text-slate-300 italic">No solution logged</span>}
                           </div>
                           <div className="text-[9px] font-black text-slate-400 uppercase mt-1">Tech: {t.technicianName || 'N/A'}</div>
                        </td>
                        <td className="px-6 py-4 text-right">
                           <span className="text-sm font-mono font-black text-slate-800">
                              {(t.actualDowntimeMinutes || (t.totalActiveMinutes + t.totalHoldMinutes) || 0).toFixed(0)}m
                           </span>
                        </td>
                     </tr>
                  ))}
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
    <div className="min-w-0">
       <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 truncate">{title}</div>
       <div className="text-xl font-black text-slate-800 leading-none truncate">{value}</div>
    </div>
  </div>
);

export default FailureHistoryView;
