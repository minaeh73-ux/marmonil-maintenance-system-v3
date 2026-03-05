
import React, { useState, useMemo } from 'react';
import { Machine, ProductionLog, User } from '../types';
import { Save, Target, PlusCircle, AlertTriangle, Clock } from 'lucide-react';

interface ProductionKPIEntryProps {
  machines: Machine[];
  currentUser: User;
  onLogProductionEntry: (log: ProductionLog) => void;
}

const ProductionKPIEntry: React.FC<ProductionKPIEntryProps> = ({ machines, currentUser, onLogProductionEntry }) => {
  const [prodDate, setProdDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMachineId, setSelectedMachineId] = useState('');
  const [actualRunHours, setActualRunHours] = useState(0);
  const [actualProduction, setActualProduction] = useState(0);
  const [rejectQuantity, setRejectQuantity] = useState(0);
  const [error, setError] = useState('');

  const selectedMachine = useMemo(() => machines.find(m => m.id === selectedMachineId), [machines, selectedMachineId]);
  const PLANNED_PRODUCTION_TIME_DAILY = 22; 

  const downtimeHours = PLANNED_PRODUCTION_TIME_DAILY - actualRunHours;
  const expectedProduction = selectedMachine ? (selectedMachine.idealProductionRate || 0) * PLANNED_PRODUCTION_TIME_DAILY : 0;
  const goodProduction = actualProduction - rejectQuantity;

  const isFormValid = useMemo(() => {
    if (!selectedMachine || !prodDate) return false;
    if (actualRunHours < 0 || actualRunHours > PLANNED_PRODUCTION_TIME_DAILY) return false;
    if (actualProduction < 0 || rejectQuantity < 0) return false;
    if (rejectQuantity > actualProduction) return false;
    return true;
  }, [selectedMachine, prodDate, actualRunHours, actualProduction, rejectQuantity]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    onLogProductionEntry({
      id: `prodlog-${Date.now()}`,
      date: prodDate,
      machineId: selectedMachine!.id,
      machineName: selectedMachine!.name,
      actualRunHours,
      actualProduction,
      rejectQuantity,
      loggedBy: currentUser.name,
    });

    setSelectedMachineId('');
    setActualRunHours(0);
    setActualProduction(0);
    setRejectQuantity(0);
    setError('');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <div className="bg-slate-900 rounded-3xl p-8 text-white shadow-xl flex items-center justify-between border-l-8 border-blue-600">
        <div className="flex items-center gap-4">
          <div className="bg-blue-600 p-3 rounded-2xl shadow-lg"><Target className="w-8 h-8" /></div>
          <div>
            <h2 className="text-2xl font-black uppercase tracking-tight">Manual KPI Data Entry</h2>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Authorized Entry Zone</p>
          </div>
        </div>
        <div className="text-right hidden md:block">
          <div className="text-3xl font-black text-green-400">22.0h</div>
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Daily Cycle Cap</div>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl p-8">
        <form onSubmit={handleSubmit} className="space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block">Log Date</label>
              <input type="date" required value={prodDate} onChange={e => setProdDate(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-black outline-none focus:border-blue-500" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block">Asset Name</label>
              <select required value={selectedMachineId} onChange={e => setSelectedMachineId(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-black outline-none focus:border-blue-500 appearance-none">
                <option value="">-- SELECT ASSET --</option>
                {machines.map(m => <option key={m.id} value={m.id}>{m.name} ({m.workcenterArea})</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 bg-blue-50/50 rounded-3xl border border-blue-100 space-y-4">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase text-blue-600 tracking-widest">
                <Clock className="w-4 h-4" /> Runtime (Hrs)
              </div>
              <input type="number" required step="0.5" max="22" min="0" value={actualRunHours} onChange={e => setActualRunHours(parseFloat(e.target.value) || 0)} className="w-full bg-white border-2 border-slate-100 rounded-2xl p-4 text-2xl font-black outline-none focus:border-blue-500" />
            </div>
            <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 space-y-4">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-500 tracking-widest">
                <Target className="w-4 h-4" /> Production (M2)
              </div>
              <input type="number" required min="0" value={actualProduction} onChange={e => setActualProduction(parseFloat(e.target.value) || 0)} className="w-full bg-white border-2 border-slate-100 rounded-2xl p-4 text-2xl font-black outline-none focus:border-blue-500" />
            </div>
            <div className="p-6 bg-red-50/50 rounded-3xl border border-red-100 space-y-4">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase text-red-600 tracking-widest">
                <AlertTriangle className="w-4 h-4" /> Rejects (M2)
              </div>
              <input type="number" required min="0" value={rejectQuantity} onChange={e => setRejectQuantity(parseFloat(e.target.value) || 0)} className="w-full bg-white border-2 border-slate-100 rounded-2xl p-4 text-2xl font-black text-red-600 outline-none focus:border-red-500" />
            </div>
          </div>

          {selectedMachine && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6 border-t border-slate-50">
              <AutoCalcBox label="Downtime" value={`${downtimeHours.toFixed(1)}h`} />
              <AutoCalcBox label="Expectation" value={`${expectedProduction.toFixed(0)} M2`} />
              <AutoCalcBox label="Yield" value={`${goodProduction.toFixed(0)} M2`} />
              <AutoCalcBox label="Planned Cycle" value="22.0h" />
            </div>
          )}

          <button type="submit" disabled={!isFormValid} className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-30 text-white font-black py-6 rounded-[2rem] uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl transition-all active:scale-95">
            <PlusCircle className="w-6 h-6" /> Commit Production Record
          </button>
        </form>
      </div>
    </div>
  );
};

const AutoCalcBox = ({ label, value }: any) => (
  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center">
    <div className="text-[8px] font-black uppercase text-slate-400 tracking-widest mb-1">{label}</div>
    <div className="text-sm font-black text-slate-800">{value}</div>
  </div>
);

export default ProductionKPIEntry;
