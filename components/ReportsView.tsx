

import React, { useState, useMemo, useRef } from 'react';
import { Ticket, User, Machine, SparePartRequest, PreventiveMaintenanceTask, Role, HistoricalDowntime } from '../types';
import * as XLSX from 'xlsx';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area, PieChart, Pie, Cell, Legend, LineChart, Line
} from 'recharts';
import { 
  Filter, Download, Printer, Calendar, RefreshCcw, 
  TrendingUp, TrendingDown, Clock, AlertTriangle, 
  CheckCircle2, Users, Factory, FileText, Ban, Layers,
  FileCheck, History
} from 'lucide-react';

interface ReportsViewProps {
  tickets: Ticket[];
  machines: Machine[];
  users: User[];
  sparePartRequests: SparePartRequest[];
  pmTasks: PreventiveMaintenanceTask[];
  historicalDowntime: HistoricalDowntime[];
  currentUser: User;
  onLogAction: (action: string) => void;
}

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#64748b'];

const ReportsView: React.FC<ReportsViewProps> = ({ 
  tickets, machines, users, sparePartRequests, pmTasks, historicalDowntime, currentUser, onLogAction 
}) => {
  const [activeTab, setActiveTab] = useState<'EXECUTIVE' | 'ASSETS' | 'WORKFORCE' | 'PREVENTIVE'>('EXECUTIVE');
  const [showFilters, setShowFilters] = useState(true);

  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [filters, setFilters] = useState({
    workcenter: '',
    machineId: '',
    faultType: '',
    downtimeType: '',
    status: '',
    department: '',
    technicianId: '',
    priority: '',
    includeOOS: false,
    includeHistory: true
  });

  const filteredTickets = useMemo(() => {
    const startMs = new Date(dateRange.start).getTime();
    const endMs = new Date(dateRange.end).setHours(23, 59, 59, 999);

    return tickets.filter(t => {
      const inDate = t.createdAt >= startMs && t.createdAt <= endMs;
      const matchesWorkcenter = !filters.workcenter || t.category === filters.workcenter;
      const matchesMachine = !filters.machineId || t.machineId === filters.machineId;
      const machine = machines.find(m => m.id === t.machineId);
      const isOOS = machine?.status === 'OUT_OF_SERVICE';
      const allowedOOS = filters.includeOOS ? true : !isOOS;

      return inDate && matchesWorkcenter && matchesMachine && allowedOOS;
    });
  }, [tickets, dateRange, filters, machines]);

  const filteredHistorical = useMemo(() => {
    if (!filters.includeHistory) return [];
    const startMs = new Date(dateRange.start).getTime();
    const endMs = new Date(dateRange.end).setHours(23, 59, 59, 999);

    return historicalDowntime.filter(h => {
      const inDate = (h.startDate >= startMs && h.startDate <= endMs) || (h.endDate >= startMs && h.endDate <= endMs);
      const machine = machines.find(m => m.id === h.assetId);
      const matchesWorkcenter = !filters.workcenter || machine?.category === filters.workcenter;
      const matchesMachine = !filters.machineId || h.assetId === filters.machineId;
      return inDate && matchesWorkcenter && matchesMachine;
    });
  }, [historicalDowntime, dateRange, filters, machines]);

  const kpis = useMemo(() => {
    const closedTickets = filteredTickets.filter(t => t.status === 'CLOSED');
    
    const ticketDowntimeMin = filteredTickets.reduce((acc, t) => {
      return acc + (t.actualDowntimeMinutes || (t.totalActiveMinutes + t.totalHoldMinutes));
    }, 0);

    const historicalDowntimeMin = filteredHistorical.reduce((acc, h) => {
      return acc + ((h.endDate - h.startDate) / 60000);
    }, 0);

    const totalDowntimeMin = ticketDowntimeMin + historicalDowntimeMin;
    const totalFailureEvents = filteredTickets.length + filteredHistorical.length;

    const startMs = new Date(dateRange.start).getTime();
    const endMs = new Date(dateRange.end).setHours(23, 59, 59, 999);
    const totalDays = Math.max(1, (endMs - startMs) / (1000 * 60 * 60 * 24));
    
    const relevantMachines = machines.filter(m => 
      (!filters.workcenter || m.category === filters.workcenter) &&
      (!filters.machineId || m.id === filters.machineId) &&
      (filters.includeOOS || m.status !== 'OUT_OF_SERVICE')
    );

    const totalPlannedHours = relevantMachines.reduce((acc, m) => {
      const dailyPlan = (m.plannedHours || 168) / 7;
      return acc + (dailyPlan * totalDays);
    }, 0);

    const totalDowntimeHours = totalDowntimeMin / 60;
    const actualOperatingHours = Math.max(0, totalPlannedHours - totalDowntimeHours);
    const availability = totalPlannedHours > 0 ? (actualOperatingHours / totalPlannedHours) * 100 : 0;

    // MTTR calculation
    const mttr = totalFailureEvents > 0 ? Math.round(totalDowntimeMin / totalFailureEvents) : 0;
    
    // MTBF (Approximate)
    const mtbf = totalFailureEvents > 0 ? Math.round(actualOperatingHours / totalFailureEvents) : actualOperatingHours;

    return {
      totalTickets: filteredTickets.length,
      totalHistory: filteredHistorical.length,
      totalEvents: totalFailureEvents,
      totalDowntimeHours,
      mttr,
      mtbf,
      availability,
    };
  }, [filteredTickets, filteredHistorical, machines, dateRange, filters]);

  // ... Machine Analytics logic update to include history ...
  const machineAnalytics = useMemo(() => {
    const map = new Map<string, { name: string, downtime: number, count: number }>();
    
    filteredTickets.forEach(t => {
      const existing = map.get(t.machineId) || { name: t.machineName, downtime: 0, count: 0 };
      map.set(t.machineId, {
        name: t.machineName,
        downtime: existing.downtime + (t.actualDowntimeMinutes || (t.totalActiveMinutes + t.totalHoldMinutes)),
        count: existing.count + 1
      });
    });

    filteredHistorical.forEach(h => {
      const existing = map.get(h.assetId) || { name: h.assetName, downtime: 0, count: 0 };
      map.set(h.assetId, {
        name: h.assetName,
        downtime: existing.downtime + ((h.endDate - h.startDate) / 60000),
        count: existing.count + 1
      });
    });

    const array = Array.from(map.values());
    return {
      byDowntime: [...array].sort((a,b) => b.downtime - a.downtime).slice(0, 5),
      byCount: [...array].sort((a,b) => b.count - a.count).slice(0, 5)
    };
  }, [filteredTickets, filteredHistorical]);

  // Rest of component stays mostly same, but updated headers and labels to reflect "Historical Included"
  const visibleTabs = useMemo(() => {
    const tabs = [
      { id: 'EXECUTIVE', label: 'Executive Overview', roles: ['ADMIN', 'PLANNING', 'PRODUCTION'] },
      { id: 'ASSETS', label: 'Asset Reliability', roles: ['ADMIN', 'PLANNING', 'MAINTENANCE'] },
      { id: 'WORKFORCE', label: 'Workforce Performance', roles: ['ADMIN', 'MAINTENANCE'] },
      { id: 'PREVENTIVE', label: 'Preventive Health', roles: ['ADMIN', 'MAINTENANCE', 'PLANNING'] },
    ];
    return tabs.filter(t => t.roles.includes(currentUser.role));
  }, [currentUser]);

  return (
    <div className="space-y-6 pb-20 print:pb-0 print:space-y-4">
      <div className="card-industrial p-6 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 no-print">
         <div className="flex items-center gap-4">
            <div className="bg-blue-600 p-3 rounded-2xl shadow-lg shadow-blue-200 text-white">
               <FileText className="w-6 h-6" />
            </div>
            <div>
               <h2 className="text-xl font-black text-slate-800 tracking-tight">Advanced Reporting Module</h2>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Decision Support System • Historical Ingest Enabled</p>
            </div>
         </div>
         <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
             <button onClick={() => setShowFilters(!showFilters)} className={`px-4 py-3 rounded-xl btn-industrial ${showFilters ? 'bg-blue-50 border-blue-200 text-blue-700' : 'btn-outline'}`}>
                <Filter className="w-4 h-4" /> Filters
             </button>
             <button onClick={() => window.print()} className="px-4 py-3 rounded-xl btn-industrial btn-primary">
                <Printer className="w-4 h-4" /> Generate PDF Report
             </button>
         </div>
      </div>

      {showFilters && (
        <div className="card-industrial p-6 animate-in slide-in-from-top-2 no-print">
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Reporting Period</label>
                 <div className="flex items-center gap-2">
                    <input type="date" value={dateRange.start} onChange={e => setDateRange({...dateRange, start: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold outline-none focus:border-blue-500" />
                    <span className="text-slate-300">-</span>
                    <input type="date" value={dateRange.end} onChange={e => setDateRange({...dateRange, end: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold outline-none focus:border-blue-500" />
                 </div>
              </div>
              <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Asset Context</label>
                 <div className="grid grid-cols-2 gap-2">
                    <select value={filters.workcenter} onChange={e => setFilters({...filters, workcenter: e.target.value, machineId: ''})} className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold outline-none">
                       <option value="">All Areas</option>
                       {Array.from(new Set(machines.map(m => m.category))).map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <select value={filters.machineId} onChange={e => setFilters({...filters, machineId: e.target.value})} className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold outline-none">
                       <option value="">All Machines</option>
                       {machines.filter(m => !filters.workcenter || m.category === filters.workcenter).map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                 </div>
              </div>
              <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">System Toggles</label>
                 <div className="flex items-center gap-2 h-[42px]">
                    <label className={`flex-1 h-full flex items-center justify-center gap-2 border-2 rounded-xl cursor-pointer transition-all ${filters.includeHistory ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-white border-slate-100 text-slate-400'}`}>
                       <input type="checkbox" checked={filters.includeHistory} onChange={e => setFilters({...filters, includeHistory: e.target.checked})} className="hidden" />
                       <span className="text-[10px] font-black uppercase">Include Legacy Data</span>
                    </label>
                 </div>
              </div>
           </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
         <KPICard title="Availability" value={`${kpis.availability.toFixed(1)}%`} icon={<CheckCircle2 className={kpis.availability > 90 ? "text-green-500" : "text-red-500"} />} />
         <KPICard title="Downtime (Hrs)" value={kpis.totalDowntimeHours.toFixed(1)} icon={<TrendingDown className="text-red-500" />} />
         <KPICard title="MTTR (Min)" value={kpis.mttr} icon={<Clock className="text-amber-500" />} />
         <KPICard title="MTBF (Hrs)" value={kpis.mtbf} icon={<RefreshCcw className="text-blue-500" />} />
         <KPICard title="Failures" value={kpis.totalEvents} icon={<AlertTriangle className="text-red-600" />} />
         <KPICard title="Legacy Records" value={kpis.totalHistory} icon={<History className="text-amber-600" />} />
      </div>

      <div className="border-b border-slate-200 flex gap-6 overflow-x-auto no-print">
         {visibleTabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`py-4 px-2 font-black text-[10px] uppercase tracking-widest whitespace-nowrap transition-all border-b-2 tab-btn ${activeTab === tab.id ? 'text-blue-600 border-blue-600' : 'text-slate-400 border-transparent hover:text-slate-600'}`}>
               {tab.label}
            </button>
         ))}
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
         {activeTab === 'EXECUTIVE' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
               <div className="card-industrial p-6 min-h-[400px] flex flex-col avoid-break">
                  <h4 className="font-black text-slate-800 text-sm uppercase tracking-widest mb-6">Reliability Impact by Asset</h4>
                  <ResponsiveContainer width="100%" height={300}>
                     <PieChart>
                        <Pie data={machineAnalytics.byDowntime.map(m => ({ name: m.name, value: m.downtime }))} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                           {machineAnalytics.byDowntime.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                        </Pie>
                        <Tooltip />
                        <Legend />
                     </PieChart>
                  </ResponsiveContainer>
               </div>
            </div>
         )}
         {/* ... Other tabs ... */}
      </div>
    </div>
  );
};

const KPICard = ({ title, value, icon }: any) => (
  <div className="card-industrial p-5 flex flex-col justify-between h-32 avoid-break">
     <div className="flex justify-between items-start">
        <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{title}</h5>
        <div className="p-2 bg-slate-50 rounded-lg">{icon}</div>
     </div>
     <div className="text-2xl font-black text-slate-800">{value}</div>
  </div>
);

export default ReportsView;