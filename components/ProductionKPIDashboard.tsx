
import React, { useMemo, useState } from 'react';
import { Machine, ProductionLog, OEEMetrics, ProductionRollingKPIs, ProductionKPIAlert, User } from '../types';
import { 
  Activity, Target, TrendingUp, TrendingDown, CheckCircle2, AlertTriangle, 
  BarChart3, Factory, Gauge, CalendarDays, RefreshCcw, Bell, Trash2, ShieldCheck
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Cell, Legend 
} from 'recharts';

interface ProductionKPIDashboardProps {
  machines: Machine[];
  productionLogEntries: ProductionLog[];
  currentUser: User;
  onDeleteEntry: (id: string) => void;
}

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6'];
const PLANNED_PRODUCTION_TIME_DAILY = 22; 

const ProductionKPIDashboard: React.FC<ProductionKPIDashboardProps> = ({ machines, productionLogEntries, currentUser, onDeleteEntry }) => {
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);
  const isAdmin = currentUser.role === 'ADMIN';

  const calculateDailyOEEMetrics = (machine: Machine, log: ProductionLog): OEEMetrics => {
    const downtimeHours = PLANNED_PRODUCTION_TIME_DAILY - (log.actualRunHours || 0);
    const expectedProduction = (machine.idealProductionRate || 0) * PLANNED_PRODUCTION_TIME_DAILY;
    const actualProduction = log.actualProduction || 0;
    const rejectQuantity = log.rejectQuantity || 0;
    const goodProduction = actualProduction - rejectQuantity;

    const dailyAvailability = PLANNED_PRODUCTION_TIME_DAILY > 0 ? ((PLANNED_PRODUCTION_TIME_DAILY - downtimeHours) / PLANNED_PRODUCTION_TIME_DAILY) : 0;
    const dailyPerformance = expectedProduction > 0 ? (actualProduction / expectedProduction) : 0;
    const dailyQuality = actualProduction > 0 ? (goodProduction / actualProduction) : 1;
    const dailyOEE = dailyAvailability * dailyPerformance * dailyQuality;

    return {
      date: log.date,
      machineId: machine.id,
      machineName: machine.name,
      dailyAvailability: dailyAvailability * 100,
      dailyPerformance: dailyPerformance * 100,
      dailyQuality: dailyQuality * 100,
      dailyOEE: dailyOEE * 100,
      plannedProductionTime: PLANNED_PRODUCTION_TIME_DAILY,
      downtimeHours,
      expectedProduction,
      goodProduction,
    };
  };

  const { rollingKPIs, alerts, overallDailyKPIs } = useMemo(() => {
    const alerts: ProductionKPIAlert[] = [];
    
    const rollingKPIs: ProductionRollingKPIs[] = machines.map(machine => {
      const machineLogs = productionLogEntries.filter(log => log.machineId === machine.id)
                                             .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      const latestLogDate = machineLogs.length > 0 ? new Date(machineLogs[0].date) : new Date(dateFilter);
      const fourteenDaysAgo = new Date(latestLogDate.getTime() - (14 * 24 * 60 * 60 * 1000));
      const recentLogs = machineLogs.filter(log => new Date(log.date).getTime() >= fourteenDaysAgo.getTime() && new Date(log.date).getTime() <= latestLogDate.getTime());
      
      const expected14DayProduction = (machine.idealProductionRate || 0) * PLANNED_PRODUCTION_TIME_DAILY * 14;
      const actual14DayProduction = recentLogs.reduce((sum, log) => sum + (log.actualProduction || 0), 0);
      const compliance14Day = expected14DayProduction > 0 ? (actual14DayProduction / expected14DayProduction) * 100 : 0;
      const productionGap14Day = expected14DayProduction - actual14DayProduction;

      const oeeAvg = recentLogs.length > 0 
                                ? recentLogs.reduce((sum, log) => sum + calculateDailyOEEMetrics(machine, log).dailyOEE, 0) / recentLogs.length
                                : 0;
      const availAvg = recentLogs.length > 0 
                                ? recentLogs.reduce((sum, log) => sum + calculateDailyOEEMetrics(machine, log).dailyAvailability, 0) / recentLogs.length
                                : 0;

      if (compliance14Day < 90) alerts.push({ machineId: machine.id, machineName: machine.name, type: 'Compliance', threshold: 90, actualValue: compliance14Day, date: latestLogDate.toISOString().split('T')[0] });

      return {
        machineId: machine.id,
        machineName: machine.name,
        expected14DayProduction,
        actual14DayProduction,
        compliance14Day,
        productionGap14Day,
        oee14DayAverage: oeeAvg,
        availability14DayAverage: availAvg,
        latestLogDate: latestLogDate.toISOString().split('T')[0],
      };
    });

    const todayLogs = productionLogEntries.filter(log => log.date === dateFilter);
    let totalPlannedTime = 0, totalActualRunHours = 0, totalActualProduction = 0, totalRejectQuantity = 0, totalExpectedProduction = 0;
    
    todayLogs.forEach(log => {
      const machine = machines.find(m => m.id === log.machineId);
      if (machine) {
        totalPlannedTime += PLANNED_PRODUCTION_TIME_DAILY;
        totalActualRunHours += (log.actualRunHours || 0);
        totalActualProduction += (log.actualProduction || 0);
        totalRejectQuantity += (log.rejectQuantity || 0);
        totalExpectedProduction += (machine.idealProductionRate || 0) * PLANNED_PRODUCTION_TIME_DAILY;
      }
    });

    const overallDailyAvailability = totalPlannedTime > 0 ? ((totalActualRunHours) / totalPlannedTime) * 100 : 0;
    const overallDailyPerformance = totalExpectedProduction > 0 ? (totalActualProduction / totalExpectedProduction) * 100 : 0;
    const overallDailyQuality = totalActualProduction > 0 ? ((totalActualProduction - totalRejectQuantity) / totalActualProduction) * 100 : 100;
    const overallDailyOEE = (overallDailyAvailability / 100) * (overallDailyPerformance / 100) * (overallDailyQuality / 100) * 100;

    return { 
      rollingKPIs, 
      alerts, 
      overallDailyKPIs: {
        dailyAvailability: overallDailyAvailability,
        dailyPerformance: overallDailyPerformance,
        dailyQuality: overallDailyQuality,
        dailyOEE: overallDailyOEE,
        compliance14Day: rollingKPIs.reduce((sum, r) => sum + r.compliance14Day, 0) / Math.max(1, rollingKPIs.length),
        productionGap14Day: rollingKPIs.reduce((sum, r) => sum + r.productionGap14Day, 0),
      }
    };
  }, [machines, productionLogEntries, dateFilter]);

  return (
    <div className="space-y-8 pb-20">
      <div className="bg-gradient-to-r from-blue-900 to-slate-900 rounded-3xl p-8 text-white shadow-2xl flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-5">
          <div className="bg-blue-600 p-4 rounded-2xl"><Activity className="w-8 h-8" /></div>
          <div>
            <h2 className="text-3xl font-black uppercase tracking-tight">OEE Intelligence Dashboard</h2>
            <p className="text-blue-300 font-bold uppercase tracking-widest text-xs mt-1">22-Hour Effective Daily Cycle</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-white/10 px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-bold">
            <CalendarDays className="w-4 h-4" />
            <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} className="bg-transparent text-white outline-none cursor-pointer" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
        <KPICard title="Availability" value={`${(overallDailyKPIs.dailyAvailability || 0).toFixed(1)}%`} icon={<Gauge className="text-green-500" />} status={overallDailyKPIs.dailyAvailability < 90 ? 'danger' : 'success'} />
        <KPICard title="Performance" value={`${(overallDailyKPIs.dailyPerformance || 0).toFixed(1)}%`} icon={<TrendingUp className="text-purple-500" />} status={overallDailyKPIs.dailyPerformance < 85 ? 'danger' : 'success'} />
        <KPICard title="Quality" value={`${(overallDailyKPIs.dailyQuality || 0).toFixed(1)}%`} icon={<CheckCircle2 className="text-orange-500" />} status={overallDailyKPIs.dailyQuality < 95 ? 'danger' : 'success'} />
        <KPICard title="OEE Score" value={`${(overallDailyKPIs.dailyOEE || 0).toFixed(1)}%`} icon={<BarChart3 className="text-blue-500" />} status={overallDailyKPIs.dailyOEE < 75 ? 'danger' : 'success'} />
        <KPICard title="14d Compliance" value={`${(overallDailyKPIs.compliance14Day || 0).toFixed(1)}%`} icon={<ShieldCheck className="text-indigo-500" />} status={overallDailyKPIs.compliance14Day < 90 ? 'danger' : 'success'} />
        <KPICard title="14d Gap" value={`${(overallDailyKPIs.productionGap14Day || 0).toFixed(0)}M2`} icon={<TrendingDown className="text-red-500" />} status={overallDailyKPIs.productionGap14Day > 0 ? 'danger' : 'success'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm h-[450px] flex flex-col">
          <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest mb-6 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600" /> Machine OEE Ranking (14d Rolling)
          </h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={[...rollingKPIs].sort((a,b) => b.oee14DayAverage - a.oee14DayAverage).slice(0, 8)} margin={{ bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="machineName" angle={-45} textAnchor="end" fontSize={10} interval={0} />
              <YAxis fontSize={10} domain={[0, 100]} />
              <Tooltip />
              <Bar dataKey="oee14DayAverage" name="OEE %" radius={[4, 4, 0, 0]}>
                {rollingKPIs.map((entry, index) => <Cell key={index} fill={entry.oee14DayAverage < 75 ? '#ef4444' : '#3b82f6'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm h-[450px] flex flex-col">
          <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest mb-6 flex items-center gap-2">
            <Target className="w-5 h-5 text-indigo-600" /> Compliance Ranking (14d Rolling)
          </h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={[...rollingKPIs].sort((a,b) => b.compliance14Day - a.compliance14Day).slice(0, 8)} margin={{ bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="machineName" angle={-45} textAnchor="end" fontSize={10} interval={0} />
              <YAxis fontSize={10} domain={[0, 100]} />
              <Tooltip />
              <Bar dataKey="compliance14Day" name="Compliance %" radius={[4, 4, 0, 0]}>
                {rollingKPIs.map((entry, index) => <Cell key={index} fill={entry.compliance14Day < 90 ? '#f59e0b' : '#10b981'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {isAdmin && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-blue-600" />
            <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest">Historical Entry Management (Admin Only)</h3>
          </div>
          <div className="table-responsive">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-[10px] uppercase text-slate-500 font-black tracking-widest border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Machine</th>
                  <th className="px-6 py-4">Actual (M2)</th>
                  <th className="px-6 py-4">Hours</th>
                  <th className="px-6 py-4">Logged By</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {productionLogEntries.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10).map(log => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-mono text-xs">{log.date}</td>
                    <td className="px-6 py-4 font-black text-xs uppercase">{log.machineName}</td>
                    <td className="px-6 py-4 font-bold text-xs">{log.actualProduction} M2</td>
                    <td className="px-6 py-4 text-xs">{log.actualRunHours}h</td>
                    <td className="px-6 py-4 text-[10px] font-bold text-slate-400">{log.loggedBy}</td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => onDeleteEntry(log.id)} className="p-2 text-red-400 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

const KPICard = ({ title, value, icon, status }: any) => (
  <div className={`p-5 rounded-2xl border flex items-center gap-4 bg-white shadow-sm ${status === 'danger' ? 'border-red-100' : 'border-slate-100'}`}>
    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">{icon}</div>
    <div>
      <div className="text-[9px] font-black uppercase text-slate-400 mb-1">{title}</div>
      <div className={`text-2xl font-black ${status === 'danger' ? 'text-red-600' : 'text-slate-800'}`}>{value}</div>
    </div>
  </div>
);

export default ProductionKPIDashboard;
