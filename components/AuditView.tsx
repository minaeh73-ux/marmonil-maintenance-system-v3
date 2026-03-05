
import React, { useState } from 'react';
import { ActivityLog } from '../types';
import { ShieldAlert, Search, Filter, Lock, Download, AlertTriangle } from 'lucide-react';
import * as XLSX from 'xlsx';

interface AuditViewProps {
  logs: ActivityLog[];
}

const AuditView: React.FC<AuditViewProps> = ({ logs }) => {
  const [filterUser, setFilterUser] = useState('');
  const [filterAction, setFilterAction] = useState('');

  const filteredLogs = logs.filter(log => 
    (!filterUser || log.actionBy.toLowerCase().includes(filterUser.toLowerCase())) &&
    (!filterAction || log.action.toLowerCase().includes(filterAction.toLowerCase()))
  );

  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(filteredLogs);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Security_Audit_Log");
    XLSX.writeFile(wb, `Audit_Export_${Date.now()}.xlsx`);
  };

  return (
    <div className="space-y-8 pb-20">
      <div className="bg-red-600 rounded-3xl p-8 text-white shadow-xl flex items-center justify-between relative overflow-hidden">
         <div className="relative z-10 flex items-center gap-6">
            <div className="bg-white/20 p-4 rounded-2xl backdrop-blur-sm">
               <ShieldAlert className="w-10 h-10 text-white" />
            </div>
            <div>
               <h2 className="text-2xl font-black uppercase tracking-tight">Security Audit Console</h2>
               <p className="text-xs font-bold text-red-200 uppercase tracking-widest mt-1">Immutable System Log • Admin Access Only</p>
            </div>
         </div>
         <Lock className="absolute -right-6 -bottom-6 w-40 h-40 text-red-800 opacity-20" />
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
         <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
            <div className="flex items-center gap-4">
               <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input type="text" placeholder="Filter by User..." value={filterUser} onChange={e => setFilterUser(e.target.value)} className="pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs font-bold focus:ring-2 focus:ring-red-500 outline-none" />
               </div>
               <div className="relative">
                  <Filter className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input type="text" placeholder="Filter by Action..." value={filterAction} onChange={e => setFilterAction(e.target.value)} className="pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs font-bold focus:ring-2 focus:ring-red-500 outline-none" />
               </div>
            </div>
            <button onClick={handleExport} className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-colors">
               <Download className="w-4 h-4" /> Export Log
            </button>
         </div>
         
         <div className="max-h-[600px] overflow-y-auto">
            <table className="w-full text-left">
               <thead className="bg-slate-100 sticky top-0 text-[10px] font-black uppercase text-slate-500 tracking-widest border-b border-slate-200">
                  <tr>
                     <th className="px-6 py-4">Timestamp</th>
                     <th className="px-6 py-4">Actor</th>
                     <th className="px-6 py-4">Event</th>
                     <th className="px-6 py-4">Department</th>
                     <th className="px-6 py-4 text-right">Details</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                  {filteredLogs.map(log => (
                     <tr key={log.id} className="hover:bg-red-50/30 transition-colors">
                        <td className="px-6 py-4">
                           <span className="font-mono text-xs font-bold text-slate-600">{new Date(log.timestamp).toLocaleString()}</span>
                        </td>
                        <td className="px-6 py-4">
                           <div className="font-black text-sm text-slate-800">{log.actionBy}</div>
                        </td>
                        <td className="px-6 py-4">
                           <div className="flex items-center gap-2">
                              {log.action.includes('RESET') || log.action.includes('DELETE') ? (
                                 <AlertTriangle className="w-4 h-4 text-red-500" />
                              ) : <div className="w-4 h-4" />}
                              <span className="text-xs font-bold text-slate-700">{log.action}</span>
                           </div>
                        </td>
                        <td className="px-6 py-4">
                           <span className="text-[10px] font-black uppercase tracking-widest bg-slate-100 px-2 py-1 rounded text-slate-500">{log.department}</span>
                        </td>
                        <td className="px-6 py-4 text-right">
                           <span className="text-xs font-mono text-slate-400">{log.id}</span>
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

export default AuditView;
