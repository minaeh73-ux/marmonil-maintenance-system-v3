

import React, { useMemo, useState } from 'react';
import { Ticket, Machine, User, HistoricalDowntime } from '../types';
import * as XLSX from 'xlsx';
import { 
  Clock, 
  TrendingDown, 
  CheckCircle2, 
  AlertTriangle, 
  Save, 
  FileSpreadsheet, 
  Printer, 
  Filter, 
  Calendar, 
  Sliders,
  Ban
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend 
} from 'recharts';

interface OperatingHoursViewProps {
  tickets: Ticket[];
  machines: Machine[]; // These should now be pre-filtered for active+approved versions
  historicalDowntime: HistoricalDowntime[];
  currentUser: User;
  onUpdateMachine: (machine: Machine) => void;
}

const OperatingHoursView: React.FC<OperatingHoursViewProps> = ({ tickets, machines, historicalDowntime, currentUser, onUpdateMachine }) => {
  const [editingMachineId, setEditingMachineId] = useState<string | null>(null);
  const [tempPlannedHours, setTempPlannedHours] = useState<number>(168);
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [partialStopFactor, setPartialStopFactor] = useState<number>(50);

  const canEdit = currentUser.role === 'ADMIN' || currentUser.role === 'PLANNING';

  const processedData = useMemo(() => {
    const startMs = new Date(dateRange.start).getTime();
    const endMs = new Date(dateRange.end).setHours(23, 59, 59, 999);

    return machines.map(machine => { // machines are already filtered
      const relevantTickets = tickets.filter(t => 
        t.machineId === machine.id && 
        t.createdAt >= startMs && 
        t.createdAt <= endMs
      );

      const relevantHistory = historicalDowntime.filter(h => 
        h.assetId === machine.id &&
        ((h.startDate >= startMs && h.startDate <= endMs) || (h.endDate >= startMs && h.endDate <= endMs))
      );

      let fullStopMin = 0;
      let partialStopMin = 0;

      relevantTickets.forEach(t => {
        const endTime = t.closedAt ? t.closedAt : Math.min(Date.now(), endMs);
        const durationMin = Math.max(0, (endTime - t.createdAt) / 60000);
        if (t.downtimeType === 'PARTIAL_STOP') partialStopMin += durationMin;
        else fullStopMin += durationMin;
      });

      relevantHistory.forEach(h => {
        const s = Math.max(startMs, h.startDate);
        const e = Math.min(endMs, h.endDate);
        const durationMin = Math.max(0, (e - s) / 60000);
        fullStopMin += durationMin; // Historical records currently treated as full stop impact
      });

      const fullStopHours = fullStopMin / 60;
      const partialStopHours = partialStopMin / 60;
      const equivalentDowntimeHours = fullStopHours + (partialStopHours * (partialStopFactor / 100));
      const plannedHours = machine.plannedHours || 168;
      const actualOperatingHours = Math.max(0, plannedHours - equivalentDowntimeHours);
      const availability = plannedHours > 0 ? (actualOperatingHours / plannedHours) * 100 : 0;

      return {
        ...machine,
        stats: {
          fullStopHours,
          partialStopHours,
          equivalentDowntimeHours,
          actualOperatingHours,
          availability,
          plannedHours
        }
      };
    });
  }, [machines, tickets, historicalDowntime, dateRange, partialStopFactor]);

  const activeMachines = processedData.filter(m => m.status !== 'OUT_OF_SERVICE');
  const oosMachines = processedData.filter(m => m.status === 'OUT_OF_SERVICE');

  const totals = useMemo(() => {
    return activeMachines.reduce((acc, m) => ({
      planned: acc.planned + m.stats.plannedHours,
      actual: acc.actual + m.stats.actualOperatingHours,
      downtime: acc.downtime + m.stats.equivalentDowntimeHours
    }), { planned: 0, actual: 0, downtime: 0 });
  }, [activeMachines]);

  const factoryAvailability = totals.planned > 0 ? (totals.actual / totals.planned) * 100 : 0;

  const handleEditClick = (machine: Machine) => {
    if (!canEdit) return;
    setEditingMachineId(machine.id);
    setTempPlannedHours(machine.plannedHours || 168);
  };

  const handleSave = (machine: Machine) => {
    onUpdateMachine({ ...machine, plannedHours: tempPlannedHours });
    setEditingMachineId(null);
  };

  return (
    <div className="space-y-8 pb-10">
      <div className="card-industrial p-6 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 no-print">
        <div className="flex items-center gap-4">
          <div className="bg-blue-600 p-3 rounded-2xl shadow-lg shadow-blue-200 text-white">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-800 tracking-tight">Operating Hours & Efficiency</h2>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Availability Analysis Dashboard • Legacy Included</p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4 w-full lg:w-auto">
           <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-100">
              <Calendar className="w-4 h-4 text-slate-400 ml-2" />
              <input type="date" value={dateRange.start} onChange={e => setDateRange({...dateRange, start: e.target.value})} className="bg-transparent text-xs font-bold text-slate-700 outline-none w-28" />
              <span className="text-slate-300">-</span>
              <input type="date" value={dateRange.end} onChange={e => setDateRange({...dateRange, end: e.target.value})} className="bg-transparent text-xs font-bold text-slate-700 outline-none w-28" />
           </div>
           <div className="flex items-center gap-2">
              <button onClick={() => window.print()} className="btn-industrial !text-[10px] p-3 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl" title="Print PDF">
                 <Printer className="w-5 h-5" />
              </button>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Factory Availability" value={`${factoryAvailability.toFixed(1)}%`} icon={<CheckCircle2 className="text-green-500" />} color="green" />
        <KPICard title="Total Planned" value={`${totals.planned.toFixed(0)}h`} icon={<Clock className="text-blue-500" />} color="blue" />
        <KPICard title="Efficiency Loss" value={`${totals.downtime.toFixed(1)}h`} icon={<TrendingDown className="text-red-500" />} color="red" />
        <KPICard title="Net Production" value={`${totals.actual.toFixed(1)}h`} icon={<Save className="text-indigo-500" />} color="indigo" />
      </div>

      <div className="card-industrial overflow-hidden">
        <div className="table-responsive">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-[10px] uppercase text-slate-500 font-black tracking-widest border-b border-slate-100">
                <th className="px-6 py-4">Machine Asset</th>
                <th className="px-6 py-4 text-center">Planned (Hrs)</th>
                <th className="px-6 py-4 text-center text-red-600">Total Loss</th>
                <th className="px-6 py-4 text-center text-green-700">Actual Run</th>
                <th className="px-6 py-4 text-center">Availability</th>
                <th className="px-6 py-4 text-right no-print">Manage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {activeMachines.map(m => (
                <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-black text-slate-800">{m.name}</td>
                  <td className="px-6 py-4 text-center">
                    {editingMachineId === m.id && canEdit ? (
                      <input 
                        type="number" 
                        value={tempPlannedHours} 
                        onChange={e => setTempPlannedHours(parseFloat(e.target.value))} 
                        min="0"
                        max="168"
                        className="w-20 p-2 bg-slate-100 border border-slate-200 rounded-lg text-xs text-center font-bold outline-none"
                      />
                    ) : (
                      <span className="text-sm font-bold text-slate-700">{m.stats.plannedHours.toFixed(0)}</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center text-red-600 font-bold">
                    {m.stats.equivalentDowntimeHours.toFixed(1)}
                  </td>
                  <td className="px-6 py-4 text-center text-green-700 font-bold">
                    {m.stats.actualOperatingHours.toFixed(1)}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`text-sm font-bold ${m.stats.availability < 70 ? 'text-red-500' : 'text-green-600'}`}>
                      {m.stats.availability.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right no-print">
                    {canEdit && (
                      editingMachineId === m.id ? (
                        <button onClick={() => handleSave(m)} className="btn-industrial !bg-blue-600 !text-white px-4 py-2 text-[10px] rounded-lg">
                          Save
                        </button>
                      ) : (
                        <button onClick={() => handleEditClick(m)} className="btn-industrial !bg-slate-100 !text-slate-600 px-4 py-2 text-[10px] rounded-lg">
                          Edit
                        </button>
                      )
                    )}
                  </td>
                </tr>
              ))}
              {oosMachines.length > 0 && (
                <tr className="bg-slate-100">
                  <td colSpan={6} className="px-6 py-3 text-center text-slate-500 font-black uppercase text-xs tracking-widest">
                    <span className="flex items-center justify-center gap-2">
                       <Ban className="w-4 h-4" /> Out of Service Assets
                    </span>
                  </td>
                </tr>
              )}
              {oosMachines.map(m => (
                <tr key={m.id} className="hover:bg-slate-50 opacity-70">
                  <td className="px-6 py-4 font-black text-slate-400">{m.name}</td>
                  <td className="px-6 py-4 text-center text-slate-400">{m.stats.plannedHours.toFixed(0)}</td>
                  <td className="px-6 py-4 text-center text-slate-400">{m.stats.equivalentDowntimeHours.toFixed(1)}</td>
                  <td className="px-6 py-4 text-center text-slate-400">{m.stats.actualOperatingHours.toFixed(1)}</td>
                  <td className="px-6 py-4 text-center text-slate-400">{m.stats.availability.toFixed(1)}%</td>
                  <td className="px-6 py-4 text-right no-print">
                    {canEdit && (
                      <button onClick={() => handleEditClick(m)} className="btn-industrial !bg-slate-100 !text-slate-400 px-4 py-2 text-[10px] rounded-lg" disabled>
                        Edit
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {processedData.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    <Sliders className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    No machine data or logs for selected period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const KPICard = ({ title, value, icon, color }: { title: string; value: string; icon: React.ReactNode; color: string }) => (
  <div className="card-industrial p-5 flex items-center gap-4 transition-transform hover:scale-[1.02] duration-200">
    <div className={`p-4 bg-${color}-50 rounded-xl border border-${color}-100 flex-shrink-0`}>{icon}</div>
    <div className="min-w-0">
       <h5 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest truncate">{title}</h5>
       <div className="text-2xl font-black text-slate-800 leading-none my-1">{value}</div>
    </div>
  </div>
);

export default OperatingHoursView;