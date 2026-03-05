import React from 'react';
import { SparePartRequest, User, Role } from '../types';
import { ClipboardList, CheckCircle2, Truck, Clock, AlertTriangle, ArrowRight, PackageCheck, ShieldCheck, User as UserIcon } from 'lucide-react';

interface SparePartTrackingViewProps {
  requests: SparePartRequest[];
  onUpdateRequest: (requestId: string, status: string) => void;
  currentUser: User;
}

const SparePartTrackingView: React.FC<SparePartTrackingViewProps> = ({ requests, onUpdateRequest, currentUser }) => {
  const isStoreOrAdmin = currentUser.role === 'STORE' || currentUser.role === 'ADMIN';

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING': return <Clock className="w-4 h-4 text-slate-400" />;
      case 'APPROVED': return <CheckCircle2 className="w-4 h-4 text-blue-500" />;
      case 'ORDERED': return <Truck className="w-4 h-4 text-orange-500" />;
      case 'IN_TRANSIT': return <Truck className="w-4 h-4 text-purple-500 animate-pulse" />;
      case 'DELIVERED': return <PackageCheck className="w-4 h-4 text-green-500" />;
      default: return null;
    }
  };

  const formatLeadTime = (ms?: number) => {
    if (!ms) return '-';
    const hrs = Math.floor(ms / 3600000);
    return `${hrs}h`;
  };

  return (
    <div className="space-y-8 pb-20">
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="bg-blue-600 p-3 rounded-2xl shadow-lg shadow-blue-200 text-white">
            <ClipboardList className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-800 tracking-tight">Spare Part Lifecycle Control</h2>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Enterprise Logistics & Supply Chain Tracking</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="table-responsive">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-[10px] uppercase text-slate-500 font-black tracking-widest border-b border-slate-100">
                <th className="px-6 py-4">Request Context</th>
                <th className="px-6 py-4">Component Details</th>
                <th className="px-6 py-4">Logistics</th>
                <th className="px-6 py-4">Performance</th>
                <th className="px-6 py-4">Workflow Status</th>
                <th className="px-6 py-4 text-right">Process Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {requests.sort((a, b) => b.requestDate - a.requestDate).map(req => (
                <tr key={req.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="text-sm font-black text-slate-800">{req.machineName}</div>
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">REF: {req.ticketId}</div>
                    <div className="flex items-center gap-1.5 mt-1 text-[9px] font-bold text-slate-300">
                       <UserIcon className="w-2.5 h-2.5" /> {req.requestedBy}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-bold text-slate-700">{req.partName} <span className="text-slate-400">x{req.quantity}</span></div>
                    <div className="text-[10px] font-mono text-slate-400">{req.partCode || 'NO_CODE'}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-[10px] font-black px-2 py-1 rounded bg-slate-100 text-slate-500 uppercase inline-block mb-1">{req.requestedFrom.replace(/_/g, ' ')}</div>
                    <div className="text-[9px] font-bold text-slate-400 block">REQ: {new Date(req.requestDate).toLocaleDateString()}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                       <div className="flex justify-between items-center text-[8px] font-black uppercase text-slate-400">
                          <span>WH Response</span>
                          <span className="text-slate-600">{formatLeadTime(req.warehouseResponseTime)}</span>
                       </div>
                       <div className="flex justify-between items-center text-[8px] font-black uppercase text-slate-400">
                          <span>Supplier Lead</span>
                          <span className="text-slate-600">{formatLeadTime(req.supplierLeadTime)}</span>
                       </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                       {getStatusIcon(req.status)}
                       <span className={`text-[10px] font-black uppercase tracking-widest ${
                         req.status === 'DELIVERED' ? 'text-green-600' :
                         req.status === 'ORDERED' ? 'text-orange-600' : 
                         req.status === 'IN_TRANSIT' ? 'text-purple-600' : 'text-slate-400'
                       }`}>{req.status}</span>
                    </div>
                    {req.deliveryDate && (
                       <div className="text-[8px] font-black text-slate-400 mt-1 uppercase">REC: {new Date(req.deliveryDate).toLocaleDateString()}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {isStoreOrAdmin && req.status !== 'DELIVERED' && (
                      <div className="flex justify-end gap-2">
                         {req.status === 'PENDING' && (
                           <button onClick={() => onUpdateRequest(req.id, 'APPROVED')} className="text-[9px] font-black bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 uppercase tracking-widest transition-all">Approve</button>
                         )}
                         {req.status === 'APPROVED' && (
                           <button onClick={() => onUpdateRequest(req.id, 'ORDERED')} className="text-[9px] font-black bg-orange-500 text-white px-3 py-1.5 rounded-lg hover:bg-orange-600 uppercase tracking-widest transition-all">Order</button>
                         )}
                         {req.status === 'ORDERED' && (
                           <button onClick={() => onUpdateRequest(req.id, 'IN_TRANSIT')} className="text-[9px] font-black bg-purple-600 text-white px-3 py-1.5 rounded-lg hover:bg-purple-700 uppercase tracking-widest transition-all">In Transit</button>
                         )}
                         {(req.status === 'IN_TRANSIT' || req.status === 'ORDERED' || req.status === 'APPROVED') && (
                           <button onClick={() => onUpdateRequest(req.id, 'DELIVERED')} className="text-[9px] font-black bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 uppercase tracking-widest transition-all">Received</button>
                         )}
                      </div>
                    )}
                    {req.status === 'DELIVERED' && (
                      <div className="flex items-center justify-end gap-1 text-green-600">
                         <ShieldCheck className="w-4 h-4" />
                         <span className="text-[9px] font-black uppercase tracking-widest">Audited</span>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {requests.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center">
                    <ClipboardList className="w-12 h-12 mx-auto text-slate-100 mb-4" />
                    <p className="text-slate-400 font-black uppercase tracking-widest text-xs">No active spare part flows in system</p>
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

export default SparePartTrackingView;